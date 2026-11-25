import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Path,
  Picture,
  Shader,
  Skia,
  createPicture,
  useFont,
  useImage,
} from '@shopify/react-native-skia';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { color, Icon, IconButton, space, Text } from '@/ds';
import { motion, timing } from '@/ds/motion';
import { t } from '@/i18n';
import { sun } from '@/janela/geo';
import { FORA, cantoDoMosaico, criarMosaico, nivelDaNoite, nivelDeLonge, nivelDoDia, nivelPara, type Mosaico } from './blocos';
import { cameraBasis, destino, FOV, grandeCirculo, project, projectZ, sunEcef, type Camera } from './camera';
import { SKSL_GLOBO, TEX } from './shader';

const effect = Skia.RuntimeEffect.Make(SKSL_GLOBO)!;
const K = 1 / Math.tan(FOV / 2);
const TAN = Math.tan(FOV / 2);
const RAD = Math.PI / 180;
const PR = PixelRatio.get();

// Cidades com 150 mil habitantes ou mais (GeoNames), em ordem decrescente de população:
// [nome, lat, lon, população].
const CIDADES: [string, number, number, number][] = require('../../assets/globo/cidades.json');

export type Ponto = { lat: number; lon: number };
export type ModoGlobo = 'planeta' | 'seguir';

type Props = {
  width: number;
  height: number;
  /** Posição atual do avião e rumo (graus, a partir do norte). */
  aviao: Ponto & { rumo: number };
  origem: Ponto & { nome: string };
  destino: Ponto & { nome: string };
  /** Posições reais desde a decolagem (histórico do coletor). Vazia: a rota voada sai reta da origem. */
  trilha?: Ponto[];
  /** Distância do topo do globo até o botão de centralizar (fica abaixo do painel superior). */
  topoDosControles?: number;
  /** planeta = de cima, norte para cima; seguir = câmera inclinada atrás do avião, no rumo dele. */
  modo: ModoGlobo;
  /** Instante (ms) para a posição do sol. */
  instante: number;
};

// Distância e inclinação da câmera em cada modo (km e radianos).
const CAMERA = {
  planeta: { dist: 1800, tilt: 0 },
  seguir: { dist: 700, tilt: 55 * RAD },
} as const;
const DIST_MIN = 120;
const DIST_MAX = 26000;

