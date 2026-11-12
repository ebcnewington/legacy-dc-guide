#!/usr/bin/env python3
"""Bake the 13 credited Places photographs into local, mobile-sized WebP assets.

This runs when GitHub Pages builds. Visitors never need to download the remote
Wikimedia files or depend on Wikimedia's availability to view location cards.
The source metadata and license links stay in data/guide.json.
"""
from __future__ import annotations

import io
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "data/guide.json"
OUT = ROOT / "assets/places"
WIDTHS = (480, 720)
HEIGHT_RATIO = 9 / 16
MAX_BYTES = 13_000_000
HEADERS = {
    "User-Agent": "EmmanuelBaptistLegacyDCGuide/1.0 (https://ebcnewington.github.io/legacy-dc-guide/; photo-baking)",
    "Accept": "image/jpeg,image/png,image/webp,image/*;q=0.8",
}


def original_url(thumbnail: str) -> str | None:
    """Derive the canonical original URL from the Commons thumbnail URL."""
    parsed = urlparse(thumbnail)
    path = parsed.path
    if parsed.hostname not in ("upload.wikimedia.org", "thumb.wikimedia.org"):
        return None
    prefix = "/wikipedia/commons/thumb/"
    if not path.startswith(prefix):
        return None
    remainder = path[len(prefix):].split("/")
    if len(remainder) < 4:
        return None
    return "https://upload.wikimedia.org/wikipedia/commons/" + "/".join(remainder[:3])


def source_urls(photo: dict) -> list[str]:
    thumb = photo.get("remote_src") or ""
    if not thumb.startswith("https://upload.wikimedia.org/wikipedia/commons/thumb/"):
        raise ValueError(f"Missing Commons thumbnail source: {thumb}")
    result = [
        thumb,
        thumb.replace("https://upload.wikimedia.org", "https://thumb.wikimedia.org", 1),
    ]
    origin = original_url(thumb)
    if origin:
        result.append(origin)
    return result


def get_image(session: requests.Session, photo: dict, name: str) -> Image.Image:
    errors = []
    for url in source_urls(photo):
        for attempt in (1, 2):
            try:
                with session.get(url, timeout=(15, 25), headers=HEADERS, stream=True) as response:
                    response.raise_for_status()
                    content = bytearray()
                    for part in response.iter_content(chunk_size=131072):
                        content.extend(part)
                        if len(content) > MAX_BYTES:
                            raise ValueError("source image exceeds safety download limit")
                image = Image.open(io.BytesIO(content))
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGB")
                if min(image.size) < 240:
                    raise ValueError(f"image is too small: {image.size}")
                return image
            except (requests.RequestException, OSError, ValueError, UnidentifiedImageError) as exc:
                errors.append(f"{url} ({type(exc).__name__}: {str(exc)[:120]})")
                if attempt == 1:
                    time.sleep(0.8)
    raise RuntimeError(f"Unable to prepare location photo '{name}': " + " | ".join(errors))


def center_position(position: str) -> tuple[float, float]:
    parts = re.findall(r"([0-9.]+)%", position or "")
    if len(parts) < 2:
        return 0.5, 0.5
    return tuple(min(1.0, max(0.0, float(value) / 100)) for value in parts[:2])


def main() -> None:
    guide = json.loads(GUIDE.read_text(encoding="utf-8"))
    places = guide.get("places") or []
    if len(places) != 13:
        raise RuntimeError(f"Expected 13 Places entries; found {len(places)}")
    OUT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    total = 0
    for place in places:
        ident = place["id"]
        if not re.fullmatch(r"[a-z0-9-]+", ident):
            raise ValueError(f"Unsafe place ID: {ident}")
        photo = place.get("photo") or {}
        if not photo.get("source", "").startswith("https://commons.wikimedia.org/wiki/File:"):
            raise ValueError(f"Missing original source/credit link: {ident}")
        picture = get_image(session, photo, ident)
        center = center_position(photo.get("position", "center"))
        for width in WIDTHS:
            height = round(width * HEIGHT_RATIO)
            output = OUT / f"{ident}-{width}.webp"
            rendered = ImageOps.fit(
                picture, (width, height),
                method=Image.Resampling.LANCZOS, centering=center
            )
            rendered.save(output, "WEBP", quality=79, method=5)
            # Check content instead of trusting a successful save.
            with Image.open(output) as check:
                check.verify()
            size = output.stat().st_size
            if size < 2_000 or size > 180_000:
                raise RuntimeError(f"Unexpected optimized image size for {output}: {size}")
            total += size
            print(f"{ident}: {width}x{height}, {size:,} bytes")
    expected = {f"{p['id']}-{w}.webp" for p in places for w in WIDTHS}
    actual = {p.name for p in OUT.glob("*.webp")}
    if not expected.issubset(actual):
        raise RuntimeError(f"Missing location assets: {sorted(expected - actual)}")
    print(f"Verified {len(expected)} local WebP photo assets, {total:,} bytes in total")


if __name__ == "__main__":
    main()
