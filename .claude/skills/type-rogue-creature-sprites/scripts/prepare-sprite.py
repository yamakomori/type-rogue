#!/usr/bin/env python3

import argparse
import math
from collections import Counter
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError as exc:
    raise SystemExit("Pillow is required. Ask before installing it in this environment.") from exc


def parse_color(value):
    value = value.strip().lstrip("#")
    if len(value) != 6:
        raise argparse.ArgumentTypeError("key color must be auto, none, or a six-digit hex color")
    try:
        return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("invalid hex key color") from exc


def detect_border_key(image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    border = []
    for x in range(width):
        border.append(rgb.getpixel((x, 0)))
        border.append(rgb.getpixel((x, height - 1)))
    for y in range(1, height - 1):
        border.append(rgb.getpixel((0, y)))
        border.append(rgb.getpixel((width - 1, y)))

    def bucket(pixel):
        return tuple(channel // 16 for channel in pixel)

    winning_bucket = Counter(bucket(pixel) for pixel in border).most_common(1)[0][0]
    candidates = [pixel for pixel in border if bucket(pixel) == winning_bucket]
    return tuple(sorted(pixel[channel] for pixel in candidates)[len(candidates) // 2] for channel in range(3))


def despill_color(rgb, key):
    key_max = max(key)
    spill_channels = [
        index for index, value in enumerate(key)
        if value >= key_max - 16 and value >= 128
    ]
    non_spill = [index for index in range(3) if index not in spill_channels]
    if not spill_channels or not non_spill:
        return rgb
    channels = list(rgb)
    cap = max(channels[index] for index in non_spill)
    for index in spill_channels:
        channels[index] = min(channels[index], cap)
    return tuple(channels)


def apply_chroma(image, key, transparent_threshold, opaque_threshold, edge_contract, despill):
    rgba = image.convert("RGBA")
    pixels = list(rgba.getdata())
    alpha_values = []
    output = []
    denominator = max(opaque_threshold - transparent_threshold, 1)

    for red, green, blue, source_alpha in pixels:
        distance = math.sqrt(
            (red - key[0]) ** 2
            + (green - key[1]) ** 2
            + (blue - key[2]) ** 2
        )
        if distance <= transparent_threshold:
            matte = 0
        elif distance >= opaque_threshold:
            matte = 255
        else:
            matte = round(255 * (distance - transparent_threshold) / denominator)
        alpha = round(source_alpha * matte / 255)
        alpha_values.append(alpha)
        if alpha == 0:
            output.append((0, 0, 0, 0))
        elif despill and alpha < 252:
            red, green, blue = despill_color((red, green, blue), key)
            output.append((red, green, blue, alpha))
        else:
            output.append((red, green, blue, alpha))

    rgba.putdata(output)
    if edge_contract:
        alpha = Image.new("L", rgba.size)
        alpha.putdata(alpha_values)
        alpha = alpha.filter(ImageFilter.MinFilter(edge_contract * 2 + 1))
        rgba.putalpha(alpha)
        rgba.putdata([
            (0, 0, 0, 0) if pixel[3] == 0 else pixel
            for pixel in rgba.getdata()
        ])
    return rgba


def fit_strip(image, width, height):
    resized_height = round(image.height * width / image.width)
    image = image.resize((width, resized_height), Image.Resampling.NEAREST)
    if resized_height >= height:
        top = (resized_height - height) // 2
        return image.crop((0, top, width, top + height))
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.alpha_composite(image, (0, (height - resized_height) // 2))
    return canvas


def main():
    parser = argparse.ArgumentParser(description="Remove a chroma background and normalize a Type Rogue sprite strip.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--key-color", default="auto", help="auto, none, or RRGGBB/#RRGGBB")
    parser.add_argument("--transparent-threshold", type=int, default=18)
    parser.add_argument("--opaque-threshold", type=int, default=140)
    parser.add_argument("--edge-contract", type=int, default=1)
    parser.add_argument("--no-despill", action="store_true")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=256)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.output.exists() and not args.force:
        raise SystemExit(f"output already exists: {args.output}; pass --force to replace it")
    if args.width <= 0 or args.height <= 0 or args.width % 4:
        raise SystemExit("width and height must be positive, and width must divide into four frames")
    if not 0 <= args.transparent_threshold < args.opaque_threshold <= 442:
        raise SystemExit("thresholds must satisfy 0 <= transparent < opaque <= 442")
    if not 0 <= args.edge_contract <= 8:
        raise SystemExit("edge contract must be between 0 and 8")

    image = Image.open(args.input)
    if args.key_color.lower() == "none":
        key = None
        rgba = image.convert("RGBA")
    else:
        key = detect_border_key(image) if args.key_color.lower() == "auto" else parse_color(args.key_color)
        rgba = apply_chroma(
            image,
            key,
            args.transparent_threshold,
            args.opaque_threshold,
            args.edge_contract,
            not args.no_despill,
        )

    result = fit_strip(rgba, args.width, args.height)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output, optimize=True)
    visible = sum(1 for alpha in result.getchannel("A").getdata() if alpha)
    key_label = "none" if key is None else "#" + "".join(f"{channel:02x}" for channel in key)
    print(f"Wrote {args.output}")
    print(f"Size: {result.width}x{result.height} RGBA / key: {key_label} / visible pixels: {visible}")


if __name__ == "__main__":
    main()
