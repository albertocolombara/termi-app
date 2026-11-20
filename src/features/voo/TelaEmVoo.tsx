/**
 * 04A/04B/04C · Em voo. PRD: RF-17 a RF-20; UC-04.
 * Tudo sai do relógio e da sessão gravada: ao abrir o app, a janela e o globo aparecem na posição certa.
 * Em segundo plano a janela e o globo são desmontados e o relógio para (lição do protótipo, build-7).
 *
 * Pousar antes (E3) abre a confirmação; quando o tempo do usuário acaba, a sessão vira pouso (UC-08).
 * Ainda não estão aqui: serviço de bordo (E1/E2), Em espera (E5), Em solo (E8), sons e vista da janela.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SessaoGravada } from '@/data/sessoes/repositorio';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { useTrilha } from '@/data/voos/useTrilha';
import { useVoosDisponiveis } from '@/data/voos/useVoos';
import { agendaDePausas } from '@/domain/sessao/pausas';
import { tempoCumprido } from '@/domain/sessao/encerramento';
import { minutosAte, proximaPausa } from '@/domain/sessao/progresso';
import { distanciaKm } from '@/domain/voos/geo';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';
import { progressoNaRota, type Amostra } from '@/domain/voos/trilha';
import { Button, color, EmVooRota, Icon, InfoBanner, radius, screenGutter, SegmentedControl, space, Suitcase, Text, type IconName } from '@/ds';
import { Globo, type ModoGlobo } from '@/globo/Globo';
import { t } from '@/i18n';
import { Janela } from '@/janela/Janela';

import { codigoDoLugar, horaLocal, kmh, metros, nomeDoLugar } from './formato';
import { FolhaPousarAntes } from './FolhaPousarAntes';
import { useEncerrar } from './useEncerrar';
import { useRelogio } from './useRelogio';

type Vista = 'janela' | 'globo';

export function TelaEmVoo() {
  const insets = useSafeAreaInsets();
  const sessao = useSessaoEmAndamento();

  if (!sessao.data) {
    return (
      <View style={[styles.tela, { paddingTop: insets.top + space[24], paddingHorizontal: screenGutter, gap: space[20] }]}>
        <InfoBanner message={sessao.isPending ? t('dial.procurando') : t('emVoo.nenhuma')} />
        <Button variant="secondary" size="small" label={t('emVoo.voltarAoInicio')} onPress={() => router.dismissTo('/')} style={{ alignSelf: 'flex-start' }} />
      </View>
    );
  }
  return <EmVoo sessao={sessao.data} />;
}

function EmVoo({ sessao }: { sessao: SessaoGravada }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { agora, ativo } = useRelogio(1000);
  const [vista, setVista] = useState<Vista>('janela');
  const [modoGlobo, setModoGlobo] = useState<ModoGlobo>('planeta');
  const [alturaDoPainel, setAlturaDoPainel] = useState(240);
  const [alturaDoTopo, setAlturaDoTopo] = useState(170);
  const [confirmando, setConfirmando] = useState(false);
  const [boasVindasFechada, setBoasVindasFechada] = useState(false);
  const encerrar = useEncerrar(sessao);

  const { embarcouEm, pousoPrevistoEm } = sessao;
  const voo = useVooAtualizado(sessao.voo);
  const trilha = useTrilha(voo).data ?? SEM_TRILHA;
  const pos = projetar(voo, agora);
  const posicao = useMemo(() => ({ lat: pos.lat, lon: pos.lon, rumo: pos.rumo }), [pos.lat, pos.lon, pos.rumo]);
  const pausas = useMemo(
    () => agendaDePausas(Math.round((pousoPrevistoEm - embarcouEm) / 60_000), sessao.intervaloServico),
    [embarcouEm, pousoPrevistoEm, sessao.intervaloServico],
  );
  const pausa = proximaPausa(embarcouEm, pausas, agora);
  // A barra de rota mostra a rota inteira do avião (origem → destino), pela trilha real.
  const progressoDaRota = progressoNaRota(voo.origem, trilha, pos, voo.destino);
  const tempoAcabou = tempoCumprido(pousoPrevistoEm, agora);
  const origem = nomeDoLugar(voo.origem);
  const destino = nomeDoLugar(voo.destino);
  // Quanto o avião andou desde o embarque, para as nuvens passarem na janela.
  const deslocamentoKm = ((agora - embarcouEm) / 3_600_000) * (voo.velocidadeNos ?? 450) * 1.852;

  // A paisagem ocupa tudo acima do painel inferior e passa um pouco por trás dele, sob o degradê.
  const alturaDaPaisagem = Math.max(320, height - alturaDoPainel + SOBREPOSICAO);
  // A janela é 4:3; para preencher a altura, fica mais larga que a tela e é cortada nas laterais.
  const larguraDaJanela = Math.max(width, Math.round((alturaDaPaisagem * 3) / 4));
  const mostrarBoasVindas = !boasVindasFechada && agora - embarcouEm < BOAS_VINDAS_MS;

  // O horário escolhido chegou: pouso completo garantido (RN-09). Também vale ao reabrir o app depois do pouso.
  // Em espera e "Continuar até o pouso" (RN-09a) entram quando o app souber se o avião real ainda está no ar.
  useEffect(() => {
    if (tempoAcabou) encerrar('pouso');
  }, [tempoAcabou, encerrar]);

  return (
    <View style={styles.tela}>
      {/* Paisagem: janela ou globo. Desmontados em segundo plano. */}
      <View style={[styles.paisagem, { height: alturaDaPaisagem }]}>
        {ativo && vista === 'janela' ? (
          <View style={{ position: 'absolute', top: 0, left: (width - larguraDaJanela) / 2 }}>
            <Janela
              width={larguraDaJanela}
              posicao={posicao}
              time={agora}
              driftKm={deslocamentoKm}
              fps={10}
              quality={1}
              satClouds
              showMeter={false}
              showLandscape
              showOverlay
            />
          </View>
        ) : null}
        {ativo && vista === 'globo' ? (
          <Globo
            width={width}
            height={alturaDaPaisagem}
            aviao={posicao}
            trilha={trilha}
            topoDosControles={alturaDoTopo + space[16]}
            origem={{ lat: voo.origem.lat, lon: voo.origem.lon, nome: origem }}
            destino={{ lat: voo.destino.lat, lon: voo.destino.lon, nome: destino }}
            modo={modoGlobo}
            instante={agora}
          />
        ) : null}
        {/* Degradês para a paisagem se juntar ao fundo (Figma 04B). */}
        <View pointerEvents="none" style={[styles.degradeTopo, { height: Math.min(260, alturaDaPaisagem * 0.36) }]} />
        <View pointerEvents="none" style={[styles.degradeBase, { height: Math.min(220, alturaDaPaisagem * 0.3) }]} />
      </View>

      {/* Painel superior */}
      <View
        style={{ paddingTop: insets.top + space[24], paddingHorizontal: screenGutter }}
        pointerEvents="box-none"
        onLayout={(e) => setAlturaDoTopo(e.nativeEvent.layout.height)}
      >
        <View style={styles.linhaTopo} pointerEvents="box-none">
          <View style={{ gap: space[16] }} pointerEvents="box-none">
            <View style={{ gap: space[6] }}>
              <Text variant="Body/Medium 14">{voo.callsign}</Text>
              {voo.companhiaNome ? (
                <Text variant="Body/Medium 14" tone="tertiary">
                  {voo.companhiaNome}
                </Text>
              ) : null}
            </View>
            <View style={{ alignSelf: 'flex-start' }}>
              <SegmentedControl
                segments={[
                  { value: 'janela', label: t('emVoo.janela'), icon: 'window' },
                  { value: 'globo', label: t('emVoo.globo'), icon: 'globe' },
                ]}
                value={vista}
                onChange={setVista}
              />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: space[6] }} accessible accessibilityLabel={t('emVoo.pousaEmAcessivel', { min: minutosAte(pousoPrevistoEm, agora), hora: horaLocal(pousoPrevistoEm) })}>
            <Text variant="Body/Medium 14" tone="secondary">
              {t('emVoo.pousaEm')}
            </Text>
            <Text variant="Heading/Screen 32" style={{ fontWeight: '500', letterSpacing: -1 }}>
              {t('emVoo.minutos', { min: minutosAte(pousoPrevistoEm, agora) })}
            </Text>
            <Text variant="Body/Medium 14" tone="secondary">
              {horaLocal(pousoPrevistoEm)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} pointerEvents="box-none" />

      {/* Boas-vindas: só no começo do voo, por cima da paisagem, sem tirar espaço dela. */}
      {mostrarBoasVindas ? (
        <Pressable
          onPress={() => setBoasVindasFechada(true)}
          accessibilityRole="button"
          accessibilityHint={t('emVoo.fecharBoasVindas')}
          style={[styles.boasVindas, { marginHorizontal: screenGutter, marginBottom: space[12] }]}
        >
          <Suitcase size={36} />
          <Text variant="Caption/Medium 12" tone="secondary" style={{ flex: 1 }}>
            {t('emVoo.boasVindas', { voo: voo.callsign, origem, destino })}
          </Text>
        </Pressable>
      ) : null}

      {vista === 'globo' ? (
        <View style={[styles.modosDoGlobo, { marginHorizontal: screenGutter }]} accessibilityRole="radiogroup">
          <ModoDoGlobo icone="seguir" rotulo={t('globo.seguir')} ativo={modoGlobo === 'seguir'} onPress={() => setModoGlobo('seguir')} />
          <ModoDoGlobo icone="planeta" rotulo={t('globo.planeta')} ativo={modoGlobo === 'planeta'} onPress={() => setModoGlobo('planeta')} />
        </View>
      ) : null}

      {/* Painel inferior ("Em voo / Painel inferior") */}
      <View
        style={{ paddingHorizontal: screenGutter, paddingTop: space[16], paddingBottom: insets.bottom + space[24], gap: space[20] }}
        onLayout={(e) => setAlturaDoPainel(e.nativeEvent.layout.height)}
      >
        <View style={styles.linha}>
          <Lugar cidade={origem} codigo={codigoDoLugar(voo.origem)} />
          <EmVooRota progresso={progressoDaRota} />
          <Lugar cidade={destino} codigo={codigoDoLugar(voo.destino)} direita />
        </View>
        <View style={styles.linha}>
          <Dado rotulo={t('emVoo.altitude')} valor={metros(pos.altitudePes) ?? '—'} />
          <Dado rotulo={t('emVoo.velocidade')} valor={kmh(pos.noSolo ? 0 : voo.velocidadeNos)} />
          <Dado rotulo={t('emVoo.horaLocal')} valor={horaLocal(agora)} />
        </View>
        <View style={[styles.linha, { minHeight: 48 }]}>
          <Button variant="secondary" size="mini" label={t('emVoo.pousarAntes')} onPress={() => setConfirmando(true)} disabled={tempoAcabou} />
          {pausa ? (
            <View style={styles.servico} accessible accessibilityLabel={t('emVoo.servicoEm', { min: pausa.emMin })}>
              <Icon name="crewServiceTile" />
              <Text variant="Caption/Medium 12">{t('emVoo.servicoEm', { min: pausa.emMin })}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <FolhaPousarAntes
        visivel={confirmando}
        sessao={sessao}
        agora={agora}
        onContinuar={() => setConfirmando(false)}
        onPousar={() => {
          setConfirmando(false);
          encerrar('pousar-antes');
        }}
      />
    </View>
  );
}

