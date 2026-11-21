import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PixelRatio, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  ColorMatrix,
  FilterMode,
  Image as SkiaImage,
  LinearGradient,
  MipmapMode,
  Picture,
  RadialGradient,
  Rect,
  Skia,
  SkImage,
  SkShader,
  TileMode,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ATLAS_PX, SKSL, uniformArray } from './shader';
import { makeAtlas, AtlasState } from './tiles';
import { makeAtlasDeNuvens, type NuvensState } from './nuvens';
import { pesoDaPassagemNoturna } from '@/domain/janela/nuvens';
import { sun } from './geo';

const effect = Skia.RuntimeEffect.Make(SKSL);
const EMPTY = Skia.Shader.MakeColor(Skia.Color('transparent'));
const OFF: [number, number, number] = [1e3, 1e3, 1];

// Qualidade: resolução da paisagem em relação à tela (as camadas do Blender ficam sempre nítidas).
export const QUALITY = [
  { label: 'Econômica', dpr: 0.75, hq: 0, near: false },
  { label: 'Normal', dpr: 1.25, hq: 1, near: true },
  { label: 'Máxima', dpr: 2, hq: 1, near: true },
];

// Mesmo filtro "warm" do protótipo web (sepia .5, saturação 1,25, brilho .97) na asa do entardecer.
const WARM = [
  0.7759, 0.2955, 0.0853, 0, 0,
  0.143, 0.8514, 0.0725, 0, 0,
  0.0963, 0.153, 0.6563, 0, 0,
  0, 0, 0, 1, 0,
];

const sm = (a: number, b: number, x: number) => {
  x = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const ease = (x: number) => {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
};

function texShader(img: SkImage | null): SkShader {
  return img
    ? img.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.Linear)
    : EMPTY;
}

type Props = {
  width: number;
  /** Posição do avião agora (graus) e rumo (graus a partir do norte). */
  posicao: { lat: number; lon: number; rumo: number };
  /** Instante da `posicao` e do `driftKm` (ms). Também usado para o sol. */
  time: number;
  /**
   * Posição 1 s depois de `time`. Entre uma leitura e outra (a tela atualiza a cada 1 s), a janela
   * interpola o caminho quadro a quadro na thread de interface. Sem ela, a paisagem anda em degraus de 1 s.
   */
  posicaoSeguinte?: { lat: number; lon: number };
  /** Quanto o avião já andou desde o embarque (km), para as nuvens passarem. */
  driftKm: number;
  /** Velocidade das nuvens (km por segundo), para a interpolação entre leituras. */
  driftKmPorS?: number;
  /**
   * Altitude do avião em km. A câmera desce junto (sensação de aproximação no pouso), até 2,5 km:
   * mais baixo os blocos de terra (61 m por pixel) ficariam borrados. Sem altitude: 10,5 km.
   */
  altitudeKm?: number | null;
  /** Quadros por segundo da paisagem (2 em economia, 10 padrão, 30 na janela fluida). */
  fps: number;
  quality: number;
  satClouds: boolean;
  showMeter: boolean;
  /** Diagnóstico: desligar camadas para achar o que pesa. */
  showLandscape: boolean;
  showOverlay: boolean;
  /** Camadas da vista da janela (domain/janela/vistas): asa e moldura do Blender. */
  asa?: boolean;
  moldura?: boolean;
};

