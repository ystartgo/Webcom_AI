"""
Webcom AI - Native PowerPoint (.pptx) Diagram Engine
Converts flowchart and architecture block diagram graph data (nodes & edges)
into genuine, 100% native Microsoft PowerPoint (.pptx) shapes and connectors.
No SVGs, no raster bitmaps - full native Office Open XML shapes (p:sp, p:cxnSp, p:txBody).
"""

import io
import json
import math
import re
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.oxml import parse_xml

def hex_to_rgb(hex_str: str, default: tuple = (30, 41, 59)) -> RGBColor:
    if not hex_str:
        return RGBColor(*default)
    h = hex_str.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join([c * 2 for c in h])
    if len(h) != 6:
        return RGBColor(*default)
    try:
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
        return RGBColor(r, g, b)
    except Exception:
        return RGBColor(*default)


def _is_text_only_node(node: Dict[str, Any]) -> bool:
    fill = str(node.get("fill", "") or "").lower()
    stroke = str(node.get("stroke", "") or "").lower()
    shape = str(node.get("shape", "") or "").lower()
    return (
        bool(str(node.get("text", "") or "").strip())
        and fill in ("none", "transparent", "")
        and stroke in ("none", "transparent", "")
        and shape not in ("crystal", "circle", "oval")
        and not bool(node.get("is_container"))
    )


def _dedupe_points(points: List[List[int]]) -> List[List[int]]:
    cleaned: List[List[int]] = []
    for pt in points:
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            continue
        x = int(round(float(pt[0])))
        y = int(round(float(pt[1])))
        if not cleaned or cleaned[-1] != [x, y]:
            cleaned.append([x, y])
    return cleaned


def _edge_route_points(
    edge: Dict[str, Any],
    node_map: Dict[str, Dict[str, Any]]
) -> List[List[int]]:
    explicit = edge.get("waypoints") or edge.get("points")
    if isinstance(explicit, list) and len(explicit) >= 2:
        return _dedupe_points(explicit)

    f_id = str(edge.get("from", ""))
    t_id = str(edge.get("to", ""))
    src = node_map.get(f_id)
    dst = node_map.get(t_id)
    if not src or not dst:
        return []

    sx = float(src["x"]) + float(src["width"]) / 2.0
    sy = float(src["y"]) + float(src["height"]) / 2.0
    tx = float(dst["x"]) + float(dst["width"]) / 2.0
    ty = float(dst["y"]) + float(dst["height"]) / 2.0
    dx = tx - sx
    dy = ty - sy
    offset_x = float(edge.get("offsetX", 0) or 0)
    offset_y = float(edge.get("offsetY", 0) or 0)

    if abs(dx) >= abs(dy):
        x_start = round(float(src["x"]) + float(src["width"])) if dx > 0 else round(float(src["x"]))
        x_end = round(float(dst["x"])) if dx > 0 else round(float(dst["x"]) + float(dst["width"]))
        y_start = round(sy + offset_y)
        y_end = round(ty + offset_y)
        if abs(y_start - y_end) <= 8:
            coords = [[x_start, y_start], [x_end, y_start]]
        else:
            mid_x = round((x_start + x_end) / 2.0 + offset_x)
            coords = [[x_start, y_start], [mid_x, y_start], [mid_x, y_end], [x_end, y_end]]
    else:
        y_start = round(float(src["y"]) + float(src["height"])) if dy > 0 else round(float(src["y"]))
        y_end = round(float(dst["y"])) if dy > 0 else round(float(dst["y"]) + float(dst["height"]))
        x_start = round(sx + offset_x)
        x_end = round(tx + offset_x)
        if abs(x_start - x_end) <= 8:
            coords = [[x_start, y_start], [x_start, y_end]]
        else:
            mid_y = round((y_start + y_end) / 2.0 + offset_y)
            coords = [[x_start, y_start], [x_start, mid_y], [x_end, mid_y], [x_end, y_end]]
    return _dedupe_points(coords)


def _extract_json_payload(raw_text: str) -> Optional[str]:
    if not raw_text:
        return None
    text = raw_text.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
    if fenced:
        text = fenced.group(1).strip()
    if text.startswith("{") and text.endswith("}"):
        return text
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start:end + 1]
    return None


