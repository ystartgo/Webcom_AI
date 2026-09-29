"""
Webcom AI - Native PowerPoint (.pptx) Diagram Engine
Converts flowchart and architecture block diagram graph data (nodes & edges)
into genuine, 100% native Microsoft PowerPoint (.pptx) shapes and connectors.
No SVGs, no raster bitmaps - full native Office Open XML shapes (p:sp, p:cxnSp, p:txBody).
"""

import io
from typing import List, Dict, Any, Optional
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

def generate_pptx_from_diagram(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    slide_title: str = "Architecture Block Diagram",
    theme: str = "dark",
    canvas_w: Optional[float] = None,
    canvas_h: Optional[float] = None
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

    # If no nodes, return empty slide
    if not nodes:
        out = io.BytesIO()
        prs.save(out)
        return out.getvalue()

    # 2. Determine Bounding Box of all nodes to map to slide coordinates
    min_x = min(float(n.get("x", 0)) for n in nodes)
    min_y = min(float(n.get("y", 0)) for n in nodes)
    max_x = max(float(n.get("x", 0)) + float(n.get("width", 120)) for n in nodes)
    max_y = max(float(n.get("y", 0)) + float(n.get("height", 60)) for n in nodes)

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
    for n in nodes:
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

        shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius > 0 else MSO_SHAPE.RECTANGLE
        shape = slide.shapes.add_shape(shape_type, sx, sy, sw, sh)

        # Style Fill
        fill_hex = node_dict.get("fill", "#1e293b" if is_dark else "#ffffff")
        shape.fill.solid()
        shape.fill.fore_color.rgb = hex_to_rgb(fill_hex, (30, 41, 59) if is_dark else (255, 255, 255))

        # Style Stroke
        stroke_hex = node_dict.get("stroke", "#38bdf8" if is_dark else "#0284c7")
        stroke_w = float(node_dict.get("strokeWidth", 2))
        shape.line.color.rgb = hex_to_rgb(stroke_hex, (56, 189, 248))
        shape.line.width = Pt(max(1.0, min(5.0, stroke_w)))

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
        # Scale font proportionally to slide dimensions
        scaled_font_size = max(8.0, min(24.0, base_font_size * scale * 1.05))

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
            "cx": sx + sw / 2, "cy": sy + sh / 2,
            "raw": node_dict
        }

    # Render containers first, then components
    for n in container_nodes:
        render_node(n, is_container=True)
    for n in component_nodes:
        render_node(n, is_container=False)

    # 4. Render Edges (Connectors)
    for edge in edges:
        from_id = str(edge.get("from", ""))
        to_id = str(edge.get("to", ""))
        label = str(edge.get("label", "")).strip()

        src = rendered_node_shapes.get(from_id)
        dst = rendered_node_shapes.get(to_id)
        if not src or not dst:
            continue

        # Calculate optimal attachment points (Center-to-Center bounding intersection)
        src_cx, src_cy = src["cx"], src["cy"]
        dst_cx, dst_cy = dst["cx"], dst["cy"]

        # Approximate port on boundaries
        dx = dst_cx - src_cx
        dy = dst_cy - src_cy

        if abs(dx) > abs(dy):
            # Horizontal connection
            if dx > 0:
                p1_x = src["sx"] + src["sw"]
                p1_y = src_cy
                p2_x = dst["sx"]
                p2_y = dst_cy
            else:
                p1_x = src["sx"]
                p1_y = src_cy
                p2_x = dst["sx"] + dst["sw"]
                p2_y = dst_cy
        else:
            # Vertical connection
            if dy > 0:
                p1_x = src_cx
                p1_y = src["sy"] + src["sh"]
                p2_x = dst_cx
                p2_y = dst["sy"]
            else:
                p1_x = src_cx
                p1_y = src["sy"]
                p2_x = dst_cx
                p2_y = dst["sy"] + dst["sh"]

        # Add native connector
        conn_color_hex = edge.get("color", "#94a3b8" if is_dark else "#475569")
        conn_color = hex_to_rgb(conn_color_hex, (148, 163, 184))

        connector = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT,
            p1_x, p1_y, p2_x, p2_y
        )
        connector.line.color.rgb = conn_color
        connector.line.width = Pt(float(edge.get("strokeWidth", 2.0)))

        # Add triangle arrowhead
        try:
            line_xml = connector._element.spPr.ln
            head_end = parse_xml('<a:headEnd xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="triangle"/>')
            line_xml.append(head_end)
        except Exception:
            pass

        # If connector has label, add small native text box at midpoint
        if label:
            mid_x = (p1_x + p2_x) / 2
            mid_y = (p1_y + p2_y) / 2
            lbl_w = Inches(1.8)
            lbl_h = Inches(0.35)
            lbl_box = slide.shapes.add_textbox(mid_x - lbl_w / 2, mid_y - lbl_h / 2, lbl_w, lbl_h)
            lbl_tf = lbl_box.text_frame
            lbl_tf.word_wrap = True
            lbl_p = lbl_tf.paragraphs[0]
            lbl_p.text = label
            lbl_p.alignment = PP_ALIGN.CENTER
            lbl_p.font.size = Pt(9.5)
            lbl_p.font.bold = True
            lbl_p.font.color.rgb = RGBColor(56, 189, 248) if is_dark else RGBColor(2, 132, 199)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


