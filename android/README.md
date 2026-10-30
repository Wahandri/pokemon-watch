# Contenedor Android / Wear OS de PokéWatch

La app del repositorio es una web app React + Vite. Este directorio la empaqueta
como APK nativo para Wear OS (Xiaomi Watch 2, 466x466).

## Cómo funciona

- `app/src/main/java/com/wahandri/pokemonwatch/MainActivity.java`
  Activity nativa con **GeckoView** (motor de Firefox). Wear OS no soporta
  WebView, asi que se embebe el motor y se sirve el juego desde un servidor
  local (NanoHTTPD) en `http://127.0.0.1:8765`. Asi `localStorage`, `fetch` y
  las rutas relativas funcionan como en un navegador real.
- `web/pw-bridge.js` se inyecta en `dist/index.html` durante el build y
  convierte los sensores del reloj (expuestos por la interfaz
  `window.PokeSensor`) en eventos `deviceorientation` / `devicemotion`.
  Solo emite eventos sintéticos si el WebView no entrega eventos reales.
- `app/src/main/assets/www/` se genera en cada build (no se versiona).

## Compilar

Desde la raíz del repositorio:

```bash
./build-apk.sh            # APK debug (firmado con la clave de debug)
./build-apk.sh release    # APK release, también firmado con la clave de debug
```

Requisitos: JDK 17, Android SDK 35 y Node 22. El APK pesa ~80 MB porque incluye
GeckoView (una sola ABI: arm64-v8a). Con `-PgeckoX86` se compila la variante
x86_64 para el emulador.

El APK queda en `apk/pokemon-watch-<fecha>-<variante>.apk`.

## Instalar en el reloj

```bash
adb devices
adb install -r apk/pokemon-watch-<fecha>-debug.apk
```

Si el reloj está en otra red: `adb connect <ip-del-reloj>:5555` (antes hay que
activar la depuración ADB en las opciones de desarrollador de Wear OS).

## Juego

- **Inicio**: Bulbasaur, Charmander, Squirtle y Pikachu (nivel 5). Eliges el activo.
- **Salvajes**: aparecen por el mapa, deambulan y persiguen si te acercas. Al
  chocar empieza el combate.
- **Combate**: 1v1 por turnos, sin PP, 4 movimientos por Pokemon. Los salvajes
  son algo mas debiles (88% de PS) para que ganar sea lo normal sin ser trivial.
- **Captura**: solo especies nuevas. Tras vencer aparece la Pokeball; se arrastra
  con el dedo hasta el Pokemon. Tres intentos y probabilidad segun la especie.
  Eevee se puede capturar hasta 3 veces (una por evolucion).
- **Progresion**: XP solo para el que lucha (`6 + 3 x nivel rival`), subida
  `12 + 8 x nivel`, techo 50. Evolucion automatica por nivel; Eevee elige entre
  Vaporeon, Jolteon y Flareon.
- **Descanso**: si pierdes, el Pokemon duerme 30 min (corre en tiempo real, con
  la app cerrada). Se despierta con bayas: `20 + 2 x nivel`.
- **Pokedex**: 151 especies, siluetas para los no vistos.

## Scripts de datos

```bash
node scripts/build-battle-data.cjs   # regenera src/game/gen1Data.ts
python3 scripts/sync-sprites.py       # copia sprites y reconstruye la libreria
```

La libreria compartida se genera en `/opt/server/compartida/pokemon-assets`
(combate, andando, PMD, retratos, Pokeballs, `INDEX.json` y creditos).
