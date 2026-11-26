/**
 * 04A/04B/04C · Em voo. PRD: RF-17 a RF-20; UC-04.
 * Tudo sai do relógio e da sessão gravada: ao abrir o app, a janela e o globo aparecem na posição certa.
 * Em segundo plano a janela e o globo são desmontados e o relógio para (lição do protótipo, build-7).
 *
 * Pousar antes (E3) abre a confirmação; quando o tempo do usuário acaba, a sessão vira pouso (UC-08).
 * Serviço de bordo: E2 (pausa em andamento, com "Voltar ao foco") e E1 (aviso "De volta ao foco").
 * Em espera (E5) e Continuando até o pouso (E5b) entram no horário se o avião real ainda voa (RN-09a).
 * Ainda não está aqui: Em solo (E8), adiado para a Fase 5 (decisão do Alberto em 25/11/2026).
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SessaoGravada } from '@/data/sessoes/repositorio';
import { useMotivoDaSessao, useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { useContinuandoDesde, useContinuarAtePouso } from '@/data/sessoes/continuarAtePouso';
import { useIndicesQueVoltaram, useVoltouAoFoco } from '@/data/sessoes/voltouAoFoco';
import { useBlocosDoVoo } from '@/data/blocos/useBlocosDoVoo';
import { indiceDaQualidade, quadrosDaJanela, useAjustes } from '@/data/preferencias/ajustes';
import { useSomDeFundo } from '@/data/preferencias/somDeFundo';
import { useVistaDaJanela } from '@/data/preferencias/vistaDaJanela';
import { useTrilha } from '@/data/voos/useTrilha';
import { useVooAoVivo } from '@/data/voos/useVooAoVivo';
import { CAMADAS_DA_VISTA, vistaEmUso } from '@/domain/janela/vistas';
import { agendaDePausas, PAUSA_MAXIMA_MIN } from '@/domain/sessao/pausas';
import { MOTIVO_VAZIO } from '@/domain/sessao/motivo';
import { somEmUso } from '@/domain/sons/catalogo';
import { tempoCumprido } from '@/domain/sessao/encerramento';
import { estadoDaSessao } from '@/domain/sessao/estado';
import { aviaoReal } from '@/domain/voos/aviaoReal';
import { minutosAte, pausaEmAndamento, pausaRecemTerminada, proximaPausa, relogioRegressivo } from '@/domain/sessao/progresso';
import { distanciaKm } from '@/domain/voos/geo';
import { projetar } from '@/domain/voos/projecao';
import type { Voo } from '@/domain/voos/tipos';
import { fusoDaPosicao, horaNoFuso } from '@/domain/voos/horaLocal';
import { progressoNaRota, type Amostra } from '@/domain/voos/trilha';
import { BottomSheet, Button, color, EmVooRota, Icon, IconButton, InfoBanner, radius, screenGutter, SegmentedControl, space, Text, type IconName } from '@/ds';
import { Globo, type ModoGlobo } from '@/globo/Globo';
import { t } from '@/i18n';
import { Janela } from '@/janela/Janela';
import { cancelarAvisoDeFimDaPausa } from '@/services/avisos';
import { useClasse } from '@/services/compras';

import { codigoDoLugar, duracao, duracaoPorExtenso, horaLocal, kmh, metros, nomeDoLugar } from './formato';
import { AvisoDeBoasVindas } from './AvisoDeBoasVindas';
import { AvisoNoApp } from './AvisoNoApp';
import { FolhaEmEspera } from './FolhaEmEspera';
import { FolhaInfoDoVoo, type Radar } from './FolhaInfoDoVoo';
import { FolhaMotivoDaViagem } from './FolhaMotivoDaViagem';
import { FolhaVistaDaJanela } from './FolhaVistaDaJanela';
import { FolhaPousarAntes } from './FolhaPousarAntes';
import { FolhaSons } from './FolhaSons';
import { useEncerrar } from './useEncerrar';
import { useRelogio } from './useRelogio';
import { useSomLiberado } from './somLiberado';

type Vista = 'janela' | 'globo';

/** IconButton de 48 dp: o espaço reservado embaixo do horário do pouso. */
const TAMANHO_DO_BOTAO = 48;

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
  const [explicandoServico, setExplicandoServico] = useState(false);
  // Avisos fechados no "×" (ex.: "pausa-0", "fim-0", "sem-sinal"). É uma lista, não um único valor:
  // com dois avisos ao mesmo tempo, fechar um não pode reabrir o outro (loop do build-47).
  const [avisosFechados, setAvisosFechados] = useState<readonly string[]>([]);
  const fecharAviso = (chave: string) => setAvisosFechados((f) => (f.includes(chave) ? f : [...f, chave]));
  const voltaram = useIndicesQueVoltaram(sessao.id);
  const voltarAoFoco = useVoltouAoFoco((s) => s.voltar);
  const [escolhendoVista, setEscolhendoVista] = useState(false);
  const classe = useClasse();
  const ajustes = useAjustes();
  const { escolhida, escolher } = useVistaDaJanela();
  const vistaDaJanela = vistaEmUso(escolhida, classe);
  const [escolhendoSom, setEscolhendoSom] = useState(false);
  const [vendoMotivo, setVendoMotivo] = useState(false);
  const [vendoInfo, setVendoInfo] = useState(false);
  const motivoDaSessao = useMotivoDaSessao(sessao.id);
  const som = useSomDeFundo();
  // O som em si toca no layout raiz (SomDoVoo), também com a tela bloqueada.
  const somAtual = somEmUso(som.escolhido, classe);
  const encerrar = useEncerrar(sessao);
  // Chegou à tela do voo: o som pode tocar (se o embarque foi pulado, por exemplo).
  const liberarSom = useSomLiberado((s) => s.liberar);
  useEffect(() => {
    liberarSom(sessao.id);
  }, [liberarSom, sessao.id]);

  const { embarcouEm, pousoPrevistoEm } = sessao;
  const { voo, radar } = useVooAtualizado(sessao.voo);
  // O radar voltou: aviso curto "Sinal do radar de volta" (pedido do Alberto, 24/11/2026), e um
  // sinal perdido de novo volta a avisar.
  const [radarAntes, setRadarAntes] = useState(radar);
  const [radarVoltou, setRadarVoltou] = useState<{ em: number; de: 'sem-sinal' | 'sem-internet' } | null>(null);
  if (radar !== radarAntes) {
    if (radar === 'ok' && (radarAntes === 'sem-sinal' || radarAntes === 'sem-internet')) setRadarVoltou({ em: agora, de: radarAntes });
    setRadarAntes(radar);
  }
  const radarFechado = avisosFechados.some((k) => k === 'sem-sinal' || k === 'sem-internet');
  if (radar === 'ok' && radarFechado) setAvisosFechados((f) => f.filter((k) => k !== 'sem-sinal' && k !== 'sem-internet'));
  const trilha = useTrilha(voo).data ?? SEM_TRILHA;
  // Só com a janela à vista: no globo ou com a tela desligada a paisagem não é baixada
  // (voo de 5h45 no globo: 36,7 MB de paisagem que ninguém viu). Ao voltar para a janela,
  // baixa da posição atual em diante e a janela refaz o mosaico quando os blocos chegam.
  useBlocosDoVoo(voo, ativo && vista === 'janela');
  const pos = projetar(voo, agora);
  const fusoDoVoo = useMemo(() => fusoDaPosicao(Math.round(pos.lat), Math.round(pos.lon)), [pos.lat, pos.lon]);
  const horaDoVoo = horaNoFuso(agora, fusoDoVoo);
  const posicao = useMemo(() => ({ lat: pos.lat, lon: pos.lon, rumo: pos.rumo }), [pos.lat, pos.lon, pos.rumo]);
  // Onde o avião estará daqui a 1 s: a janela interpola o caminho entre as leituras do relógio.
  const seguinte = projetar(voo, agora + 1000);
  const posicaoSeguinte = useMemo(() => ({ lat: seguinte.lat, lon: seguinte.lon }), [seguinte.lat, seguinte.lon]);
  const pausas = useMemo(
    () => agendaDePausas(Math.round((pousoPrevistoEm - embarcouEm) / 60_000), sessao.intervaloServico),
    [embarcouEm, pousoPrevistoEm, sessao.intervaloServico],
  );
  const pausa = proximaPausa(embarcouEm, pausas, agora);
  // E2: pausa em andamento (até 5 min). E1: aviso "De volta ao foco" no primeiro minuto depois dela.
  const emPausa = pausaEmAndamento(embarcouEm, pausas, agora, voltaram);
  const pausaTerminada = emPausa ? null : pausaRecemTerminada(embarcouEm, pausas, agora, DE_VOLTA_AO_FOCO_MS);
  // A barra de rota mostra a rota inteira do avião (origem → destino), pela trilha real.
  const progressoDaRota = progressoNaRota(voo.origem, trilha, pos, voo.destino);
  const tempoAcabou = tempoCumprido(pousoPrevistoEm, agora);
  const origem = nomeDoLugar(voo.origem);
  const destino = nomeDoLugar(voo.destino);
  // Quanto o avião andou desde o embarque, para as nuvens passarem na janela.
  const velocidadeKmh = (voo.velocidadeNos ?? 450) * 1.852;
  const deslocamentoKm = ((agora - embarcouEm) / 3_600_000) * velocidadeKmh;

  // A paisagem ocupa tudo acima do painel inferior e passa um pouco por trás dele, sob o degradê.
  const alturaDaPaisagem = Math.max(320, height - alturaDoPainel + SOBREPOSICAO);
  // A janela é 4:3; para preencher a altura, fica mais larga que a tela e é cortada nas laterais.
  const larguraDaJanela = Math.max(width, Math.round((alturaDaPaisagem * 3) / 4));
  const mostrarBoasVindas = !boasVindasFechada && agora - embarcouEm < BOAS_VINDAS_MS;
  const avisoDaPausa = emPausa && !avisosFechados.includes(`pausa-${emPausa.indice}`);
  const avisoRadarVoltou = radar === 'ok' && !!radarVoltou && agora - radarVoltou.em < RADAR_VOLTOU_MS && !avisosFechados.includes(`radar-voltou-${radarVoltou.em}`);
  const avisoDeVolta = !!pausaTerminada && !voltaram.includes(pausaTerminada.indice) && !avisosFechados.includes(`fim-${pausaTerminada.indice}`);

  const encerrarPausa = () => {
    if (!emPausa) return;
    voltarAoFoco(sessao.id, emPausa.indice);
    cancelarAvisoDeFimDaPausa(emPausa.indice);
    setExplicandoServico(false);
  };

  // O horário escolhido chegou: pouso completo garantido (RN-09). Também vale ao reabrir o app depois do pouso.
  // Em espera e "Continuar até o pouso" (RN-09a) entram quando o app souber se o avião real ainda está no ar.
  // E5 Em espera (RN-09a): no horário, se o avião real ainda está no ar (leitura recente do radar),
  // pergunta se o usuário quer continuar até o pouso. Na dúvida, pousa no horário (RN-09).
  const continuandoDesde = useContinuandoDesde(sessao.id);
  const continuarAtePouso = useContinuarAtePouso((s) => s.continuar);
  const fimDoTempo = tempoAcabou
    ? estadoDaSessao({ embarcouEm, pousoPrevistoEm, pausas: [], continuarAtePousoDesde: continuandoDesde }, agora, aviaoReal(voo, radar, agora)).tipo
    : null;
  const emEspera = fimDoTempo === 'em-espera';
  const continuando = fimDoTempo === 'continuando-ate-o-pouso';
  useEffect(() => {
    if (fimDoTempo !== 'pousou') return;
    if (continuandoDesde !== undefined) encerrar('pouso', Date.now(), { desde: continuandoDesde });
    else encerrar('pouso');
  }, [fimDoTempo, continuandoDesde, encerrar]);
  const pousarAgora = () => {
    if (continuandoDesde !== undefined) encerrar('pouso', Date.now(), { desde: continuandoDesde });
    else encerrar('pouso');
  };
  // Durante "Continuar até o pouso", o painel mostra a previsão do avião real.
  const pousoMostrado = continuando ? voo.pousoPrevistoEm : pousoPrevistoEm;
  const prefixo = continuando ? '~' : '';

  return (
    <View style={styles.tela}>
      {/* Paisagem: janela ou globo. Desmontados em segundo plano. */}
      <View style={[styles.paisagem, { height: alturaDaPaisagem }]}>
        {ativo && vista === 'janela' ? (
          <View style={{ position: 'absolute', top: DESCIDA_DA_JANELA, left: (width - larguraDaJanela) / 2 }}>
            <Janela
              width={larguraDaJanela}
              posicao={posicao}
              posicaoSeguinte={posicaoSeguinte}
              time={agora}
              driftKm={deslocamentoKm}
              driftKmPorS={velocidadeKmh / 3600}
              altitudeKm={pos.noSolo ? 0 : pos.altitudePes === null ? null : pos.altitudePes * 0.0003048}
              fps={quadrosDaJanela(ajustes)}
              quality={indiceDaQualidade(ajustes.qualidadeDaJanela)}
              satClouds
              showMeter={false}
              showLandscape
              showOverlay
              asa={CAMADAS_DA_VISTA[vistaDaJanela].asa}
              moldura={CAMADAS_DA_VISTA[vistaDaJanela].moldura}
            />
          </View>
        ) : null}
        {ativo && vista === 'globo' ? (
          <Globo
            width={width}
            height={alturaDaPaisagem}
            aviao={posicao}
            trilha={trilha}
            // "Centralizar" no lugar do botão de vistas da janela, embaixo do horário do pouso: o painel
            // superior reserva esse espaço nas duas vistas (build-77: o botão tinha descido).
            topoDosControles={alturaDoTopo - TAMANHO_DO_BOTAO}
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
            {/* Toque no código do voo: "Sobre este voo" (pedido do Alberto, 24/11/2026). */}
            <Pressable
              onPress={() => setVendoInfo(true)}
              accessibilityRole="button"
              accessibilityLabel={t('infoDoVoo.abrir', { voo: voo.callsign })}
              hitSlop={8}
              style={({ pressed }) => [{ gap: space[6], alignSelf: 'flex-start' }, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Text variant="Body/Medium 14">{voo.callsign}</Text>
                <Icon name="chevronRight" color={color.text.tertiary} />
              </View>
              {voo.companhiaNome ? (
                <Text variant="Body/Medium 14" tone="tertiary">
                  {voo.companhiaNome}
                </Text>
              ) : null}
            </Pressable>
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
          <View style={{ alignItems: 'flex-end', gap: space[6] }} accessible accessibilityLabel={t('emVoo.pousaEmAcessivel', { duracao: duracaoPorExtenso(minutosAte(pousoMostrado, agora)), hora: horaLocal(pousoMostrado) })}>
            <Text variant="Body/Medium 14" tone="secondary">
              {t('emVoo.pousaEm')}
            </Text>
            <Text variant="Heading/Screen 32" style={{ fontWeight: '500', letterSpacing: -1 }}>
              {prefixo}
              {duracao(minutosAte(pousoMostrado, agora))}
            </Text>
            <Text variant="Body/Medium 14" tone="secondary">
              {horaLocal(pousoMostrado)}
            </Text>
            {vista === 'janela' ? (
              <IconButton
                icon="windowView"
                accessibilityLabel={t('vista.botao')}
                onPress={() => setEscolhendoVista(true)}
                indicator={classe !== 'primeira'}
                style={{ marginTop: space[10] }}
              />
            ) : (
              // Mesmo espaço do botão de vistas no globo: os avisos ficam no mesmo lugar nas duas
              // vistas (Alberto, 25/11/2026). O "Centralizar" do globo é desenhado aqui por cima.
              <View style={{ width: TAMANHO_DO_BOTAO, height: TAMANHO_DO_BOTAO, marginTop: space[10] }} />
            )}
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} pointerEvents="box-none">
        {/* Um aviso por vez: serviço de bordo, depois "De volta ao foco", depois boas-vindas. */}
        <View style={{ paddingHorizontal: screenGutter, paddingTop: space[16] }}>
          {continuando && continuandoDesde !== undefined && !avisosFechados.includes('continuando') ? (
            // E5b (Figma v3): continuando até o pouso, com os minutos a mais.
            <AvisoNoApp
              key="continuando"
              icone="plane"
              titulo={t('emEspera.avisoTitulo')}
              texto={t('emEspera.avisoTexto', {
                tempo: duracao(Math.round((pousoPrevistoEm - embarcouEm) / 60_000)),
                extra: duracao(Math.max(0, Math.floor((agora - continuandoDesde) / 60_000))),
              })}
              rotuloFechar={t('emVoo.fecharAviso')}
              onFechar={() => fecharAviso('continuando')}
            />
          ) : avisoDaPausa ? (
            <AvisoNoApp
              key={`pausa-${emPausa.indice}`}
              icone="servicoDeBordo"
              titulo={t('servico.avisoTitulo')}
              texto={t('servico.avisoTexto')}
              rotuloFechar={t('servico.fecharAviso')}
              onFechar={() => fecharAviso(`pausa-${emPausa.indice}`)}
            />
          ) : avisoDeVolta && pausaTerminada ? (
            <AvisoNoApp
              key={`fim-${pausaTerminada.indice}`}
              icone="servicoDeBordo"
              titulo={t('servico.deVoltaTitulo')}
              texto={t('servico.deVoltaTexto', { hora: horaLocal(pousoPrevistoEm) })}
              rotuloFechar={t('servico.fecharDeVolta')}
              onFechar={() => fecharAviso(`fim-${pausaTerminada.indice}`)}
            />
          ) : (radar === 'sem-sinal' || radar === 'sem-internet') && !avisosFechados.includes(radar) ? (
            // E4 e X4 (Figma v3): o foco continua; a posição passa a ser estimada.
            <AvisoNoApp
              key={radar}
              icone={radar === 'sem-internet' ? 'semInternet' : 'semSinal'}
              titulo={radar === 'sem-internet' ? t('emVoo.semInternetTitulo') : t('emVoo.semSinalTitulo')}
              texto={radar === 'sem-internet' ? t('emVoo.semInternetTexto', { hora: horaLocal(pousoPrevistoEm) }) : t('emVoo.semSinalTexto')}
              rotuloFechar={t('emVoo.fecharAviso')}
              onFechar={() => fecharAviso(radar)}
            />
          ) : avisoRadarVoltou && radarVoltou ? (
            <AvisoNoApp
              key={`radar-voltou-${radarVoltou.em}`}
              icone="plane"
              titulo={radarVoltou.de === 'sem-internet' ? t('emVoo.conexaoVoltouTitulo') : t('emVoo.radarVoltouTitulo')}
              texto={t('emVoo.radarVoltouTexto')}
              rotuloFechar={t('emVoo.fecharAviso')}
              onFechar={() => fecharAviso(`radar-voltou-${radarVoltou.em}`)}
            />
          ) : mostrarBoasVindas ? (
            <AvisoDeBoasVindas voo={voo.callsign} origem={origem} destino={destino} onFechar={() => setBoasVindasFechada(true)} />
          ) : null}
        </View>
      </View>

      <View style={[styles.linha, styles.linhaDosControles, { marginHorizontal: screenGutter }]} pointerEvents="box-none">
        {vista === 'globo' ? (
          <View style={styles.modosDoGlobo} accessibilityRole="radiogroup">
            <ModoDoGlobo icone="seguir" rotulo={t('globo.seguir')} ativo={modoGlobo === 'seguir'} onPress={() => setModoGlobo('seguir')} />
            <ModoDoGlobo icone="planeta" rotulo={t('globo.planeta')} ativo={modoGlobo === 'planeta'} onPress={() => setModoGlobo('planeta')} />
          </View>
        ) : (
          <View />
        )}
        {/* Ajustes acima do som (Alberto, build-31): o voo segue no horário com os Ajustes abertos. */}
        <View style={styles.botoesDaDireita} pointerEvents="box-none">
          <IconButton icon="settings" accessibilityLabel={t('ajustes.abrir')} onPress={() => router.push('/ajustes')} />
          {/* Motivo da viagem em voo (anotação do Figma v3): ver, marcar e editar as tarefas. */}
          <IconButton icon="logbook" accessibilityLabel={t('motivo.botaoEmVoo')} onPress={() => setVendoMotivo(true)} />
          <IconButton icon="speaker" accessibilityLabel={t('sons.botao')} onPress={() => setEscolhendoSom(true)} />
        </View>
      </View>

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
          {/* Hora de onde o avião está, com o fuso (Alberto, 26/11/2026). */}
          <Dado rotulo={horaDoVoo.fuso ? t('emVoo.horaLocalComFuso', { fuso: horaDoVoo.fuso }) : t('emVoo.horaLocal')} valor={horaDoVoo.hora} />
        </View>
        <View style={[styles.linha, { minHeight: 48 }]}>
          <Button
            variant="secondary"
            size="mini"
            label={continuando ? t('emVoo.pousarAgora') : t('emVoo.pousarAntes')}
            onPress={continuando ? pousarAgora : () => setConfirmando(true)}
            disabled={tempoAcabou && !continuando}
            style={{ alignSelf: 'center' }}
          />
          {emPausa ? (
            // E2: "Pausa em andamento" com a contagem regressiva (Figma v3: "Em andamento att").
            <IndicadorDoServico
              texto={t('servico.emAndamento', { tempo: relogioRegressivo(emPausa.restanteMs) })}
              rotulo={t('servico.emAndamentoAcessivel', { tempo: relogioRegressivo(emPausa.restanteMs) })}
              onPress={() => setExplicandoServico(true)}
            />
          ) : pausa ? (
            <IndicadorDoServico
              texto={t('emVoo.servicoEm', { tempo: duracao(pausa.emMin) })}
              rotulo={t('emVoo.servicoEm', { tempo: duracao(pausa.emMin) })}
              dica={t('servico.dica')}
              onPress={() => setExplicandoServico(true)}
            />
          ) : sessao.intervaloServico === 'desligado' ? null : (
            <IndicadorDoServico texto={t('servico.semMaisPausas')} apagado onPress={() => setExplicandoServico(true)} />
          )}
        </View>
      </View>

      <BottomSheet
        visible={explicandoServico}
        onClose={() => setExplicandoServico(false)}
        title={t('servico.titulo')}
        icone={<IconeDoServico />}
        subtitle={emPausa ? undefined : t('servico.subtitulo')}
        footer={
          emPausa ? (
            <View style={{ gap: space[12] }}>
              {/* Secundário (Alberto, build-51): como principal, parecia o botão de fechar a folha e
                  dava para encerrar a pausa sem querer. */}
              <Button variant="secondary" size="medium" icon={null} label={t('servico.finalizarPausa')} onPress={encerrarPausa} />
              <Text variant="Caption/Regular 12" tone="tertiary">
                {t('servico.terminaSozinha')}
              </Text>
            </View>
          ) : (
            <Button size="medium" icon={null} label={t('servico.entendi')} onPress={() => setExplicandoServico(false)} />
          )
        }
      >
        {emPausa ? (
          // E2 (Figma 194:4652): contagem regressiva e barra da pausa.
          <View style={{ gap: space[16], paddingTop: space[4] }}>
            <View style={styles.contagem} accessible accessibilityLabel={t('servico.emAndamentoAcessivel', { tempo: relogioRegressivo(emPausa.restanteMs) })}>
              <Text variant="Display/Data 52" style={styles.relogio}>
                {relogioRegressivo(emPausa.restanteMs)}
              </Text>
              <Text variant="Body/Medium 14" tone="secondary">
                {t('servico.restantes')}
              </Text>
            </View>
            <View style={styles.trilhoDaPausa}>
              <View style={[styles.barraDaPausa, { width: `${Math.min(100, (emPausa.restanteMs / (PAUSA_MS)) * 100)}%` }]} />
            </View>
          </View>
        ) : (
        <View style={{ gap: space[12], paddingTop: space[4] }}>
          <Text variant="Body/Medium 14" tone="secondary">
            {sessao.intervaloServico === 'desligado' ? t('servico.desligado') : t('servico.comoFunciona', { intervalo: sessao.intervaloServico })}
          </Text>
          <Text variant="Body/Medium 14" tone="secondary">
            {t('servico.nadaSePerde')}
          </Text>
          {pausa ? (
            <Text variant="Label/Medium 14">
              {t('servico.proxima', { min: pausa.emMin, hora: horaLocal(embarcouEm + pausas[pausa.indice].inicioMin * 60_000) })}
            </Text>
          ) : null}
        </View>
        )}
      </BottomSheet>

      <FolhaSons
        visivel={escolhendoSom}
        classe={classe}
        emUso={somAtual}
        volume={som.volume}
        onEscolher={som.escolher}
        onVolume={som.ajustarVolume}
        onPrimeiraClasse={() => {
          setEscolhendoSom(false);
          router.push('/primeira-classe');
        }}
        onFechar={() => setEscolhendoSom(false)}
      />

      <FolhaVistaDaJanela
        visivel={escolhendoVista}
        classe={classe}
        emUso={vistaDaJanela}
        onEscolher={(v) => {
          escolher(v);
          setEscolhendoVista(false);
        }}
        onPrimeiraClasse={() => {
          setEscolhendoVista(false);
          router.push('/primeira-classe');
        }}
        onFechar={() => setEscolhendoVista(false)}
      />

      <FolhaMotivoDaViagem
        visivel={vendoMotivo}
        inicial={motivoDaSessao.motivo ?? MOTIVO_VAZIO}
        resumo
        // Cada mudança (marcar, editar, salvar o objetivo) vai para o SQLite na hora.
        onSalvar={motivoDaSessao.salvar}
        onFechar={() => setVendoMotivo(false)}
      />

      <FolhaInfoDoVoo visivel={vendoInfo} voo={voo} pos={pos} radar={radar} agora={agora} onFechar={() => setVendoInfo(false)} />

      <FolhaEmEspera
        visivel={emEspera}
        sessao={sessao}
        minutosAtePousoReal={minutosAte(voo.pousoPrevistoEm, agora)}
        onContinuar={() => continuarAtePouso(sessao.id, Date.now())}
        onPousar={pousarAgora}
      />

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
/** Quanto tempo o aviso "Sinal do radar de volta" fica na tela. */
const RADAR_VOLTOU_MS = 8_000;
/** Quanto tempo o aviso "De volta ao foco" fica depois do fim da pausa. */
const DE_VOLTA_AO_FOCO_MS = 60_000;
const PAUSA_MS = PAUSA_MAXIMA_MIN * 60_000;
/** A janela desce um pouco para o vidro começar abaixo do seletor Janela | Globo (pedido do Alberto, build-17). */
const DESCIDA_DA_JANELA = 56;

/**
 * O voo gravado no embarque, trocado pela leitura mais nova do cache quando ela chega (a cada 5 min
 * com a tela aberta). Assim a posição projetada se corrige pelo dado real.
 * Guarda a última leitura boa: sem sinal, o voo segue projetado a partir dela (antes voltava para
 * a leitura do embarque) e a próxima busca usa a região onde o avião foi visto por último.
 * Só aceita o mesmo voo: mesmo avião, mesmo destino e pouso previsto parecido.
 */
function useVooAtualizado(gravado: Voo): { voo: Voo; radar: Radar } {
  const [ultimo, setUltimo] = useState(gravado);
  const q = useVooAoVivo(ultimo, () => projetar(ultimo, Date.now()));
  const leitura = q.data;
  // X4: a leitura falhou (sem conexão). E4: o avião devia estar numa área coletada e não está.
  // Fora das áreas do coletor: posição estimada, sem aviso (`fora-da-area`).
  const radar: Radar = q.isError ? 'sem-internet' : leitura ? (leitura.situacao === 'ok' ? 'ok' : leitura.situacao) : 'ok';
  const vivo = leitura?.voo;
  if (
    vivo &&
    vivo.coletadoEm > ultimo.coletadoEm &&
    distanciaKm(vivo.destino, gravado.destino) < 5 &&
    Math.abs(vivo.pousoPrevistoEm - gravado.pousoPrevistoEm) < 3 * 3_600_000
  ) {
    setUltimo(vivo);
  }
  return { voo: ultimo, radar };
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

/** Quadrado do ícone do serviço de bordo (Figma v3): xícara laranja; apagado quando não há mais pausas. */
function IconeDoServico({ apagado }: { apagado?: boolean }) {
  return (
    <View style={[styles.iconeDoServico, apagado && { backgroundColor: color.bg.system }]}>
      <Icon name="servicoDeBordo" color={apagado ? color.text.tertiary : color.status.warning} />
    </View>
  );
}

/** Figma v3: componente "Serviço de bordo" (próximo serviço, pausa em andamento, sem mais pausas). */
function IndicadorDoServico({ texto, rotulo, dica, apagado, onPress }: { texto: string; rotulo?: string; dica?: string; apagado?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.servico, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={rotulo ?? texto.replace('\n', ' ')}
      accessibilityHint={dica}
      hitSlop={8}
      onPress={onPress}
    >
      <IconeDoServico apagado={apagado} />
      <Text variant="Caption/Regular 12" style={{ letterSpacing: 0, fontVariant: ['tabular-nums'] }}>
        {texto}
      </Text>
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
  linhaDosControles: { alignItems: 'flex-end' },
  botoesDaDireita: { gap: space[8] },
  servico: { flexDirection: 'row', alignItems: 'center', gap: space[8], maxWidth: 180 },
  iconeDoServico: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: color.aviso.icone, alignItems: 'center', justifyContent: 'center' },
  contagem: { flexDirection: 'row', alignItems: 'baseline', gap: space[12] },
  relogio: { fontVariant: ['tabular-nums'] },
  trilhoDaPausa: { height: 4, borderRadius: 2, backgroundColor: color.surface.track, overflow: 'hidden' },
  barraDaPausa: { height: 4, borderRadius: 2, backgroundColor: color.accent.default },
  // Embaixo, na linha do botão de som (Figma 04A; Alberto, build-47).
  modosDoGlobo: { flexDirection: 'row', alignSelf: 'flex-end', gap: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: color.surface.strong },
  modo: { width: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modoAtivo: { backgroundColor: color.surface.track },
});
