#!/usr/bin/env python3
"""Sincroniza los sprites del juego y construye la libreria compartida.

1. Copia a public/sprites/battle/ los sprites de combate (frontal, espalda e
   icono) de Gen 1 desde pokeemerald-expansion.
2. Genera los retratos 32x32 de las 151 especies (fotograma 0 del sprite
   andando).
3. Construye /opt/server/compartida/pokemon-assets con TODOS los sprites
   disponibles, ordenados en carpetas en espanol, con INDEX.json y creditos.

Uso: python3 scripts/sync-sprites.py [--force]
"""
import json
import os
import shutil
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GBA = "/opt/server/apps/GBA-Pokemon-make/graphics"
POKE_RPG = "/opt/server/apps/poke-rpg"
PMD = "/opt/server/apps/poke-granja/frontend/public/pmd"
SHARED = "/opt/server/compartida/pokemon-assets"

FORCE = "--force" in sys.argv

WALK = os.path.join(ROOT, "public", "sprites", "walk")
PORTRAIT = os.path.join(ROOT, "public", "sprites", "portrait")
BATTLE = os.path.join(ROOT, "public", "sprites", "battle")


def load_json(name):
    with open(os.path.join(ROOT, "scripts", name), encoding="utf-8") as f:
        return json.load(f)


def copy(src, dst):
    if not os.path.exists(src):
        return False
    if os.path.exists(dst) and not FORCE:
        if os.path.getsize(src) == os.path.getsize(dst):
            return True
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return True


def clean_background(path):
    """Quita el fondo opaco de un sprite (floodfill + color exacto)."""
    image = Image.open(path).convert("RGBA")
    if image.getpixel((0, 0))[3] == 0:
        return image

    background = image.getpixel((0, 0))
    for corner in [(0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1)]:
        ImageDraw.floodfill(image, corner, (0, 0, 0, 0), thresh=12)

    pixels = image.load()
    target = background[:3]
    for y in range(image.height):
        for x in range(image.width):
            pixel = pixels[x, y]
            if pixel[3] and pixel[:3] == target:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def copy_clean(src, dst, first_frame=False):
    """Copia limpiando el fondo. Siempre reescribe (son pocos KB)."""
    if not os.path.exists(src):
        return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    image = clean_background(src)
    # Los sprites de combate traen 2 fotogramas apilados (64x128): para la UI
    # nos quedamos con el primero, que es el de reposo.
    if first_frame and image.height == image.width * 2:
        image = image.crop((0, 0, image.width, image.width))
    image.save(dst, optimize=True)
    return True


def battle_files(slug):
    folder = os.path.join(GBA, "pokemon", slug)
    front = None
    for candidate in ("anim_front.png", "front.png"):
        path = os.path.join(folder, candidate)
        if os.path.exists(path):
            front = path
            break
    # back.png viene volcado con la paleta shiny; back_gba.png es el normal.
    back = None
    for candidate in ("back_gba.png", "back.png"):
        path = os.path.join(folder, candidate)
        if os.path.exists(path):
            back = path
            break

    return {
        "frontal": front,
        "espalda": back,
        "icono": os.path.join(folder, "icon.png"),
        "overworld": os.path.join(folder, "overworld.png"),
    }


def build_game_sprites(gen1):
    """Copia lo que necesita el APK."""
    os.makedirs(os.path.join(BATTLE, "front"), exist_ok=True)
    os.makedirs(os.path.join(BATTLE, "back"), exist_ok=True)
    os.makedirs(os.path.join(BATTLE, "icon"), exist_ok=True)
    os.makedirs(PORTRAIT, exist_ok=True)

    missing = []
    for entry in gen1:
        slug = entry["slug"]
        files = battle_files(slug)
        for src, sub in ((files["frontal"], "front"), (files["espalda"], "back"), (files["icono"], "icon")):
            if not src or not os.path.exists(src):
                missing.append(f"{slug} ({sub})")
                continue
            copy_clean(src, os.path.join(BATTLE, sub, f"{entry['id']:03d}.png"), first_frame=True)

        walk = os.path.join(WALK, f"{slug}.png")
        if os.path.exists(walk):
            sheet = Image.open(walk).convert("RGBA")
            sheet.crop((0, 0, 32, 32)).save(
                os.path.join(PORTRAIT, f"{slug}.png"), optimize=True
            )

    if missing:
        print(f"  ! faltan {len(missing)} sprites de combate: {missing[:5]}")
    print(f"  combate y retratos: {len(gen1)} especies")


