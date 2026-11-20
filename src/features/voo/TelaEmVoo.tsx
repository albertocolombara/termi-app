/**
 * 04A/04B/04C · Em voo. PRD: RF-17 a RF-20; UC-04.
 * Tudo sai do relógio e da sessão gravada: ao abrir o app, a janela e o globo aparecem na posição certa.
 * Em segundo plano a janela e o globo são desmontados e o relógio para (lição do protótipo, build-7).
 *
 * Pousar antes (E3) abre a confirmação; quando o tempo do usuário acaba, a sessão vira pouso (UC-08).
 * Ainda não estão aqui: serviço de bordo (E1/E2), Em espera (E5), Em solo (E8), sons e vista da janela.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SessaoGravada } from '@/data/sessoes/repositorio';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { agendaDePausas } from '@/domain/sessao/pausas';
import { tempoCumprido } from '@/domain/sessao/encerramento';
import { minutosAte, progressoDaSessao, proximaPausa } from '@/domain/sessao/progresso';
import { distanciaKm } from '@/domain/voos/geo';
import { projetar } from '@/domain/voos/projecao';
import { Button, color, EmVooRota, Icon, IconButton, InfoBanner, radius, screenGutter, SegmentedControl, space, Suitcase, Text } from '@/ds';
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
  const [alturaDoPainel, setAlturaDoPainel] = useState(260);
  const [confirmando, setConfirmando] = useState(false);
  const encerrar = useEncerrar(sessao);

  const { voo, embarcouEm, pousoPrevistoEm } = sessao;
  const pos = projetar(voo, agora);
  const posicao = useMemo(() => ({ lat: pos.lat, lon: pos.lon, rumo: pos.rumo }), [pos.lat, pos.lon, pos.rumo]);
  const pausas = useMemo(
    () => agendaDePausas(Math.round((pousoPrevistoEm - embarcouEm) / 60_000), sessao.intervaloServico),
    [embarcouEm, pousoPrevistoEm, sessao.intervaloServico],
  );
  const pausa = proximaPausa(embarcouEm, pausas, agora);
  const progresso = progressoDaSessao(embarcouEm, pousoPrevistoEm, agora);
  // No globo, o trecho voado vai do aeroporto de origem até o avião (geográfico, não pelo tempo).
  const totalKm = distanciaKm(voo.origem, voo.destino);
  const progressoNoMapa = totalKm > 0 ? Math.min(1, distanciaKm(voo.origem, pos) / totalKm) : 1;
  const tempoAcabou = tempoCumprido(pousoPrevistoEm, agora);

  // O horário escolhido chegou: pouso completo garantido (RN-09). Também vale ao reabrir o app depois do pouso.
  // Em espera e "Continuar até o pouso" (RN-09a) entram quando o app souber se o avião real ainda está no ar.
  useEffect(() => {
    if (tempoAcabou) encerrar('pouso');
  }, [tempoAcabou, encerrar]);
  const origem = nomeDoLugar(voo.origem);
  const destino = nomeDoLugar(voo.destino);
  // Quanto o avião andou desde o embarque, para as nuvens passarem na janela.
  const deslocamentoKm = ((agora - embarcouEm) / 3_600_000) * (voo.velocidadeNos ?? 450) * 1.852;
  const alturaDoGlobo = Math.max(240, height - alturaDoPainel - insets.bottom);

  return (
    <View style={styles.tela}>
      {/* Fundo: janela (4:3, largura toda) ou globo. Desmontados em segundo plano. */}
      <View style={StyleSheet.absoluteFill}>
        {ativo && vista === 'janela' ? (
          <Janela
            width={width}
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
        ) : null}
        {ativo && vista === 'globo' ? (
          <Globo
            width={width}
            height={alturaDoGlobo}
            aviao={posicao}
            progresso={progressoNoMapa}
            origem={{ lat: voo.origem.lat, lon: voo.origem.lon, nome: origem }}
            destino={{ lat: voo.destino.lat, lon: voo.destino.lon, nome: destino }}
            modo={modoGlobo}
            instante={agora}
          />
        ) : null}
      </View>

      {/* Painel superior */}
      <View style={{ paddingTop: insets.top + space[24], paddingHorizontal: screenGutter, gap: space[16] }} pointerEvents="box-none">
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

      {vista === 'globo' ? (
        <View style={[styles.modosDoGlobo, { marginHorizontal: screenGutter }]}>
          <IconButton
            icon="plane"
            accessibilityLabel={t('globo.seguir')}
            onPress={() => setModoGlobo('seguir')}
            style={modoGlobo === 'seguir' ? styles.modoAtivo : undefined}
          />
          <IconButton
            icon="globe"
            accessibilityLabel={t('globo.planeta')}
            onPress={() => setModoGlobo('planeta')}
            style={modoGlobo === 'planeta' ? styles.modoAtivo : undefined}
          />
        </View>
      ) : null}

      {/* Painel inferior ("Em voo / Painel inferior") */}
      <View
        style={{ paddingHorizontal: screenGutter, paddingTop: space[16], paddingBottom: insets.bottom + space[24], gap: space[20], backgroundColor: vista === 'globo' ? color.bg.flight : 'transparent' }}
        onLayout={(e) => setAlturaDoPainel(e.nativeEvent.layout.height)}
      >
        <View style={styles.linha}>
          <Lugar cidade={origem} codigo={codigoDoLugar(voo.origem)} />
          <EmVooRota progresso={progresso} />
          <Lugar cidade={destino} codigo={codigoDoLugar(voo.destino)} direita />
        </View>
        <View style={styles.linha}>
          <Dado rotulo={t('emVoo.altitude')} valor={metros(pos.altitudePes) ?? '—'} />
          <Dado rotulo={t('emVoo.velocidade')} valor={kmh(pos.noSolo ? 0 : voo.velocidadeNos)} />
          <Dado rotulo={t('emVoo.horaLocal')} valor={horaLocal(agora)} />
        </View>
        <View style={styles.boasVindas}>
          <Suitcase size={36} />
          <Text variant="Caption/Medium 12" tone="tertiary" style={{ flex: 1 }}>
            {t('emVoo.boasVindas', { voo: voo.callsign, origem, destino })}
          </Text>
        </View>
        <View style={[styles.linha, { minHeight: 48 }]}>
          <Button variant="secondary" size="small" label={t('emVoo.pousarAntes')} onPress={() => setConfirmando(true)} disabled={tempoAcabou} />
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
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12] },
  boasVindas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[10],
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderRadius: radius.md,
    backgroundColor: color.surface.subtle,
  },
  servico: { flexDirection: 'row', alignItems: 'center', gap: space[8], maxWidth: 160 },
  modosDoGlobo: { flexDirection: 'row', alignSelf: 'flex-start', gap: space[4], padding: space[4], borderRadius: radius.xl, backgroundColor: color.surface.strong },
  modoAtivo: { backgroundColor: color.surface.default },
});