const SEM_TRILHA: Amostra[] = [];
const SOBREPOSICAO = 56;
const BOAS_VINDAS_MS = 90_000;

/**
 * O voo gravado no embarque, trocado pela leitura mais nova do cache quando ela chega (a cada 5 min
 * com a tela aberta). Assim a posição projetada se corrige pelo dado real. Só aceita o mesmo voo:
 * mesmo avião, mesmo destino e pouso previsto parecido.
 */
function useVooAtualizado(gravado: Voo): Voo {
  const cache = useVoosDisponiveis();
  const vivo = cache.data?.voos.find((v) => v.hex === gravado.hex);
  if (
    vivo &&
    vivo.coletadoEm > gravado.coletadoEm &&
    distanciaKm(vivo.destino, gravado.destino) < 5 &&
    Math.abs(vivo.pousoPrevistoEm - gravado.pousoPrevistoEm) < 3 * 3_600_000
  ) {
    return vivo;
  }
  return gravado;
}

function ModoDoGlobo({ icone, rotulo, ativo, onPress }: { icone: IconName; rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.modo, ativo && styles.modoAtivo, pressed && { opacity: 0.8 }]}
    >
      <Icon name={icone} color={ativo ? color.accent.default : color.text.primary} />
    </Pressable>
  );
}

