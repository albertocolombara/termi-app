import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  FilterMode,
  Group,
  Image as SkiaImage,
  LinearGradient,
  MipmapMode,
  Picture,
  RadialGradient,
  Rect,
  rect,
  Skia,
  SkImage,
  SkShader,
  TileMode,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useFrameCallback, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ATLAS_PX, SKSL, uniformArray } from './shader';
import { makeAtlas, AtlasState } from './tiles';
import { makeAtlasDeNuvens, type NuvensState } from './nuvens';
import { pesoDaPassagemNoturna } from '@/domain/janela/nuvens';
import { DURACAO_DA_PERSIANA_MS, MASCARA_DA_PERSIANA, PERSIANA, deslocamentoDaPersiana } from '@/domain/janela/persiana';
import { sun } from './geo';
import { t } from '@/i18n';

const effect = Skia.RuntimeEffect.Make(SKSL);
const EMPTY = Skia.Shader.MakeColor(Skia.Color('transparent'));
const OFF: [number, number, number] = [1e3, 1e3, 1];

// Qualidade: resolução da paisagem em relação à tela (as camadas do Blender ficam sempre nítidas).
export const QUALITY = [
  { label: 'Econômica', dpr: 0.75, hq: 0, near: false },
  { label: 'Normal', dpr: 1.25, hq: 1, near: true },
  { label: 'Máxima', dpr: 2, hq: 1, near: true },
];

