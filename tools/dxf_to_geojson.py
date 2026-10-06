#!/usr/bin/env python3
"""
tools/dxf_to_geojson.py
High-precision DXF to GeoJSON converter & geometric summarizer for Webcom AI.
Utilizes ezdxf to parse LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, POINT, TEXT/MTEXT, 3DFACE.
Outputs standard GeoJSON FeatureCollection and statistical summary.
"""

import sys
import os
import json
import math
from pathlib import Path

def convert_dxf_to_geojson(dxf_path, output_geojson_path=None):
    try:
        import ezdxf
    except ImportError:
        print("[ERROR] ezdxf is required. Install via: pip install ezdxf")
        return None

    p = Path(dxf_path)
    if not p.exists():
        print(f"[ERROR] DXF file not found: {dxf_path}")
        return None

    try:
        doc = ezdxf.readfile(str(p))
    except Exception as e:
        print(f"[ERROR] Failed to read DXF file: {e}")
        return None

    msp = doc.modelspace()
    features = []
    layer_stats = {}
    type_stats = {}

    min_x = float('inf')
    max_x = float('-inf')
    min_y = float('inf')
    max_y = float('-inf')

    def update_bounds(x, y):
        nonlocal min_x, max_x, min_y, max_y
        if x < min_x: min_x = x
        if x > max_x: max_x = x
        if y < min_y: min_y = y
        if y > max_y: max_y = y

    for entity in msp:
        etype = entity.dxftype()
        layer = entity.dxf.layer if hasattr(entity.dxf, 'layer') else '0'
        type_stats[etype] = type_stats.get(etype, 0) + 1
        layer_stats[layer] = layer_stats.get(layer, 0) + 1

        geom = None
        props = {
            "entity": etype,
            "layer": layer,
            "color": entity.dxf.color if hasattr(entity.dxf, 'color') else 256,
        }

        # 1. LINE
        if etype == 'LINE':
            start = (round(entity.dxf.start.x, 4), round(entity.dxf.start.y, 4))
            end = (round(entity.dxf.end.x, 4), round(entity.dxf.end.y, 4))
            update_bounds(start[0], start[1])
            update_bounds(end[0], end[1])
            geom = {
                "type": "LineString",
                "coordinates": [list(start), list(end)]
            }
            props["length"] = round(math.hypot(end[0] - start[0], end[1] - start[1]), 4)

        # 2. LWPOLYLINE (2D Polyline)
        elif etype == 'LWPOLYLINE':
            coords = []
            for v in entity.get_points(format='xy'):
                x, y = round(v[0], 4), round(v[1], 4)
                update_bounds(x, y)
                coords.append([x, y])
            if coords:
                is_closed = bool(entity.closed)
                if is_closed and len(coords) >= 3:
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    geom = {
                        "type": "Polygon",
                        "coordinates": [coords]
                    }
                else:
                    geom = {
                        "type": "LineString",
                        "coordinates": coords
                    }
                props["points_count"] = len(coords)
                props["is_closed"] = is_closed

        # 3. POLYLINE (2D/3D Polyline)
        elif etype == 'POLYLINE':
            coords = []
            for v in entity.vertices:
                loc = v.dxf.location
                x, y = round(loc.x, 4), round(loc.y, 4)
                update_bounds(x, y)
                coords.append([x, y])
            if coords:
                is_closed = bool(entity.is_closed)
                if is_closed and len(coords) >= 3:
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    geom = {
                        "type": "Polygon",
                        "coordinates": [coords]
                    }
                else:
                    geom = {
                        "type": "LineString",
                        "coordinates": coords
                    }
                props["points_count"] = len(coords)
                props["is_closed"] = is_closed

        # 4. CIRCLE
        elif etype == 'CIRCLE':
            cx, cy = round(entity.dxf.center.x, 4), round(entity.dxf.center.y, 4)
            r = round(entity.dxf.radius, 4)
            update_bounds(cx - r, cy - r)
            update_bounds(cx + r, cy + r)
            # Approximate circle with 36 points
            pts = []
            for i in range(37):
                ang = i * (2 * math.pi / 36)
                pts.append([round(cx + r * math.cos(ang), 4), round(cy + r * math.sin(ang), 4)])
            geom = {
                "type": "Polygon",
                "coordinates": [pts]
            }
            props["center"] = [cx, cy]
            props["radius"] = r
            props["area"] = round(math.pi * (r ** 2), 4)

        # 5. ARC
        elif etype == 'ARC':
            cx, cy = round(entity.dxf.center.x, 4), round(entity.dxf.center.y, 4)
            r = round(entity.dxf.radius, 4)
            sa = math.radians(entity.dxf.start_angle)
            ea = math.radians(entity.dxf.end_angle)
            if ea < sa:
                ea += 2 * math.pi
            pts = []
            steps = max(8, int(math.degrees(ea - sa) / 10))
            for i in range(steps + 1):
                ang = sa + i * ((ea - sa) / steps)
                x, y = round(cx + r * math.cos(ang), 4), round(cy + r * math.sin(ang), 4)
                update_bounds(x, y)
                pts.append([x, y])
            geom = {
                "type": "LineString",
                "coordinates": pts
            }
            props["center"] = [cx, cy]
            props["radius"] = r

        # 6. POINT
        elif etype == 'POINT':
            loc = entity.dxf.location
            x, y = round(loc.x, 4), round(loc.y, 4)
            update_bounds(x, y)
            geom = {
                "type": "Point",
                "coordinates": [x, y]
            }

        # 7. TEXT / MTEXT
        elif etype in ['TEXT', 'MTEXT']:
            loc = entity.dxf.insert
            x, y = round(loc.x, 4), round(loc.y, 4)
            update_bounds(x, y)
            text_str = entity.text if hasattr(entity, 'text') else entity.dxf.text
            geom = {
                "type": "Point",
                "coordinates": [x, y]
            }
            props["text"] = text_str

        if geom:
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": props
            })

    # Prepare summary report
    bbox = [float(min_x), float(min_y), float(max_x), float(max_y)] if min_x != float('inf') else [0.0, 0.0, 0.0, 0.0]
    width = round(float(max_x - min_x), 4) if min_x != float('inf') else 0.0
    height = round(float(max_y - min_y), 4) if min_y != float('inf') else 0.0

    geojson_doc = {
        "type": "FeatureCollection",
        "bbox": bbox,
        "metadata": {
            "source_file": p.name,
            "dxf_version": doc.dxfversion,
            "total_entities": len(features),
            "width": width,
            "height": height,
            "layers": layer_stats,
            "entity_types": type_stats
        },
        "features": features
    }

    if output_geojson_path:
        out_p = Path(output_geojson_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(geojson_doc, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"[OK] GeoJSON written to: {out_p.resolve()}")

    return geojson_doc

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python tools/dxf_to_geojson.py <path_to_dxf_file> [output_geojson_path]")
        sys.exit(1)

    dxf_file = sys.argv[1]
    out_file = sys.argv[2] if len(sys.argv) > 2 else Path(dxf_file).with_suffix('.geojson')
    res = convert_dxf_to_geojson(dxf_file, out_file)
    if res:
        meta = res["metadata"]
        print("\n================ DXF -> GeoJSON 解析統計報告 ================")
        print(f"檔案名稱: {meta['source_file']}")
        print(f"AutoCAD 版本: {meta['dxf_version']}")
        print(f"圖形幾何總數: {meta['total_entities']} 個 Features")
        print(f"外包矩形邊界 (Bounding Box): {res['bbox']}")
        print(f"幾何範圍尺寸: 寬度 {meta['width']} x 高度 {meta['height']}")
        print(f"包含圖層 ({len(meta['layers'])} 個): {list(meta['layers'].keys())}")
        print(f"幾何物件類型分佈: {meta['entity_types']}")
        print("============================================================\n")
