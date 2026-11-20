"""Gera as miniaturas da folha "Vista da janela" (04E) a partir dos renders do Blender.

Céu em degradê + terra (base_dia) + asa e/ou moldura, em 192 × 256 (96 × 128 dp a 2x).
Com asa e Asa e motor ainda não têm render: não geram miniatura (a folha mostra "Em breve").
Uso: python3 scripts/gerar-miniaturas-da-janela.py
"""
from PIL import Image

W, H = 192, 256
A = 'assets/janela/'


def paisagem():
    ceu = Image.new('RGB', (W, H))
    px = ceu.load()
    for y in range(H):
        t = y / H
        cor = (int(70 + 90 * t), int(120 + 80 * t), int(190 + 40 * t))
        for x in range(W):
            px[x, y] = cor
    terra = Image.open(A + 'base_dia.jpg').convert('RGB').crop((700, 600, 1340, 1240)).resize((W, int(H * 0.62)))
    ceu.paste(terra, (0, H - terra.height))
    return ceu.convert('RGBA')


def camada(nome):
    return Image.open(A + nome).convert('RGBA').resize((W, H), Image.LANCZOS)


VISTAS = {
    'so-janela': ['moldura_dia.webp'],
    'asa-completa': ['asa_dia.webp', 'moldura_dia.webp'],
    'sem-moldura': ['asa_dia.webp'],
}
for nome, camadas in VISTAS.items():
    im = paisagem()
    for c in camadas:
        im = Image.alpha_composite(im, camada(c))
    im.convert('RGB').save(f'assets/janela/miniatura_{nome}.jpg', quality=82)
    print(nome)