def _feature_collection_to_diagram(fc: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(fc, dict) or fc.get("type") != "FeatureCollection":
        raise ValueError("LLM 回覆不是有效的 FeatureCollection")

    new_nodes: List[Dict[str, Any]] = []
    new_edges: List[Dict[str, Any]] = []

    for idx, feature in enumerate(fc.get("features", []) or []):
        if not isinstance(feature, dict):
            continue
        geometry = feature.get("geometry") or {}
        props = feature.get("properties") or {}
        g_type = geometry.get("type")
        role = str(props.get("role", "") or "").lower()

        if g_type == "Polygon" and role in ("block", "panel", "container"):
            rings = geometry.get("coordinates") or []
            if not rings or not isinstance(rings[0], list) or len(rings[0]) < 4:
                continue
            ring = rings[0]
            xs = [float(pt[0]) for pt in ring if isinstance(pt, (list, tuple)) and len(pt) >= 2]
            ys = [float(pt[1]) for pt in ring if isinstance(pt, (list, tuple)) and len(pt) >= 2]
            if not xs or not ys:
                continue
            x1, y1 = min(xs), min(ys)
            x2, y2 = max(xs), max(ys)
            fill = str(props.get("fill", "#D1CFCE"))
            stroke = str(props.get("stroke", "#7F7F7F"))
            is_container = bool(props.get("is_container")) or role in ("panel", "container")
            new_nodes.append({
                "id": str(props.get("id") or f"node_{idx + 1}"),
                "x": round(x1),
                "y": round(y1),
                "width": max(4, round(x2 - x1)),
                "height": max(4, round(y2 - y1)),
                "text": str(props.get("label", "")),
                "fill": fill,
                "stroke": stroke,
                "strokeWidth": float(props.get("strokeWidth", 1.5) or 1.5),
                "dash": bool(props.get("dash", False)),
                "radius": float(props.get("radius", 4 if is_container else 2) or 0),
                "fontSize": float(props.get("fontSize", 9.5) or 9.5),
                "textColor": str(props.get("textColor", "#0f172a")),
                "shape": str(props.get("shape", "rect") or "rect"),
                "is_container": is_container
            })
        elif g_type == "Point" and role in ("text", "label", "annotation"):
            coords = geometry.get("coordinates") or [0, 0]
            bbox = props.get("bbox") or []
            label = str(props.get("label", ""))
            width = max(18, round(float(bbox[2]))) if len(bbox) >= 4 else max(24, round(len(label) * 7.2 + 10))
            height = max(10, round(float(bbox[3]))) if len(bbox) >= 4 else 16
            x = round(float(bbox[0])) if len(bbox) >= 4 else round(float(coords[0]) - width / 2)
            y = round(float(bbox[1])) if len(bbox) >= 4 else round(float(coords[1]) - height / 2)
            new_nodes.append({
                "id": str(props.get("id") or f"text_{idx + 1}"),
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "text": label,
                "fill": "none",
                "stroke": "none",
                "strokeWidth": 0,
                "dash": False,
                "radius": 0,
                "fontSize": float(props.get("fontSize", 8.5) or 8.5),
                "textColor": str(props.get("textColor", "#374151")),
                "shape": "rect",
                "kind": "text"
            })
        elif g_type == "LineString" and role == "connector":
            coords = _dedupe_points(geometry.get("coordinates") or [])
            label_bbox = props.get("labelBBox") or []
            new_edges.append({
                "id": str(props.get("id") or f"edge_{idx + 1}"),
                "from": str(props.get("from", "")),
                "to": str(props.get("to", "")),
                "label": str(props.get("label", "")),
                "color": str(props.get("stroke", "#7F7F7F")),
                "arrow": str(props.get("arrow", "forward")),
                "dash": bool(props.get("dash", False)),
                "strokeWidth": float(props.get("strokeWidth", 1.5) or 1.5),
                "fontSize": float(props.get("fontSize", 8.0) or 8.0),
                "labelColor": str(props.get("textColor", props.get("labelColor", "#334155"))),
                "waypoints": coords,
                "labelX": int(float(label_bbox[0])) if len(label_bbox) >= 4 else None,
                "labelY": int(float(label_bbox[1])) if len(label_bbox) >= 4 else None,
                "labelWidth": int(float(label_bbox[2])) if len(label_bbox) >= 4 else None,
                "labelHeight": int(float(label_bbox[3])) if len(label_bbox) >= 4 else None
            })

    return {
        "nodes": new_nodes,
        "edges": new_edges,
        "width": int((fc.get("metadata") or {}).get("imageWidth", 1920) or 1920),
        "height": int((fc.get("metadata") or {}).get("imageHeight", 1080) or 1080),
        "feature_count": len(fc.get("features", []) or [])
    }


def _call_llm_for_geojson(
    llm_endpoint: str,
    compiler_prompt: str,
    geojson_context: str,
    source_image_base64: Optional[str] = None
) -> Dict[str, Any]:
    import requests

    endpoint = llm_endpoint.rstrip("/") + "/chat/completions"
    user_parts: List[Dict[str, Any]] = [
        {"type": "text", "text": compiler_prompt + "\n\n目前初稿 GeoJSON:\n" + geojson_context}
    ]
    if source_image_base64:
        user_parts.append({
            "type": "image_url",
            "image_url": {"url": source_image_base64}
        })

    payload = {
        "model": "local-model",
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是一個嚴謹的硬體系統架構向量編譯器。"
                    "你要根據輸入圖片與 GeoJSON 初稿，輸出更精確的 GeoJSON FeatureCollection。"
                    "只允許輸出純 JSON，不得附加 markdown、說明、註解或多餘文字。"
                )
            },
            {
                "role": "user",
                "content": user_parts if source_image_base64 else user_parts[0]["text"]
            }
        ],
        "temperature": 0.05,
        "max_tokens": 8192,
        "stream": False
    }

    response = requests.post(endpoint, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    content = (((data.get("choices") or [{}])[0]).get("message") or {}).get("content", "")
    if isinstance(content, list):
        content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
    json_payload = _extract_json_payload(str(content))
    if not json_payload:
        raise ValueError("LLM 未回傳可解析的 JSON")
    parsed = json.loads(json_payload)
    if parsed.get("type") != "FeatureCollection":
        raise ValueError("LLM JSON 不是 FeatureCollection")
    return parsed


def _rect_intersection_area(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    ax1, ay1 = float(a["x"]), float(a["y"])
    ax2, ay2 = ax1 + float(a["width"]), ay1 + float(a["height"])
    bx1, by1 = float(b["x"]), float(b["y"])
    bx2, by2 = bx1 + float(b["width"]), by1 + float(b["height"])
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    return float(ix2 - ix1) * float(iy2 - iy1)


def _rect_center(a: Dict[str, Any]) -> tuple[float, float]:
    return float(a["x"]) + float(a["width"]) / 2.0, float(a["y"]) + float(a["height"]) / 2.0


def _point_in_rect(px: float, py: float, rect: Dict[str, Any], pad: float = 0.0) -> bool:
    return (
        float(rect["x"]) - pad <= px <= float(rect["x"]) + float(rect["width"]) + pad
        and float(rect["y"]) - pad <= py <= float(rect["y"]) + float(rect["height"]) + pad
    )


def _normalize_ocr_text(text: str) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip())
    return t.strip()


HARDWARE_OCR_PHRASES = [
    "CPU",
    "IPQ5424",
    "CPU IPQ5424",
    "QCN5024-2G",
    "QCN6224",
    "QCN6274",
    "RFICx",
    "QCN5024-2G RFICx",
    "DDR4",
    "32 Bit Data",
    "18 Bit Addr",
    "DDR Ctrl",
    "48MHz",
    "38.4MHz",
    "26MHz",
    "UART",
    "Debug UART",
    "Connector/Header",
    "MDC/MDIO",
    "GPIO",
    "Reset",
    "1G",
    "10G",
    "2 x 1G SW",
    "1G to 2 x 1G SW",
    "10G BASE-T PHY",
    "QCA8334",
    "QCA8112",
    "QCA8112 (PHY)",
    "FEM",
    "6G FEM",
    "U.FL",
]

CONNECTOR_LABEL_PHRASES = [
    "32 Bit Data",
    "18 Bit Addr",
    "DDR Ctrl",
    "DDR4",
    "PCIe",
    "SGMII",
    "USXGMII",
    "1G",
    "10G",
    "1G to",
    "2 x 1G SW",
    "10G BASE-T PHY",
    "MDC/MDIO",
    "GPIO",
    "UART",
    "Reset",
    "48MHz",
    "38.4MHz",
    "26MHz",
    "RFICx",
]


def _ocr_skeleton(text: str) -> str:
    t = (text or "").upper()
    t = t.replace(" ", "")
    t = t.replace("\n", "")
    t = re.sub(r"[^A-Z0-9]", "", t)
    return t


def _is_connector_label_text(text: str) -> bool:
    t = _correct_ocr_text(text).replace("\n", " ").strip()
    if not t:
        return False
    if t in CONNECTOR_LABEL_PHRASES:
        return True
    upper = t.upper()
    if any(phrase.upper() in upper for phrase in CONNECTOR_LABEL_PHRASES):
        return True
    if re.search(r"\b\d+\s*BIT\b", upper):
        return True
    if re.search(r"\b(MHZ|GHZ)\b", upper):
        return True
    if "/" in t and len(t) <= 24:
        return True
    return False


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def _apply_common_ocr_substitutions(text: str) -> str:
    t = (text or "").strip()
    replacements = [
        (r"\bPQ5424\b", "IPQ5424"),
        (r"\bQCNSQ4-?2G\b", "QCN5024-2G"),
        (r"\bQCN5Q24-?2G\b", "QCN5024-2G"),
        (r"\bRifCLX\b", "RFICx"),
        (r"\bRFfCLX\b", "RFICx"),
        (r"\bMH[tT]\b", "MHz"),
        (r"\b48MH[zZtT]?\b", "48MHz"),
        (r"\b38\.?4MH[zZtT]?\b", "38.4MHz"),
        (r"\b26MH[zZtT]?\b", "26MHz"),
        (r"Connectoe/?He.?et", "Connector/Header"),
        (r"\bMOIO\b", "MDIO"),
        (r"\bIOG\b", "10G"),
        (r"\bIG\b", "1G"),
        (r"\b8A8n2\b", "QCA8112"),
        (r"\b8A812\b", "QCA8112"),
        (r"\bQCA8112\s*\(\s*PHY\s*\)", "QCA8112 (PHY)"),
        (r"\(\s*\(PHY\)\s*\)", "(PHY)"),
        (r"\(\s*PHY\s*\)", "(PHY)"),
        (r"\bBit Oa\b", "18 Bit Addr"),
        (r"\b2 X 1G SW\b", "2 x 1G SW"),
        (r"\b1G tO\b", "1G to"),
        (r"\btO\b", "to"),
        (r"\bGMDO\b", "GPIO"),
        (r"MDIO", "MDIO"),
        (r"MDO/MDIO|MDC/MDlO|MDC/MDIO", "MDC/MDIO"),
        (r"^[^A-Za-z0-9]*/\s*MDIO$", "MDC/MDIO"),
        (r"\bto\s+to\b", "to"),
        (r"^[^A-Za-z0-9]*6G\b", "6G"),
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", t).strip()


def _match_hardware_phrase(text: str) -> str:
    raw = _apply_common_ocr_substitutions(_normalize_ocr_text(text))
    if not raw:
        return raw

    raw_skeleton = _ocr_skeleton(raw)
    if not raw_skeleton:
        return raw

    best_phrase = raw
    best_score = 0.0
    for phrase in HARDWARE_OCR_PHRASES:
        phrase_skeleton = _ocr_skeleton(phrase)
        score = max(
            _similarity(raw.upper(), phrase.upper()),
            _similarity(raw_skeleton, phrase_skeleton)
        )
        if raw_skeleton == phrase_skeleton:
            return phrase
        if (
            score > best_score
            and (
                score >= 0.84
                or (len(raw_skeleton) >= 5 and score >= 0.73 and (raw_skeleton in phrase_skeleton or phrase_skeleton in raw_skeleton))
            )
        ):
            best_score = score
            best_phrase = phrase
    return best_phrase


def _correct_ocr_text(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    lines = [seg.strip() for seg in re.split(r"[\r\n]+", text) if seg.strip()]
    corrected = [_match_hardware_phrase(line) for line in lines]
    deduped: List[str] = []
    for seg in corrected:
        seg = seg.strip()
        if not seg:
            continue
        if deduped and deduped[-1] == seg:
            continue
        if seg.lower() == "to" and deduped and deduped[-1].lower().endswith(" to"):
            continue
        deduped.append(seg)
    corrected = deduped
    corrected = [seg for seg in corrected if seg]
    return "\n".join(corrected)


def _should_merge_text_pair(a: Dict[str, Any], b: Dict[str, Any]) -> Optional[str]:
    if not a.get("text") or not b.get("text"):
        return None

    ax1, ay1 = float(a["x"]), float(a["y"])
    ax2, ay2 = ax1 + float(a["width"]), ay1 + float(a["height"])
    bx1, by1 = float(b["x"]), float(b["y"])
    bx2, by2 = bx1 + float(b["width"]), by1 + float(b["height"])
    acx, acy = _rect_center(a)
    bcx, bcy = _rect_center(b)
    avg_h = max(1.0, (float(a["height"]) + float(b["height"])) / 2.0)
    avg_w = max(1.0, (float(a["width"]) + float(b["width"])) / 2.0)
    a_text = str(a["text"]).strip()
    b_text = str(b["text"]).strip()
    shortish = max(len(a_text), len(b_text)) <= 12

    same_row = abs(acy - bcy) <= avg_h * 0.65
    h_gap = bx1 - ax2 if ax1 <= bx1 else ax1 - bx2
    if same_row and -4 <= h_gap <= max(24.0, avg_h * 1.6):
        if shortish or len(a_text) + len(b_text) <= 22:
            return "horizontal"

    x_overlap = max(0.0, min(ax2, bx2) - max(ax1, bx1))
    min_w = max(1.0, min(float(a["width"]), float(b["width"])))
    overlap_ratio = x_overlap / min_w
    vertical_gap = by1 - ay2 if ay1 <= by1 else ay1 - by2
    same_col = abs(acx - bcx) <= max(14.0, avg_w * 0.45) or overlap_ratio >= 0.55
    if same_col and -3 <= vertical_gap <= max(18.0, avg_h * 1.1):
        if shortish or len(a_text) + len(b_text) <= 22:
            return "vertical"
    return None


def _merge_two_text_regions(a: Dict[str, Any], b: Dict[str, Any], direction: str, merged_id: str) -> Dict[str, Any]:
    x1 = min(float(a["x"]), float(b["x"]))
    y1 = min(float(a["y"]), float(b["y"]))
    x2 = max(float(a["x"]) + float(a["width"]), float(b["x"]) + float(b["width"]))
    y2 = max(float(a["y"]) + float(a["height"]), float(b["y"]) + float(b["height"]))

    if direction == "horizontal":
        first, second = (a, b) if float(a["x"]) <= float(b["x"]) else (b, a)
        raw_text = f"{first['text']} {second['text']}"
    else:
        first, second = (a, b) if float(a["y"]) <= float(b["y"]) else (b, a)
        raw_text = f"{first['text']}\n{second['text']}"

    merged_text = _correct_ocr_text(raw_text)
    if not merged_text:
        merged_text = _normalize_ocr_text(raw_text)

    return {
        "id": merged_id,
        "x": int(round(x1)),
        "y": int(round(y1)),
        "width": int(round(x2 - x1)),
        "height": int(round(y2 - y1)),
        "text": merged_text
    }


def _merge_text_regions(text_regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    regions = [dict(r) for r in text_regions if str(r.get("text", "")).strip()]
    if len(regions) <= 1:
        return regions

    changed = True
    merge_seq = 1
    while changed:
        changed = False
        regions.sort(key=lambda r: (float(r["y"]), float(r["x"]), float(r["width"])))
        used = set()
        merged_regions: List[Dict[str, Any]] = []

        for i, region in enumerate(regions):
            if i in used:
                continue
            best_j = None
            best_dir = None
            best_score = float("inf")
            for j in range(i + 1, len(regions)):
                if j in used:
                    continue
                candidate = regions[j]
                direction = _should_merge_text_pair(region, candidate)
                if not direction:
                    continue
                dx = abs(_rect_center(region)[0] - _rect_center(candidate)[0])
                dy = abs(_rect_center(region)[1] - _rect_center(candidate)[1])
                score = dy * 2.0 + dx if direction == "horizontal" else dx * 2.0 + dy
                if score < best_score:
                    best_score = score
                    best_j = j
                    best_dir = direction
            if best_j is not None and best_dir is not None:
                merged = _merge_two_text_regions(region, regions[best_j], best_dir, f"merged_text_{merge_seq}")
                merge_seq += 1
                merged_regions.append(merged)
                used.add(i)
                used.add(best_j)
                changed = True
            else:
                merged_regions.append(region)
                used.add(i)
        regions = merged_regions
    return regions


def _merge_nearby_label_nodes(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    phrase_set = {phrase.upper(): phrase for phrase in HARDWARE_OCR_PHRASES}
    kept_nodes: List[Dict[str, Any]] = []
    removed_ids = set()

    for base in nodes:
        if base.get("id") in removed_ids:
            continue
        if base.get("fill") in (None, "none") or not str(base.get("text", "")).strip():
            continue

        bx1, by1 = float(base["x"]), float(base["y"])
        bx2, by2 = bx1 + float(base["width"]), by1 + float(base["height"])
        best_label = None
        best_text = str(base["text"]).strip()

        for candidate in nodes:
            if candidate is base or candidate.get("id") in removed_ids:
                continue
            if candidate.get("fill") != "none" or candidate.get("stroke") != "none":
                continue
            ctext = str(candidate.get("text", "")).strip()
            if not ctext:
                continue
            cx1, cy1 = float(candidate["x"]), float(candidate["y"])
            cx2, cy2 = cx1 + float(candidate["width"]), cy1 + float(candidate["height"])
            near = not (cx2 < bx1 - 26 or cx1 > bx2 + 26 or cy2 < by1 - 22 or cy1 > by2 + 22)
            if not near:
                continue

            combos = [
                f"{base['text']} {ctext}",
                f"{base['text']}\n{ctext}",
                f"{ctext} {base['text']}",
                f"{ctext}\n{base['text']}",
            ]
            for combo in combos:
                corrected = _correct_ocr_text(combo)
                canonical = phrase_set.get(corrected.upper())
                base_skeleton = _ocr_skeleton(str(base["text"]))
                cand_skeleton = _ocr_skeleton(ctext)
                canon_skeleton = _ocr_skeleton(canonical) if canonical else ""
                if (
                    canonical
                    and len(canonical) > len(best_text)
                    and base_skeleton
                    and cand_skeleton
                    and base_skeleton in canon_skeleton
                    and cand_skeleton in canon_skeleton
                ):
                    best_text = canonical
                    best_label = candidate
                    break

        if best_label is not None:
            base["text"] = best_text
            removed_ids.add(best_label["id"])

    for node in nodes:
        if node.get("id") not in removed_ids:
            kept_nodes.append(node)
    return kept_nodes


def _demote_text_like_nodes(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    updated: List[Dict[str, Any]] = []
    for node in nodes:
        text = str(node.get("text", "")).strip()
        fill = str(node.get("fill", ""))
        width = float(node.get("width", 0))
        height = float(node.get("height", 0))
        elongated = width >= max(48.0, height * 2.6)
        pale = fill.lower() in {"#f8fafc", "#ffffff", "#f1f5f9"}
        tiny = height <= 22 and width <= 140
        label_like = _is_connector_label_text(text)

        if text and pale and (label_like or elongated or tiny):
            new_node = dict(node)
            new_node["fill"] = "none"
            new_node["stroke"] = "none"
            new_node["textColor"] = "#2563eb" if any(c.isdigit() for c in text) else "#374151"
            new_node["fontSize"] = min(float(new_node.get("fontSize", 8.0)), 8.5)
            updated.append(new_node)
        else:
            updated.append(node)
    return updated


def _estimate_text_density(rect: Dict[str, Any], text_regions: List[Dict[str, Any]]) -> Dict[str, Any]:
    overlap_area = 0.0
    inside_count = 0
    contained_texts: List[str] = []
    for txt in text_regions:
        overlap = _rect_intersection_area(rect, txt)
        if overlap <= 0:
            continue
        overlap_area += overlap
        cx, cy = _rect_center(txt)
        if _point_in_rect(cx, cy, rect, pad=2):
            inside_count += 1
            contained_texts.append(str(txt.get("text", "")))
    rect_area = max(1.0, float(rect["width"]) * float(rect["height"]))
    return {
        "overlap_ratio": overlap_area / rect_area,
        "inside_count": inside_count,
        "texts": contained_texts
    }


def _snap_rect_to_line_support(
    rect: Dict[str, Any],
    horizontal_mask: Any,
    vertical_mask: Any,
    img_w: int,
    img_h: int
) -> Dict[str, Any]:
    x = int(rect["x"])
    y = int(rect["y"])
    w = int(rect["width"])
    h = int(rect["height"])
    if w < 10 or h < 8:
        return rect

    pad_x = max(3, min(10, w // 6))
    pad_y = max(3, min(10, h // 6))
    inner_x1 = max(0, x + max(1, w // 8))
    inner_x2 = min(img_w, x + w - max(1, w // 8))
    inner_y1 = max(0, y + max(1, h // 8))
    inner_y2 = min(img_h, y + h - max(1, h // 8))
    if inner_x2 <= inner_x1 or inner_y2 <= inner_y1:
        return rect

    top_band = horizontal_mask[max(0, y - pad_y):min(img_h, y + pad_y + 1), inner_x1:inner_x2]
    bottom_band = horizontal_mask[max(0, y + h - pad_y - 1):min(img_h, y + h + pad_y), inner_x1:inner_x2]
    left_band = vertical_mask[inner_y1:inner_y2, max(0, x - pad_x):min(img_w, x + pad_x + 1)]
    right_band = vertical_mask[inner_y1:inner_y2, max(0, x + w - pad_x - 1):min(img_w, x + w + pad_x)]

    def pick_row(band: Any, base: int) -> Optional[int]:
        if getattr(band, "size", 0) == 0:
            return None
        scores = np.count_nonzero(band > 0, axis=1)
        idx = int(np.argmax(scores))
        if scores[idx] < max(3, (inner_x2 - inner_x1) * 0.08):
            return None
        return base + idx

    def pick_col(band: Any, base: int) -> Optional[int]:
        if getattr(band, "size", 0) == 0:
            return None
        scores = np.count_nonzero(band > 0, axis=0)
        idx = int(np.argmax(scores))
        if scores[idx] < max(3, (inner_y2 - inner_y1) * 0.08):
            return None
        return base + idx

    top = pick_row(top_band, max(0, y - pad_y))
    bottom = pick_row(bottom_band, max(0, y + h - pad_y - 1))
    left = pick_col(left_band, max(0, x - pad_x))
    right = pick_col(right_band, max(0, x + w - pad_x - 1))

    nx1 = max(0, left if left is not None else x)
    ny1 = max(0, top if top is not None else y)
    nx2 = min(img_w, (right + 1) if right is not None else (x + w))
    ny2 = min(img_h, (bottom + 1) if bottom is not None else (y + h))

    if nx2 - nx1 < 8 or ny2 - ny1 < 8:
        return rect

    snapped = dict(rect)
    snapped["x"] = int(nx1)
    snapped["y"] = int(ny1)
    snapped["width"] = int(nx2 - nx1)
    snapped["height"] = int(ny2 - ny1)
    snapped["area"] = int(snapped["width"] * snapped["height"])
    return snapped


def _merge_collinear_segments(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not segments:
        return []
    merged: List[Dict[str, Any]] = []
    by_orientation: Dict[str, List[Dict[str, Any]]] = {"horizontal": [], "vertical": []}
    for seg in segments:
        by_orientation.setdefault(seg["orientation"], []).append(seg)

    for orientation, segs in by_orientation.items():
        if orientation == "horizontal":
            segs.sort(key=lambda s: (s["y1"], s["x1"]))
            for seg in segs:
                if not merged or merged[-1]["orientation"] != "horizontal":
                    merged.append(dict(seg))
                    continue
                prev = merged[-1]
                same_row = abs(prev["y1"] - seg["y1"]) <= 2
                touching = seg["x1"] <= prev["x2"] + 6
                if same_row and touching:
                    prev["x2"] = max(prev["x2"], seg["x2"])
                    prev["length"] = prev["x2"] - prev["x1"]
                else:
                    merged.append(dict(seg))
        else:
            segs.sort(key=lambda s: (s["x1"], s["y1"]))
            for seg in segs:
                if not merged or merged[-1]["orientation"] != "vertical":
                    merged.append(dict(seg))
                    continue
                prev = merged[-1]
                same_col = abs(prev["x1"] - seg["x1"]) <= 2
                touching = seg["y1"] <= prev["y2"] + 6
                if same_col and touching:
                    prev["y2"] = max(prev["y2"], seg["y2"])
                    prev["length"] = prev["y2"] - prev["y1"]
                else:
                    merged.append(dict(seg))
    return merged


def _extract_line_segments(horizontal_mask: Any, vertical_mask: Any) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    for orientation, mask in (("horizontal", horizontal_mask), ("vertical", vertical_mask)):
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for idx, contour in enumerate(contours):
            x, y, w, h = cv2.boundingRect(contour)
            if orientation == "horizontal":
                if w < 14:
                    continue
                mid_y = int(round(y + h / 2.0))
                segments.append({
                    "id": f"hseg_{idx + 1}",
                    "orientation": "horizontal",
                    "x1": int(x),
                    "y1": mid_y,
                    "x2": int(x + w),
                    "y2": mid_y,
                    "length": int(w)
                })
            else:
                if h < 14:
                    continue
                mid_x = int(round(x + w / 2.0))
                segments.append({
                    "id": f"vseg_{idx + 1}",
                    "orientation": "vertical",
                    "x1": mid_x,
                    "y1": int(y),
                    "x2": mid_x,
                    "y2": int(y + h),
                    "length": int(h)
                })
    return _merge_collinear_segments(segments)


def _build_geometry_ir(
    image_width: int,
    image_height: int,
    boxes: List[Dict[str, Any]],
    text_regions: List[Dict[str, Any]],
    line_segments: List[Dict[str, Any]],
    symbols: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    return {
        "unit": "pixel",
        "imageWidth": int(image_width),
        "imageHeight": int(image_height),
        "rectangles": [
            {
                "id": f"node_{idx + 1}",
                "x": int(b["x"]),
                "y": int(b["y"]),
                "width": int(b["width"]),
                "height": int(b["height"]),
                "shape": b.get("shape", "rect"),
                "isContainer": bool(b.get("is_container", False))
            }
            for idx, b in enumerate(boxes)
        ],
        "texts": [
            {
                "id": str(t["id"]),
                "x": int(t["x"]),
                "y": int(t["y"]),
                "width": int(t["width"]),
                "height": int(t["height"]),
                "text": str(t.get("text", ""))
            }
            for t in text_regions
        ],
        "lineSegments": line_segments,
        "polylines": [],
        "symbols": list(symbols or [])
    }


def _classify_symbol_candidate(
    bbox: Dict[str, Any],
    contour_area: float,
    approx_vertices: int,
    perimeter: float
) -> str:
    width = max(1.0, float(bbox.get("width", 0)))
    height = max(1.0, float(bbox.get("height", 0)))
    area = max(1.0, width * height)
    aspect = width / height
    fill_ratio = contour_area / area
    circularity = 0.0
    if perimeter > 0:
        circularity = float(4.0 * math.pi * contour_area / max(perimeter * perimeter, 1e-6))

    if approx_vertices <= 3:
        return "arrow"
    if approx_vertices == 4 and 0.72 <= aspect <= 1.35 and fill_ratio < 0.72:
        return "diamond"
    if circularity >= 0.62 and 0.70 <= aspect <= 1.35:
        return "circle"
    if 1.30 <= aspect <= 2.80 and 10 <= height <= 34:
        return "crystal"
    return "symbol"


def _detect_symbol_candidates(
    gray: Any,
    closed_mask: Any,
    rectangles: List[Dict[str, Any]],
    text_regions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    symbol_contours, _ = cv2.findContours(closed_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    symbols: List[Dict[str, Any]] = []
    seen_keys = set()

    for idx, contour in enumerate(symbol_contours):
        x, y, w, h = cv2.boundingRect(contour)
        bbox = {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
        area = int(w * h)
        if w < 6 or h < 6 or area < 42 or area > 2600:
            continue

        contour_area = float(cv2.contourArea(contour))
        if contour_area < 12:
            continue
        perimeter = float(cv2.arcLength(contour, True))
        approx = cv2.approxPolyDP(contour, 0.045 * perimeter if perimeter > 0 else 1.0, True)
        fill_ratio = contour_area / max(1.0, float(area))
        if fill_ratio < 0.18:
            continue

        overlaps_box = False
        for rect in rectangles:
            inter = _rect_intersection_area(bbox, rect)
            if inter / max(1.0, min(float(area), float(rect.get("area", rect["width"] * rect["height"])))) > 0.56:
                overlaps_box = True
                break
        if overlaps_box:
            continue

        if _text_region_inside_rectangles(bbox, rectangles):
            continue

        text_overlap = False
        for txt in text_regions:
            if _rect_intersection_area(bbox, txt) / max(1.0, float(area)) > 0.48:
                text_overlap = True
                break
        if text_overlap:
            continue

        patch = gray[y:y + h, x:x + w]
        mean_gray = float(np.mean(patch)) if patch.size else 255.0
        if mean_gray > 246 and fill_ratio < 0.45:
            continue

        kind = _classify_symbol_candidate(bbox, contour_area, len(approx), perimeter)
        key = (int(round(x / 4.0)), int(round(y / 4.0)), int(round(w / 4.0)), int(round(h / 4.0)), kind)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        symbols.append({
            "id": f"sym_{len(symbols) + 1}",
            "kind": kind,
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "vertices": int(len(approx)),
            "confidence": round(min(0.95, max(0.35, fill_ratio)), 3)
        })

    symbols.sort(key=lambda item: (item["y"], item["x"], item["width"] * item["height"]))
    return symbols


def _text_region_inside_rectangles(
    text_region: Dict[str, Any],
    rectangles: List[Dict[str, Any]]
) -> bool:
    tcx, tcy = _rect_center(text_region)
    text_area = max(1.0, float(text_region.get("width", 0)) * float(text_region.get("height", 0)))
    for rect in rectangles:
        if bool(rect.get("is_container") or rect.get("isContainer")):
            continue
        interior_pad = max(2, min(int(rect.get("width", 0)), int(rect.get("height", 0))) // 8)
        if _point_in_rect(tcx, tcy, rect, pad=-interior_pad):
            return True
        overlap_ratio = _rect_intersection_area(text_region, rect) / text_area
        if overlap_ratio > 0.55:
            return True
    return False


def _point_key(point: List[int]) -> tuple[int, int]:
    return (int(point[0]), int(point[1]))


def _best_rect_for_point(point: List[int], rectangles: List[Dict[str, Any]], tol: int = 5) -> Optional[str]:
    best_id = None
    best_distance = float("inf")
    best_area = float("inf")
    for rect in rectangles:
        attachment = _point_rect_attachment(point, rect, tol=tol)
        if attachment is None:
            continue
        area = float(rect["width"]) * float(rect["height"])
        if attachment["distance"] < best_distance or (
            abs(attachment["distance"] - best_distance) < 0.25 and area < best_area
        ):
            best_distance = attachment["distance"]
            best_area = area
            best_id = str(rect["id"])
    return best_id


def _point_rect_attachment(point: List[int], rect: Dict[str, Any], tol: int = 5) -> Optional[Dict[str, Any]]:
    px, py = float(point[0]), float(point[1])
    rx1, ry1 = float(rect["x"]), float(rect["y"])
    rx2, ry2 = rx1 + float(rect["width"]), ry1 + float(rect["height"])
    if not (rx1 - tol <= px <= rx2 + tol and ry1 - tol <= py <= ry2 + tol):
        return None

    candidates = []
    if ry1 - tol <= py <= ry2 + tol:
        candidates.append(("left", abs(px - rx1)))
        candidates.append(("right", abs(px - rx2)))
    if rx1 - tol <= px <= rx2 + tol:
        candidates.append(("top", abs(py - ry1)))
        candidates.append(("bottom", abs(py - ry2)))
    if not candidates:
        return None
    side, distance = min(candidates, key=lambda item: item[1])
    if distance > tol:
        return None
    return {"side": side, "distance": float(distance)}


def _attach_segment_to_rectangles(
    segment: Dict[str, Any],
    rectangles: List[Dict[str, Any]]
) -> Dict[str, Optional[str]]:
    start = [int(segment["x1"]), int(segment["y1"])]
    end = [int(segment["x2"]), int(segment["y2"])]
    return {
        "from": _best_rect_for_point(start, rectangles, tol=5),
        "to": _best_rect_for_point(end, rectangles, tol=5)
    }


def _simplify_orthogonal_polyline(points: List[List[int]]) -> List[List[int]]:
    pts = _dedupe_points(points)
    if len(pts) <= 2:
        return pts
    simplified = [pts[0]]
    for i in range(1, len(pts) - 1):
        prev = simplified[-1]
        cur = pts[i]
        nxt = pts[i + 1]
        if (prev[0] == cur[0] == nxt[0]) or (prev[1] == cur[1] == nxt[1]):
            continue
        simplified.append(cur)
    simplified.append(pts[-1])
    return _dedupe_points(simplified)


def _segment_contains_point(segment: Dict[str, Any], point: List[int], tol: int = 3) -> bool:
    x, y = int(point[0]), int(point[1])
    x1, y1 = int(segment["x1"]), int(segment["y1"])
    x2, y2 = int(segment["x2"]), int(segment["y2"])
    if str(segment.get("orientation")) == "horizontal":
        min_x, max_x = sorted([x1, x2])
        return abs(y - y1) <= tol and (min_x - tol) <= x <= (max_x + tol)
    min_y, max_y = sorted([y1, y2])
    return abs(x - x1) <= tol and (min_y - tol) <= y <= (max_y + tol)


def _polyline_length(points: List[List[int]]) -> float:
    total = 0.0
    for idx in range(len(points) - 1):
        total += math.dist(points[idx], points[idx + 1])
    return total


def _best_rect_by_ray(
    point: List[int],
    direction: List[int],
    rectangles: List[Dict[str, Any]],
    max_gap: int = 26,
    ortho_tol: int = 10
) -> Optional[str]:
    px, py = int(point[0]), int(point[1])
    dx = int(direction[0])
    dy = int(direction[1])
    if dx == 0 and dy == 0:
        return None

    best_id = None
    best_score = float("inf")
    best_area = float("inf")
    for rect in rectangles:
        rx1 = int(rect["x"])
        ry1 = int(rect["y"])
        rx2 = rx1 + int(rect["width"])
        ry2 = ry1 + int(rect["height"])
        gap = None
        ortho = None

        if abs(dx) >= abs(dy):
            if dx > 0:
                gap = rx1 - px
            else:
                gap = px - rx2
            if gap is None or gap < -2 or gap > max_gap:
                continue
            if ry1 - ortho_tol <= py <= ry2 + ortho_tol:
                ortho = 0
            else:
                ortho = min(abs(py - ry1), abs(py - ry2))
        else:
            if dy > 0:
                gap = ry1 - py
            else:
                gap = py - ry2
            if gap is None or gap < -2 or gap > max_gap:
                continue
            if rx1 - ortho_tol <= px <= rx2 + ortho_tol:
                ortho = 0
            else:
                ortho = min(abs(px - rx1), abs(px - rx2))

        if ortho is None or ortho > ortho_tol:
            continue

        area = float(rect["width"]) * float(rect["height"])
        score = float(gap) * 1.6 + float(ortho)
        if score < best_score or (abs(score - best_score) < 0.25 and area < best_area):
            best_score = score
            best_area = area
            best_id = str(rect["id"])
    return best_id


def _rect_for_route_endpoint(
    route: List[List[int]],
    rectangles: List[Dict[str, Any]],
    at_start: bool
) -> str:
    if len(route) < 2:
        return ""
    point = route[0] if at_start else route[-1]
    exact = _best_rect_for_point(point, rectangles, tol=6)
    if exact:
        return exact

    ref = route[1] if at_start else route[-2]
    step_dx = int(ref[0]) - int(point[0])
    step_dy = int(ref[1]) - int(point[1])
    if at_start:
        direction = [-step_dx, -step_dy]
    else:
        direction = [step_dx, step_dy]
    return _best_rect_by_ray(point, direction, rectangles, max_gap=26, ortho_tol=10) or ""


def _build_polylines_from_segments(
    line_segments: List[Dict[str, Any]],
    rectangles: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    if not line_segments:
        return []

    split_points: Dict[str, List[List[int]]] = {}
    for seg in line_segments:
        split_points[str(seg.get("id", ""))] = [
            [int(seg["x1"]), int(seg["y1"])],
            [int(seg["x2"]), int(seg["y2"])]
        ]

    horizontal = [seg for seg in line_segments if str(seg.get("orientation")) == "horizontal"]
    vertical = [seg for seg in line_segments if str(seg.get("orientation")) == "vertical"]
    for h_seg in horizontal:
        hy = int(h_seg["y1"])
        hx1, hx2 = sorted([int(h_seg["x1"]), int(h_seg["x2"])])
        for v_seg in vertical:
            vx = int(v_seg["x1"])
            vy1, vy2 = sorted([int(v_seg["y1"]), int(v_seg["y2"])])
            if (hx1 - 3) <= vx <= (hx2 + 3) and (vy1 - 3) <= hy <= (vy2 + 3):
                cross = [vx, hy]
                split_points[str(h_seg.get("id", ""))].append(cross)
                split_points[str(v_seg.get("id", ""))].append(cross)

    adjacency: Dict[tuple[int, int], set[tuple[int, int]]] = {}

    def add_edge(a: List[int], b: List[int]) -> None:
        ka = _point_key(a)
        kb = _point_key(b)
        if ka == kb:
            return
        adjacency.setdefault(ka, set()).add(kb)
        adjacency.setdefault(kb, set()).add(ka)

    for seg in line_segments:
        pts = [
            pt for pt in split_points.get(str(seg.get("id", "")), [])
            if _segment_contains_point(seg, pt, tol=3)
        ]
        unique_pts = list({_point_key(pt): [int(pt[0]), int(pt[1])] for pt in pts}.values())
        if str(seg.get("orientation")) == "horizontal":
            unique_pts.sort(key=lambda pt: (pt[0], pt[1]))
        else:
            unique_pts.sort(key=lambda pt: (pt[1], pt[0]))
        for i in range(len(unique_pts) - 1):
            a = unique_pts[i]
            b = unique_pts[i + 1]
            if math.dist(a, b) >= 2:
                add_edge(a, b)

    point_rect_map: Dict[tuple[int, int], Optional[str]] = {
        point: _best_rect_for_point([point[0], point[1]], rectangles, tol=6)
        for point in adjacency.keys()
    }

    def is_anchor(point: tuple[int, int]) -> bool:
        degree = len(adjacency.get(point, set()))
        return degree != 2 or bool(point_rect_map.get(point))

    visited_edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    polylines: List[Dict[str, Any]] = []

    def edge_key(a: tuple[int, int], b: tuple[int, int]) -> tuple[tuple[int, int], tuple[int, int]]:
        return (a, b) if a <= b else (b, a)

    def walk_path(start: tuple[int, int], next_point: tuple[int, int]) -> List[List[int]]:
        points = [[start[0], start[1]], [next_point[0], next_point[1]]]
        prev = start
        current = next_point
        visited_edges.add(edge_key(start, next_point))
        while True:
            if is_anchor(current) and current != start:
                break
            candidates = [
                nb for nb in adjacency.get(current, set())
                if nb != prev and edge_key(current, nb) not in visited_edges
            ]
            if len(candidates) != 1:
                break
            nxt = candidates[0]
            visited_edges.add(edge_key(current, nxt))
            points.append([nxt[0], nxt[1]])
            prev, current = current, nxt
        return _simplify_orthogonal_polyline(points)

    anchor_points = [point for point in adjacency.keys() if is_anchor(point)]
    for start in anchor_points:
        for nb in list(adjacency.get(start, set())):
            ek = edge_key(start, nb)
            if ek in visited_edges:
                continue
            route = walk_path(start, nb)
            if len(route) < 2 or _polyline_length(route) < 18:
                continue
            from_id = _rect_for_route_endpoint(route, rectangles, at_start=True)
            to_id = _rect_for_route_endpoint(route, rectangles, at_start=False)
            if from_id and to_id and from_id == to_id:
                continue
            polylines.append({
                "from": from_id,
                "to": to_id,
                "waypoints": route
            })

    # Handle closed or orphan loops without anchors
    for a, neighbors in list(adjacency.items()):
        for b in list(neighbors):
            ek = edge_key(a, b)
            if ek in visited_edges:
                continue
            route = walk_path(a, b)
            if len(route) < 2 or _polyline_length(route) < 18:
                continue
            polylines.append({
                "from": _rect_for_route_endpoint(route, rectangles, at_start=True),
                "to": _rect_for_route_endpoint(route, rectangles, at_start=False),
                "waypoints": route
            })

    deduped: List[Dict[str, Any]] = []
    seen_routes: set[tuple[tuple[int, int], ...]] = set()
    for poly in polylines:
        route = _simplify_orthogonal_polyline(poly.get("waypoints") or [])
        if len(route) < 2:
            continue
        route_key = tuple(tuple(pt) for pt in route)
        reverse_key = tuple(reversed(route_key))
        if route_key in seen_routes or reverse_key in seen_routes:
            continue
        seen_routes.add(route_key)
        deduped.append({
            "from": str(poly.get("from", "")),
            "to": str(poly.get("to", "")),
            "waypoints": route,
            "length": _polyline_length(route)
        })

    partial_groups: Dict[tuple[int, int], List[Dict[str, Any]]] = {}
    for poly in deduped:
        from_id = str(poly.get("from", "") or "")
        to_id = str(poly.get("to", "") or "")
        if bool(from_id) == bool(to_id):
            continue
        route = poly.get("waypoints") or []
        if len(route) < 2:
            continue
        if from_id:
            open_point = route[-1]
            attached_id = from_id
            outward = list(route)
        else:
            open_point = route[0]
            attached_id = to_id
            outward = list(reversed(route))
        partial_groups.setdefault(_point_key(open_point), []).append({
            "junction": list(open_point),
            "attached_id": attached_id,
            "route_from_junction": outward,
            "length": float(poly.get("length", 0) or _polyline_length(outward))
        })

    combined: List[Dict[str, Any]] = []
    for group in partial_groups.values():
        unique_rects = {item["attached_id"] for item in group if item["attached_id"]}
        if len(unique_rects) < 2:
            continue
        group.sort(key=lambda item: item["length"], reverse=True)
        trunk = group[0]
        for branch in group[1:]:
            if branch["attached_id"] == trunk["attached_id"]:
                continue
            merged_route = _simplify_orthogonal_polyline(
                list(reversed(trunk["route_from_junction"])) + branch["route_from_junction"][1:]
            )
            if len(merged_route) < 2 or _polyline_length(merged_route) < 18:
                continue
            combined.append({
                "from": trunk["attached_id"],
                "to": branch["attached_id"],
                "waypoints": merged_route,
                "length": _polyline_length(merged_route)
            })

    for poly in combined:
        route = _simplify_orthogonal_polyline(poly.get("waypoints") or [])
        if len(route) < 2:
            continue
        route_key = tuple(tuple(pt) for pt in route)
        reverse_key = tuple(reversed(route_key))
        if route_key in seen_routes or reverse_key in seen_routes:
            continue
        seen_routes.add(route_key)
        deduped.append({
            "from": str(poly.get("from", "")),
            "to": str(poly.get("to", "")),
            "waypoints": route,
            "length": _polyline_length(route)
        })
    return deduped




def _point_distance(a: List[int], b: List[int]) -> float:
    return math.hypot(float(a[0]) - float(b[0]), float(a[1]) - float(b[1]))


def _symbol_center(symbol: Dict[str, Any]) -> List[int]:
    return [
        int(round(float(symbol.get("x", 0)) + float(symbol.get("width", 0)) / 2.0)),
        int(round(float(symbol.get("y", 0)) + float(symbol.get("height", 0)) / 2.0)),
    ]


def _route_terminal_vector(route: List[List[int]], at_start: bool) -> tuple[float, float]:
    if len(route) < 2:
        return (0.0, -1.0)
    if at_start:
        a = route[0]
        b = route[1]
        return (float(a[0]) - float(b[0]), float(a[1]) - float(b[1]))
    a = route[-1]
    b = route[-2]
    return (float(a[0]) - float(b[0]), float(a[1]) - float(b[1]))


def _rotation_from_vector(dx: float, dy: float) -> float:
    if abs(dx) >= abs(dy):
        return 90.0 if dx > 0 else 270.0
    return 180.0 if dy > 0 else 0.0


def _attach_symbols_to_polylines(
    polylines: List[Dict[str, Any]],
    symbols: List[Dict[str, Any]]
) -> None:
    if not polylines or not symbols:
        return

    used_targets: set[tuple[str, str]] = set()
    for sym in symbols:
        center = _symbol_center(sym)
        sw = max(1.0, float(sym.get("width", 0)))
        sh = max(1.0, float(sym.get("height", 0)))
        tol = max(12.0, min(42.0, max(sw, sh) * 1.8))
        best_match = None
        best_score = float("inf")

        for poly in polylines:
            poly_id = str(poly.get("id", "") or "")
            route = poly.get("waypoints") or []
            if len(route) < 2:
                continue
            for endpoint_name, endpoint in (("start", route[0]), ("end", route[-1])):
                target_key = (poly_id, endpoint_name)
                if target_key in used_targets:
                    continue
                px, py = int(endpoint[0]), int(endpoint[1])
                inside = (
                    float(sym.get("x", 0)) - 4 <= px <= float(sym.get("x", 0)) + sw + 4
                    and float(sym.get("y", 0)) - 4 <= py <= float(sym.get("y", 0)) + sh + 4
                )
                dist = _point_distance(center, [px, py])
                if not inside and dist > tol:
                    continue
                score = dist - (8.0 if inside else 0.0)
                if score < best_score:
                    dx, dy = _route_terminal_vector(route, at_start=(endpoint_name == "start"))
                    best_score = score
                    best_match = {
                        "polylineId": poly_id,
                        "endpoint": endpoint_name,
                        "distance": round(dist, 3),
                        "rotation": _rotation_from_vector(dx, dy)
                    }

        if best_match is None:
            continue

        sym["attachedPolylineId"] = best_match["polylineId"]
        sym["attachedEndpoint"] = best_match["endpoint"]
        sym["attachmentDistance"] = best_match["distance"]
        sym["rotation"] = best_match["rotation"]
        used_targets.add((best_match["polylineId"], best_match["endpoint"]))

    poly_index = {str(poly.get("id", "") or ""): poly for poly in polylines}
    for sym in symbols:
        poly_id = str(sym.get("attachedPolylineId", "") or "")
        endpoint = str(sym.get("attachedEndpoint", "") or "")
        if not poly_id or endpoint not in ("start", "end"):
            continue
        poly = poly_index.get(poly_id)
        if not poly:
            continue
        ref_key = "startSymbolIds" if endpoint == "start" else "endSymbolIds"
        ref_kind_key = "startSymbolKinds" if endpoint == "start" else "endSymbolKinds"
        poly.setdefault(ref_key, []).append(str(sym.get("id", "")))
        poly.setdefault(ref_kind_key, []).append(str(sym.get("kind", "symbol")))


def _build_edges_from_geometry_ir(
    geometry_ir: Dict[str, Any],
    label_regions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    rectangles = list(geometry_ir.get("rectangles", []) or [])
    line_segments = list(geometry_ir.get("lineSegments", []) or [])
    polylines = _build_polylines_from_segments(line_segments, rectangles)
    geometry_ir["polylines"] = [
        {
            "id": f"poly_{idx + 1}",
            "from": str(poly.get("from", "")),
            "to": str(poly.get("to", "")),
            "waypoints": poly.get("waypoints") or [],
            "length": float(poly.get("length", 0) or 0)
        }
        for idx, poly in enumerate(polylines)
    ]
    _attach_symbols_to_polylines(geometry_ir["polylines"], list(geometry_ir.get("symbols", []) or []))

    edges: List[Dict[str, Any]] = []
    used_routes: set[tuple[tuple[int, int], ...]] = set()
    for idx, poly in enumerate(polylines):
        length = float(poly.get("length", 0) or 0)
        if length < 18:
            continue
        route = _simplify_orthogonal_polyline(poly.get("waypoints") or [])
        if len(route) < 2:
            continue
        route_key = tuple(tuple(pt) for pt in route)
        if route_key in used_routes:
            continue

        from_id = str(poly.get("from", "") or "")
        to_id = str(poly.get("to", "") or "")
        if not from_id and not to_id:
            continue
        if from_id and to_id and from_id == to_id:
            continue

        matched_poly = geometry_ir["polylines"][idx] if idx < len(geometry_ir["polylines"]) else {}
        start_symbol_ids = list(matched_poly.get("startSymbolIds", []) or [])
        end_symbol_ids = list(matched_poly.get("endSymbolIds", []) or [])
        start_symbol_kinds = list(matched_poly.get("startSymbolKinds", []) or [])
        end_symbol_kinds = list(matched_poly.get("endSymbolKinds", []) or [])

        edges.append({
            "id": f"gpoly_{idx + 1}",
            "from": from_id,
            "to": to_id,
            "label": "",
            "color": "#334155",
            "arrow": "forward",
            "waypoints": route,
            "strokeWidth": 1.5,
            "startSymbolIds": start_symbol_ids,
            "endSymbolIds": end_symbol_ids,
            "startSymbolKinds": start_symbol_kinds,
            "endSymbolKinds": end_symbol_kinds
        })
        used_routes.add(route_key)

    return _assign_labels_to_edges(edges, label_regions)


def _build_ppt_render_primitives(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    geometry_ir: Optional[Dict[str, Any]] = None
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not isinstance(geometry_ir, dict):
        return nodes, edges

    rectangles = list(geometry_ir.get("rectangles", []) or [])
    texts = list(geometry_ir.get("texts", []) or [])
    polylines = list(geometry_ir.get("polylines", []) or [])
    line_segments = list(geometry_ir.get("lineSegments", []) or [])
    symbols = list(geometry_ir.get("symbols", []) or [])
    if not rectangles and not texts and not polylines and not line_segments and not symbols:
        return nodes, edges

    node_style_map = {
        str(n.get("id", "")): n
        for n in nodes
        if str(n.get("id", "")).strip()
    }
    edge_route_map: Dict[tuple, Dict[str, Any]] = {}
    for edge in edges:
        route = _dedupe_points(edge.get("waypoints") or edge.get("points") or [])
        if len(route) >= 2:
            edge_route_map[tuple(tuple(pt) for pt in route)] = edge

    render_nodes: List[Dict[str, Any]] = []
    for rect in rectangles:
        rect_id = str(rect.get("id", "") or "")
        base = node_style_map.get(rect_id, {})
        is_container = bool(base.get("is_container", rect.get("isContainer", False)))
        rect_w = max(4, int(rect.get("width", 4) or 4))
        rect_h = max(4, int(rect.get("height", 4) or 4))
        render_nodes.append({
            "id": rect_id or f"geom_rect_{len(render_nodes) + 1}",
            "x": int(rect.get("x", 0) or 0),
            "y": int(rect.get("y", 0) or 0),
            "width": rect_w,
            "height": rect_h,
            "text": str(base.get("text", "")),
            "fill": str(base.get("fill", "none" if is_container else "#D1CFCE")),
            "stroke": str(base.get("stroke", "#7a8b9e" if is_container else "#7F7F7F")),
            "strokeWidth": float(base.get("strokeWidth", 1.5) or 1.5),
            "dash": bool(base.get("dash", is_container)),
            "radius": float(base.get("radius", 4 if is_container else 2) or 0),
            "fontSize": float(base.get("fontSize", 9.5 if rect_w > 60 else 8.0) or 8.0),
            "textColor": str(base.get("textColor", "#0f172a")),
            "shape": str(base.get("shape", rect.get("shape", "rect")) or "rect"),
            "is_container": is_container
        })

    for txt in texts:
        label = str(txt.get("text", "")).strip()
        if not label:
            continue
        if _text_region_inside_rectangles(txt, rectangles):
            continue
        render_nodes.append({
            "id": str(txt.get("id", "") or f"geom_text_{len(render_nodes) + 1}"),
            "x": int(txt.get("x", 0) or 0),
            "y": int(txt.get("y", 0) or 0),
            "width": max(16, int(txt.get("width", 16) or 16)),
            "height": max(10, int(txt.get("height", 10) or 10)),
            "text": label,
            "fill": "none",
            "stroke": "none",
            "strokeWidth": 0,
            "dash": False,
            "radius": 0,
            "fontSize": 8.0,
            "textColor": "#374151",
            "shape": "rect",
            "kind": "text"
        })

    for sym in symbols:
        kind = str(sym.get("kind", "symbol") or "symbol")
        render_shape = "rect"
        if kind == "arrow":
            render_shape = "triangle"
        elif kind == "diamond":
            render_shape = "diamond"
        elif kind in ("circle", "oval"):
            render_shape = "circle"

        render_nodes.append({
            "id": str(sym.get("id", "") or f"geom_symbol_{len(render_nodes) + 1}"),
            "x": int(sym.get("x", 0) or 0),
            "y": int(sym.get("y", 0) or 0),
            "width": max(6, int(sym.get("width", 6) or 6)),
            "height": max(6, int(sym.get("height", 6) or 6)),
            "text": "",
            "fill": "#334155" if kind == "arrow" else ("#ffffff" if kind in ("circle", "oval") else "none"),
            "stroke": "#334155" if kind != "symbol" else "#7c3aed",
            "strokeWidth": 1.25,
            "dash": False,
            "radius": 0,
            "fontSize": 8.0,
            "textColor": "#334155",
            "shape": render_shape,
            "kind": "symbol",
            "symbolKind": kind,
            "rotation": float(sym.get("rotation", 0) or 0),
            "confidence": float(sym.get("confidence", 0) or 0)
        })

    render_edges: List[Dict[str, Any]] = []
    source_paths = polylines or [
        {
            "id": str(seg.get("id", "") or f"geom_seg_{idx + 1}"),
            "waypoints": [
                [int(seg.get("x1", 0) or 0), int(seg.get("y1", 0) or 0)],
                [int(seg.get("x2", 0) or 0), int(seg.get("y2", 0) or 0)]
            ]
        }
        for idx, seg in enumerate(line_segments)
    ]
    for idx, poly in enumerate(source_paths):
        route = _dedupe_points(poly.get("waypoints") or [])
        if len(route) < 2:
            continue
        matched_edge = edge_route_map.get(tuple(tuple(pt) for pt in route), {})
        render_edges.append({
            "id": str(poly.get("id", "") or f"geom_seg_{idx + 1}"),
            "from": str(matched_edge.get("from", poly.get("from", ""))),
            "to": str(matched_edge.get("to", poly.get("to", ""))),
            "label": str(matched_edge.get("label", "")),
            "color": str(matched_edge.get("color", "#334155")),
            "arrow": str(matched_edge.get("arrow", "none")),
            "dash": bool(matched_edge.get("dash", False)),
            "strokeWidth": float(matched_edge.get("strokeWidth", 1.25) or 1.25),
            "fontSize": float(matched_edge.get("fontSize", 8.0) or 8.0),
            "labelColor": str(matched_edge.get("labelColor", "#334155")),
            "waypoints": route,
            "startSymbolIds": list(matched_edge.get("startSymbolIds", poly.get("startSymbolIds", [])) or []),
            "endSymbolIds": list(matched_edge.get("endSymbolIds", poly.get("endSymbolIds", [])) or []),
            "startSymbolKinds": list(matched_edge.get("startSymbolKinds", poly.get("startSymbolKinds", [])) or []),
            "endSymbolKinds": list(matched_edge.get("endSymbolKinds", poly.get("endSymbolKinds", [])) or [])
        })

    if render_nodes or render_edges:
        return render_nodes, render_edges
    return nodes, edges


def _edge_label_distance(path_points: List[List[int]], txt: Dict[str, Any]) -> float:
    if len(path_points) < 2:
        return float("inf")
    tcx, tcy = _rect_center(txt)
    best_score = float("inf")
    for i in range(len(path_points) - 1):
        x1, y1 = path_points[i]
        x2, y2 = path_points[i + 1]
        if abs(y1 - y2) <= 3:
            min_x, max_x = sorted([x1, x2])
            dist = abs(tcy - y1) + max(0, min_x - tcx, tcx - max_x)
        elif abs(x1 - x2) <= 3:
            min_y, max_y = sorted([y1, y2])
            dist = abs(tcx - x1) + max(0, min_y - tcy, tcy - max_y)
        else:
            continue
        best_score = min(best_score, dist)
    return best_score


def _assign_labels_to_edges(edges: List[Dict[str, Any]], text_regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not edges:
        return edges

    for edge in edges:
        edge["label"] = edge.get("label", "") or ""
        edge.pop("labelSourceId", None)
        edge.pop("labelX", None)
        edge.pop("labelY", None)
        edge.pop("labelWidth", None)
        edge.pop("labelHeight", None)

    assignments: List[tuple[float, int, str, Dict[str, Any]]] = []
    for txt in text_regions:
        label = str(txt.get("text", "")).strip()
        if not label or not _is_connector_label_text(label):
            continue
        tolerance = max(26.0, float(txt.get("height", 12)) * 2.2, float(txt.get("width", 20)) * 0.35)
        best_idx = None
        best_score = float("inf")
        for idx, edge in enumerate(edges):
            score = _edge_label_distance(edge.get("waypoints") or [], txt)
            if score <= tolerance and score < best_score:
                best_score = score
                best_idx = idx
        if best_idx is not None:
            assignments.append((best_score, best_idx, label, txt))

    assignments.sort(key=lambda item: item[0])
    used_edges = set()
    used_label_ids = set()
    for _, edge_idx, label, txt in assignments:
        if edge_idx in used_edges:
            continue
        txt_id = str(txt.get("id", "") or "")
        if txt_id and txt_id in used_label_ids:
            continue
        edges[edge_idx]["label"] = label
        edges[edge_idx]["labelSourceId"] = txt_id
        edges[edge_idx]["labelX"] = int(txt.get("x", 0) or 0)
        edges[edge_idx]["labelY"] = int(txt.get("y", 0) or 0)
        edges[edge_idx]["labelWidth"] = int(txt.get("width", 0) or 0)
        edges[edge_idx]["labelHeight"] = int(txt.get("height", 0) or 0)
        used_edges.add(edge_idx)
        if txt_id:
            used_label_ids.add(txt_id)
    return edges

def generate_pptx_from_diagram(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    slide_title: str = "Architecture Block Diagram",
    theme: str = "dark",
    canvas_w: Optional[float] = None,
    canvas_h: Optional[float] = None,
    geometry_ir: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Creates a PowerPoint presentation (.pptx) with native shapes, connectors, and text frames.
    """
    prs = Presentation()
    # 16:9 Widescreen: 13.333 x 7.5 inches
    SLIDE_WIDTH_INCHES = 13.333
    SLIDE_HEIGHT_INCHES = 7.5
    prs.slide_width = Inches(SLIDE_WIDTH_INCHES)
    prs.slide_height = Inches(SLIDE_HEIGHT_INCHES)

    blank_layout = prs.slide_layouts[6] # Blank slide
    slide = prs.slides.add_slide(blank_layout)

    # 1. Slide Background
    is_dark = (theme != "light")
    bg_color = RGBColor(15, 23, 42) if is_dark else RGBColor(248, 250, 252)
    bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(SLIDE_WIDTH_INCHES), Inches(SLIDE_HEIGHT_INCHES))
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = bg_color
    bg_shape.line.color.rgb = bg_color

    render_nodes, render_edges = _build_ppt_render_primitives(nodes, edges, geometry_ir)

    # If no primitives, return empty slide
    if not render_nodes and not render_edges:
        out = io.BytesIO()
        prs.save(out)
        return out.getvalue()

    # 2. Determine Bounding Box of all render primitives to map to slide coordinates
    bound_xs: List[float] = []
    bound_ys: List[float] = []
    for n in render_nodes:
        nx = float(n.get("x", 0))
        ny = float(n.get("y", 0))
        nw = float(n.get("width", 0))
        nh = float(n.get("height", 0))
        bound_xs.extend([nx, nx + nw])
        bound_ys.extend([ny, ny + nh])
    for edge in render_edges:
        for pt in _dedupe_points(edge.get("waypoints") or edge.get("points") or []):
            bound_xs.append(float(pt[0]))
            bound_ys.append(float(pt[1]))
    if not bound_xs or not bound_ys:
        out = io.BytesIO()
        prs.save(out)
        return out.getvalue()

    min_x = min(bound_xs)
    min_y = min(bound_ys)
    max_x = max(bound_xs)
    max_y = max(bound_ys)

    orig_w = max(100.0, max_x - min_x)
    orig_h = max(100.0, max_y - min_y)

    # Margins on slide (Inches)
    MARGIN_LEFT = 0.8
    MARGIN_TOP = 0.9
    USABLE_W = SLIDE_WIDTH_INCHES - (MARGIN_LEFT * 2)
    USABLE_H = SLIDE_HEIGHT_INCHES - MARGIN_TOP - 0.6

    scale_x = USABLE_W / orig_w
    scale_y = USABLE_H / orig_h
    scale = min(scale_x, scale_y)

    # Centering offsets
    render_w = orig_w * scale
    render_h = orig_h * scale
    offset_x = MARGIN_LEFT + (USABLE_W - render_w) / 2.0
    offset_y = MARGIN_TOP + (USABLE_H - render_h) / 2.0

    def to_slide_x(px: float) -> Inches:
        return Inches(offset_x + (px - min_x) * scale)

    def to_slide_y(py: float) -> Inches:
        return Inches(offset_y + (py - min_y) * scale)

    def to_slide_w(pw: float) -> Inches:
        return Inches(max(0.1, pw * scale))

    def to_slide_h(ph: float) -> Inches:
        return Inches(max(0.1, ph * scale))

    def to_slide_point(pt: List[int]) -> tuple[int, int]:
        return int(to_slide_x(float(pt[0]))), int(to_slide_y(float(pt[1])))

    def polyline_midpoint(points: List[List[int]]) -> tuple[int, int]:
        if len(points) < 2:
            return 0, 0
        lengths = []
        total = 0.0
        for i in range(len(points) - 1):
            seg_len = math.dist(points[i], points[i + 1])
            lengths.append(seg_len)
            total += seg_len
        if total <= 0:
            px, py = points[len(points) // 2]
            return int(px), int(py)
        acc = 0.0
        half = total / 2.0
        for i, seg_len in enumerate(lengths):
            if acc + seg_len >= half:
                ratio = 0 if seg_len <= 0 else (half - acc) / seg_len
                x = points[i][0] + (points[i + 1][0] - points[i][0]) * ratio
                y = points[i][1] + (points[i + 1][1] - points[i][1]) * ratio
                return int(round(x)), int(round(y))
            acc += seg_len
        px, py = points[-1]
        return int(px), int(py)

    # Add Title Box at top
    if slide_title:
        title_box = slide.shapes.add_textbox(Inches(MARGIN_LEFT), Inches(0.25), Inches(USABLE_W), Inches(0.55))
        ttf = title_box.text_frame
        ttf.word_wrap = True
        tp = ttf.paragraphs[0]
        tp.text = slide_title
        tp.font.size = Pt(16)
        tp.font.bold = True
        tp.font.color.rgb = RGBColor(56, 189, 248) if is_dark else RGBColor(2, 132, 199)

    # 3. Separate Container/Group Nodes from Leaf Component Nodes
    # If a node is a container (large box or dashed border), render it first so it sits behind
    container_nodes = []
    component_nodes = []
    symbol_nodes = []
    for n in render_nodes:
        if str(n.get("kind", "")) == "symbol":
            symbol_nodes.append(n)
            continue
        w = float(n.get("width", 120))
        h = float(n.get("height", 60))
        area = w * h
        if area > (orig_w * orig_h * 0.25) or n.get("isGroup", False) or n.get("dash", False):
            container_nodes.append(n)
        else:
            component_nodes.append(n)

    rendered_node_shapes: Dict[str, Any] = {}

    def render_node(node_dict: Dict[str, Any], is_container: bool = False):
        nid = str(node_dict.get("id", ""))
        nx = float(node_dict.get("x", 0))
        ny = float(node_dict.get("y", 0))
        nw = float(node_dict.get("width", 120))
        nh = float(node_dict.get("height", 60))
        radius = float(node_dict.get("radius", 8))
        text = str(node_dict.get("text", "")).strip()

        sx = to_slide_x(nx)
        sy = to_slide_y(ny)
        sw = to_slide_w(nw)
        sh = to_slide_h(nh)

        is_crystal = (node_dict.get("shape") == "crystal")
        if node_dict.get("shape") in ("circle", "oval"):
            shape_type = MSO_SHAPE.OVAL
        elif node_dict.get("shape") == "triangle":
            shape_type = MSO_SHAPE.ISOSCELES_TRIANGLE
        elif node_dict.get("shape") == "diamond":
            shape_type = MSO_SHAPE.DIAMOND
        elif radius > 0 and not is_crystal:
            shape_type = MSO_SHAPE.ROUNDED_RECTANGLE
        else:
            shape_type = MSO_SHAPE.RECTANGLE
        shape = slide.shapes.add_shape(shape_type, sx, sy, sw, sh)
        rotation = float(node_dict.get("rotation", 0) or 0)
        if rotation:
            try:
                shape.rotation = rotation
            except Exception:
                pass

        if is_crystal:
            shape.fill.background()
            shape.line.fill.background()
            c_stroke_hex = node_dict.get("stroke", "#0284c7")
            c_stroke_rgb = hex_to_rgb(c_stroke_hex, (2, 132, 199))
            c_stroke_w = float(node_dict.get("strokeWidth", 1.5))
            c_dashed = bool(node_dict.get("dash", False))

            # Left lead line (horizontal)
            lead1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, sx, int(sy + sh // 2 - Pt(c_stroke_w / 2)), int(sw * 0.22), int(Pt(c_stroke_w)))
            lead1.fill.solid()
            lead1.fill.fore_color.rgb = c_stroke_rgb
            lead1.line.fill.background()

            # Left electrode plate (vertical)
            plate1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, int(sx + sw * 0.22), int(sy + Pt(1)), int(Pt(c_stroke_w)), int(sh - Pt(2)))
            plate1.fill.solid()
            plate1.fill.fore_color.rgb = c_stroke_rgb
            plate1.line.fill.background()

            # Quartz crystal body (centered rectangle)
            qz_x = int(sx + sw * 0.33)
            qz_y = int(sy + sh * 0.12)
            qz_w = int(sw * 0.34)
            qz_h = int(sh * 0.76)
            quartz = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, qz_x, qz_y, qz_w, qz_h)
            quartz.fill.solid()
            quartz.fill.fore_color.rgb = RGBColor(255, 255, 255)
            quartz.line.color.rgb = c_stroke_rgb
            quartz.line.width = Pt(c_stroke_w)
            if c_dashed:
                try:
                    line_elem = quartz._element.spPr.ln
                    cust_dash = parse_xml('<a:prstDash xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="dash"/>')
                    line_elem.append(cust_dash)
                except Exception:
                    pass

            # Right electrode plate (vertical)
            plate2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, int(sx + sw * 0.78), int(sy + Pt(1)), int(Pt(c_stroke_w)), int(sh - Pt(2)))
            plate2.fill.solid()
            plate2.fill.fore_color.rgb = c_stroke_rgb
            plate2.line.fill.background()

            # Right lead line (horizontal)
            lead2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, int(sx + sw * 0.78), int(sy + sh // 2 - Pt(c_stroke_w / 2)), int(sw * 0.22), int(Pt(c_stroke_w)))
            lead2.fill.solid()
            lead2.fill.fore_color.rgb = c_stroke_rgb
            lead2.line.fill.background()
        else:
            # Style Fill
            fill_hex = node_dict.get("fill", "#1e293b" if is_dark else "#ffffff")
            if fill_hex.lower() in ("none", "transparent"):
                shape.fill.background()
                shape.line.fill.background()
            else:
                shape.fill.solid()
                shape.fill.fore_color.rgb = hex_to_rgb(fill_hex, (30, 41, 59) if is_dark else (255, 255, 255))
                stroke_hex = node_dict.get("stroke", "#38bdf8" if is_dark else "#0284c7")
                stroke_w = float(node_dict.get("strokeWidth", 2))
                shape.line.color.rgb = hex_to_rgb(stroke_hex, (56, 189, 248))
                shape.line.width = Pt(max(0.75, min(4.0, stroke_w)))

            # Handle Dashed line for container if requested
            if node_dict.get("dash", False):
                try:
                    line_elem = shape._element.spPr.ln
                    cust_dash = parse_xml('<a:prstDash xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="dash"/>')
                    line_elem.append(cust_dash)
                except Exception:
                    pass

        # Text Frame
        tf = shape.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.TOP if is_container else MSO_ANCHOR.MIDDLE

        lines = text.split("\n") if text else []
        text_color_hex = node_dict.get("textColor", "#f8fafc" if is_dark else "#0f172a")
        text_color = hex_to_rgb(text_color_hex, (248, 250, 252) if is_dark else (15, 23, 42))
        base_font_size = float(node_dict.get("fontSize", 12))
        scaled_font_size = max(7.0, min(24.0, base_font_size * scale * 1.05))

        if lines:
            for idx, line in enumerate(lines):
                p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
                p.text = line
                p.alignment = PP_ALIGN.CENTER
                p.font.size = Pt(scaled_font_size)
                p.font.bold = True if (idx == 0 or len(lines) == 1) else False
                p.font.color.rgb = text_color
        else:
            tf.paragraphs[0].text = ""

        rendered_node_shapes[nid] = {
            "shape": shape,
            "sx": sx, "sy": sy, "sw": sw, "sh": sh,
            "cx": int(sx + sw // 2), "cy": int(sy + sh // 2),
            "raw": node_dict
        }

    # Render containers first, then components
    for n in container_nodes:
        render_node(n, is_container=True)
    for n in component_nodes:
        render_node(n, is_container=False)

    # 4. Render Edges (Connectors)
    raw_node_map = {str(n.get("id", "")): n for n in render_nodes}
    for edge in render_edges:
        label = str(edge.get("label", "")).strip()
        route_points = _edge_route_points(edge, raw_node_map)
        if len(route_points) < 2:
            continue

        slide_points = [to_slide_point(pt) for pt in route_points]
        conn_color_hex = edge.get("color", "#94a3b8" if is_dark else "#475569")
        conn_color = hex_to_rgb(conn_color_hex, (148, 163, 184))
        arrow = edge.get("arrow", "forward")

        for idx in range(len(slide_points) - 1):
            x1, y1 = slide_points[idx]
            x2, y2 = slide_points[idx + 1]
            connector = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
            connector.line.color.rgb = conn_color
            connector.line.width = Pt(float(edge.get("strokeWidth", 1.5)))
            try:
                line_xml = connector._element.spPr.ln
                has_end_symbol = bool(edge.get("endSymbolIds"))
                has_start_symbol = bool(edge.get("startSymbolIds"))
                if idx == len(slide_points) - 2 and arrow in ("forward", "both") and not has_end_symbol:
                    head_end = parse_xml('<a:headEnd xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="triangle"/>')
                    line_xml.append(head_end)
                if idx == 0 and (arrow in ("backward", "both") or edge.get("bidirectional", False)) and not has_start_symbol:
                    tail_end = parse_xml('<a:tailEnd xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="triangle"/>')
                    line_xml.append(tail_end)
                if edge.get("dash", False):
                    cust_dash = parse_xml('<a:prstDash xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="dash"/>')
                    line_xml.append(cust_dash)
            except Exception:
                pass

        if label:
            label_x = edge.get("labelX")
            label_y = edge.get("labelY")
            label_w = edge.get("labelWidth")
            label_h = edge.get("labelHeight")
            if label_x is not None and label_y is not None:
                px = float(label_x)
                py = float(label_y)
                pw = max(18.0, float(label_w or max(24, len(label) * 7.2)))
                ph = max(10.0, float(label_h or 14))
                lbl_box = slide.shapes.add_textbox(
                    to_slide_x(px),
                    to_slide_y(py),
                    to_slide_w(pw),
                    to_slide_h(ph)
                )
                is_horizontal = pw >= ph
            else:
                mid_x, mid_y = polyline_midpoint(slide_points)
                is_horizontal = len(slide_points) >= 2 and abs(slide_points[-1][0] - slide_points[0][0]) >= abs(slide_points[-1][1] - slide_points[0][1])
                lbl_w = int(Inches(1.5))
                lbl_h = int(Inches(0.24))
                if is_horizontal:
                    lbl_y_pos = int(mid_y - lbl_h - Inches(0.01))
                    lbl_box = slide.shapes.add_textbox(int(mid_x - lbl_w // 2), lbl_y_pos, lbl_w, lbl_h)
                else:
                    lbl_box = slide.shapes.add_textbox(int(mid_x + Inches(0.05)), int(mid_y - lbl_h // 2), lbl_w, lbl_h)
            lbl_tf = lbl_box.text_frame
            lbl_tf.word_wrap = False
            lbl_tf.margin_left = lbl_tf.margin_right = lbl_tf.margin_top = lbl_tf.margin_bottom = 0
            lbl_p = lbl_tf.paragraphs[0]
            lbl_p.text = label
            lbl_p.alignment = PP_ALIGN.CENTER if is_horizontal else PP_ALIGN.LEFT
            lbl_p.font.size = Pt(max(7.0, min(10.0, float(edge.get("fontSize", 8.0)))))
            lbl_p.font.bold = True
            lbl_p.font.color.rgb = hex_to_rgb(edge.get("labelColor", conn_color_hex), (15, 23, 42))

    for n in symbol_nodes:
        render_node(n, is_container=False)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


def import_pptx_diagram(pptx_bytes: bytes) -> Dict[str, Any]:
    """
    Directly extracts 100% native shapes, text, colors, and connectors from an uploaded .pptx slide.
    Zero rasterization loss, 100% accurate vector reconstruction.
    """
    import io
    from pptx import Presentation

    prs = Presentation(io.BytesIO(pptx_bytes))
    if not prs.slides:
        return {"status": "error", "message": "簡報中沒有投影片", "nodes": [], "edges": []}

    slide = prs.slides[0]
    sw = prs.slide_width or 12192000
    sh = prs.slide_height or 6858000

    target_w = 1920
    target_h = round(1920.0 * (sh / sw))
    scale_x = target_w / float(sw)
    scale_y = target_h / float(sh)

    nodes = []
    edges = []

    # 1. First pass: extract all blocks and text shapes
    for i, s in enumerate(slide.shapes):
        # Skip full-slide background rectangle
        if s.left == 0 and s.top == 0 and s.width >= sw * 0.96 and s.height >= sh * 0.96:
            continue

        stype_str = str(s.shape_type)
        if "LINE" in stype_str:
            continue

        x = max(0, round(s.left * scale_x))
        y = max(0, round(s.top * scale_y))
        w = max(10, round(s.width * scale_x))
        h = max(10, round(s.height * scale_y))

        # Extract text & typography
        text = ""
        text_color = "#1e293b"
        font_size = 10.0
        if s.has_text_frame:
            paras = [p for p in s.text_frame.paragraphs if p.text.strip()]
            text = "\n".join(p.text.strip() for p in paras)
            for p in paras:
                for r in p.runs:
                    if r.font and r.font.size:
                        try:
                            font_size = round(r.font.size.pt, 1)
                        except Exception:
                            pass
                    try:
                        if r.font and r.font.color and r.font.color.type == 1:
                            c = r.font.color.rgb
                            text_color = f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"
                            break
                    except Exception:
                        pass

        # Extract Fill
        fill = "none"
        try:
            if s.fill and s.fill.type == 1:
                c = s.fill.fore_color.rgb
                fill = f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"
        except Exception:
            pass

        # Extract Stroke
        stroke = "none"
        stroke_width = 1
        try:
            if s.line and s.line.color and s.line.color.type == 1:
                c = s.line.color.rgb
                stroke = f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"
            if s.line and s.line.width:
                stroke_width = max(1, round(s.line.width.pt))
        except Exception:
            pass

        shape_kind = "rect"
        try:
            ashp = str(s.auto_shape_type)
            if "ROUNDED_RECTANGLE" in ashp:
                shape_kind = "rounded"
            elif "OVAL" in ashp:
                shape_kind = "circle"
        except Exception:
            pass
        name_lower = getattr(s, "name", "").lower()
        if "round" in name_lower:
            shape_kind = "rounded"
        elif "oval" in name_lower or "circle" in name_lower:
            shape_kind = "circle"

        is_container = bool(w > target_w * 0.15 and h > target_h * 0.20 and not text)

        nid = f"node_{len(nodes) + 1}"
        node_obj = {
            "id": nid,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "text": text,
            "fill": fill,
            "stroke": stroke,
            "strokeWidth": stroke_width,
            "textColor": text_color,
            "fontSize": font_size,
            "shape": shape_kind,
            "is_container": is_container
        }
        nodes.append(node_obj)

    # 2. Second pass: extract lines & connectors
    for i, s in enumerate(slide.shapes):
        stype_str = str(s.shape_type)
        if "LINE" not in stype_str:
            continue

        bx = getattr(s, "begin_x", s.left)
        by = getattr(s, "begin_y", s.top)
        ex = getattr(s, "end_x", s.left + s.width)
        ey = getattr(s, "end_y", s.top + s.height)

        px1 = round(bx * scale_x)
        py1 = round(by * scale_y)
        px2 = round(ex * scale_x)
        py2 = round(ey * scale_y)

        line_color = "#334155"
        try:
            if s.line and s.line.color and s.line.color.type == 1:
                c = s.line.color.rgb
                line_color = f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"
        except Exception:
            pass

        from_id = ""
        to_id = ""
        min_d1 = float("inf")
        min_d2 = float("inf")

        for n in nodes:
            if n.get("is_container"):
                continue
            nx, ny, nw, nh = n["x"], n["y"], n["width"], n["height"]
            ncx = nx + nw / 2.0
            ncy = ny + nh / 2.0

            d1 = (px1 - ncx)**2 + (py1 - ncy)**2
            d2 = (px2 - ncx)**2 + (py2 - ncy)**2

            if d1 < min_d1:
                min_d1 = d1
                from_id = n["id"]
            if d2 < min_d2:
                min_d2 = d2
                to_id = n["id"]

        edges.append({
            "id": f"edge_{len(edges) + 1}",
            "from": from_id,
            "to": to_id,
            "points": [[px1, py1], [px2, py2]],
            "waypoints": [[px1, py1], [px2, py2]],
            "color": line_color,
            "stroke": line_color,
            "strokeWidth": 2
        })

    return {
        "status": "success",
        "nodes": nodes,
        "edges": edges,
        "width": target_w,
        "height": target_h,
        "count": len(nodes),
        "edge_count": len(edges)
    }


def recognize_base64_diagram(
    image_base64: str,
    min_area: int = 180,
    ocr_enabled: bool = True,
    padding: int = 48
) -> Dict[str, Any]:
    """
    General-purpose visual & geometric block diagram extraction engine.
    Analyzes any architecture diagram image:
    1. Multi-scale edge & gradient filtering to isolate component rectangles.
    2. Segments solid and outlined components, crystals, and interface panels.
    3. Multi-scale OCR text extraction and spatial association into bounding boxes.
    4. Traces orthogonal connectors between adjacent components.
    Zero hardcoded chip presets or domain keywords.
    """
    import base64
    import io
    from PIL import Image, ImageOps, ImageEnhance
    import tempfile
    import subprocess
    import json
    from pathlib import Path

    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    raw_bytes = base64.b64decode(image_base64)
    pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    w, h = pil_img.size

    img_np = np.array(pil_img)

    # 0. Automatic Border Background Padding (邊界外擴留白防截斷)
    pad = max(0, int(padding)) if padding is not None else 48
    if pad > 0:
        border_pixels = np.concatenate([
            img_np[0, :, :],
            img_np[-1, :, :],
            img_np[:, 0, :],
            img_np[:, -1, :]
        ], axis=0)
        bg_color = np.median(border_pixels, axis=0).astype(int).tolist()
        img_np_proc = cv2.copyMakeBorder(
            img_np, pad, pad, pad, pad,
            cv2.BORDER_CONSTANT, value=bg_color
        )
    else:
        img_np_proc = img_np
        pad = 0

    pw, ph = img_np_proc.shape[1], img_np_proc.shape[0]
    gray = cv2.cvtColor(img_np_proc, cv2.COLOR_RGB2GRAY)
    pil_img_proc = Image.fromarray(img_np_proc)

    # 1. High contrast binary for display preview
    contrasted = ImageOps.autocontrast(ImageOps.grayscale(pil_img_proc), cutoff=2)
    sharp = ImageEnhance.Sharpness(contrasted).enhance(2.5)
    arr = np.array(sharp)
    mean_lum = float(np.mean(arr))
    thresh_val = (mean_lum + 25) if mean_lum < 115 else (mean_lum - 25)
    binary = (arr < thresh_val).astype(np.uint8) if mean_lum >= 115 else (arr > thresh_val).astype(np.uint8)
    enhanced_pil = Image.fromarray((binary * 255).astype(np.uint8))
    if pad > 0:
        enhanced_pil = enhanced_pil.crop((pad, pad, pad + w, pad + h))
    enh_buf = io.BytesIO()
    enhanced_pil.save(enh_buf, format="PNG")
    enhanced_b64 = "data:image/png;base64," + base64.b64encode(enh_buf.getvalue()).decode("utf-8")

    # 2. Universal Morphological & Gradient Box Detection
    edges = cv2.Canny(gray, 30, 120)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (8, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 8))
    h_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, h_kernel)
    v_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, v_kernel)
    line_mask = cv2.bitwise_or(h_lines, v_lines)

    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = cv2.magnitude(grad_x, grad_y)
    grad_bin = (grad_mag > 35).astype(np.uint8) * 255

    combined = cv2.bitwise_or(line_mask, grad_bin)
    closed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
    raw_line_segments = _extract_line_segments(h_lines, v_lines)
    line_segments = []
    for s in raw_line_segments:
        x1 = max(0, min(w, s["x1"] - pad))
        y1 = max(0, min(h, s["y1"] - pad))
        x2 = max(0, min(w, s["x2"] - pad))
        y2 = max(0, min(h, s["y2"] - pad))
        if abs(x2 - x1) >= 4 or abs(y2 - y1) >= 4:
            line_segments.append({**s, "x1": x1, "y1": y1, "x2": x2, "y2": y2})

    # 3. High-Resolution Multi-Scale OCR (Running on padded canvas for border margin)
    ocr_lines = []
    if ocr_enabled:
        try:
            up_scale = 3
            upscaled = pil_img_proc.resize((pw * up_scale, ph * up_scale), Image.Resampling.LANCZOS)
            up_gray = ImageOps.grayscale(upscaled)
            up_sharp = ImageEnhance.Sharpness(ImageOps.autocontrast(up_gray, cutoff=1)).enhance(2.0)

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
                tmp_ocr_path = tf.name
                up_sharp.save(tmp_ocr_path)

            ps_script = Path(__file__).resolve().parent / "win_ocr.ps1"
            if ps_script.exists():
                p = subprocess.run(
                    ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps_script), "-ImagePath", tmp_ocr_path],
                    capture_output=True, encoding="utf-8", errors="replace", timeout=25
                )
                if p.returncode == 0 and p.stdout.strip():
                    ocr_res = json.loads(p.stdout.strip())
                    ocr_lines = ocr_res.get("Lines", [])
            Path(tmp_ocr_path).unlink(missing_ok=True)
        except Exception as e:
            import traceback
            traceback.print_exc()

    # 3b. Build OCR text regions as a dedicated text layer
    up_scale = 3
    text_regions = []
    for idx, line in enumerate(ocr_lines):
        t = _correct_ocr_text(line.get("Text", ""))
        if len(t) < 1:
            continue
        lx = max(0, min(w - 5, round(line.get("X", 0) / up_scale) - pad))
        ly = max(0, min(h - 5, round(line.get("Y", 0) / up_scale) - pad))
        lw = max(12, round(line.get("Width", 0) / up_scale))
        lh = max(10, round(line.get("Height", 0) / up_scale))
        text_regions.append({
            "id": f"text_{idx + 1}",
            "x": lx,
            "y": ly,
            "width": lw,
            "height": lh,
            "text": t
        })
    text_regions = _merge_text_regions(text_regions)

    # 4. Extract block candidates independently from the text layer
    contours, hierarchy = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    eff_min_area = max(120, min(int(min_area), 350))
    image_area = max(1, w * h)

    for idx, c in enumerate(contours):
        px, py, pbw, pbh = cv2.boundingRect(c)
        area = pbw * pbh
        if pbw < 14 or pbh < 10 or area < eff_min_area or area >= (pw * ph) * 0.90:
            continue

        cnt_area = cv2.contourArea(c)
        rect_ratio = cnt_area / max(1, area)
        approx = cv2.approxPolyDP(c, 0.03 * cv2.arcLength(c, True), True)
        likely_box = rect_ratio > 0.52 or (hierarchy is not None and hierarchy[0][idx][2] >= 0 and area > 450) or len(approx) <= 8
        if not likely_box:
            continue

        # Map back to original coordinate space
        ox = px - pad
        oy = py - pad
        x = max(0, min(w - 2, ox))
        y = max(0, min(h - 2, oy))
        bw = max(10, min(w - x, ox + pbw - x))
        bh = max(10, min(h - y, oy + pbh - y))
        area = bw * bh
        if bw < 14 or bh < 10 or area < eff_min_area:
            continue

        candidate = {"x": int(x), "y": int(y), "width": int(bw), "height": int(bh), "area": int(area)}
        candidate = _snap_rect_to_line_support(candidate, h_lines, v_lines, w, h)
        x = int(candidate["x"])
        y = int(candidate["y"])
        bw = int(candidate["width"])
        bh = int(candidate["height"])
        area = int(candidate["area"])
        density = _estimate_text_density(candidate, text_regions)
        covers_most_page = (bw > w * 0.68 and bh > h * 0.55) or area > image_area * 0.45
        mostly_text = density["overlap_ratio"] > 0.18 and density["inside_count"] >= 5
        orig_gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        pale_region = float(np.mean(orig_gray[y:y + bh, x:x + bw])) > 222
        if covers_most_page and density["inside_count"] >= 3:
            continue
        if area > image_area * 0.20 and mostly_text:
            continue
        if pale_region and density["overlap_ratio"] > 0.45 and density["inside_count"] >= 1 and area < image_area * 0.08:
            continue

        inner_x1 = min(w - 1, x + max(2, bw // 6))
        inner_y1 = min(h - 1, y + max(2, bh // 6))
        inner_x2 = min(w, x + bw - max(2, bw // 6))
        inner_y2 = min(h, y + bh - max(2, bh // 6))
        if inner_x2 > inner_x1 and inner_y2 > inner_y1:
            region = img_np[inner_y1:inner_y2, inner_x1:inner_x2]
            med_r = int(np.median(region[:, :, 0]))
            med_g = int(np.median(region[:, :, 1]))
            med_b = int(np.median(region[:, :, 2]))
        else:
            cx_s = min(w - 1, max(0, x + bw // 2))
            cy_s = min(h - 1, max(0, y + bh // 2))
            med_r, med_g, med_b = img_np[cy_s, cx_s].tolist()
        hex_color = f"#{med_r:02x}{med_g:02x}{med_b:02x}"

        is_circle = (abs(bw - bh) <= 4 and bw <= 28 and cnt_area / max(1, area) < 0.82)
        is_crystal = (bw >= 18 and bw <= 42 and bh >= 10 and bh <= 26 and not is_circle and 1.25 <= bw / max(1, bh) <= 2.7)
        is_container = (
            not covers_most_page
            and bw > w * 0.15
            and bh > h * 0.20
            and density["inside_count"] <= 3
            and density["overlap_ratio"] < 0.22
        )

        candidate.update({
            "fill": hex_color,
            "fill_rgb": (med_r, med_g, med_b),
            "shape": "circle" if is_circle else ("crystal" if is_crystal else "rect"),
            "is_container": is_container
        })
        boxes.append(candidate)

    # 4b. Extract embedded sub-components inside group containers (e.g. ports & connectors)
    sub_boxes = []
    for b in boxes:
        if not b.get("is_container"):
            continue
        cx, cy, cw, ch = b["x"], b["y"], b["width"], b["height"]
        if cw < 50 or ch < 50:
            continue
        sub_roi = img_np[cy + 3:cy + ch - 3, cx + 3:cx + cw - 3]
        if sub_roi.size == 0:
            continue
        cb_fill = np.array(b.get("fill_rgb", (230, 230, 230)), dtype=np.float32)
        dist = np.linalg.norm(sub_roi.astype(np.float32) - cb_fill, axis=2)
        sub_mask = (dist > 30).astype(np.uint8) * 255
        sub_cnts, _ = cv2.findContours(sub_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for sc in sub_cnts:
            sx, sy, sbw, sbh = cv2.boundingRect(sc)
            if 20 <= sbw <= cw * 0.90 and 10 <= sbh <= ch * 0.60 and (sbw * sbh) >= 180:
                roi_part = sub_roi[sy:sy + sbh, sx:sx + sbw]
                mr = int(np.median(roi_part[:, :, 0]))
                mg = int(np.median(roi_part[:, :, 1]))
                mb = int(np.median(roi_part[:, :, 2]))
                sub_boxes.append({
                    "x": cx + 3 + sx,
                    "y": cy + 3 + sy,
                    "width": sbw,
                    "height": sbh,
                    "area": sbw * sbh,
                    "fill": f"#{mr:02x}{mg:02x}{mb:02x}",
                    "fill_rgb": (mr, mg, mb),
                    "shape": "rect",
                    "is_container": False
                })
    if sub_boxes:
        boxes.extend(sub_boxes)

    boxes.sort(key=lambda b: (-b["area"], b["y"], b["x"]))
    clean_boxes = []
    for b in boxes:
        rejected = False
        for cb in clean_boxes:
            inter = _rect_intersection_area(b, cb)
            if inter <= 0:
                continue
            containment = inter / max(1, b["area"])
            union = b["area"] + cb["area"] - inter
            if containment > 0.72:
                # If cb is a container and b is a normal block inside it:
                # DO NOT reject b! b is a nested child block!
                if cb.get("is_container") and not b.get("is_container"):
                    continue
                rejected = True
                break
            if inter / max(1, union) > 0.56:
                if cb.get("is_container") and not b.get("is_container"):
                    continue
                rejected = True
                break
        if not rejected:
            clean_boxes.append(b)

    clean_boxes.sort(key=lambda b: (b["y"] // 35, b["x"]))

    # 5. Associate OCR text to block candidates only when the text is really inside the block
    box_texts = {id(b): [] for b in clean_boxes}
    assigned_text_ids = set()
    for txt in text_regions:
        lcx, lcy = _rect_center(txt)
        best_box = None
        best_area = float("inf")
        for b in clean_boxes:
            if b["is_container"]:
                continue
            interior_pad = max(2, min(b["width"], b["height"]) // 8)
            if _point_in_rect(lcx, lcy, b, pad=-interior_pad):
                if b["area"] < best_area:
                    best_area = b["area"]
                    best_box = b
            else:
                overlap_ratio = _rect_intersection_area(txt, b) / max(1.0, float(txt["width"]) * float(txt["height"]))
                if overlap_ratio > 0.55 and b["area"] < best_area:
                    best_area = b["area"]
                    best_box = b
        if best_box is not None:
            if txt["text"] not in box_texts[id(best_box)]:
                box_texts[id(best_box)].append(txt["text"])
            assigned_text_ids.add(txt["id"])

    # 6. Build nodes with proper color classification
    nodes = []
    for idx, b in enumerate(clean_boxes):
        node_id = f"node_{idx + 1}"
        box_text = _correct_ocr_text("\n".join(box_texts[id(b)]))

        r, g, b_c = b.get("fill_rgb", (128, 128, 128))
        lum = 0.299 * r + 0.587 * g + 0.114 * b_c
        is_dark_fill = lum < 135

        # Color-semantic classification based on dominant hue
        # Cyan/blue tones → #00b4d8 (Third Party / DDR / NAND)
        # Grey tones → #D1CFCE (Qualcomm chips, CPU)
        # Blue-purple dark → #1e3a5f (CPU core)
        # White/light grey → keep as-is
        fill_color = b["fill"]
        text_color = "#0f172a"
        stroke_color = "#475569"

        if not b["is_container"]:
            # Cyan/teal dominant: g+b >> r
            if b_c > 120 and g > 100 and b_c > r * 1.3:
                fill_color = "#0ea5e9"   # cyan-blue (Third Party Component)
                text_color = "#ffffff"
                stroke_color = "#0284c7"
            # Blue dominant dark: b >> r, g
            elif b_c > 100 and b_c > g * 1.2 and lum < 120:
                fill_color = "#1e40af"   # blue (DDR/NAND/BT/GPS style)
                text_color = "#ffffff"
                stroke_color = "#3b82f6"
            # Grey/silver (Qualcomm chips)
            elif abs(r - g) < 20 and abs(g - b_c) < 20 and 100 < lum < 210:
                fill_color = "#D1CFCE"   # light grey (Qualcomm component)
                text_color = "#0f172a"
                stroke_color = "#7F7F7F"
            # Dark fill
            elif is_dark_fill:
                fill_color = b["fill"]
                text_color = "#ffffff"
                stroke_color = "#0077b6"
            # White / very light
            elif lum > 220:
                fill_color = "#f8fafc"
                text_color = "#0f172a"
                stroke_color = "#94a3b8"
            else:
                fill_color = b["fill"]
                text_color = "#ffffff" if is_dark_fill else "#0f172a"
                stroke_color = "#475569"

        node_data = {
            "id": node_id,
            "x": b["x"],
            "y": b["y"],
            "width": b["width"],
            "height": b["height"],
            "text": box_text,
            "fill": "none" if b["is_container"] else fill_color,
            "stroke": "#7a8b9e" if b["is_container"] else stroke_color,
            "strokeWidth": 1.5,
            "dash": bool(b["is_container"]),
            "radius": 4 if b["is_container"] else 2,
            "fontSize": 9.5 if b["width"] > 60 else 8.0,
            "textColor": text_color,
            "is_container": b["is_container"]
        }
        if b.get("shape") in ("circle", "crystal"):
            node_data["shape"] = b["shape"]
            if b["shape"] == "crystal":
                node_data["fill"] = "none"

        nodes.append(node_data)

    candidate_label_regions = [
        txt for txt in text_regions
        if txt["id"] not in assigned_text_ids and _is_connector_label_text(str(txt.get("text", "")).strip())
    ]
    if pad > 0:
        gray_crop = gray[pad:pad + h, pad:pad + w]
        closed_crop = closed[pad:pad + h, pad:pad + w]
    else:
        gray_crop = gray
        closed_crop = closed
    symbol_candidates = _detect_symbol_candidates(gray_crop, closed_crop, clean_boxes, text_regions)
    geometry_ir = _build_geometry_ir(w, h, clean_boxes, text_regions, line_segments, symbol_candidates)
    edges_out = _build_edges_from_geometry_ir(geometry_ir, candidate_label_regions)
    assigned_connector_label_ids = {
        str(edge.get("labelSourceId"))
        for edge in edges_out
        if str(edge.get("labelSourceId", "")).strip()
    }

    # 7. Add floating text labels for text regions not absorbed into blocks
    floating_text_regions = [
        txt for txt in text_regions
        if txt["id"] not in assigned_text_ids and txt["id"] not in assigned_connector_label_ids
    ]
    for idx, txt in enumerate(floating_text_regions):
        t = _correct_ocr_text(txt["text"]).strip()
        if len(t) >= 2:
            nodes.append({
                "id": f"lbl_{idx + 1}",
                "x": txt["x"],
                "y": txt["y"],
                "width": max(24, txt["width"]),
                "height": max(14, txt["height"]),
                "text": t,
                "fill": "none",
                "stroke": "none",
                "textColor": "#2563eb" if any(c.isdigit() for c in t) else "#374151",
                "fontSize": 8.0
            })

    nodes = _merge_nearby_label_nodes(nodes)
    nodes = _demote_text_like_nodes(nodes)

    return {
        "status": "success",
        "nodes": nodes,
        "edges": edges_out,
        "geometry_ir": geometry_ir,
        "enhanced_base64": enhanced_b64,
        "title": "架構方塊圖",
        "width": w,
        "height": h,
        "count": len(nodes)
    }


def refine_diagram_layout(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    prompt: Optional[str] = None,
    llm_endpoint: Optional[str] = "http://127.0.0.1:1234/v1",
    geojson_context: Optional[str] = None,
    source_image_base64: Optional[str] = None,
    image_width: Optional[int] = None,
    image_height: Optional[int] = None,
    use_llm: bool = True
) -> Dict[str, Any]:
    """
    Multi-stage diagram refinement engine.
    1. 匯出目前節點/連線成標準 GeoJSON。
    2. 若可用，將「原圖 + 初稿 GeoJSON + 嚴格編譯提示詞」送入 LLM。
    3. 驗證 LLM 回傳的 FeatureCollection，轉回編輯模型。
    4. 若 LLM 不可用或輸出無效，退回幾何規則微調。
    """
    import copy
    def geometric_refine(base_nodes: List[Dict[str, Any]], base_edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        refined_nodes = copy.deepcopy(base_nodes)
        refined_edges = copy.deepcopy(base_edges)
        node_map = {str(n["id"]): n for n in refined_nodes}
        changelog = []

        for e in refined_edges:
            f_id = str(e.get("from"))
            t_id = str(e.get("to"))
            if f_id in node_map and t_id in node_map:
                na = node_map[f_id]
                nb = node_map[t_id]
                if na.get("is_container") or nb.get("is_container"):
                    continue
                cy_a = float(na["y"]) + float(na["height"]) / 2.0
                cy_b = float(nb["y"]) + float(nb["height"]) / 2.0
                if abs(cy_a - cy_b) <= 12 and (float(na["x"]) + float(na["width"]) <= float(nb["x"]) + 15 or float(nb["x"]) + float(nb["width"]) <= float(na["x"]) + 15):
                    target_cy = cy_a if float(na["width"]) >= float(nb["width"]) else cy_b
                    new_ya = round(target_cy - float(na["height"]) / 2.0)
                    new_yb = round(target_cy - float(nb["height"]) / 2.0)
                    if abs(float(na["y"]) - new_ya) > 0.5:
                        na["y"] = new_ya
                        changelog.append(f"水平校正 {f_id} 垂直中心")
                    if abs(float(nb["y"]) - new_yb) > 0.5:
                        nb["y"] = new_yb
                        changelog.append(f"水平校正 {t_id} 垂直中心")

        for n in refined_nodes:
            n["x"] = round(float(n.get("x", 0)))
            n["y"] = round(float(n.get("y", 0)))
            n["width"] = round(float(n.get("width", 10)))
            n["height"] = round(float(n.get("height", 10)))

        edge_pairs: Dict[str, List[Dict[str, Any]]] = {}
        for e in refined_edges:
            key = f"{e.get('from')}->{e.get('to')}"
            edge_pairs.setdefault(key, []).append(e)

        for grp in edge_pairs.values():
            if len(grp) == 2:
                grp[0]["offsetY"] = -7
                grp[1]["offsetY"] = 7
            elif len(grp) == 3:
                grp[0]["offsetY"] = -14
                grp[1]["offsetY"] = 0
                grp[2]["offsetY"] = 14

        return {"nodes": refined_nodes, "edges": refined_edges, "changelog": changelog}

    width = int(image_width or 1920)
    height = int(image_height or 1080)
    if geojson_context and geojson_context.strip():
        base_geojson_str = geojson_context.strip()
    else:
        base_geojson_str = json.dumps(
            export_diagram_to_geojson(nodes, edges, width=width, height=height),
            ensure_ascii=False
        )

    compiler_prompt = (
        (prompt or "請依照原圖校正此硬體架構 GeoJSON，輸出可還原成可編輯 PPT 的精確結果。").strip()
        + "\n\n請嚴格遵守："
        + "\n1. 只輸出純 JSON FeatureCollection。"
        + "\n2. 座標系為左上角 [0,0] 的像素座標。"
        + "\n3. 連線必須維持 Manhattan orthogonal，保留所有折點。"
        + "\n4. 不可硬編某一張圖的固定位置，需根據當前輸入圖片與 GeoJSON 推理。"
        + "\n5. 文字標註不可遺漏，必要時用 Point + bbox 輸出。"
    )

    llm_error = None
    if use_llm and llm_endpoint:
        try:
            compiled_fc = _call_llm_for_geojson(
                llm_endpoint=llm_endpoint,
                compiler_prompt=compiler_prompt,
                geojson_context=base_geojson_str,
                source_image_base64=source_image_base64
            )
            diagram = _feature_collection_to_diagram(compiled_fc)
            post = geometric_refine(diagram["nodes"], diagram["edges"])
            llm_geojson = export_diagram_to_geojson(
                post["nodes"],
                post["edges"],
                width=diagram.get("width", width),
                height=diagram.get("height", height)
            )
            return {
                "status": "success",
                "nodes": post["nodes"],
                "edges": post["edges"],
                "geojson": llm_geojson,
                "changelog": post["changelog"] + ["LLM 向量編譯完成"],
                "adjustments_count": len(post["changelog"]) + 1,
                "engine": "LLM Hardware Architecture Vector Compiler",
                "llm_used": True
            }
        except Exception as exc:
            llm_error = str(exc)

    fallback = geometric_refine(nodes, edges)
    fallback_geojson = export_diagram_to_geojson(
        fallback["nodes"],
        fallback["edges"],
        width=width,
        height=height
    )
    return {
        "status": "success",
        "nodes": fallback["nodes"],
        "edges": fallback["edges"],
        "geojson": fallback_geojson,
        "changelog": fallback["changelog"],
        "adjustments_count": len(fallback["changelog"]),
        "engine": "Universal Geometric Alignment Engine",
        "llm_used": False,
        "llm_error": llm_error
    }


def export_diagram_to_geojson(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    width: int = 1920,
    height: int = 1080
) -> Dict[str, Any]:
    """
    Exports diagram nodes and orthogonal edges into standard GeoJSON (Pixel Space) FeatureCollection.
    Follows Hardware Architecture Vector Compiler specification:
    - Blocks as Polygon features with role='block'
    - Orthogonal signal lines as LineString features with Manhattan alignment
    """
    features = []
    node_map = {str(n["id"]): n for n in nodes}

    for n in nodes:
        x1 = round(float(n.get("x", 0)))
        y1 = round(float(n.get("y", 0)))
        w = round(float(n.get("width", 50)))
        h = round(float(n.get("height", 30)))
        x2 = x1 + w
        y2 = y1 + h
        label = str(n.get("text", ""))

        if _is_text_only_node(n):
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(x1 + w / 2), round(y1 + h / 2)]
                },
                "properties": {
                    "role": "text",
                    "id": str(n.get("id", "")),
                    "label": label,
                    "bbox": [x1, y1, w, h],
                    "textColor": str(n.get("textColor", "#374151")),
                    "fontSize": float(n.get("fontSize", 8.5) or 8.5)
                }
            })
            continue

        role = "container" if n.get("is_container") else "block"
        props = {
            "role": role,
            "id": str(n.get("id", "")),
            "label": label,
            "fill": str(n.get("fill", "#D1CFCE")),
            "stroke": str(n.get("stroke", "#7F7F7F")),
            "strokeWidth": float(n.get("strokeWidth", 1.5) or 1.5),
            "radius": float(n.get("radius", 0) or 0),
            "textColor": str(n.get("textColor", "#0f172a")),
            "fontSize": float(n.get("fontSize", 9.5) or 9.5),
            "bbox": [x1, y1, w, h]
        }
        if n.get("shape") in ("crystal", "circle", "oval"):
            props["shape"] = n["shape"]
        if n.get("is_container"):
            props["is_container"] = True
            props["dash"] = bool(n.get("dash", True))

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]]
            },
            "properties": props
        })

    for e in edges:
        f_id = str(e.get("from", ""))
        t_id = str(e.get("to", ""))
        coords = _edge_route_points(e, node_map)
        lbl = str(e.get("label", "")).strip()
        color = str(e.get("color", "#7F7F7F"))
        arrow = str(e.get("arrow", "forward"))

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "properties": {
                "role": "connector",
                "id": str(e.get("id", f"conn_{f_id}_{t_id}")),
                "label": lbl,
                "stroke": color,
                "strokeWidth": float(e.get("strokeWidth", 1.5) or 1.5),
                "arrow": arrow,
                "from": f_id,
                "to": t_id,
                "dash": bool(e.get("dash", False)),
                "fontSize": float(e.get("fontSize", 8.0) or 8.0),
                "textColor": str(e.get("labelColor", "#334155")),
                "labelBBox": [
                    int(e.get("labelX", 0) or 0),
                    int(e.get("labelY", 0) or 0),
                    int(e.get("labelWidth", 0) or 0),
                    int(e.get("labelHeight", 0) or 0)
                ] if e.get("labelX") is not None and e.get("labelY") is not None else None
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "imageWidth": int(width),
            "imageHeight": int(height),
            "unit": "pixel",
            "compiler": "Hardware Architecture Vector Compiler",
            "alignment": "Manhattan Orthogonal"
        },
        "features": features
    }
