#!/usr/bin/env bash
# Nyitó animáció fájljainak előállítása egy forrásvideóból (9:16, bármilyen felbontás, hanggal is).
# Használat: bash scripts/intro-assets.sh <forras.mp4>
# Kimenet (public/assets/intro/):
#   lamelix-intro.mp4       720×1280 H.264, hang nélkül (némított automatikus lejátszás), gyors indulás
#   lamelix-intro.json      minta-index a hardveres dekóderhez (src/intro/decoderPlayer.ts)
#   lamelix-intro.avif      animált AVIF tartalék (ha nincs WebCodecs)
#   lamelix-intro-logo.webp a zárókocka állóképként
# Utána: src/lib/introSplash.ts INTRO_DURATION_MS = a videó hossza; tests/introSplash.test.ts mintaszám.
set -euo pipefail
src="${1:?forrásvideó kell}"
out="$(cd "$(dirname "$0")/.." && pwd)/public/assets/intro"
mkdir -p "$out"
ffmpeg -v error -y -i "$src" -an -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset veryfast -crf "${CRF:-20}" -profile:v high -level 4.0 -movflags +faststart "$out/lamelix-intro.mp4"
ffmpeg -v error -y -i "$out/lamelix-intro.mp4" -vf "format=yuv420p" -c:v libsvtav1 -preset 6 -crf "${AVIF_CRF:-32}" -g 48 -f avif -loop 1 "$out/lamelix-intro.avif" 2>/dev/null
ffmpeg -v error -y -sseof -0.05 -i "$out/lamelix-intro.mp4" -frames:v 1 -c:v libwebp -quality 88 "$out/lamelix-intro-logo.webp"
python3 - "$out/lamelix-intro.mp4" "$out/lamelix-intro.json" <<'EOF'
import base64, json, struct, subprocess, sys
video, target = sys.argv[1], sys.argv[2]
packets = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,size,pos,flags', '-of', 'json', video]))['packets']
duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).decode().strip())
data = open(video, 'rb').read()
i = data.index(b'avcC'); size = struct.unpack('>I', data[i - 4:i])[0]; avcc = data[i + 4:i - 4 + size]
index = {
    'codec': 'avc1.%02x%02x%02x' % (avcc[1], avcc[2], avcc[3]), 'width': 720, 'height': 1280,
    'durationUs': round(duration * 1e6), 'description': base64.b64encode(avcc).decode(),
    'samples': [[int(p['pos']), int(p['size']), round(float(p['pts_time']) * 1e6), 1 if 'K' in p['flags'] else 0] for p in packets],
}
open(target, 'w').write(json.dumps(index, separators=(',', ':')))
print(f"{len(index['samples'])} minta, {duration:.2f} mp, {index['codec']}")
EOF
ls -la "$out"
