# Sprites

Sprites overworld (andando) de Pokémon, organizados para el juego.

## Fuente

Todos vienen del repositorio público
[TeamAquasHideout/Team-Aquas-Asset-Repo](https://github.com/TeamAquasHideout/Team-Aquas-Asset-Repo):

- `Overworld Pokemon Sprites/Rahtak/Followers/` — pack principal (todas las
  generaciones y formas, ~1000 sprites).
- `Official Pokemon Assets/HGSS Overworld Pokemon/sprites/` — sprites
  oficiales de HeartGold/SoulSilver, usados como respaldo (por ejemplo para
  Pokémon grandes que en el pack principal vienen en 384x64).

Créditos del repositorio original: sprites overworld de HGSS recopilados por
WiserVisor, rips de The Spriters Resource (Dragon, redblueyellow) y sprites
formateados por pokemonrrp y Rahtak.

## Formato

Cada archivo `walk/<nombre>.png` es una hoja de **192x32 px**: 6 fotogramas de
32x32.

| Fotogramas | Dirección            |
| ---------- | -------------------- |
| 0, 1       | abajo (quieto, paso) |
| 2, 3       | arriba               |
| 4, 5       | lateral (mirando a la izquierda) |

El lateral se voltea en el juego para caminar hacia la derecha.

`portrait/<nombre>.png` es el fotograma 0 (32x32) y se usa en menús y HUD.

`index.json` lista todos los sprites disponibles.

## Regenerar

```bash
python3 scripts/fetch-sprites.py          # usa la caché local
python3 scripts/fetch-sprites.py --force  # vuelve a descargar todo
```
