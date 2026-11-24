/**
 * Globo de rotas (Início e Estatísticas · Figma v3). Diferente do globo do voo: é um globo pontilhado,
 * leve, com as rotas que o usuário já voou destacadas em amarelo.
 *
 * - Gira devagar sozinho quando ninguém mexe (para com "reduzir movimento").
 * - Arrastar gira; pinça dá um zoom pequeno (até 1,8×).
 * - Tocar numa rota mostra um bloco compacto do voo (Figma "Globo/Detalhes da rota") e gira o globo
 *   até ela; tocar fora ou no × fecha.
 * - Um cometa corre em cada rota e o destino pulsa quando ele chega (como no código de referência do
 *   Alberto); sem animação com "reduzir movimento".
 *
 * A Terra é desenhada num shader (pontos de terra por uma máscara 1024 × 512) e os arcos numa Picture
 * refeita a cada quadro na thread de interface. Fora de foco (`ativo` falso) o quadro para.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Canvas, Fill, ImageShader, Picture, Shader, Skia, createPicture, useImage } from '@shopify/react-native-skia';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { color, radius, space, Text } from '@/ds';
import { motion } from '@/ds/motion';
import { dataRelativa, type RotaVoada } from '@/domain/historico/historico';
import { t } from '@/i18n';

import { arcoNaTela, centroDaRota, escondido, maisPerto, projetar, rotaNoToque, SEGMENTOS_DO_ARCO, vetor, type Vec3 } from './geometria';
import { MASCARA, SKSL_GLOBO_DE_ROTAS } from './shader';

const efeito = Skia.RuntimeEffect.Make(SKSL_GLOBO_DE_ROTAS)!;
const RAD = Math.PI / 180;

/** Inclinação padrão: um pouco de cima, para mostrar mais do hemisfério norte, onde há mais terra. */
const TILT_PADRAO = 20 * RAD;
const TILT_MAX = 70 * RAD;
const ZOOM_MAX = 1.8;
/** Raio do globo em relação ao menor lado da área (Figma: globo de ~330 px numa área de 412). */
const RAIO_RELATIVO = 0.4;
/** Faixas de latitude da grade de pontos. */
const LINHAS = 230;
/** Giro automático (rad/s) e espera depois do último toque. */
const GIRO = 0.06;
const ESPERA_MS = 2500;
/** Cometas só nas rotas mais recentes (custo por quadro). */
const MAX_COMETAS = 12;
/** Rotas desenhadas (as mais recentes). */
const MAX_ROTAS = 80;
const CICLO_S = 3.6;
const ALCANCE_DO_TOQUE = 22;
const LARGURA_DO_BLOCO = 184;

type RotaNoGlobo = { a: Vec3; b: Vec3; deslocamento: number };

export type GloboDeRotasProps = {
  rotas: RotaVoada[];
  largura: number;
  altura: number;
  /** Instante para as datas do bloco ("hoje", "ontem"). */
  agora: number;
  /** Fora de foco (outra tela por cima, app em segundo plano) o globo para de desenhar. */
  ativo?: boolean;
  /** Dentro de uma tela que rola (estatísticas): arrastar só gira na horizontal. */
  dentroDeRolagem?: boolean;
  /** Bloco de dica quando não há rotas (Figma: "Preencha o globo"). */
  dica?: { titulo: string; texto: string } | null;
};