// Luz de posição na ponta da asa (render v3 do Blender, 1080 × 1440): brilha à noite e no entardecer.
// A render do entardecer já vem quente; o filtro "warm" do protótipo não é mais aplicado.
const LUZ_DA_ASA = { x: 415 / 1080, y: 813 / 1440 };

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
  // A 30 fps o relógio corre na thread de interface, a cada quadro da tela. A 10 fps (padrão) e a
  // 2 fps (economia) um timer do JavaScript basta: o callback a cada quadro acordava a thread de
  // interface 60 a 120 vezes por segundo e segurava a tela na taxa máxima, para desenhar só 10
  // (build-43: 9 min de CPU em 11 min de uso a 10 fps). O desenho continua fora do JavaScript.
  const porQuadro = fps > 10;
  const quadro = useFrameCallback(() => {
    'worklet';
    const agora = Date.now();
    if (agora - relogio.value >= intervalo.value - 4) relogio.value = agora;
  }, porQuadro);
  useEffect(() => {
    quadro.setActive(porQuadro);
    if (porQuadro) return;
    const id = setInterval(() => relogio.set(Date.now()), 1000 / fps);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porQuadro, fps]);
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

  // Persiana: um toque fecha, outro volta à posição inicial. Com "reduzir movimento", sem animação.
  const fechada = useSharedValue(0);
  const [persianaFechada, setPersianaFechada] = useState(false);
  const [persianaUsada, setPersianaUsada] = useState(false);
  const tocarPersiana = () => {
    const alvo = persianaFechada ? 0 : 1;
    setPersianaUsada(true);
    setPersianaFechada(!persianaFechada);
    fechada.value = reduceMotion ? alvo : withTiming(alvo, { duration: DURACAO_DA_PERSIANA_MS, easing: Easing.inOut(Easing.cubic) });
  };
  const sv = width / 1080;

  return (
    <View style={[styles.view, { width, height }]}>
      <View style={{ width: lw, height: lh, transform: [{ scale }], transformOrigin: 'top left' }}>
        <Canvas style={{ width: lw, height: lh }}>{showLandscape ? <Picture picture={picture} /> : null}</Canvas>
      </View>
      {showOverlay && (
        <Overlay
          width={width}
          height={height}
          wt={r2(wt)}
          wn={r2(wn)}
          beacon={beacon}
          piscando={bk > 0.005}
          glow={r2(wn * 0.75 + wt * 0.25)}
          asa={asa}
          moldura={moldura}
          fechada={fechada}
          persianaUsada={persianaUsada}
        />
      )}
      {showOverlay && moldura && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(persianaFechada ? 'janela.abrirPersiana' : 'janela.fecharPersiana')}
          onPress={tocarPersiana}
          style={{
            position: 'absolute',
            left: MASCARA_DA_PERSIANA.x * sv,
            top: MASCARA_DA_PERSIANA.y * sv,
            width: MASCARA_DA_PERSIANA.largura * sv,
            height: MASCARA_DA_PERSIANA.altura * sv,
          }}
        />
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

/** Camadas da janela v3 do Blender (assets/janela). `require` fixo para o Metro empacotar. */
const IMG = {
  asa: { dia: require('../../assets/janela/asa_dia.webp'), tarde: require('../../assets/janela/asa_entardecer.webp'), noite: require('../../assets/janela/asa_noite.webp') },
  asaBeacon: require('../../assets/janela/asa_beacon.webp'),
  moldura: { dia: require('../../assets/janela/moldura_dia.webp'), tarde: require('../../assets/janela/moldura_entardecer.webp'), noite: require('../../assets/janela/moldura_noite.webp') },
  fechada: { dia: require('../../assets/janela/moldura_dia_fechada.webp'), tarde: require('../../assets/janela/moldura_entardecer_fechada.webp'), noite: require('../../assets/janela/moldura_noite_fechada.webp') },
  persiana: { dia: require('../../assets/janela/persiana_dia.webp'), tarde: require('../../assets/janela/persiana_entardecer.webp'), noite: require('../../assets/janela/persiana_noite.webp') },
  mascara: require('../../assets/janela/persiana_mascara.png'),
};
type Luz = 'dia' | 'tarde' | 'noite';

/**
 * Asa, moldura e persiana do Blender. Só redesenha quando a luz muda (valores arredondados),
 * não a cada quadro da paisagem; a persiana anima pela thread de interface.
 *
 * Memória (visao-do-produto, janela v3): cada camada cheia ocupa ~6 MB decodificada. Só carrega
 * as luzes que estão aparecendo, e a moldura "fechada" só depois do primeiro toque na persiana.
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
  fechada,
  persianaUsada,
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
  /** 0 = persiana na posição inicial, 1 = fechada. */
  fechada: SharedValue<number>;
  persianaUsada: boolean;
}) {
  // Peso de cada luz: o dia fica por baixo; entardecer e noite entram por cima com a sua opacidade.
  const usa: Record<Luz, boolean> = { dia: wt + wn < 0.999, tarde: wt > 0.001, noite: wn > 0.001 };
  const peso: Record<Luz, number> = { dia: 1, tarde: wt, noite: wn };
  const se = <T,>(cond: boolean, fonte: T) => (cond ? fonte : null);
  const asaImg = {
    dia: useImage(se(asa && usa.dia, IMG.asa.dia)),
    tarde: useImage(se(asa && usa.tarde, IMG.asa.tarde)),
    noite: useImage(se(asa && usa.noite, IMG.asa.noite)),
  };
  const asaBeacon = useImage(se(asa && piscando, IMG.asaBeacon));
  const molImg = {
    dia: useImage(se(moldura && usa.dia, IMG.moldura.dia)),
    tarde: useImage(se(moldura && usa.tarde, IMG.moldura.tarde)),
    noite: useImage(se(moldura && usa.noite, IMG.moldura.noite)),
  };
  const fechImg = {
    dia: useImage(se(moldura && persianaUsada && usa.dia, IMG.fechada.dia)),
    tarde: useImage(se(moldura && persianaUsada && usa.tarde, IMG.fechada.tarde)),
    noite: useImage(se(moldura && persianaUsada && usa.noite, IMG.fechada.noite)),
  };
  const perImg = {
    dia: useImage(se(moldura && usa.dia, IMG.persiana.dia)),
    tarde: useImage(se(moldura && usa.tarde, IMG.persiana.tarde)),
    noite: useImage(se(moldura && usa.noite, IMG.persiana.noite)),
  };
  const mascara = useImage(se(moldura, IMG.mascara));

  const s = width / 1080; // a vista tem 3:4, igual à render
  const descida = useDerivedValue(() => [{ translateY: deslocamentoDaPersiana(fechada.value) }]);
  const LUZES: Luz[] = ['dia', 'tarde', 'noite'];

  const img = (image: SkImage | null, opacity = 1) =>
    image && opacity > 0.001 ? (
      <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="cover" opacity={opacity} />
    ) : null;
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {asa && img(asaImg.dia, usa.dia ? 1 : 0)}
      {asa && img(asaImg.tarde, wt)}
      {asa && img(asaImg.noite, wn)}
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
          x={width * LUZ_DA_ASA.x - width * 0.025}
          y={height * LUZ_DA_ASA.y - width * 0.025}
          width={width * 0.05}
          height={width * 0.05}
          opacity={glow}
          blendMode="screen"
        >
          <RadialGradient
            c={vec(width * LUZ_DA_ASA.x, height * LUZ_DA_ASA.y)}
            r={width * 0.025}
            colors={['#FFFFFF', '#FFFFFF', '#FFFAF059', '#FFFAF000']}
            positions={[0, 0.07, 0.22, 0.65]}
          />
        </Rect>
      )}
      {/* Moldura: a cabine escurece conforme a persiana desce (mistura com a moldura "fechada"). */}
      {moldura &&
        LUZES.map((l) =>
          usa[l] && molImg[l] ? (
            <Group key={l} opacity={peso[l]}>
              {img(molImg[l])}
              {fechImg[l] ? <SkiaImage image={fechImg[l]} x={0} y={0} width={width} height={height} fit="cover" opacity={fechada} /> : null}
            </Group>
          ) : null,
        )}
      {/* Persiana: desenhada fechada, sobe pelo deslocamento e é recortada pela máscara fixa. */}
      {moldura && mascara && (
        <Group transform={[{ scale: s }]}>
          <Group
            layer
            clip={rect(MASCARA_DA_PERSIANA.x, MASCARA_DA_PERSIANA.y, MASCARA_DA_PERSIANA.largura, MASCARA_DA_PERSIANA.altura)}
          >
            <Group transform={descida}>
              {LUZES.map((l) =>
                usa[l] && perImg[l] ? (
                  <SkiaImage
                    key={l}
                    image={perImg[l]}
                    x={PERSIANA.x}
                    y={PERSIANA.y}
                    width={PERSIANA.largura}
                    height={PERSIANA.altura}
                    opacity={peso[l]}
                  />
                ) : null,
              )}
            </Group>
            <SkiaImage
              image={mascara}
              x={MASCARA_DA_PERSIANA.x}
              y={MASCARA_DA_PERSIANA.y}
              width={MASCARA_DA_PERSIANA.largura}
              height={MASCARA_DA_PERSIANA.altura}
              blendMode="dstIn"
            />
          </Group>
        </Group>
      )}
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
