/**
 * 03 · Cartão de embarque. PRD: RF-13, RF-14, RN-09; UC-02 (E2: o voo sumiu do cache).
 * "Adicionar motivo da viagem" abre a folha 03b.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoosDisponiveis } from '@/data/voos/useVoos';
import { minutosAtePouso } from '@/domain/voos/elegibilidade';
import { distanciaKm } from '@/domain/voos/geo';
import { projetar } from '@/domain/voos/projecao';
import { motivoVazio, type MotivoDaViagem } from '@/domain/sessao/motivo';
import { ActionRow, Button, color, Icon, InfoBanner, LinhaTracejada, radius, screenGutter, space, Suitcase, Text, TopBar, type IconName } from '@/ds';
import { t } from '@/i18n';

import { CodigoDeBarras } from './CodigoDeBarras';
import { FolhaMotivoDaViagem } from './FolhaMotivoDaViagem';
import { ImpressaoDoBilhete } from './ImpressaoDoBilhete';
import { codigoDoLugar, dataCurta, duracao, duracaoCompacta, horaLocal, km, metros, nomeDoLugar } from './formato';
import { useNovoVoo } from './novoVoo';

const ICONE_DA_CATEGORIA: Record<string, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};

export function TelaCartao() {
  const insets = useSafeAreaInsets();
  const { tempoMin, vooHex, motivo, setMotivo } = useNovoVoo();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const q = useVoosDisponiveis();
  const [largura, setLargura] = useState(348);
  // Data do dia em que o cartão foi impresso.
  const [hoje] = useState(() => dataCurta(Date.now()));
  const voo = q.data?.voos.find((v) => v.hex === vooHex);
  const agora = q.data?.consultadoEm ?? 0;

  if (!voo) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg.app, paddingTop: insets.top + space[6], paddingHorizontal: screenGutter, gap: space[20] }}>
        <TopBar title={t('partidas.titulo')} onBack={() => router.back()} step={3} />
        <InfoBanner message={q.isPending ? t('dial.procurando') : t('cartao.sumiu')} />
        {!q.isPending ? <Button label={t('cartao.verPartidas')} onPress={() => router.back()} /> : null}
      </View>
    );
  }

  const min = minutosAtePouso(voo, agora);
  const pos = projetar(voo, agora);
  const falta = distanciaKm(pos, voo.destino);
  const cidade = nomeDoLugar(voo.destino);
  const altitude = metros(pos.altitudePes);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[24],
          paddingHorizontal: screenGutter,
          gap: space[12],
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: space[12] }}>
          <TopBar title={t('partidas.titulo')} onBack={() => router.back()} time={duracaoCompacta(tempoMin)} step={3} />
          <Text variant="Display/Pixel 32" style={{ color: color.text.accent, paddingTop: space[8] }} accessibilityRole="header">
            {t('cartao.titulo')}
          </Text>

          <View accessible accessibilityLabel={t('cartao.acessivel', { voo: voo.callsign, origem: nomeDoLugar(voo.origem), destino: cidade, min })}>
            <View style={styles.cabecalho}>
              <Text variant="Body/Large 16">{t('cartao.cartao')}</Text>
              <Text variant="Body/Medium 14" tone="tertiary">
                {voo.callsign}
              </Text>
            </View>
            <ImpressaoDoBilhete dica={t('cartao.pularImpressao')}>
            <View style={[styles.papel, styles.papelDeCima]}>
              <View style={styles.linha}>
                <Lugar cidade={nomeDoLugar(voo.origem)} codigo={codigoDoLugar(voo.origem)} />
                <View style={styles.rota}>
                  <LinhaTracejada cor={color.cartao.tracejado} traco={2} espaco={2} style={{ flex: 1 }} />
                  <Icon name="plane" size={21} color={color.cartao.texto} />
                  <LinhaTracejada cor={color.cartao.tracejado} traco={2} espaco={2} style={{ flex: 1 }} />
                </View>
                <Lugar cidade={cidade} codigo={codigoDoLugar(voo.destino)} direita />
              </View>
              <View style={styles.linha}>
                <Dado rotulo={t('cartao.chegada')} valor={horaLocal(voo.pousoPrevistoEm)} grande />
                <Dado rotulo={t('cartao.tempoDeFoco')} valor={duracao(min)} grande direita />
              </View>
              <View style={styles.linha}>
                <Dado rotulo={t('cartao.status')} valor={t('cartao.confirmado')} />
                <Dado rotulo={t('cartao.aeronave')} valor={voo.aeronave ?? '—'} />
                <Dado rotulo={t('cartao.assento')} valor="23A" />
                <Dado rotulo={t('cartao.data')} valor={hoje} />
              </View>
              {/* Picote entre as duas partes do bilhete */}
              <LinhaTracejada cor={color.cartao.tracejado} traco={5} espaco={4} style={styles.picote} />
            </View>
            <View style={[styles.papel, styles.papelDeBaixo]} onLayout={(e) => setLargura(e.nativeEvent.layout.width - 2 * space[16])}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[12] }}>
                <Suitcase size={36} />
                <Text variant="Caption/Medium 12" style={{ flex: 1, color: color.cartao.textoSecundario }}>
                  {altitude
                    ? t('cartao.situacao', { altitude, falta: km(falta), cidade, hora: horaLocal(voo.pousoPrevistoEm) })
                    : t('cartao.situacaoSemAltitude', { falta: km(falta), cidade, hora: horaLocal(voo.pousoPrevistoEm) })}
                </Text>
              </View>
              <CodigoDeBarras texto={voo.callsign} largura={largura} />
            </View>
            </ImpressaoDoBilhete>
          </View>
          {motivoVazio(motivo) ? (
            <ActionRow title={t('cartao.adicionarMotivo')} description={t('cartao.adicionarMotivoDescricao')} onPress={() => setFolhaAberta(true)} />
          ) : (
            // 03c (Figma v3): com o motivo preenchido, o bloco mostra o ícone da categoria e o objetivo.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('cartao.editarMotivo')}: ${resumoDoMotivo(motivo)}`}
              onPress={() => setFolhaAberta(true)}
              style={({ pressed }) => [styles.motivo, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.iconeDoMotivo}>
                <Icon name={motivo.categoria ? ICONE_DA_CATEGORIA[motivo.categoria] : 'logbook'} size={16} />
              </View>
              <Text variant="Body/Large 16" style={{ flex: 1 }} numberOfLines={1}>
                {motivo.foco || resumoDoMotivo(motivo)}
              </Text>
              <Icon name="chevronRight" />
            </Pressable>
          )}
        </View>
        <Button label={t('cartao.embarcar')} onPress={() => router.push('/voo/embarque')} />
      </ScrollView>
      <FolhaMotivoDaViagem
        visivel={folhaAberta}
        inicial={motivo}
        onFechar={() => setFolhaAberta(false)}
        onSalvar={(m) => {
          setMotivo(m);
          setFolhaAberta(false);
        }}
      />
    </View>
  );
}

