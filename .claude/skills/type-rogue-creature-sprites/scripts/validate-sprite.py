#!/usr/bin/env python3

import argparse
import hashlib
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required. Ask before installing it in this environment.") from exc


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(path, width, height, frames, css_size, centroid_warning):
    errors = []
    warnings = []
    image = Image.open(path)
    if image.size != (width, height):
        errors.append(f"expected {width}x{height}, got {image.width}x{image.height}")
    if image.mode != "RGBA":
        errors.append(f"expected RGBA, got {image.mode}")
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    hidden_color_pixels = sum(
        1 for red, green, blue, pixel_alpha in rgba.getdata()
        if pixel_alpha == 0 and (red or green or blue)
    )
    if hidden_color_pixels:
        warnings.append(f"{hidden_color_pixels} transparent pixels retain hidden RGB color")
    if any(alpha.crop((0, 0, width, 1)).getdata()) \
            or any(alpha.crop((0, height - 1, width, height)).getdata()) \
            or any(alpha.crop((0, 0, 1, height)).getdata()) \
            or any(alpha.crop((width - 1, 0, width, height)).getdata()):
        errors.append("outer border must be fully transparent")

    frame_width = width // frames
    visible_counts = []
    centroids = []
    for index in range(frames):
        frame_alpha = alpha.crop((index * frame_width, 0, (index + 1) * frame_width, height))
        values = list(frame_alpha.getdata())
        visible = [(position % frame_width, position // frame_width, value)
                   for position, value in enumerate(values) if value > 0]
        visible_counts.append(len(visible))
        if len(visible) < 100:
            errors.append(f"frame {index + 1} has too few visible pixels: {len(visible)}")
            centroids.append((0.0, 0.0))
            continue
        weight = sum(value for _, _, value in visible)
        centroids.append((
            sum(x * value for x, _, value in visible) / weight,
            sum(y * value for _, y, value in visible) / weight,
        ))
        corners = [
            frame_alpha.getpixel((0, 0)),
            frame_alpha.getpixel((frame_width - 1, 0)),
            frame_alpha.getpixel((0, height - 1)),
            frame_alpha.getpixel((frame_width - 1, height - 1)),
        ]
        if any(corners):
            errors.append(f"frame {index + 1} corners must be transparent")

    if all(visible_counts):
        x_shift = (max(x for x, _ in centroids) - min(x for x, _ in centroids)) * css_size / frame_width
        y_shift = (max(y for _, y in centroids) - min(y for _, y in centroids)) * css_size / height
        if x_shift > centroid_warning:
            warnings.append(f"horizontal centroid shift is {x_shift:.1f} CSS px")
        if y_shift > centroid_warning:
            warnings.append(f"vertical centroid shift is {y_shift:.1f} CSS px")
    else:
        x_shift = y_shift = 0.0

    return {
        "path": path,
        "visible": visible_counts,
        "x_shift": x_shift,
        "y_shift": y_shift,
        "errors": errors,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description="Validate Type Rogue four-frame RGBA sprite strips.")
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--mirror-dir", type=Path)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=256)
    parser.add_argument("--frames", type=int, default=4)
    parser.add_argument("--css-size", type=float, default=64)
    parser.add_argument("--centroid-warning", type=float, default=6)
    args = parser.parse_args()

    failed = False
    for path in args.files:
        result = validate(
            path,
            args.width,
            args.height,
            args.frames,
            args.css_size,
            args.centroid_warning,
        )
        if args.mirror_dir:
            mirror = args.mirror_dir / path.name
            if not mirror.exists():
                result["errors"].append(f"mirror is missing: {mirror}")
            elif digest(path) != digest(mirror):
                result["errors"].append(f"mirror differs: {mirror}")

        print(f"{path}: visible={result['visible']} centroid=({result['x_shift']:.1f}, {result['y_shift']:.1f}) CSS px")
        for warning in result["warnings"]:
            print(f"  WARN: {warning}")
        for error in result["errors"]:
            print(f"  ERROR: {error}")
        failed = failed or bool(result["errors"])

    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