function Lugar({ cidade, codigo, direita }: { cidade: string; codigo: string; direita?: boolean }) {
  return (
    <View style={{ gap: space[8], alignItems: direita ? 'flex-end' : 'flex-start', maxWidth: 96 }}>
      <Text variant="Body/Medium 14" tone="tertiary" numberOfLines={1}>
        {cidade}
      </Text>
      <Text variant="Heading/Screen 32">{codigo}</Text>
    </View>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={{ gap: space[8] }}>
      <Text variant="Body/Medium 14" tone="tertiary">
        {rotulo}
      </Text>
      <Text variant="Label/Medium 14" tone="secondary">
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.flight },
  paisagem: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  degradeTopo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundImage: `linear-gradient(180deg, ${color.bg.flight} 18%, transparent 100%)`,
  },
  degradeBase: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundImage: `linear-gradient(180deg, transparent 0%, ${color.bg.flight} 100%)`,
  },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12] },
  boasVindas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[10],
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderRadius: radius.md,
    backgroundColor: color.bg.sheet,
  },
  servico: { flexDirection: 'row', alignItems: 'center', gap: space[8], maxWidth: 160 },
  modosDoGlobo: { flexDirection: 'row', alignSelf: 'flex-start', gap: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: color.surface.strong },
  modo: { width: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modoAtivo: { backgroundColor: color.surface.track },
});
