#!/usr/bin/env python3
"""Descarga la libreria de sprites overworld (andando) del repositorio publico
TeamAquasHideout/Team-Aquas-Asset-Repo.

Fuentes:
  - Overworld Pokemon Sprites/Rahtak/Followers/*.png   (pack completo, ~1000)
  - Official Pokemon Assets/HGSS Overworld Pokemon/sprites/*.png (respaldo Gen 1-4)

Cada hoja es un PNG de 192x32: 6 fotogramas de 32x32
  [0,1] abajo (quieto/paso)  [2,3] arriba  [4,5] lateral (mirando a la izquierda)

Salida:
  public/sprites/walk/<nombre>.png      hoja completa (192x32)
  public/sprites/portrait/<nombre>.png  fotograma 0 (32x32) para menus/HUD
  public/sprites/index.json             nombres disponibles

Uso:  python3 scripts/fetch-sprites.py [--force]
"""
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

from PIL import Image, ImageDraw

REPO = "TeamAquasHideout/Team-Aquas-Asset-Repo"
BRANCH = "main"
RAW = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/"
TREE = f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=1"

RAHTAK_DIR = "Overworld Pokemon Sprites/Rahtak/Followers/"
HGSS_DIR = "Official Pokemon Assets/HGSS Overworld Pokemon/sprites/"

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites")
WALK_DIR = os.path.join(ROOT, "walk")
PORTRAIT_DIR = os.path.join(ROOT, "portrait")

# Los unicos Pokemon con retrato propio (los que salen en el juego).
ROSTER = [
    "pikachu", "charizard", "bulbasaur", "squirtle", "eevee", "gengar",
    "lucario", "greninja", "mew", "snorlax", "garchomp", "gardevoir",
    "dragonite", "umbreon", "mudkip", "torchic", "treecko", "cyndaquil",
    "jigglypuff", "mimikyu", "blastoise", "arcanine",
]

FORCE = "--force" in sys.argv


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "pokemon-watch-build"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def fetch_tree():
    data = json.loads(http_get(TREE))
    if "tree" not in data:
        raise SystemExit(f"No se pudo leer el arbol del repo: {data}")
    return [item["path"] for item in data["tree"] if item["type"] == "blob"]


def clean_background(image):
    """Quita el fondo opaco que traen algunos packs.

    1. Relleno por inundacion desde las 4 esquinas.
    2. Elimina los restos del color de fondo exacto (zonas encerradas por el
       cuerpo del sprite, como el aro de Rayquaza).
    """
    if image.getpixel((0, 0))[3] == 0:
        return False

    background = image.getpixel((0, 0))
    for corner in [(0, 0), (image.width - 1, 0),
                   (0, image.height - 1), (image.width - 1, image.height - 1)]:
        ImageDraw.floodfill(image, corner, (0, 0, 0, 0), thresh=12)

    pixels = image.load()
    target = background[:3]
    for y in range(image.height):
        for x in range(image.width):
            pixel = pixels[x, y]
            if pixel[3] and pixel[:3] == target:
                pixels[x, y] = (0, 0, 0, 0)
    return True


def process(name, urls):
    dest = os.path.join(WALK_DIR, f"{name}.png")
    if os.path.exists(dest) and not FORCE:
        return name, "cache"

    for url in urls:
        try:
            raw = http_get(url)
        except Exception:
            continue
        image = Image.open(BytesIO(raw)).convert("RGBA")
        if image.size != (192, 32):
            # Hay sprites "grandes" (384x64) que no encajan en el formato del
            # juego: se prueba el siguiente origen antes de descartarlo.
            continue
        cleaned = clean_background(image)
        image.save(dest, optimize=True)
        return name, "ok" if cleaned else "ok-sin-fondo"

    return name, "sin formato 192x32"


def main():
    os.makedirs(WALK_DIR, exist_ok=True)
    os.makedirs(PORTRAIT_DIR, exist_ok=True)

    paths = fetch_tree()
    rahtak = {os.path.basename(p)[:-4]: p for p in paths if p.startswith(RAHTAK_DIR) and p.endswith(".png")}
    hgss = {os.path.basename(p)[:-4]: p for p in paths if p.startswith(HGSS_DIR) and p.endswith(".png")}

    # Rahtak manda; HGSS se usa de respaldo (p. ej. sprites grandes en 384x64).
    plan = {}
    for name in set(rahtak) | set(hgss):
        urls = []
        if name in rahtak:
            urls.append(RAW + rahtak[name].replace(" ", "%20"))
        if name in hgss:
            urls.append(RAW + hgss[name].replace(" ", "%20"))
        plan[name] = urls
    print(f"Rahtak: {len(rahtak)}  HGSS: {len(hgss)}  total: {len(plan)}")

    results = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(process, name, urls)
                   for name, urls in sorted(plan.items())]
        for future in futures:
            name, status = future.result()
            results[name] = status
            if status.startswith("sin formato"):
                print(f"  ! {name}: {status}")

    cached = sum(1 for s in results.values() if s == "cache")
    ok = len(results) - cached
    print(f"descargados: {ok}  ya existentes: {cached}")

    # Retratos del roster
    missing = []
    for name in ROSTER:
        walk_path = os.path.join(WALK_DIR, f"{name}.png")
        if not os.path.exists(walk_path):
            missing.append(name)
            continue
        sheet = Image.open(walk_path).convert("RGBA")
        sheet.crop((0, 0, 32, 32)).save(
            os.path.join(PORTRAIT_DIR, f"{name}.png"), optimize=True
        )
    if missing:
        raise SystemExit(f"Faltan sprites del roster: {missing}")
    print(f"retratos: {len(ROSTER)}")

    with open(os.path.join(ROOT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(sorted(results), f, indent=0)

    total = sum(os.path.getsize(os.path.join(WALK_DIR, f))
                for f in os.listdir(WALK_DIR))
    print(f"libreria: {len(results)} sprites, {total / 1024:.0f} KB")


if __name__ == "__main__":
    main()
