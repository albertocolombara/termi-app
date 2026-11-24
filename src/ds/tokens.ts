/**
 * Tokens do design system Termi · Focus Flights.
 * Espelho das variáveis do Figma (página "Design System"):
 * Primitivos → Cor (semântica) → Espaçamento → Raio, mais os estilos de texto e efeito.
 * Use sempre `color.*` (semântico) nos componentes; `palette.*` só para criar novos tokens.
 */
import type { TextStyle, ViewStyle } from 'react-native';

// ───────── Primitivos (coleção "Primitivos") ─────────
export const palette = {
  'yellow/500': '#FFC629',
  'yellow/900': '#2A2416',
  'orange/500': '#FF9F1C',
  /** Laranja internacional (aviação): avisos. */
  'orange-intl/500': '#F44A22',
  'green/500': '#44CE32',
  'brown/950': '#151106',
  'ink/950': '#010911',
  'ink/900': '#141218',
  'ink/850': '#1D1B20',
  'ink/800': '#26242A',
  'white/100': '#FFFFFF',
  'black/100': '#000000',
  'white/a05': 'rgba(255,255,255,0.05)',
  'white/a08': 'rgba(255,255,255,0.08)',
  'white/a10': 'rgba(255,255,255,0.10)',
  'white/a15': 'rgba(255,255,255,0.15)',
  'white/a20': 'rgba(255,255,255,0.20)',
  'white/a25': 'rgba(255,255,255,0.25)',
  'white/a40': 'rgba(255,255,255,0.40)',
  'white/a60': 'rgba(255,255,255,0.60)',
  'white/a65': 'rgba(255,255,255,0.65)',
  'white/a80': 'rgba(255,255,255,0.80)',
  'black/a25': 'rgba(0,0,0,0.25)',
  'black/a55': 'rgba(0,0,0,0.55)',
  'yellow/a05': 'rgba(255,198,41,0.05)',
  'yellow/a20': 'rgba(255,198,41,0.20)',
  'orange-intl/a05': 'rgba(244,74,34,0.05)',
  'orange-intl/a08': 'rgba(219,70,35,0.08)',
} as const;

const p = palette;