def build_shared_library(gen1):
    """Copia TODO a /opt/server/compartida/pokemon-assets."""
    num_by_slug = {}
    for entry in gen1:
        num_by_slug[entry["slug"]] = entry["id"]

    # El mapa completo (1517 especies/formas) para numerar tambien las formas.
    for item in load_json("species-map.json"):
        num_by_slug.setdefault(item["slug"], item["num"])

    gates = {
        "frontal": os.path.join(SHARED, "sprites_lucha", "frontal"),
        "espalda": os.path.join(SHARED, "sprites_lucha", "espalda"),
        "icono": os.path.join(SHARED, "sprites_lucha", "iconos"),
        "caminando": os.path.join(SHARED, "sprites_caminando"),
        "pmd": os.path.join(SHARED, "sprites_caminando_pmd"),
        "retratos": os.path.join(SHARED, "retratos"),
        "pokeballs": os.path.join(SHARED, "pokeballs"),
    }
    for path in gates.values():
        os.makedirs(path, exist_ok=True)

    index = {}
    copied = 0

    # --- combate (todas las especies del repo GBA) ---
    gba_dir = os.path.join(GBA, "pokemon")
    for slug in sorted(os.listdir(gba_dir)):
        folder = os.path.join(gba_dir, slug)
        if not os.path.isdir(folder):
            continue
        files = battle_files(slug)
        num = num_by_slug.get(slug)
        prefix = f"{num:03d}_" if num else ""
        for key, gate in (("frontal", gates["frontal"]), ("espalda", gates["espalda"]), ("icono", gates["icono"])):
            src = files[key]
            if not src or not os.path.exists(src):
                continue
            dest_name = f"{prefix}{slug}.png"
            if copy_clean(src, os.path.join(gate, dest_name)):
                copied += 1
            index.setdefault(slug, {"numero": num, "archivos": {}})
            index[slug]["archivos"][key] = f"sprites_lucha/{os.path.basename(gate)}/{dest_name}"

    # --- andando (HGSS / Rahtak) ---
    for name in sorted(os.listdir(WALK)):
        if not name.endswith(".png"):
            continue
        slug = name[:-4]
        num = num_by_slug.get(slug)
        dest_name = f"{num:03d}_{slug}.png" if num else name
        if copy(os.path.join(WALK, name), os.path.join(gates["caminando"], dest_name)):
            copied += 1
        index.setdefault(slug, {"numero": num, "archivos": {}})
        index[slug]["archivos"]["caminando"] = f"sprites_caminando/{dest_name}"

    # --- retratos ---
    for name in sorted(os.listdir(PORTRAIT)):
        if not name.endswith(".png"):
            continue
        slug = name[:-4]
        num = num_by_slug.get(slug)
        dest_name = f"{num:03d}_{slug}.png" if num else name
        if copy(os.path.join(PORTRAIT, name), os.path.join(gates["retratos"], dest_name)):
            copied += 1

    # --- PMD (SpriteCollab, CC BY-NC) ---
    pmd_count = 0
    if os.path.isdir(PMD):
        for dirpath, _, filenames in os.walk(PMD):
            for name in filenames:
                src = os.path.join(dirpath, name)
                rel = os.path.relpath(src, PMD)
                if copy(src, os.path.join(gates["pmd"], rel)):
                    pmd_count += 1

    # --- pokeballs ---
    balls_dir = os.path.join(GBA, "balls")
    balls = 0
    for name in sorted(os.listdir(balls_dir)):
        if name.endswith(".png"):
            if copy(os.path.join(balls_dir, name), os.path.join(gates["pokeballs"], name)):
                balls += 1

    # --- indice ---
    entries = []
    for slug, data in sorted(index.items(), key=lambda kv: (kv[1]["numero"] or 9999, kv[0])):
        entries.append({
            "slug": slug,
            "numero": data["numero"],
            "archivos": data["archivos"],
        })

    with open(os.path.join(SHARED, "INDEX.json"), "w", encoding="utf-8") as f:
        json.dump({"generado": "scripts/sync-sprites.py", "total": len(entries), "sprites": entries},
                  f, ensure_ascii=False, indent=1)

    write_docs()
    print(f"  libreria: {copied} archivos, {len(entries)} especies, {pmd_count} PMD, {balls} pokeballs")


def write_docs():
    with open(os.path.join(SHARED, "00_LEEME.md"), "w", encoding="utf-8") as f:
        f.write("""# Libreria de sprites Pokemon

Todo lo que tenemos en el servidor, ordenado en carpetas en espanol.

```
sprites_lucha/frontal/     Sprites de combate frontales (64x64)
sprites_lucha/espalda/     Sprites de combate de espalda (64x64)
sprites_lucha/iconos/      Iconos de menu / caja (32x32)
sprites_caminando/         Overworld 192x32 (6 fotogramas: abajo, arriba, lateral)
sprites_caminando_pmd/     PMD SpriteCollab (animaciones: Walk, Idle, Attack...)
retratos/                  Retrato 32x32 (fotograma frontal)
pokeballs/                 Pokeballs de GBA
INDEX.json                 Indice: numero, slug y rutas de cada sprite
CREDITOS.md               Origen y licencia de cada cosa
```

Los nombres son `NNN_nombre.png` (numero de Pokedex + nombre). Las formas
conservan el sufijo (`003_venusaur_mega.png`).

Este directorio es la fuente; el juego solo copia al APK lo que necesita.
""")

    with open(os.path.join(SHARED, "CREDITOS.md"), "w", encoding="utf-8") as f:
        f.write("""# Creditos y licencias

- **Sprites de combate, iconos, overworld y Pokeballs**: `pokeemerald-expansion`
  (https://github.com/rh-hideout/pokeemerald-expansion), basado en la
  decompilacion `pret/pokeemerald`. Assets de Nintendo / Creatures Inc. /
  GAME FREAK. Uso personal, no comercial.
- **Sprites andando (HGSS/Rahtak)**: `TeamAquasHideout/Team-Aquas-Asset-Repo`
  (https://github.com/TeamAquasHideout/Team-Aquas-Asset-Repo). Recopilados por
  WiserVisor y Rahtak; rips de The Spriters Resource.
- **PMD SpriteCollab** (`sprites_caminando_pmd/`): `PMDCollab/SpriteCollab`,
  licencia **CC BY-NC 4.0** (atribucion, no comercial).
- **Datos de especies y movimientos**: `@pkmn/dex` (MIT) y los JSON de
  `poke-rpg` (Pokemon League Online).

Pokemon y los nombres de los Pokemon son marcas de Nintendo / Creatures Inc. /
GAME FREAK inc. Este proyecto es de fan, personal y no comercial.
""")


def main():
    gen1 = load_json("gen1-list.json")
    print("1/2 sprites del juego")
    build_game_sprites(gen1)
    print("2/2 libreria compartida")
    build_shared_library(gen1)


if __name__ == "__main__":
    main()
