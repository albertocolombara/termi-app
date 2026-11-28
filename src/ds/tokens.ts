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
  'white/a03': 'rgba(255,255,255,0.03)',
  'white/a05': 'rgba(255,255,255,0.05)',
  'white/a06': 'rgba(255,255,255,0.06)',
  'white/a08': 'rgba(255,255,255,0.08)',
  'white/a10': 'rgba(255,255,255,0.10)',
  'white/a12': 'rgba(255,255,255,0.12)',
  'white/a14': 'rgba(255,255,255,0.14)',
  'white/a15': 'rgba(255,255,255,0.15)',
  'white/a20': 'rgba(255,255,255,0.20)',
  'white/a25': 'rgba(255,255,255,0.25)',
  'white/a40': 'rgba(255,255,255,0.40)',
  'white/a50': 'rgba(255,255,255,0.50)',
  'white/a60': 'rgba(255,255,255,0.60)',
  'white/a65': 'rgba(255,255,255,0.65)',
  'white/a80': 'rgba(255,255,255,0.80)',
  'white/a95': 'rgba(255,255,255,0.95)',
  'black/a25': 'rgba(0,0,0,0.25)',
  'black/a55': 'rgba(0,0,0,0.55)',
  'yellow/a05': 'rgba(255,198,41,0.05)',
  'yellow/a10': 'rgba(255,198,41,0.10)',
  'yellow/a14': 'rgba(255,198,41,0.14)',
  'yellow/a20': 'rgba(255,198,41,0.20)',
  'green/a14': 'rgba(68,206,50,0.14)',
  'orange-intl/a05': 'rgba(244,74,34,0.05)',
  'orange-intl/a08': 'rgba(219,70,35,0.08)',
  /** Papel físico marfim quente (03 Cartão de embarque, 05 Pouso, M2 Passaporte). */
  'paper/ivory': '#F1EFEA',
  'paper/ink': '#1C1A15',
  /** Tintas arquivais de carimbo do passaporte (Design System v2). */
  'ink/amber': '#B37B16',
  'ink/forest': '#2B7A4B',
  'ink/navy': '#365E8D',
  'ink/terracotta': '#B3543A',
  'ink/plum': '#9E4061',
  /** Gradiente pôr do sol do card de sequência diária (Design System v2). */
  'sunset/top': '#EB7324',
  'sunset/mid': '#CC4F14',
  'sunset/deep': '#A3380D',
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
    card: p['white/a05'], // card v4 Clean sem borda externa
    cardMuted: p['white/a03'], // card recuado (itens já conquistados)
    paper: p['paper/ivory'], // material físico marfim (embarque, pouso, passaporte)
  },
  accent: {
    default: p['yellow/500'], // CTAs, seleção, progresso
    subtle: p['yellow/900'], // fundo de selos
    container: p['yellow/a10'], // fundo suave de opção/plano selecionado
    badge: p['yellow/a14'], // pílula Plus e badges quentes
    on: p['brown/950'], // conteúdo sobre o amarelo
  },
  /** Laranja do Termi: personagem, marca e ícones de voo. Nunca para avisos. */
  brand: {
    termi: p['orange/500'],
  },
  status: {
    warning: p['orange-intl/500'],
    success: p['green/500'],
    /** Fundo da etiqueta "Pousou" e "Radar ao vivo": verde a 14%. */
    successSubtle: p['green/a14'],
    successContainer: p['green/a14'],
  },
  text: {
    primary: p['white/100'],
    secondary: p['white/a80'],
    tertiary: p['white/a65'],
    muted: p['white/a60'],
    accent: p['yellow/500'],
    onAccent: p['brown/950'],
    onPaper: p['paper/ink'],
    /** Figma `text/disabled` (branco a 38%): itens indisponíveis, como a loja de cidade sem souvenir. */
    disabled: 'rgba(255,255,255,0.38)',
  },
  /** Figma `state/*`: estados interativos de superfície e itens indisponíveis. */
  state: {
    disabledContainer: 'rgba(255,255,255,0.12)',
    pressedSurface: p['white/a14'],
  },
  /** Cartão de embarque (papel marfim quente `#F1EFEA`, Figma v4 Clean). */
  cartao: {
    papel: p['paper/ivory'],
    texto: p['paper/ink'],
    textoMedio: 'rgba(28,26,21,0.80)',
    textoSecundario: 'rgba(28,26,21,0.62)',
    tracejado: 'rgba(28,26,21,0.28)',
    cabecalho: p['white/a05'],
    bordaDoCabecalho: p['white/a65'],
    /** Sombra da fenda da impressora sobre o bilhete sendo impresso. */
    sombraDaFenda: 'rgba(0,0,0,0.35)',
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
  /** Tintas arquivais dos carimbos do passaporte (Design System v2 · papel marfim `#F1EFEA`). */
  carimbo: {
    papel: p['paper/ivory'],
    bordaDoPapel: 'rgba(28,26,21,0.10)',
    tintas: [p['ink/amber'], p['ink/forest'], p['ink/navy'], p['ink/terracotta'], p['ink/plum']],
  },
  /** Gradiente pôr do sol do card de sequência diária (Design System v2). */
  streak: {
    sunsetTop: p['sunset/top'],
    sunsetMid: p['sunset/mid'],
    sunsetDeep: p['sunset/deep'],
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
  // Globo de rotas do Início e das Estatísticas, em preto e branco (Alberto, build-66 e build-70):
  // o mar vai até o fundo do app (#141218); rotas e pontos seguem amarelos. O globo do voo não usa isto.
  globo: {
    terra: '#B8B7BD',
    marCentro: '#2A2830',
    marBorda: '#141218',
    halo: 'rgba(255,255,255,0.08)',
    cartao: '#201D25',
    sombraDoCartao: 'rgba(0,0,0,0.53)',
  },
  /** Onboarding (Figma "Onboarding · v3"; cores locais das telas, sem variável no Figma). */
  onboarding: {
    /** Fundo da opção marcada no OB4: amarelo a 4%. */
    opcaoMarcada: 'rgba(255,198,41,0.04)',
    /** Brilho de "de verdade." no OB2: sombra de 24 em amarelo a 45%. */
    brilhoDoDestaque: 'rgba(255,217,77,0.45)',
    /** Fim do degradê do contador do OB1. */
    fimDoContador: '#414141',
    /** Cartão das notificações de exemplo do OB9 (como no Android). */
    notificacao: '#1A211F',
    /** Borda da etiqueta "Vista do Plus" do OB10. */
    vistaDoPlus: '#D4B061',
  },
  border: {
    subtle: p['white/a10'],
    pillOutline: p['white/a12'],
    default: p['white/a15'],
    input: p['white/a20'],
    strong: p['white/a25'],
    control: p['white/a40'],
    accent: p['yellow/500'],
  },
} as const;

/**
 * Loja de souvenirs (Figma v3: L1, L2, L2b). Luz quente da vitrine (amarelo a 16%), reflexo do vidro,
 * sombra da medalha na prateleira e os metais da medalha provisória, usada até os renders de cada país
 * entrarem no catálogo (`imagem2d`).
 */
export const loja = {
  luzDaVitrine: 'rgba(255,204,64,0.05)', // bem leve (Alberto, build-70)
  reflexo: 'rgba(255,255,255,0.05)',
  /** Luz fria atrás da medalha em destaque na mala (Figma M1b: "Luz de vitrine"). */
  luzDaMala: 'rgba(219,227,240,0.13)',
  sombraDaMala: 'rgba(0,0,0,1)',
  sombra: 'rgba(0,0,0,0.45)',
  metal: {
    niquel: { claro: '#EDEDF0', escuro: '#8E8E96', texto: '#3A3A40' },
    cobre: { claro: '#F2C2A0', escuro: '#9A5A35', texto: '#4A2412' },
    latao: { claro: '#F6E3A6', escuro: '#A5822E', texto: '#4A3A10' },
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
  28: 28,
  32: 32,
  40: 40,
  48: 48,
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
  cta: 16,
  card: 20,
  '3xl': 24, // vitrine da loja e card de sequência
  sheet: 28,
  screen: 28,
  full: 999,
} as const;

// ───────── Tipografia ─────────
// As fontes são embutidas pelo plugin do expo-font (app.config.ts): "Geist" (400/500/600) e a Geist Pixel.
// Regra v4 Clean (Design System v2): -3% de tracking em todos os títulos/textos grandes (>= 20px) em Geist;
// 0% nos textos < 20px. Nunca usar Geist Mono.
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

/** Estilos de texto. Nomes iguais aos do Figma ("Grupo/Nome tamanho") + escala Material 3 (`M3/*`). */
export const typography = {
  'Display/Pixel 32': type(fontFamily.pixel, '400', 32, -6, 120),
  'Display/Data 52': type(S, '600', 52, -3, 120),
  'Heading/Screen 32': type(S, '600', 32, -3, 120),
  'Heading/Data 24': type(S, '500', 24, -3, 120),
  'Heading/Sheet 22': type(S, '600', 22, -3, 130),
  'Button/Label 16': type(S, '500', 16, 0, 125),
  'Button/Label Strong 16': type(S, '600', 16, 0, 125),
  'Button/Label 14': type(S, '500', 14, 0, 130),
  'Nav/Title 20': type(S, '400', 20, -3, 130),
  'Body/Large 16': type(S, '400', 16, 0, 135),
  'Body/Large Medium 16': type(S, '500', 16, 0, 135),
  'Body/Medium 14': type(S, '400', 14, 0, 135),
  'Label/Medium 14': type(S, '500', 14, 0, 130),
  'Label/Strong 14': type(S, '600', 14, 0, 130),
  'Body/Small 13': type(S, '400', 13, 0, 135),
  'Caption/Medium 12': type(S, '500', 12, 0, 130),
  'Caption/Regular 12': type(S, '400', 12, 0, 130),
  'Caption/Strong 12': type(S, '600', 12, 0, 130),
  // Escala Material 3 (Design System v2 · 01B Typography & Type Scale)
  'M3/Display Medium 48': type(S, '400', 48, -3, 112.5),
  'M3/Display Small 36': type(S, '400', 36, -3, 116.7),
  'M3/Headline Large 30': type(S, '500', 30, -3, 120),
  'M3/Headline Small 24': type(S, '500', 24, -3, 125),
  'M3/Title Large 20': type(S, '500', 20, -3, 130),
  'M3/Title Medium 16': type(S, '500', 16, 0, 137.5),
  'M3/Body Large 15': type(S, '400', 15, 0, 146.7),
  'M3/Body Medium 13.5': type(S, '400', 13.5, 0, 140.7),
  'M3/Label Large 16': type(S, '600', 16, 0, 125),
  'M3/Label Small 12': type(S, '500', 12, 0, 133.3),
} satisfies Record<string, TextStyle>;
export type TypographyVariant = keyof typeof typography;

// ───────── Efeitos ─────────
// "Glass/Blur 12" é um desfoque de fundo: está no componente `Glass` (expo-blur), não aqui.
export const effects = {
  'Glow/Accent': { boxShadow: `0 0 6px 0 ${p['yellow/500']}` },
  'Shadow/Small': { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.6)' },
  'Shadow/Medal': { boxShadow: '0 14px 28px 0 rgba(0,0,0,0.50)' },
  'Shadow/Paper': { boxShadow: '0 10px 24px 0 rgba(0,0,0,0.35)' },
  'Shadow/Streak Sunset': { boxShadow: '0 12px 28px 0 rgba(230,97,20,0.28)' },
  'Shadow/Floating Card': { boxShadow: '0 10px 22px 0 rgba(0,0,0,0.45)' },
} satisfies Record<string, ViewStyle>;

// ───────── Tamanhos de toque ─────────
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