// ───────── Cor semântica (coleção "Cor", modo "Escuro") ─────────
export const color = {
  bg: {
    app: p['ink/900'], // fundo padrão das telas
    flight: p['ink/950'], // telas em voo
    sheet: p['ink/800'], // bottom sheets
    system: p['ink/850'], // barras do sistema
    scrim: p['black/a55'], // escurecimento atrás de sheets
  },
  surface: {
    subtle: p['white/a05'], // cards, banners, linhas de ação
    default: p['white/a08'], // chips, item selecionado, ícones
    strong: p['white/a10'], // botões de ícone, controle segmentado
    sunken: p['black/a25'], // linhas de tabela, segmento ativo
    track: p['white/a15'], // trilho do slider, toggle desligado
    inverse: p['white/100'], // knob, progresso inativo
  },
  accent: {
    default: p['yellow/500'], // CTAs, seleção, progresso
    subtle: p['yellow/900'], // fundo de selos
    on: p['brown/950'], // conteúdo sobre o amarelo
  },
  /** Laranja do Termi: personagem, marca e ícones de voo. Nunca para avisos. */
  brand: {
    termi: p['orange/500'],
  },
  status: {
    warning: p['orange-intl/500'],
    success: p['green/500'],
    /** Fundo da etiqueta "Pousou" (Figma M3b): verde a 16%. */
    successSubtle: 'rgba(68,206,50,0.16)',
  },
  text: {
    primary: p['white/100'],
    secondary: p['white/a80'],
    tertiary: p['white/a65'],
    muted: p['white/a60'],
    accent: p['yellow/500'],
    onAccent: p['brown/950'],
  },
  /** Cartão de embarque (papel branco, Figma "03 · Cartão de embarque"). */
  cartao: {
    papel: p['white/100'],
    texto: p['ink/900'],
    textoMedio: 'rgba(20,18,24,0.80)',
    textoSecundario: 'rgba(20,18,24,0.65)',
    tracejado: 'rgba(20,18,24,0.45)',
    cabecalho: p['white/a05'],
    bordaDoCabecalho: p['white/a65'],
  },
  /** Painel de partidas (Figma: "Painel de voos/Linha", Fundo=Base/Alternado). */
  painel: {
    linha: p['black/a25'],
    linhaAlternada: 'rgba(0,0,0,0.10)',
  },
  /** Ícones das categorias do motivo da viagem (Figma: "Categoria / Filtro" e "Categoria / Tag"). */
  categoria: {
    estudo: '#7FB0FF',
    trabalho: '#5ED6C8',
    leitura: '#C4A1FF',
    criacao: '#FF92BE',
    outro: '#B3B1BA',
  },
  /** Fundo das tags de categoria (Figma: "Categoria / Tag"): a cor da categoria a 10%. */
  categoriaFundo: {
    estudo: 'rgba(127,176,255,0.10)',
    trabalho: 'rgba(94,214,200,0.10)',
    leitura: 'rgba(196,161,255,0.10)',
    criacao: 'rgba(255,146,190,0.10)',
    outro: 'rgba(179,177,186,0.10)',
  },
  /** Carimbo não ganho na tela de pouso (Figma E7): branco a 30%. */
  carimboApagado: 'rgba(255,255,255,0.30)',
  /** Tintas dos carimbos do passaporte (Figma M2): ouro, laranja, rosa, verde e azul. */
  carimbo: {
    papel: '#EFEDD6',
    bordaDoPapel: '#C4C4C4',
    tintas: ['#C99B1D', '#FF9F1C', '#FF7A9C', '#44CE32', '#7FB2FF'],
  },
  /** Esteira de bagagem da tela de embarque (Figma "05 · Embarcando"; cores locais da ilustração). */
  esteira: {
    lona: '#24222B',
    emenda: '#0F0E13',
    base: '#17151C',
    brilho: p['white/a08'],
    sombra: 'rgba(0,0,0,0.45)',
  },
  /** Dial de tempo (Figma: "Dial de tempo / com voos"; cores locais do componente, sem variável). */
  dial: {
    barra: '#5B5F68', // voos no ar naquele tempo
    barraSemVoo: '#3A2420', // nenhum voo
    trilho: '#26282E',
    miolo: '#0F0F12',
    contornoDoBotao: '#141317',
    legenda: '#8C8F97',
  },
  /**
   * Plus (antes "Termi Premium" / "Primeira classe"; Figma v3, 24/11/2026): identidade simples, sem o
   * mascote. Fundo e borda amarelos bem leves, texto em Geist Pixel Grid amarelo.
   */
  plus: {
    fundo: p['yellow/a05'],
    borda: p['yellow/a20'],
  },
  /** Aviso em bloco (Figma: "Aviso · avisos desligados", X8). */
  aviso: {
    fundo: p['orange-intl/a05'],
    borda: p['orange-intl/a08'],
    /** Quadrado do ícone nos avisos em voo e no serviço de bordo (Figma v3): laranja a 10%. */
    icone: 'rgba(244,74,34,0.10)',
  },
  /** Globo de rotas do Início e das Estatísticas (Figma: "Globo/Detalhes da rota"; cores locais da ilustração). */
  globo: {
    terra: '#9FB4D6',
    marCentro: '#1E2742',
    marBorda: '#0E1220',
    halo: 'rgba(90,140,255,0.16)',
    cartao: '#201D25',
    sombraDoCartao: 'rgba(0,0,0,0.53)',
  },
  border: {
    subtle: p['white/a10'],
    default: p['white/a15'],
    input: p['white/a20'],
    strong: p['white/a25'],
    control: p['white/a40'],
    accent: p['yellow/500'],
  },
} as const;

