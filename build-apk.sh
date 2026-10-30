#!/usr/bin/env bash
# Compila el APK de PokeWatch (Wear OS / Xiaomi Watch 2) en este servidor.
#
# Uso:  ./build-apk.sh [debug|release]
#
# Requisitos (ya instalados en este servidor):
#   - JDK 17     /usr/lib/jvm/java-17-openjdk-amd64
#   - Android SDK 35  /home/wahandri/android-sdk
#   - Node 22 + npm
set -euo pipefail

cd "$(dirname "$0")"

export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-/home/wahandri/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

VARIANT="${1:-debug}"

echo "==> Java: $(java -version 2>&1 | head -1)"
echo "==> SDK:  $ANDROID_HOME"

echo "==> 1/4 dependencias web"
npm install --legacy-peer-deps --no-audit --no-fund

echo "==> 2/4 build web (rutas relativas para cargar desde assets)"
rm -rf dist
npx vite build --base ./ --outDir dist

echo "==> 3/4 copiando web a assets + puente de sensores"
cp android/web/pw-bridge.js dist/pw-bridge.js
python3 - <<'PY'
from pathlib import Path

page = Path("dist/index.html")
html = page.read_text(encoding="utf-8")
if "pw-bridge.js" not in html:
    html = html.replace(
        "</head>",
        '  <script src="./pw-bridge.js"></script>\n  </head>',
        1,
    )

# El reloj tiene densidad 2x: se fija el viewport a 466 px CSS para que el
# diseno (pensado para 466x466) se vea igual que en el navegador.
html = html.replace(
    'content="width=device-width, initial-scale=1.0"',
    'content="width=466, user-scalable=no"',
)
page.write_text(html, encoding="utf-8")
PY

ASSETS="android/app/src/main/assets/www"
rm -rf "$ASSETS"
mkdir -p "$ASSETS"
cp -a dist/. "$ASSETS/"

echo "==> 4/4 compilando APK ($VARIANT)"
cd android
if [ "$VARIANT" = "release" ]; then
  ./gradlew --no-daemon :app:assembleRelease
  BUILT=$(find app/build/outputs/apk/release -name '*.apk' | head -1)
else
  ./gradlew --no-daemon :app:assembleDebug
  BUILT=$(find app/build/outputs/apk/debug -name '*.apk' | head -1)
fi

mkdir -p ../apk
OUT="../apk/pokemon-watch-$(date +%Y%m%d)-${VARIANT}.apk"
cp "$BUILT" "$OUT"

echo
echo "==> APK generado: $(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
echo "==> tamano: $(du -h "$OUT" | cut -f1)"
echo
echo "Instalar en el reloj (ADB por USB o WiFi):"
echo "  adb devices"
echo "  adb install -r $(realpath "$OUT")"