/** Ângulo equivalente a `alvo` mais próximo de `atual` (evita a volta longa ao animar o rumo). */
function maisPerto(atual: number, alvo: number) {
  'worklet';
  const d = ((((alvo - atual) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return atual + d;
}

/**
 * Globo do voo (ADR-11, em teste). A Terra é desenhada em SkSL com os blocos da NASA no nível de
 * detalhe do zoom; rota, avião e cidades são projetados por cima com a mesma câmera.
 * Gestos: pinça para aproximar e afastar, arrastar para mover o mapa. "Centralizar" volta ao avião.
 */
export function Globo({ width, height, aviao, origem, destino: chegada, trilha = [], topoDosControles = space[16], modo, instante }: Props) {
  const dia = useImage(require('../../assets/globo/terra_dia.jpg'));
  const noite = useImage(require('../../assets/globo/terra_noite.jpg'));
  const fonte = useFont(require('@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf'), 11);

  // Câmera.
  const lat = useSharedValue(aviao.lat);
  const lon = useSharedValue(aviao.lon);
  const dist = useSharedValue<number>(CAMERA[modo].dist);
  const tilt = useSharedValue<number>(CAMERA[modo].tilt);
  const heading = useSharedValue(modo === 'seguir' ? aviao.rumo * RAD : 0);
  const sol = useSharedValue(sunEcef(instante));
  const [livre, setLivre] = useState(false);

  // Avião e rota.
  const aviaoSV = useSharedValue(aviao);
  const voado = useSharedValue<[number, number][]>([]);
  const restante = useSharedValue<[number, number][]>([]);

  // Trecho voado: origem → posições reais da trilha, em grande círculo entre cada par (a cada 12 km).
  // Assim a linha acompanha as curvas do voo e termina sempre no avião, sem degraus.
  const voadoAteATrilha = useMemo(() => {
    const pontos: [number, number][] = [[origem.lat, origem.lon], ...trilha.map((p) => [p.lat, p.lon] as [number, number])];
    const linha: [number, number][] = [pontos[0]];
    for (let i = 1; i < pontos.length; i++) linha.push(...grandeCirculo(pontos[i - 1], pontos[i], 12).slice(1));
    return linha;
  }, [origem.lat, origem.lon, trilha]);

  useEffect(() => {
    sol.value = sunEcef(instante);
  }, [instante, sol]);

  useEffect(() => {
    aviaoSV.value = aviao;
    const ultimo = voadoAteATrilha[voadoAteATrilha.length - 1];
    voado.value = [...voadoAteATrilha, ...grandeCirculo(ultimo, [aviao.lat, aviao.lon], 12).slice(1)];
    restante.value = grandeCirculo([aviao.lat, aviao.lon], [chegada.lat, chegada.lon], 12);
  }, [aviao, voadoAteATrilha, chegada.lat, chegada.lon, aviaoSV, voado, restante]);

  // Segue o avião (e reage à troca de modo), a menos que o usuário tenha movido o mapa.
  useEffect(() => {
    if (livre) return;
    const cfg = timing(motion.duration.medium4);
    lat.value = withTiming(aviao.lat, cfg);
    lon.value = withTiming(aviao.lon, cfg);
    tilt.value = withTiming(CAMERA[modo].tilt, cfg);
    heading.value = withTiming(maisPerto(heading.value, modo === 'seguir' ? aviao.rumo * RAD : 0), cfg);
  }, [aviao.lat, aviao.lon, aviao.rumo, modo, livre, lat, lon, tilt, heading]);

  // Trocar de modo volta ao avião, na distância padrão do modo (mesmo se o usuário tinha movido o mapa).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLivre(false);
    dist.value = withTiming(CAMERA[modo].dist, timing(motion.duration.medium4));
  }, [modo, dist]);

  const centralizar = useCallback(() => {
    setLivre(false);
    dist.set(withTiming(CAMERA[modo].dist, timing(motion.duration.medium4)));
  }, [modo, dist]);

  // ── Gestos ──
  const distInicial = useSharedValue(0);
  const pinca = usePinchGesture({
    onBegin: () => {
      'worklet';
      distInicial.set(dist.get());
    },
    onUpdate: (e) => {
      'worklet';
      dist.set(Math.min(DIST_MAX, Math.max(DIST_MIN, distInicial.get() / e.scale)));
    },
  });
  const arrasto = usePanGesture({
    maxPointers: 1,
    onActivate: () => {
      'worklet';
      scheduleOnRN(setLivre, true);
    },
    onUpdate: (e) => {
      'worklet';
      // km por ponto da tela, no alvo; o mapa anda junto com o dedo.
      const km = (dist.get() * 2 * TAN) / height;
      const h = heading.get();
      const leste = (-e.changeX * Math.cos(h) + e.changeY * Math.sin(h)) * km;
      const norte = (e.changeX * Math.sin(h) + e.changeY * Math.cos(h)) * km;
      const la = Math.max(-85, Math.min(85, lat.get() + norte / 111.2));
      lat.set(la);
      lon.set(((lon.get() + leste / (111.2 * Math.cos(la * RAD)) + 540) % 360) - 180);
    },
  });
  const gestos = useSimultaneousGestures(pinca, arrasto);

  const camera = useDerivedValue<Camera>(() => ({
    lat: lat.value,
    lon: lon.value,
    dist: dist.value,
    tilt: tilt.value,
    heading: heading.value,
  }));

  // ── Blocos da NASA: mosaicos perto, longe e noite, no nível do zoom ──
  // Imagem e posição de cada mosaico num só valor compartilhado: o shader lê as duas no mesmo quadro.
  // Antes a imagem vinha do estado do React e a posição dos uniforms; por um quadro a imagem nova
  // era desenhada na posição velha (build-55: a Antártida "pulava" grande ao girar o globo).
  const perto = useSharedValue<Mosaico>({ imagem: null, b: FORA, sentinel: false });
  const longe = useSharedValue<Mosaico>({ imagem: null, b: FORA, sentinel: false });
  const noiteM = useSharedValue<Mosaico>({ imagem: null, b: FORA, sentinel: false });
  const setPerto = useCallback((m: Mosaico) => perto.set(m), [perto]);
  const setLonge = useCallback((m: Mosaico) => longe.set(m), [longe]);
  const setNoiteM = useCallback((m: Mosaico) => noiteM.set(m), [noiteM]);
  const mosaicos = useRef<ReturnType<typeof criarMosaico>[] | null>(null);
  if (mosaicos.current == null) {
    mosaicos.current = [
      criarMosaico('dia', TEX.perto, setPerto),
      criarMosaico('dia', TEX.longe, setLonge),
      criarMosaico('noite', TEX.noiteMosaico, setNoiteM),
    ];
  }
  const atualizarBlocos = useCallback((z: number, la: number, lo: number) => {
    const [mp, ml, mn] = mosaicos.current!;
    // De perto (nível 8 em diante) o dia vem do Sentinel-2; o de longe continua no Blue Marble,
    // que cobre o mar (onde não há bloco do Sentinel-2).
    mp.atualizar(nivelDoDia(z), la, lo);
    ml.atualizar(nivelDeLonge(z), la, lo);
    // Luzes da cidade só quando a região vista está de noite ou no fim de tarde (build-38: o mosaico
    // noturno era o maior gasto do globo e era baixado mesmo de dia). De longe (nível baixo) a vista
    // pega o mundo todo, e os blocos são poucos: baixa sempre.
    const elevacaoDoSol = (sun(Date.now(), la, lo).el * 180) / Math.PI;
    if (z < 4 || elevacaoDoSol < 12) mn.atualizar(nivelDaNoite(z), la, lo);
  }, []);

  useAnimatedReaction(
    () => {
      const c = camera.value;
      const kmPorPixel = (c.dist * 2 * TAN) / (height * PR);
      const z = nivelPara(kmPorPixel);
      // Inclinada, a câmera vê mais à frente: centra os blocos um pouco adiante.
      const frente = c.dist * Math.sin(c.tilt) * 0.6;
      const alvo = frente > 1 ? destino(c.lat, c.lon, c.heading / RAD, frente) : [c.lat, c.lon];
      const [r, col] = cantoDoMosaico(nivelDoDia(z), alvo[0], alvo[1]);
      return { chave: `${z}/${r}/${col}`, z, la: alvo[0], lo: alvo[1] };
    },
    (atual, anterior) => {
      if (!anterior || atual.chave !== anterior.chave) scheduleOnRN(atualizarBlocos, atual.z, atual.la, atual.lo);
    },
  );

  const uniforms = useDerivedValue(() => {
    const b = cameraBasis(camera.value);
    const p = perto.value;
    const l = longe.value;
    const n = noiteM.value;
    const bPerto = p.imagem ? p.b : FORA;
    const bLonge = l.imagem ? l.b : FORA;
    const bNoite = n.imagem ? n.b : FORA;
    const s2Perto = p.sentinel ? 1 : 0;
    const s2Noite = n.sentinel ? 1 : 0;
    return { res: [width, height], cp: b.pos, cf: b.f, cr: b.right, cu: b.up, k: K, sunD: sol.value, bPerto, bLonge, bNoite, s2Perto, s2Noite };
  });

  // ── Rota: trecho voado em linha; o que falta em pontos no chão (diminuem com a distância) ──
  const pathVoado = useDerivedValue(() => {
    const b = cameraBasis(camera.value);
    const p = Skia.PathBuilder.Make();
    let aberto = false;
    for (const [la, lo] of voado.value) {
      const s = project(la, lo, b, width, height);
      if (!s) {
        aberto = false;
        continue;
      }
      if (aberto) p.lineTo(s[0], s[1]);
      else p.moveTo(s[0], s[1]);
      aberto = true;
    }
    return p.detach();
  });
  const pathRestante = useDerivedValue(() => {
    const c = camera.value;
    const b = cameraBasis(c);
    const p = Skia.PathBuilder.Make();
    const pts = restante.value;
    // Com a câmera longe, pontos a cada 12 km ficariam colados: pula alguns.
    const passo = Math.max(1, Math.round(c.dist / 900));
    for (let i = 0; i < pts.length; i += passo) {
      const s = projectZ(pts[i][0], pts[i][1], b, width, height);
      if (!s) continue;
      const r = Math.min(2.6, Math.max(0.7, (2.2 * c.dist) / s[2]));
      p.addCircle(s[0], s[1], r);
    }
    return p.detach();
  });

  // ── Cidades: mais cidades conforme aproxima, sem sobrepor rótulos ──
  const cidades = useDerivedValue(() => {
    const c = camera.value;
    const b = cameraBasis(c);
    const minPop = c.dist > 9000 ? 8e6 : c.dist > 4000 ? 3e6 : c.dist > 2200 ? 1e6 : c.dist > 1200 ? 4e5 : 1.5e5;
    const ocupado: Record<string, boolean> = {};
    return createPicture((canvas) => {
      if (!fonte) return;
      const ponto = Skia.Paint();
      ponto.setColor(Skia.Color('rgba(255,255,255,0.75)'));
      const texto = Skia.Paint();
      texto.setColor(Skia.Color('rgba(255,255,255,0.8)'));
      const sombra = Skia.Paint();
      sombra.setColor(Skia.Color('rgba(1,9,17,0.85)'));
      sombra.setStyle(1);
      sombra.setStrokeWidth(3);
      for (const [nome, la, lo, pop] of CIDADES) {
        if (pop < minPop) break;
        const s = project(la, lo, b, width, height);
        if (!s || s[0] < 0 || s[1] < 0 || s[0] > width || s[1] > height) continue;
        const gx = Math.floor(s[0] / 90);
        const gy = Math.floor(s[1] / 22);
        if (ocupado[`${gx},${gy}`] || ocupado[`${gx + 1},${gy}`]) continue;
        ocupado[`${gx},${gy}`] = true;
        ocupado[`${gx + 1},${gy}`] = true;
        canvas.drawCircle(s[0], s[1], 2, ponto);
        canvas.drawText(nome, s[0] + 5, s[1] + 4, sombra, fonte);
        canvas.drawText(nome, s[0] + 5, s[1] + 4, texto, fonte);
      }
    });
  });

  // ── Avião e cidades da rota (componentes de tela que acompanham a câmera) ──
  const estiloAviao = useAnimatedStyle(() => {
    const b = cameraBasis(camera.value);
    const a = aviaoSV.value;
    const s = project(a.lat, a.lon, b, width, height);
    if (!s) return { opacity: 0 };
    const [fl, fo] = destino(a.lat, a.lon, a.rumo, 20);
    const f = project(fl, fo, b, width, height);
    const ang = f ? Math.atan2(f[1] - s[1], f[0] - s[0]) : 0;
    return {
      opacity: 1,
      transform: [{ translateX: s[0] - AVIAO / 2 }, { translateY: s[1] - AVIAO / 2 }, { rotate: `${ang}rad` }],
    };
  });
  const estiloOrigem = useRotulo(camera, origem, width, height);
  const estiloDestino = useRotulo(camera, chegada, width, height);

  const vazio = useMemo(() => {
    const s = Skia.Surface.Make(1, 1);
    return s ? s.makeImageSnapshot() : null;
  }, []);
  const pronto = !!dia && !!noite && !!vazio;
  const imgPerto = useDerivedValue(() => perto.value.imagem ?? vazio);
  const imgLonge = useDerivedValue(() => longe.value.imagem ?? vazio);
  const imgNoite = useDerivedValue(() => noiteM.value.imagem ?? vazio);
  const ret = (w: number, h: number) => ({ x: 0, y: 0, width: w, height: h });

  return (
    <GestureDetector gesture={gestos}>
      <View style={{ width, height, backgroundColor: color.bg.app }}>
        {pronto && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill>
              <Shader source={effect} uniforms={uniforms}>
                <ImageShader image={dia} tx="repeat" ty="clamp" fit="fill" rect={ret(TEX.dia.w, TEX.dia.h)} />
                <ImageShader image={noite} tx="repeat" ty="clamp" fit="fill" rect={ret(TEX.noite.w, TEX.noite.h)} />
                <ImageShader image={imgPerto} tx="decal" ty="decal" fit="fill" rect={ret(TEX.perto, TEX.perto)} />
                <ImageShader image={imgLonge} tx="decal" ty="decal" fit="fill" rect={ret(TEX.longe, TEX.longe)} />
                <ImageShader
                  image={imgNoite}
                  tx="decal"
                  ty="decal"
                  fit="fill"
                  rect={ret(TEX.noiteMosaico, TEX.noiteMosaico)}
                />
              </Shader>
            </Fill>
            <Picture picture={cidades} />
            <Path path={pathRestante} color={color.text.secondary} />
            <Path path={pathVoado} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" color={color.accent.default} />
          </Canvas>
        )}

        <Animated.View pointerEvents="none" style={[styles.ponto, estiloOrigem]}>
          <View style={styles.pontoMarca} />
          <Text variant="Label/Strong 14" style={styles.pontoTexto}>
            {origem.nome}
          </Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.ponto, estiloDestino]}>
          <View style={styles.pontoMarca} />
          <Text variant="Label/Strong 14" style={styles.pontoTexto}>
            {chegada.nome}
          </Text>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.aviao, estiloAviao]}>
          <View style={styles.halo} />
          <Icon name="plane" size={28} color={color.accent.default} />
        </Animated.View>

        {/* Mesmo IconButton de Ajustes, diário e som (Alberto, build-47: estava maior que eles). */}
        <IconButton icon="centralizar" accessibilityLabel={t('globo.centralizar')} onPress={centralizar} style={[styles.centralizar, { top: topoDosControles }]} />
      </View>
    </GestureDetector>
  );
}

/** Posição na tela de uma cidade da rota (some quando fica atrás do globo). */
function useRotulo(camera: SharedValue<Camera>, ponto: Ponto, w: number, h: number) {
  const { lat, lon } = ponto;
  return useAnimatedStyle(() => {
    const s = project(lat, lon, cameraBasis(camera.value), w, h);
    if (!s) return { opacity: 0 };
    return { opacity: 1, transform: [{ translateX: s[0] - PONTO / 2 }, { translateY: s[1] - PONTO / 2 }] };
  });
}

const AVIAO = 44;
const PONTO = 10;

const styles = StyleSheet.create({
  aviao: { position: 'absolute', left: 0, top: 0, width: AVIAO, height: AVIAO, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: AVIAO,
    height: AVIAO,
    borderRadius: AVIAO / 2,
    backgroundColor: color.accent.default,
    opacity: 0.25,
  },
  ponto: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: space[6] },
  pontoMarca: { width: PONTO, height: PONTO, borderRadius: PONTO / 2, backgroundColor: color.text.primary },
  pontoTexto: { textShadowColor: color.bg.flight, textShadowRadius: 4 },
  centralizar: { position: 'absolute', right: space[16] },
});