export function GloboDeRotas({ rotas, largura, altura, agora, ativo = true, dentroDeRolagem = false, dica }: GloboDeRotasProps) {
  const mascara = useImage(require('../../assets/globo/terra-mascara.png'));
  const reduzir = useReducedMotion();
  const visiveis = useMemo(() => rotas.slice(0, MAX_ROTAS), [rotas]);
  const geometria = useMemo<RotaNoGlobo[]>(
    () =>
      visiveis.map((r, i) => ({
        a: vetor(r.origem.lat, r.origem.lon),
        b: vetor(r.destino.lat, r.destino.lon),
        deslocamento: i / Math.max(1, Math.min(visiveis.length, MAX_COMETAS)),
      })),
    [visiveis],
  );
  const rotasSV = useSharedValue<RotaNoGlobo[]>(geometria);
  useEffect(() => {
    rotasSV.set(geometria);
  }, [geometria, rotasSV]);

  // Começa olhando a rota mais recente; sem rotas, Europa, África e o Atlântico (como no Figma).
  const inicio = useMemo(() => {
    if (!geometria.length) return { yaw: -12 * RAD, tilt: TILT_PADRAO };
    const c = centroDaRota(geometria[0].a, geometria[0].b);
    return { yaw: c.yaw - 0.35, tilt: TILT_PADRAO };
  }, [geometria]);

  const yaw = useSharedValue(inicio.yaw);
  const tilt = useSharedValue(inicio.tilt);
  const zoom = useSharedValue(1);
  const vy = useSharedValue(0);
  const vt = useSharedValue(0);
  const arrastando = useSharedValue(false);
  const ultimoToque = useSharedValue(0);
  const tempo = useSharedValue(0);
  const selecionada = useSharedValue(-1);
  const [indiceSelecionado, setIndiceSelecionado] = useState(-1);
  const alturaDoBloco = useSharedValue(77);

  const cx = largura / 2;
  const cy = altura / 2;
  const raioBase = Math.min(largura, altura) * RAIO_RELATIVO;

  // Uma rota nova (ex.: volta do pouso) zera a seleção.
  useEffect(() => {
    selecionada.set(-1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndiceSelecionado(-1);
  }, [geometria, selecionada]);

  const quadro = useFrameCallback((info) => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    if (!reduzir) tempo.set(tempo.get() + dt);
    if (arrastando.get()) return;
    const v1 = vy.get();
    const v2 = vt.get();
    if (Math.abs(v1) > 1e-4 || Math.abs(v2) > 1e-4) {
      yaw.set(yaw.get() + v1 * dt);
      tilt.set(Math.max(-TILT_MAX, Math.min(TILT_MAX, tilt.get() + v2 * dt)));
      vy.set(v1 * Math.pow(0.05, dt));
      vt.set(v2 * Math.pow(0.05, dt));
    }
    if (selecionada.get() >= 0 || reduzir) return;
    if (Date.now() - ultimoToque.get() > ESPERA_MS) {
      yaw.set(yaw.get() - GIRO * dt);
      tilt.set(tilt.get() + (TILT_PADRAO - tilt.get()) * Math.min(1, dt * 0.4));
    }
  }, false);
  useEffect(() => {
    quadro.setActive(ativo);
  }, [ativo, quadro]);

  // ── Gestos ──
  const zoomInicial = useSharedValue(1);
  const pinca = usePinchGesture({
    onBegin: () => {
      'worklet';
      zoomInicial.set(zoom.get());
    },
    onUpdate: (e) => {
      'worklet';
      zoom.set(Math.max(1, Math.min(ZOOM_MAX, zoomInicial.get() * e.scale)));
      ultimoToque.set(Date.now());
    },
  });
  const arrasto = usePanGesture({
    maxPointers: 1,
    // Dentro de uma tela que rola, só ativa com movimento horizontal (o vertical fica para a rolagem).
    // Sem spread aqui: o plugin do Worklets não aceita `...` na configuração dos gestos (build de 24/11).
    activeOffsetX: dentroDeRolagem ? [-8, 8] : undefined,
    failOffsetY: dentroDeRolagem ? [-12, 12] : undefined,
    onActivate: () => {
      'worklet';
      arrastando.set(true);
      vy.set(0);
      vt.set(0);
    },
    onUpdate: (e) => {
      'worklet';
      const r = raioBase * zoom.get();
      yaw.set(yaw.get() - e.changeX / r);
      if (!dentroDeRolagem) tilt.set(Math.max(-TILT_MAX, Math.min(TILT_MAX, tilt.get() + e.changeY / r)));
      ultimoToque.set(Date.now());
    },
    onDeactivate: (e) => {
      'worklet';
      const r = raioBase * zoom.get();
      vy.set(-e.velocityX / r);
      vt.set(dentroDeRolagem ? 0 : e.velocityY / r);
      arrastando.set(false);
      ultimoToque.set(Date.now());
    },
  });
  const toque = useTapGesture({
    onActivate: (e) => {
      'worklet';
      ultimoToque.set(Date.now());
      const r = raioBase * zoom.get();
      const i = rotaNoToque(e.x, e.y, rotasSV.get(), yaw.get(), tilt.get(), cx, cy, r, ALCANCE_DO_TOQUE);
      selecionada.set(i);
      scheduleOnRN(setIndiceSelecionado, i);
      if (i < 0) return;
      vy.set(0);
      vt.set(0);
      const rota = rotasSV.get()[i];
      const c = centroDaRota(rota.a, rota.b);
      const cfg = { duration: motion.duration.long2, easing: motion.easing.emphasizedDecelerate, reduceMotion: ReduceMotion.System };
      // Deixa o meio da rota um pouco à esquerda do centro: o bloco abre à direita do destino.
      yaw.set(withTiming(maisPerto(yaw.get(), c.yaw + 0.25), cfg));
      tilt.set(withTiming(Math.max(-TILT_MAX, Math.min(TILT_MAX, c.tilt)), cfg));
    },
  });
  const gestos = useSimultaneousGestures(pinca, arrasto, toque);

  // ── Terra (shader) ──
  const cores = useMemo(
    () => ({
      corTerra: [...Skia.Color(color.globo.terra)].slice(0, 3).concat(0.95),
      corMarCentro: [...Skia.Color(color.globo.marCentro)],
      corMarBorda: [...Skia.Color(color.globo.marBorda)],
      corHalo: [...Skia.Color(color.globo.halo)],
    }),
    [],
  );
  const uniforms = useDerivedValue(() => ({
    centro: [cx, cy],
    raio: raioBase * zoom.get(),
    yaw: yaw.get(),
    tilt: tilt.get(),
    linhas: LINHAS,
    ...cores,
  }));

  // ── Rotas (Picture refeita a cada quadro) ──
  const arcos = useDerivedValue(() => {
    const r = raioBase * zoom.get();
    const y = yaw.get();
    const tl = tilt.get();
    const lista = rotasSV.get();
    const sel = selecionada.get();
    const t0 = tempo.get();
    return createPicture((canvas) => {
      const linha = Skia.Paint();
      linha.setAntiAlias(true);
      linha.setStyle(1);
      linha.setStrokeCap(1);
      linha.setColor(Skia.Color(color.accent.default));
      const ponto = Skia.Paint();
      ponto.setAntiAlias(true);
      ponto.setColor(Skia.Color(color.accent.default));
      const atenuar = sel >= 0 ? 0.35 : 1;

      for (let i = 0; i < lista.length; i++) {
        const pts = arcoNaTela(lista[i].a, lista[i].b, y, tl, cx, cy, r);
        const frente = Skia.PathBuilder.Make();
        const atras = Skia.PathBuilder.Make();
        for (let k = 0; k < pts.length - 1; k++) {
          const alvo = escondido(pts[k], cx, cy, r) ? atras : frente;
          alvo.moveTo(pts[k].x, pts[k].y);
          alvo.lineTo(pts[k + 1].x, pts[k + 1].y);
        }
        const destaque = i === sel;
        linha.setStrokeWidth(destaque ? 2 : 1.1);
        linha.setAlphaf(0.07 * atenuar);
        canvas.drawPath(atras.detach(), linha);
        linha.setAlphaf(destaque ? 1 : 0.4 * atenuar);
        canvas.drawPath(frente.detach(), linha);

        // Cometa: cabeça clara com cauda que some; o destino pulsa quando ele chega.
        let fase = 0.999;
        if (i < MAX_COMETAS && !reduzir) fase = (t0 / CICLO_S + lista[i].deslocamento) % 1;
        if (i < MAX_COMETAS && !reduzir && sel < 0) {
          const cabeca = Math.floor(Math.min(1, fase / 0.7) * SEGMENTOS_DO_ARCO);
          linha.setStrokeWidth(2);
          for (let k = Math.max(0, cabeca - 8); k < cabeca; k++) {
            if (escondido(pts[k], cx, cy, r)) continue;
            linha.setAlphaf((1 - (cabeca - k) / 8) * 0.95);
            canvas.drawLine(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y, linha);
          }
        }

        // Pontas: origem pequena, destino com anel.
        const ini = pts[0];
        const fim = pts[pts.length - 1];
        if (ini.z > 0) {
          ponto.setAlphaf(destaque ? 1 : 0.7 * atenuar);
          canvas.drawCircle(ini.x, ini.y, destaque ? 2.6 : 1.8, ponto);
        }
        if (fim.z > 0) {
          ponto.setAlphaf(destaque ? 1 : 0.9 * atenuar);
          canvas.drawCircle(fim.x, fim.y, destaque ? 3.2 : 2.2, ponto);
          linha.setStrokeWidth(1.2);
          linha.setAlphaf(destaque ? 0.9 : 0.3 * atenuar);
          canvas.drawCircle(fim.x, fim.y, destaque ? 6 : 4.5, linha);
          if (i < MAX_COMETAS && !reduzir && sel < 0 && fase > 0.7) {
            const k = (fase - 0.7) / 0.3;
            linha.setAlphaf((1 - k) * 0.8);
            canvas.drawCircle(fim.x, fim.y, 4 + k * 12, linha);
          }
        }
      }
    });
  });

  // ── Bloco da rota selecionada: acompanha o destino na tela ──
  const estiloDoBloco = useAnimatedStyle(() => {
    const i = selecionada.get();
    const lista = rotasSV.get();
    if (i < 0 || i >= lista.length) return { opacity: 0, transform: [{ translateX: -9999 }] };
    const p = projetar(lista[i].b, 1, yaw.get(), tilt.get(), cx, cy, raioBase * zoom.get());
    if (p.z < 0) return { opacity: 0, transform: [{ translateX: -9999 }] };
    const aDireita = p.x < largura * 0.55;
    const x = aDireita ? p.x + 12 : p.x - 12 - LARGURA_DO_BLOCO;
    const yTopo = Math.max(4, Math.min(altura - alturaDoBloco.get() - 4, p.y - 33));
    return { opacity: 1, transform: [{ translateX: Math.max(4, Math.min(largura - LARGURA_DO_BLOCO - 4, x)) }, { translateY: yTopo }] };
  });
  const setaEsquerda = useAnimatedStyle(() => {
    const i = selecionada.get();
    const lista = rotasSV.get();
    if (i < 0 || i >= lista.length) return { opacity: 0 };
    const p = projetar(lista[i].b, 1, yaw.get(), tilt.get(), cx, cy, raioBase * zoom.get());
    return { opacity: p.x < largura * 0.55 ? 1 : 0 };
  });
  const setaDireita = useAnimatedStyle(() => {
    const i = selecionada.get();
    const lista = rotasSV.get();
    if (i < 0 || i >= lista.length) return { opacity: 0 };
    const p = projetar(lista[i].b, 1, yaw.get(), tilt.get(), cx, cy, raioBase * zoom.get());
    return { opacity: p.x < largura * 0.55 ? 0 : 1 };
  });

  const fechar = () => {
    selecionada.set(-1);
    setIndiceSelecionado(-1);
    ultimoToque.set(Date.now());
  };

  const rota = indiceSelecionado >= 0 ? visiveis[indiceSelecionado] : null;

  return (
    <GestureDetector gesture={gestos}>
      <View style={{ width: largura, height: altura }}>
        {/* Só o desenho é a "imagem" para o leitor de tela; o bloco da rota (com o ×) continua acessível. */}
        <View
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityRole="image"
          accessibilityLabel={rotas.length === 1 ? t('globoDeRotas.acessivelUma') : t('globoDeRotas.acessivel', { n: rotas.length })}
        >
          {mascara ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <Fill>
                <Shader source={efeito} uniforms={uniforms}>
                  <ImageShader image={mascara} tx="repeat" ty="clamp" fit="fill" rect={{ x: 0, y: 0, width: MASCARA.w, height: MASCARA.h }} />
                </Shader>
              </Fill>
              <Picture picture={arcos} />
            </Canvas>
          ) : null}
        </View>

        {!rotas.length && dica ? (
          <View pointerEvents="none" style={[styles.bloco, styles.dica, { left: largura * 0.07, top: altura * 0.28 }]}>
            <Text variant="Label/Strong 14" style={{ paddingRight: space[24] }}>
              {dica.titulo}
            </Text>
            <Text variant="Caption/Regular 12" tone="secondary">
              {dica.texto}
            </Text>
            <View style={[styles.seta, styles.setaDireita, { top: 29 }]} />
          </View>
        ) : null}

        <Animated.View
          style={[styles.bloco, styles.blocoDaRota, estiloDoBloco]}
          pointerEvents={rota ? 'box-none' : 'none'}
          onLayout={(e) => alturaDoBloco.set(e.nativeEvent.layout.height)}
        >
          {rota ? (
            <>
              <View style={styles.linhaDaRota}>
                <Text variant="Label/Strong 14">{rota.ultimoVoo.origem.iata ?? rota.ultimoVoo.origem.icao ?? '—'}</Text>
                <Text variant="Body/Medium 14" tone="accent">
                  →
                </Text>
                <Text variant="Label/Strong 14">{rota.ultimoVoo.destino.iata ?? rota.ultimoVoo.destino.icao ?? '—'}</Text>
              </View>
              <Text variant="Caption/Regular 12" tone="secondary" numberOfLines={1}>
                {t('globoDeRotas.cidades', {
                  origem: rota.origem.cidade ?? rota.origem.nome ?? '—',
                  destino: rota.destino.cidade ?? rota.destino.nome ?? '—',
                })}
              </Text>
              <View style={styles.registro}>
                <View style={styles.etiqueta}>
                  <Text variant="Caption/Regular 12" tone="tertiary" style={styles.pequeno}>
                    {rota.ultimoVoo.callsign}
                  </Text>
                </View>
                <Text variant="Caption/Regular 12" tone="tertiary" style={styles.pequeno}>
                  {t('globoDeRotas.quando', { data: dataRelativa(rota.ultimoVoo.encerrouEm, agora), duracao: duracaoCurta(rota.ultimoVoo.minutosFoco) })}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('globoDeRotas.fechar')} hitSlop={10} onPress={fechar} style={styles.fechar}>
                <Text variant="Body/Large 16" style={{ fontSize: 18 }}>
                  ×
                </Text>
              </Pressable>
              <Animated.View style={[styles.seta, styles.setaEsquerda, setaEsquerda]} />
              <Animated.View style={[styles.seta, styles.setaDireita, setaDireita]} />
            </>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** "52 min", "1h 30" (depois de 60 min, em horas, como no painel). */
function duracaoCurta(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`;
}

const styles = StyleSheet.create({
  bloco: {
    position: 'absolute',
    width: LARGURA_DO_BLOCO,
    gap: space[4],
    paddingVertical: space[8],
    paddingHorizontal: space[10],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.globo.cartao,
    boxShadow: `0 8px 20px ${color.globo.sombraDoCartao}`,
  },
  dica: {},
  blocoDaRota: { left: 0, top: 0 },
  linhaDaRota: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: space[24] },
  registro: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: space[2] },
  etiqueta: { paddingHorizontal: space[2], borderRadius: radius.xs, backgroundColor: color.bg.app },
  pequeno: { fontSize: 10.5, lineHeight: 14 },
  fechar: { position: 'absolute', top: 2, right: 2, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  // Seta do balão: quadrado girado com a borda só nos lados de fora.
  seta: {
    position: 'absolute',
    top: 33,
    width: 9,
    height: 9,
    backgroundColor: color.globo.cartao,
    borderColor: color.border.default,
    transform: [{ rotate: '45deg' }],
  },
  setaEsquerda: { left: -5, borderLeftWidth: 1, borderBottomWidth: 1 },
  setaDireita: { right: -5, borderRightWidth: 1, borderTopWidth: 1 },
});