/** "Estudo · Revisar o capítulo 3 · 3 tarefas", só com o que foi preenchido. */
function resumoDoMotivo(m: MotivoDaViagem): string {
  const partes = [
    m.categoria ? t(`motivo.categorias.${m.categoria}`) : null,
    m.foco || null,
    m.tarefas.length === 0 ? null : m.tarefas.length === 1 ? t('motivo.umaTarefa') : t('motivo.tarefas', { n: m.tarefas.length }),
  ];
  return partes.filter(Boolean).join(' · ');
}

function Lugar({ cidade, codigo, direita }: { cidade: string; codigo: string; direita?: boolean }) {
  return (
    <View style={{ gap: space[4], alignItems: direita ? 'flex-end' : 'flex-start', maxWidth: 110 }}>
      <Text variant="Body/Medium 14" style={{ color: color.cartao.textoSecundario }} numberOfLines={1}>
        {cidade}
      </Text>
      <Text variant="Heading/Screen 32" style={{ color: color.cartao.texto }}>
        {codigo}
      </Text>
    </View>
  );
}

function Dado({ rotulo, valor, grande, direita }: { rotulo: string; valor: string; grande?: boolean; direita?: boolean }) {
  return (
    <View style={{ gap: space[4], alignItems: direita ? 'flex-end' : 'flex-start' }}>
      <Text variant="Body/Medium 14" style={{ color: grande ? color.cartao.textoMedio : color.cartao.textoSecundario }}>
        {rotulo}
      </Text>
      <Text
        variant={grande ? 'Heading/Data 24' : 'Label/Medium 14'}
        style={grande ? { fontSize: 20, color: color.cartao.texto } : { color: color.cartao.textoMedio }}
      >
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space[16],
    backgroundColor: color.cartao.cabecalho,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderStyle: 'dashed',
    borderColor: color.cartao.bordaDoCabecalho,
  },
  papel: { backgroundColor: color.cartao.papel, paddingHorizontal: space[16], paddingVertical: space[20] },
  papelDeCima: { gap: space[24], borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  picote: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  papelDeBaixo: { gap: space[16], borderRadius: 12 },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16], borderRadius: radius.lg, backgroundColor: color.surface.subtle },
  iconeDoMotivo: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.surface.subtle, alignItems: 'center', justifyContent: 'center' },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rota: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: space[12] },
});