export function Janela({
  width,
  posicao,
  posicaoSeguinte,
  time,
  driftKm,
  driftKmPorS = 0,
  altitudeKm,
  fps,
  quality,
  satClouds,
  showMeter,
  showLandscape,
  showOverlay,
  asa = true,
  moldura = true,
}: Props) {
  const height = Math.round((width * 4) / 3);
  const q = QUALITY[quality];
  const dpr = PixelRatio.get();
  // A paisagem é desenhada num canvas menor e ampliada: o shader roda em menos pixels.
  const scale = Math.max(1, dpr / q.dpr);
  const lw = Math.round(width / scale);
  const lh = Math.round(height / scale);

  const bD = useImage(require('../../assets/janela/base_dia.jpg'));
  const bN = useImage(require('../../assets/janela/base_noite.jpg'));
  const dN = useImage(require('../../assets/janela/det_noite.jpg'));

  const base = useMemo(
    () => ({ bD: texShader(bD), bN: texShader(bN), dN: texShader(dN) }),
    [bD, bN, dN],
  );

  const [near, setNear] = useState<AtlasState>({ image: null, b: OFF });
  const [mid, setMid] = useState<AtlasState>({ image: null, b: OFF });
  const [imp, setImp] = useState<AtlasState>({ image: null, b: OFF });
  const atlases = useRef<ReturnType<typeof makeAtlas>[] | null>(null);
  if (!atlases.current) {
    atlases.current = [
      makeAtlas('w10', 10, ATLAS_PX.near, setNear),
      makeAtlas('w8', 8, ATLAS_PX.mid, setMid),
      makeAtlas('l9', 9, ATLAS_PX.imp, setImp),
    ];
  }
  // Nuvens reais (satélite, a cada 3 h), em volta do avião.
  const [nuvens, setNuvens] = useState<NuvensState>({ dia: null, noite: null, b: OFF });
  const atlasDeNuvens = useRef<ReturnType<typeof makeAtlasDeNuvens> | null>(null);
  if (!atlasDeNuvens.current) atlasDeNuvens.current = makeAtlasDeNuvens(setNuvens);
  const nuvensShaders = useMemo(() => ({ dia: texShader(nuvens.dia), noite: texShader(nuvens.noite) }), [nuvens.dia, nuvens.noite]);
  const atlasShaders = useMemo(
    () => ({ near: texShader(near.image), mid: texShader(mid.image), imp: texShader(imp.image) }),
    [near.image, mid.image, imp.image],
  );

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Relógio da janela, na thread de interface: avança no ritmo escolhido (fps) sem passar pelo JavaScript.
  // Cada avanço redesenha só a paisagem (useDerivedValue abaixo); a tela React não renderiza de novo.
  const relogio = useSharedValue(Date.now());
  const intervalo = useSharedValue(1000 / fps);
  useEffect(() => {
    intervalo.set(1000 / fps);
  }, [fps, intervalo]);
  useFrameCallback(() => {
    'worklet';
    const agora = Date.now();
    if (agora - relogio.value >= intervalo.value - 4) relogio.value = agora;
  });
  const desenhos = useSharedValue(0);
  const meter = useRef({ js: 0, jsFrames: 0, jsLast: Date.now(), drawsLast: 0 });
  const [meterText, setMeterText] = useState('');
  const [uiFps, setUiFps] = useState(0);
  // Quadros na tela, medidos na thread de interface (o que o usuário sente).
  const uiN = useSharedValue(0);
  const uiT = useSharedValue(0);
  useFrameCallback((info) => {
    'worklet';
    uiN.value += 1;
    if (info.timestamp - uiT.value >= 1000) {
      const v = Math.round((uiN.value * 1000) / (info.timestamp - uiT.value));
      uiN.value = 0;
      uiT.value = info.timestamp;
      scheduleOnRN(setUiFps, v);
    }
  }, showMeter);
  // Quadros do JavaScript (onde o app monta cada quadro da paisagem).
  useEffect(() => {
    if (!showMeter) return;
    let raf = 0;
    const loop = () => {
      const m = meter.current;
      m.jsFrames++;
      const now = Date.now();
      if (now - m.jsLast >= 1000) {
        const segundos = (now - m.jsLast) / 1000;
        m.js = Math.round(m.jsFrames / segundos);
        const d = desenhos.get();
        const drawFps = Math.round((d - m.drawsLast) / segundos);
        m.drawsLast = d;
        m.jsFrames = 0;
        m.jsLast = now;
        setMeterText(`JS ${m.js} · paisagem ${showLandscape ? drawFps : 0} fps · ${Math.round(lw * dpr)}×${Math.round(lh * dpr)} px`);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showMeter, lw, lh, dpr, showLandscape, desenhos]);

  const { lat: la, lon: lo, rumo: hd } = posicao;
  const s = sun(time, la, lo);
  const el = (s.el * 180) / Math.PI;
  const wt = 1 - sm(3, 15, el);
  const wn = 1 - sm(-9, -1, el);

  useEffect(() => {
    const [aNear, aMid, aImp] = atlases.current!;
    if (q.near) aNear.update(la, lo);
    aMid.update(la, lo);
    aImp.update(la, lo);
    if (satClouds) atlasDeNuvens.current!.update(la, lo);
  }, [la, lo, q.near, satClouds]);

  // Quanto a posição anda em 1 s (para a interpolação). Sem a posição seguinte, fica parada entre leituras.
  const dLa = posicaoSeguinte ? posicaoSeguinte.lat - la : 0;
  let dLo = posicaoSeguinte ? posicaoSeguinte.lon - lo : 0;
  if (dLo > 180) dLo -= 360;
  if (dLo < -180) dLo += 360;
  const sunV = s.v;
  const hq = q.hq;
  const bNear = near.image && q.near ? near.b : OFF;
  const bMid = mid.image ? mid.b : OFF;
  const bImp = imp.image ? imp.b : OFF;
  const bCl = nuvens.dia ? nuvens.b : OFF;
  const noite = pesoDaPassagemNoturna(lo, time);
  const H = Math.min(13, Math.max(2.5, altitudeKm ?? 10.5));
  // Mesma ordem dos "uniform shader" no SKSL.
  const filhos = [base.bD, base.bN, base.dN, nuvensShaders.dia, nuvensShaders.noite, atlasShaders.near, atlasShaders.mid, atlasShaders.imp];

  // Um quadro da paisagem, montado na thread de interface a cada avanço do relógio.
  const picture = useDerivedValue(() => {
    // Segundos desde a última leitura; até 2 s de folga se a próxima leitura atrasar.
    const k = Math.min(2, Math.max(0, (relogio.value - time) / 1000));
    desenhos.set(desenhos.get() + 1);
    const uniforms = uniformArray({
      res: [lw, lh],
      sunD: sunV,
      lat0: la + dLa * k,
      lon0: lo + dLo * k,
      hd: (hd * Math.PI) / 180,
      cover: 0.45,
      drift: driftKm + driftKmPorS * k,
      useSat: satClouds ? 1 : 0,
      hq,
      bNear,
      bMid,
      bImp,
      bCl,
      noite,
      H,
    });
    const rec = Skia.PictureRecorder();
    const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, lw, lh));
    if (effect) {
      const paint = Skia.Paint();
      paint.setShader(effect.makeShaderWithChildren(uniforms, filhos));
      canvas.drawRect(Skia.XYWHRect(0, 0, lw, lh), paint);
    }
    return rec.finishRecordingAsPicture();
  });

  // Beacon vermelho da fuselagem: pulso lento a cada 3,6 s, só ao entardecer e à noite.
  // Anda com o mesmo relógio da paisagem, na thread de interface.
  const bk = reduceMotion ? 0 : Math.round((0.32 * wn + 0.1 * wt) * 50) / 50;
  const beacon = useDerivedValue(() => {
    if (bk <= 0.005) return 0;
    const ph = (relogio.value % 3600) / 3600;
    return ph < 0.15 ? ease(ph / 0.15) * bk : ph < 0.3 ? (1 - ease((ph - 0.15) / 0.15)) * bk : 0;
  });
  const r2 = (x: number) => Math.round(x * 50) / 50;

  return (
    <View style={[styles.view, { width, height }]}>
      <View style={{ width: lw, height: lh, transform: [{ scale }], transformOrigin: 'top left' }}>
        <Canvas style={{ width: lw, height: lh }}>{showLandscape ? <Picture picture={picture} /> : null}</Canvas>
      </View>
      {showOverlay && (
        <Overlay width={width} height={height} wt={r2(wt)} wn={r2(wn)} beacon={beacon} piscando={bk > 0.005} glow={r2(wn * 0.75 + wt * 0.25)} asa={asa} moldura={moldura} />
      )}
      {!bD && <Text style={styles.loading}>Preparando a janela…</Text>}
      {showMeter && (
        <Text style={styles.meter}>
          Tela {uiFps} fps · {meterText}
        </Text>
      )}
    </View>
  );
}