def recognize_base64_diagram(
    image_base64: str,
    min_area: int = 1500,
    ocr_enabled: bool = True
) -> Dict[str, Any]:
    """
    Receives base64 image string, transforms it into high-contrast recognition formats,
    detects rectangular boxes & connectors, runs text extraction, and returns structured graph data.
    """
    import base64
    import tempfile
    import subprocess
    import json
    from pathlib import Path
    import numpy as np
    from PIL import Image, ImageOps, ImageEnhance

    # 1. Decode Base64 to PIL Image
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    raw_bytes = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    w, h = img.size

    # 2. Transform into Formats Optimized for Recognition (高對比灰階 + 銳化自適應二值化)
    gray = ImageOps.grayscale(img)
    contrasted = ImageOps.autocontrast(gray, cutoff=2)
    sharp = ImageEnhance.Sharpness(contrasted).enhance(2.5)

    arr = np.array(sharp)
    mean_lum = float(np.mean(arr))
    is_dark = mean_lum < 115

    # Adaptive binarization for edge and box detection
    if is_dark:
        thresh = mean_lum + 25
        binary = (arr > thresh).astype(np.uint8)
    else:
        thresh = mean_lum - 25
        binary = (arr < thresh).astype(np.uint8)

    # Encode enhanced format back to base64 for frontend inspection
    enhanced_pil = Image.fromarray((binary * 255).astype(np.uint8))
    enh_buf = io.BytesIO()
    enhanced_pil.save(enh_buf, format="PNG")
    enhanced_b64 = "data:image/png;base64," + base64.b64encode(enh_buf.getvalue()).decode("utf-8")

    # 3. Geometric Box Detection (Connected Component Projection)
    boxes = []
    visited = np.zeros((h, w), dtype=bool)
    step = 6
    img_rgb = np.array(img)

    for y in range(12, h - 12, step):
        for x in range(12, w - 12, step):
            if binary[y, x] and not visited[y, x]:
                # Flood fill component bounding box
                min_bx, max_bx = x, x
                min_by, max_by = y, y
                queue = [(x, y)]
                visited[y, x] = True
                count = 0

                while queue:
                    cx, cy = queue.pop()
                    count += 1
                    if cx < min_bx: min_bx = cx
                    if cx > max_bx: max_bx = cx
                    if cy < min_by: min_by = cy
                    if cy > max_by: max_by = cy

                    for nx, ny in [(cx + step, cy), (cx - step, cy), (cx, cy + step), (cx, cy - step)]:
                        if 0 <= nx < w and 0 <= ny < h:
                            if binary[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = True
                                queue.append((nx, ny))

                bw = max_bx - min_bx
                bh = max_by - min_by
                area = bw * bh

                # Box sanity filter
                if (area >= min_area and area < (w * h * 0.65) and
                    bw >= 45 and bh >= 25 and bw < (w * 0.9) and bh < (h * 0.85)):
                    # Deduplicate overlapping
                    dup = False
                    for existing in boxes:
                        if abs(existing["x"] - min_bx) < 25 and abs(existing["y"] - min_by) < 25:
                            dup = True
                            break
                    if not dup:
                        # Sample center fill color
                        cx = int(min_bx + bw / 2)
                        cy = int(min_by + bh / 2)
                        c_rgb = img_rgb[cy, cx]
                        fill_hex = f"#{c_rgb[0]:02x}{c_rgb[1]:02x}{c_rgb[2]:02x}"
                        boxes.append({
                            "x": min_bx,
                            "y": min_by,
                            "width": bw,
                            "height": bh,
                            "fill": fill_hex
                        })

    # Sort boxes top-to-bottom, left-to-right
    boxes.sort(key=lambda b: (b["y"] // 40, b["x"]))

    # 4. Windows OCR or Fallback Text Extraction
    ocr_lines = []
    if ocr_enabled:
        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
                tmp_path = tf.name
                # Save contrast enhanced image for OCR
                sharp.save(tmp_path)

            ps_script = Path(__file__).resolve().parent / "win_ocr.ps1"
            if ps_script.exists():
                p = subprocess.run(
                    ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps_script), "-ImagePath", tmp_path],
                    capture_output=True, text=True, timeout=8
                )
                if p.returncode == 0 and p.stdout.strip():
                    ocr_res = json.loads(p.stdout.strip())
                    ocr_lines = ocr_res.get("Lines", [])
            Path(tmp_path).unlink(missing_ok=True)
        except Exception as ocr_err:
            pass

    # 5. Build Structured Graph Nodes
    nodes = []
    for idx, b in enumerate(boxes):
        node_id = f"node_{idx + 1}"
        box_text = ""

        # Match OCR lines inside this box
        matched_texts = []
        for line in ocr_lines:
            lx = line.get("X", 0)
            ly = line.get("Y", 0)
            lw = line.get("Width", 0)
            lh = line.get("Height", 0)
            lcx = lx + lw / 2
            lcy = ly + lh / 2
            if (b["x"] <= lcx <= b["x"] + b["width"] and
                b["y"] <= lcy <= b["y"] + b["height"]):
                t = line.get("Text", "").strip()
                if t:
                    matched_texts.append(t)

        if matched_texts:
            box_text = "\n".join(matched_texts)
        else:
            box_text = f"方塊 #{idx + 1}"

        nodes.append({
            "id": node_id,
            "x": b["x"],
            "y": b["y"],
            "width": max(100, b["width"]),
            "height": max(45, b["height"]),
            "text": box_text,
            "fill": b["fill"] if b["fill"] != "#000000" else "#1e293b",
            "stroke": "#38bdf8",
            "strokeWidth": 2,
            "radius": 6,
            "fontSize": 12,
            "textColor": "#ffffff" if is_dark else "#0f172a"
        })

    # 6. Infer Connectors between neighboring boxes
    edges = []
    for i, na in enumerate(nodes):
        closest_dist = float("inf")
        closest_target = None
        for j, nb in enumerate(nodes):
            if i == j: continue
            dx = nb["x"] - na["x"]
            dy = nb["y"] - na["y"]
            if dx >= -20 and dy >= -30:
                dist = (dx**2 + dy**2)**0.5
                if dist < closest_dist and dist < 280:
                    closest_dist = dist
                    closest_target = nb
        if closest_target:
            edges.append({
                "id": f"e_{na['id']}_{closest_target['id']}",
                "from": na["id"],
                "to": closest_target["id"],
                "label": ""
            })

    return {
        "status": "success",
        "nodes": nodes,
        "edges": edges,
        "enhanced_base64": enhanced_b64,
        "width": w,
        "height": h,
        "count": len(nodes)
    }
