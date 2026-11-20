#!/usr/bin/env bash
# Prepara a playlist de lofi para o servidor (R2), fora do APK.
# Origem: álbum "Lo-fi And Chill" de HoliznaCC0 (CC0 1.0, sem samples de terceiros):
#   https://freemusicarchive.org/music/holiznacc0/lo-fi-and-chill
# 33 faixas em MP3 de 320 kbps (~222 MB); "Clouds" e "Busted Jazz" vêm repetidas no próprio álbum
# e entram uma vez só. Cada faixa é normalizada (-20 LUFS, como os outros sons) e vira AAC de
# 96 kbps estéreo (~0,7 MB por minuto). Gera também playlist.json (id, título, duração).
# Uso: scripts/preparar-lofi.sh <pasta dos MP3> <pasta de saída>
set -euo pipefail
S="${1:?pasta dos MP3}"
D="${2:?pasta de saída}"
mkdir -p "$D"
python3 - "$S" "$D" <<'PY'
import hashlib, json, os, re, subprocess, sys, unicodedata
src, dst = sys.argv[1], sys.argv[2]
vistos, faixas = set(), []
for nome in sorted(os.listdir(src)):
    if not nome.lower().endswith('.mp3'):
        continue
    caminho = os.path.join(src, nome)
    h = hashlib.md5(open(caminho, 'rb').read()).hexdigest()
    if h in vistos:
        continue  # faixa repetida no álbum
    vistos.add(h)
    titulo = re.sub(r'^\d+\s+HoliznaCC0\s+-\s+', '', nome)
    while titulo.lower().endswith('.mp3'):
        titulo = titulo[:-4]
    slug = unicodedata.normalize('NFKD', titulo).encode('ascii', 'ignore').decode().lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    saida = os.path.join(dst, f'{slug}.m4a')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', caminho, '-af', 'loudnorm=I=-20:TP=-1.5:LRA=11',
                    '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '96k', '-map_metadata', '-1', saida], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', saida],
                               capture_output=True, text=True, check=True).stdout)
    faixas.append({'id': slug, 'titulo': titulo, 'duracaoS': round(dur), 'bytes': os.path.getsize(saida)})
playlist = {
    'versao': 1,
    'nome': 'Lofi a bordo',
    'autor': 'HoliznaCC0',
    'album': 'Lo-fi And Chill',
    'licenca': 'CC0 1.0',
    'fonte': 'https://freemusicarchive.org/music/holiznacc0/lo-fi-and-chill',
    'faixas': faixas,
}
json.dump(playlist, open(os.path.join(dst, 'playlist.json'), 'w'), ensure_ascii=False, indent=1)
total = sum(f['bytes'] for f in faixas)
print(f"{len(faixas)} faixas, {sum(f['duracaoS'] for f in faixas) / 60:.0f} min, {total / 1e6:.1f} MB")
PY
