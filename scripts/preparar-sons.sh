#!/usr/bin/env bash
# Prepara os sons de fundo do voo (assets/sons/*.m4a) a partir das gravações originais.
# Os originais ficam fora do repositório (pasta "Sons" do projeto, ~270 MB). Todos são CC0 (Freesound):
#   504724 flood-mix, "Embraer 175 approach and landing"     → motores (0:20 a 5:00: só a aproximação, antes do pouso)
#   412003 triadtravelogues, "Airplane from Beijing to Moscow" → cabine
#   645922 BonnyOrbit, "Heavy rain getting stronger under a roof" → chuva (abafada, misturada com a cabine)
#   ruído branco: gerado aqui, sem licença.
# Cada som é normalizado (-20 LUFS) e vira um loop sem emenda: o fim faz crossfade de 6 s com o começo.
# Uso: scripts/preparar-sons.sh <pasta dos originais>
set -euo pipefail
S="${1:?pasta dos originais}"
T="$(mktemp -d)"
prep() { ffmpeg -y -v error -i "$1" -af "$2aresample=44100,loudnorm=I=-20:TP=-2:LRA=11" -ac "$3" -ar 44100 -c:a pcm_s16le "$4"; }
loop() { ffmpeg -y -v error -ss "$3" -i "$1" -t "$3" -i "$1" -filter_complex "[0:a][1:a]acrossfade=d=$3:c1=tri:c2=tri[o]" -map "[o]" -c:a aac -b:a "$4" "$2"; }

prep "$S/504724__flood-mix__embraer-175-approach-and-landing.wav" "atrim=20:300,asetpts=PTS-STARTPTS," 1 "$T/motores.wav"
prep "$S/412003__triadtravelogues__airplane-from-beijing-to-moscow.wav" "atrim=2:188,asetpts=PTS-STARTPTS," 1 "$T/cabine.wav"
ffmpeg -y -v error -i "$S/412003__triadtravelogues__airplane-from-beijing-to-moscow.wav" -i "$S/645922__bonnyorbit__heavy-rain-getting-stronger-under-a-roof.wav" \
  -filter_complex "[0:a]atrim=10:150,asetpts=PTS-STARTPTS,aresample=44100,pan=stereo|c0=c0|c1=c1,volume=0.55[cab];[1:a]atrim=0:140,asetpts=PTS-STARTPTS,aresample=44100,lowpass=f=2800,highpass=f=120,volume=1.6[ch];[cab][ch]amix=inputs=2:normalize=0[m]" \
  -map "[m]" -c:a pcm_s16le "$T/chuva_mix.wav"
prep "$T/chuva_mix.wav" "" 2 "$T/chuva.wav"
ffmpeg -y -v error -f lavfi -i "anoisesrc=color=white:amplitude=0.4:duration=66:seed=7" -af "lowpass=f=9000" -c:a pcm_s16le "$T/ruido.wav"
prep "$T/ruido.wav" "" 1 "$T/ruido-branco.wav"

mkdir -p assets/sons
loop "$T/motores.wav" assets/sons/motores.m4a 6 64k
loop "$T/cabine.wav" assets/sons/cabine.m4a 6 64k
loop "$T/chuva.wav" assets/sons/chuva.m4a 6 96k
loop "$T/ruido-branco.wav" assets/sons/ruido-branco.m4a 6 48k
rm -rf "$T"
ls -la assets/sons