/**
 * Asa e moldura do Blender. Só redesenha quando a luz muda (valores arredondados),
 * não a cada quadro da paisagem.
 */
const Overlay = memo(function Overlay({
  width,
  height,
  wt,
  wn,
  beacon,
  piscando,
  glow,
  asa,
  moldura,
}: {
  width: number;
  height: number;
  wt: number;
  wn: number;
  beacon: SharedValue<number>;
  piscando: boolean;
  glow: number;
  asa: boolean;
  moldura: boolean;
}) {
  const asaDia = useImage(require('../../assets/janela/asa_dia.webp'));
  const asaTarde = useImage(require('../../assets/janela/asa_entardecer.webp'));
  const asaNoite = useImage(require('../../assets/janela/asa_noite.webp'));
  const asaBeacon = useImage(require('../../assets/janela/asa_beacon.webp'));
  const molDia = useImage(require('../../assets/janela/moldura_dia.webp'));
  const molTarde = useImage(require('../../assets/janela/moldura_entardecer.webp'));
  const molNoite = useImage(require('../../assets/janela/moldura_noite.webp'));
  const img = (image: SkImage | null, opacity = 1) =>
    image && opacity > 0.001 ? (
      <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="cover" opacity={opacity} />
    ) : null;
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {asa && img(asaDia)}
      {asa && asaTarde && wt > 0.001 && (
        <SkiaImage image={asaTarde} x={0} y={0} width={width} height={height} fit="cover" opacity={wt}>
          <ColorMatrix matrix={WARM} />
        </SkiaImage>
      )}
      {asa && img(asaNoite, wn)}
      {asa && asaBeacon && piscando && (
        <SkiaImage
          image={asaBeacon}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
          opacity={beacon}
          blendMode="screen"
        />
      )}
      {asa && glow > 0.001 && (
        <Rect
          x={width * 0.254 - width * 0.025}
          y={height * 0.442 - width * 0.025}
          width={width * 0.05}
          height={width * 0.05}
          opacity={glow}
          blendMode="screen"
        >
          <RadialGradient
            c={vec(width * 0.254, height * 0.442)}
            r={width * 0.025}
            colors={['#FFFFFF', '#FFFFFF', '#FFFAF059', '#FFFAF000']}
            positions={[0, 0.07, 0.22, 0.65]}
          />
        </Rect>
      )}
      {moldura && img(molDia)}
      {moldura && img(molTarde, wt)}
      {moldura && img(molNoite, wn)}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['#010911', '#01091100', '#01091100', '#010911']}
          positions={[0.066, 0.356, 0.647, 1]}
        />
      </Rect>
    </Canvas>
  );
});

const styles = StyleSheet.create({
  view: { overflow: 'hidden', backgroundColor: '#010911', borderRadius: 22, alignSelf: 'center' },
  meter: {
    position: 'absolute',
    left: 10,
    top: 10,
    color: '#9BE38B',
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#000000AA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loading: { position: 'absolute', alignSelf: 'center', top: '48%', color: '#FFFFFF99', fontSize: 13 },
});
