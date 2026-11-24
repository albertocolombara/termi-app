/**
 * M3b · Detalhe do voo no diário (Figma v3). PRD: RF-34; UC-11.
 * Lê o que foi gravado no encerramento: nada é recalculado, exceto o serviço de bordo, que sai da
 * agenda do voo (RN-05 a RN-07) até o fim dele.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAtualizarMotivoDoVoo, useSessaoEncerrada } from '@/data/sessoes/useSessaoEmAndamento';
import { dataRelativa } from '@/domain/historico/historico';
import { agendaDePausas, PAUSA_MAXIMA_MIN } from '@/domain/sessao/pausas';
import { Cauda, CategoriaTag, Checkbox, color, InfoBanner, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';

import { CarimboDoPassaporte } from '../passaporte/CarimboDoPassaporte';
import { codigoDoLugar, duracao, horaLocal, nomeDoLugar } from '../voo/formato';
import { useRelogio } from '../voo/useRelogio';

export function TelaDetalheDoVoo({ id }: { id: string | undefined }) {
  const insets = useSafeAreaInsets();
  const q = useSessaoEncerrada(id);
  const atualizarMotivo = useAtualizarMotivoDoVoo(id);
  const { agora } = useRelogio(60_000);
  const s = q.data;

  if (!s) {
    return (
      <View style={[styles.tela, { paddingTop: insets.top + space[6], paddingHorizontal: screenGutter, gap: space[24] }]}>
        <TopBar title={t('diario.titulo')} onBack={() => router.back()} />
        <InfoBanner message={q.isPending ? t('dial.procurando') : t('detalhe.nenhum')} />
      </View>
    );
  }

  const pousou = s.resultado === 'pousou';
  const { voo, motivo } = s;
  const destino = codigoDoLugar(voo.destino);
  const voado = (s.encerrouEm - s.embarcouEm) / 60_000;
  const pausas = agendaDePausas(s.tempoEscolhidoMin, s.intervaloServico).filter((p) => p.inicioMin < voado);
  const minutosDePausa = pausas.reduce((soma, p) => soma + Math.max(0, Math.min(PAUSA_MAXIMA_MIN, voado - p.inicioMin)), 0);
  const temMotivo = !!(motivo.categoria || motivo.foco || motivo.tarefas.length);
  const subtitulo = [voo.companhiaNome, voo.aeronave].filter(Boolean).join(' · ');

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      <TopBar title={voo.callsign} onBack={() => router.back()} />

      <View style={{ gap: space[14] }}>
        <View style={styles.cabecalho}>
          <Cauda pais={voo.companhiaPais} />
          <View style={{ flex: 1, gap: space[2] }}>
            <Text variant="Label/Strong 14" numberOfLines={1}>
              {nomeDoLugar(voo.origem)} → {nomeDoLugar(voo.destino)}
            </Text>
            {subtitulo ? (
              <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
                {subtitulo}
              </Text>
            ) : null}
          </View>
          {/* Pousou em verde; Pousou antes em cor neutra (CLAUDE.md §9). */}
          <View style={[styles.situacao, pousou ? styles.situacaoPousou : styles.situacaoAntes]}>
            <Text variant="Caption/Strong 12" style={{ color: pousou ? color.status.success : color.text.secondary }}>
              {pousou ? t('diario.pousou') : t('diario.pousouAntes')}
            </Text>
          </View>
        </View>
        <View style={styles.horarios}>
          <Horario rotulo={t('detalhe.embarque')} hora={horaLocal(s.embarcouEm)} onde={t('detalhe.ondeEQuando', { codigo: codigoDoLugar(voo.origem), data: dataRelativa(s.embarcouEm, agora) })} />
          <Horario
            rotulo={pousou ? t('detalhe.pouso') : t('detalhe.fimDoVoo')}
            hora={horaLocal(s.encerrouEm)}
            onde={t('detalhe.ondeEQuando', { codigo: pousou ? destino : '—', data: dataRelativa(s.encerrouEm, agora) })}
            direita
          />
        </View>
      </View>

      <View style={styles.grade}>
        <Bloco valor={duracao(s.minutosFoco)} rotulo={t('detalhe.focados')} />
        <Bloco valor={s.milhas.toLocaleString('pt-BR')} rotulo={t('detalhe.milhas')} />
        <View style={[styles.bloco, styles.blocoComCarimbo]}>
          <Text variant="Heading/Data 24" tone={pousou ? 'primary' : 'muted'}>
            {pousou ? destino : '—'}
          </Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {pousou ? t('detalhe.carimbo') : t('detalhe.semCarimbo')}
          </Text>
          {pousou ? (
            <View style={styles.carimbo} pointerEvents="none">
              <CarimboDoPassaporte cidade={nomeDoLugar(voo.destino)} codigo={destino} data={s.encerrouEm} tamanho={75} giro={-8} />
            </View>
          ) : null}
        </View>
        <Bloco valor={t('detalhe.dolares', { valor: s.dolares })} rotulo={t('detalhe.paraSouvenirs')} />
      </View>

      {temMotivo ? (
        <View style={styles.motivo}>
          <View style={{ gap: space[6] }}>
            <View style={styles.linhaDoMotivo}>
              <Text variant="Label/Medium 14" tone="tertiary">
                {t('detalhe.motivo')}
              </Text>
              {motivo.categoria ? (
                <CategoriaTag categoria={motivo.categoria} rotulo={t(`motivo.categorias.${motivo.categoria}` as ChaveDeTexto)} tamanho="medio" />
              ) : null}
            </View>
            {motivo.foco ? <Text variant="Body/Large Medium 16">{motivo.foco}</Text> : null}
          </View>
          {motivo.tarefas.length ? (
            <View style={{ gap: space[12] }}>
              {motivo.tarefas.map((tarefa, i) => (
                // Dá para marcar a tarefa depois do pouso (Alberto, build-46).
                <Pressable
                  key={i}
                  style={styles.tarefa}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: tarefa.feita }}
                  accessibilityLabel={tarefa.texto}
                  onPress={() => atualizarMotivo({ ...motivo, tarefas: motivo.tarefas.map((x, j) => (j === i ? { ...x, feita: !x.feita } : x)) })}
                >
                  <Checkbox checked={tarefa.feita} />
                  <Text variant="Body/Large 16" tone={tarefa.feita ? 'tertiary' : 'primary'} style={{ flex: 1 }}>
                    {tarefa.texto}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.servico}>
        <View style={[styles.ponto, !pausas.length && { backgroundColor: color.text.muted }]} />
        <Text variant="Body/Small 13" tone="secondary">
          {pausas.length === 0
            ? t('detalhe.semServico')
            : pausas.length === 1
              ? t('detalhe.umServico', { min: Math.round(minutosDePausa) })
              : t('detalhe.servicos', { n: pausas.length, min: Math.round(minutosDePausa) })}
        </Text>
      </View>
    </ScrollView>
  );
}

function Horario({ rotulo, hora, onde, direita }: { rotulo: string; hora: string; onde: string; direita?: boolean }) {
  return (
    <View style={{ gap: space[2], alignItems: direita ? 'flex-end' : 'flex-start' }}>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
      <Text variant="Heading/Data 24">{hora}</Text>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {onde}
      </Text>
    </View>
  );
}

function Bloco({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.bloco}>
      <Text variant="Heading/Data 24">{valor}</Text>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  situacao: { paddingVertical: space[4], paddingHorizontal: space[8], borderRadius: radius.md },
  situacaoPousou: { backgroundColor: color.status.successSubtle },
  situacaoAntes: { backgroundColor: color.surface.default },
  horarios: { flexDirection: 'row', justifyContent: 'space-between' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  bloco: { flexBasis: '48%', flexGrow: 1, gap: space[2], paddingVertical: space[12], paddingHorizontal: space[14], borderRadius: radius.lg, backgroundColor: color.surface.subtle },
  blocoComCarimbo: { overflow: 'visible' },
  carimbo: { position: 'absolute', right: space[8], top: -space[4] },
  motivo: { gap: space[24], padding: space[16], borderRadius: radius.lg, backgroundColor: color.bg.sheet },
  linhaDoMotivo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[6] },
  tarefa: { flexDirection: 'row', alignItems: 'center', gap: space[10], minHeight: 48 },
  servico: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.status.success },
});
