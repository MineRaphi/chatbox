#!/usr/bin/env python3
"""Generate the tray icons in assets/ from icons/chatbox.png.

Run from the repo root after changing the app icon:

    python3 scripts/generate-tray-icons.py

Needs Pillow (`pip install pillow`). Produces, each at 16 px and @2x (32 px):

- tray*Template.png  macOS menu bar: monochrome, recoloured by macOS for
                     light and dark menu bars (the "Template" suffix tells
                     Electron to mark them as template images)
- tray*.png          Windows/Linux: the coloured icon

in three states: normal (connected), Offline (dimmed: no server or
disconnected) and Dnd (Do not disturb: a "muted" slash through the icon).
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "icons" / "chatbox.png"
OUT = ROOT / "assets"

WORK = 512  # draw large, then downscale for clean edges
OFFLINE_ALPHA = 0.4
SIZES = {"": 16, "@2x": 32}


def load() -> Image.Image:
    return Image.open(SOURCE).convert("RGBA").resize((WORK, WORK), Image.LANCZOS)


def template_from(color: Image.Image) -> Image.Image:
    """Solid square with "CB" cut out: opaque where the icon is purple."""
    r, g, b, a = color.split()
    # The letters and border are black; the fill is purple. Keep only light
    # pixels (the fill) as opaque.
    luminance = Image.merge("RGB", (r, g, b)).convert("L")
    fill = luminance.point(lambda v: 255 if v > 60 else 0)
    alpha = ImageChops.multiply(fill, a)
    black = Image.new("RGBA", color.size, (0, 0, 0, 0))
    black.putalpha(alpha)
    return black


def dimmed(image: Image.Image) -> Image.Image:
    out = image.copy()
    alpha = out.getchannel("A").point(lambda v: int(v * OFFLINE_ALPHA))
    out.putalpha(alpha)
    return out


def slashed(image: Image.Image, line_rgba: tuple[int, int, int, int]) -> Image.Image:
    """A "muted" slash: a transparent gap with a solid line inside it."""
    out = image.copy()
    start = (WORK * 0.10, WORK * 0.10)
    end = (WORK * 0.90, WORK * 0.90)

    gap = Image.new("L", out.size, 0)
    ImageDraw.Draw(gap).line([start, end], fill=255, width=int(WORK * 0.22))
    alpha = ImageChops.subtract(out.getchannel("A"), gap)
    out.putalpha(alpha)

    ImageDraw.Draw(out).line([start, end], fill=line_rgba, width=int(WORK * 0.10))
    return out


def save(image: Image.Image, stem: str) -> None:
    for suffix, px in SIZES.items():
        path = OUT / f"{stem}{suffix}.png"
        image.resize((px, px), Image.LANCZOS).save(path)
        print(f"wrote {path.relative_to(ROOT)}")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    color = load()
    template = template_from(color)

    save(template, "trayTemplate")
    save(dimmed(template), "trayOfflineTemplate")
    save(slashed(template, (0, 0, 0, 255)), "trayDndTemplate")

    save(color, "tray")
    save(dimmed(color), "trayOffline")
    save(slashed(color, (0, 0, 0, 255)), "trayDnd")


if __name__ == "__main__":
    main()