/** Dourado da 1ª classe (selos premium). Gradiente linear 0° → direita. */
export const gold = {
  stops: [
    { offset: 0, color: '#D9992B' },
    { offset: 0.35, color: '#FFE8A3' },
    { offset: 0.6, color: '#F2C24F' },
    { offset: 1, color: '#C98A21' },
  ],
  border: 'rgba(255,242,196,0.70)',
  ink: '#2A1A04',
  /** Brilho dourado sob os selos (Figma: drop shadow amarelo). */
  glow: 'rgba(245,186,51,0.25)',
  /** Selo · Primeira classe: vidro dourado translúcido, borda clara e texto branco. */
  seal: {
    from: 'rgba(255,218,118,0.20)',
    to: 'rgba(255,198,41,0)',
    border: '#FFF2C4',
    glow: 'rgba(245,186,51,0.30)',
  },
} as const;

// ───────── Espaçamento (coleção "Espaçamento") ─────────
export const space = {
  0: 0,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;
export type Space = keyof typeof space;

/** Margem lateral padrão das telas (412 px de largura no Figma). */
export const screenGutter = space[16];

// ───────── Raio (coleção "Raio") ─────────
export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  tile: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  screen: 28,
  full: 999,
} as const;

// ───────── Tipografia ─────────
// As fontes são embutidas pelo plugin do expo-font (app.config.ts): "Geist" (400/500/600) e a Geist Pixel.
// Da Geist Pixel o app usa só a forma Grid, a que mais lembra um painel físico de aeroporto
// (decidido em 19/11/2026). Ela é um arquivo estático próprio, família "Geist Pixel Grid".
export const fontFamily = {
  sans: 'Geist',
  pixel: 'Geist Pixel Grid',
} as const;

type Weight = '400' | '500' | '600';

/** Converte as medidas do Figma (letter-spacing e line-height em %) para pontos do RN. */
function type(family: string, weight: Weight, size: number, letterSpacingPct: number, lineHeightPct: number): TextStyle {
  return {
    fontFamily: family,
    fontWeight: weight,
    fontSize: size,
    letterSpacing: +((size * letterSpacingPct) / 100).toFixed(2),
    lineHeight: Math.round((size * lineHeightPct) / 100),
  };
}

const S = fontFamily.sans;

/** Estilos de texto. Nomes iguais aos do Figma ("Grupo/Nome tamanho"). */
export const typography = {
  'Display/Pixel 32': type(fontFamily.pixel, '400', 32, -6, 120),
  'Display/Data 52': type(S, '600', 52, -3, 120),
  'Heading/Screen 32': type(S, '600', 32, -6, 120),
  'Heading/Data 24': type(S, '500', 24, -3, 120),
  'Heading/Sheet 22': type(S, '600', 22, 0, 130),
  'Button/Large 24': type(S, '600', 24, -3, 120),
  'Button/Medium 20': type(S, '600', 20, 0, 130),
  'Nav/Title 20': type(S, '400', 20, -3, 130),
  'Body/Large 16': type(S, '400', 16, -3, 130),
  'Body/Large Medium 16': type(S, '500', 16, 0, 130),
  'Body/Medium 14': type(S, '400', 14, -3, 130),
  'Label/Medium 14': type(S, '500', 14, 0, 130),
  'Label/Strong 14': type(S, '600', 14, 0, 130),
  'Body/Small 13': type(S, '400', 13, 0, 130),
  'Caption/Medium 12': type(S, '500', 12, -3, 130),
  'Caption/Regular 12': type(S, '400', 12, -3, 130),
  'Caption/Strong 12': type(S, '600', 12, 0, 130),
} satisfies Record<string, TextStyle>;
export type TypographyVariant = keyof typeof typography;

// ───────── Efeitos ─────────
// "Glass/Blur 12" é um desfoque de fundo: está no componente `Glass` (expo-blur), não aqui.
export const effects = {
  'Glow/Accent': { boxShadow: `0 0 6px 0 ${p['yellow/500']}` },
  'Shadow/Small': { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.6)' },
} satisfies Record<string, ViewStyle>;

// ───────── Tamanhos de toque ─────────
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
