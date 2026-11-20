/**
 * E6 · Pousou e E7 · Pousou antes. PRD: RN-08, RN-10, RF-27, RF-28; UC-06, UC-08.
 * Lê o que foi gravado no encerramento (nada é recalculado aqui).
 * A loja do destino entra na Fase 4: por enquanto o botão principal do pouso é "Novo voo".
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessaoEncerrada } from '@/data/sessoes/useSessaoEmAndamento';
import { Button, color, Icon, InfoBanner, radius, screenGutter, space, Text, type IconName } from '@/ds';
import { t } from '@/i18n';

import { Carimbo } from './Carimbo';
import { codigoDoLugar, nomeDoLugar } from './formato';

const ICONE_DA_CATEGORIA: Record<string, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};

const dataDoCarimbo = (ms: number) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ').toUpperCase();

export function TelaPouso({ id }: { id: string | undefined }) {
  const insets = useSafeAreaInsets();
  const q = useSessaoEncerrada(id);
  const s = q.data;

  if (!s) {
    return (
      <View style={[styles.tela, { paddingTop: insets.top + space[24], gap: space[20] }]}>
        <InfoBanner message={q.isPending ? t('dial.procurando') : t('pouso.nenhuma')} />
        <Button variant="link" size="medium" label={t('pouso.voltarAoInicio')} onPress={() => router.dismissTo('/')} style={{ alignSelf: 'flex-start' }} />
      </View>
    );
  }

  const pousou = s.resultado === 'pousou';
  const cidade = nomeDoLugar(s.voo.destino);
  const codigo = codigoDoLugar(s.voo.destino);
  const total = Math.round((s.pousoPrevistoEm - s.embarcouEm) / 60_000);
  const { motivo } = s;
  const temMotivo = !!(motivo.categoria || motivo.foco || motivo.tarefas.length);
  const feitas = motivo.tarefas.filter((x) => x.feita).length;

  return (
    <ScrollView
      style={{ backgroundColor: color.bg.app }}
      contentContainerStyle={[styles.conteudo, { paddingTop: insets.top + space[24], paddingBottom: insets.bottom + space[24] }]}
    >
      <View style={{ gap: space[24] }}>
        <View style={{ gap: space[12] }}>
          <Text variant="Caption/Medium 12" tone="tertiary">
            {t('pouso.cabecalho', { voo: s.voo.callsign, origem: nomeDoLugar(s.voo.origem), destino: cidade })}
          </Text>
          <Text variant="Heading/Screen 32" style={styles.titulo} accessibilityRole="header">
            {pousou ? t('pouso.titulo', { cidade }) : t('pouso.tituloAntes')}
          </Text>
          <Text variant="Body/Large 16" tone="secondary">
            {pousou ? t('pouso.subtitulo', { min: s.minutosFoco }) : t('pouso.subtituloAntes', { voados: s.minutosFoco, total })}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={pousou ? t('pouso.carimboAcessivel', { cidade, codigo, data: dataDoCarimbo(s.encerrouEm) }) : t('pouso.semCarimbo')}
        >
          <Carimbo cidade={cidade} codigo={codigo} data={dataDoCarimbo(s.encerrouEm)} apagado={!pousou} legenda={pousou ? undefined : t('pouso.semCarimbo')} />
        </View>

        <View style={styles.grade}>
          <Cartao valor={t('pouso.minutos', { min: s.minutosFoco })} rotulo={t('pouso.focados')} />
          <Cartao valor={t('pouso.milhas', { milhas: s.milhas.toLocaleString('pt-BR') })} rotulo={pousou ? t('pouso.milhasRotulo') : t('pouso.milhasTrecho')} />
          <Cartao valor={t('pouso.dolares', { dolares: s.dolares })} rotulo={pousou ? t('pouso.paraSouvenirs') : t('pouso.proximoPouso')} />
          {pousou ? <Cartao valor={codigo} rotulo={t('pouso.carimboNoPassaporte')} /> : <Cartao valor="—" rotulo={t('pouso.semLoja')} apagado />}
        </View>

        {temMotivo ? (
          <View style={styles.motivo}>
            {motivo.tarefas.length > 0 && feitas === motivo.tarefas.length ? <Icon name="incluido" size={22} /> : null}
            <View style={{ flex: 1, gap: space[6] }}>
              {motivo.foco ? <Text variant="Label/Medium 14">{motivo.foco}</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[8], flexWrap: 'wrap' }}>
                {motivo.categoria ? (
                  <View style={styles.tag}>
                    <Icon name={ICONE_DA_CATEGORIA[motivo.categoria]} size={12} />
                    <Text variant="Caption/Medium 12">{t(`motivo.categorias.${motivo.categoria}`)}</Text>
                  </View>
                ) : null}
                <Text variant="Caption/Regular 12" tone="tertiary">
                  {motivo.tarefas.length ? t('pouso.tarefas', { feitas, total: motivo.tarefas.length }) : t('pouso.salvoNoDiario')}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ gap: space[4] }}>
        <Button variant={pousou ? 'primary' : 'secondary'} label={t('pouso.novoVoo')} onPress={() => router.replace('/voo')} />
        <Button variant="link" size="medium" label={t('pouso.voltarAoInicio')} onPress={() => router.dismissTo('/')} style={{ alignSelf: 'center' }} />
      </View>
    </ScrollView>
  );
}

function Cartao({ valor, rotulo, apagado }: { valor: string; rotulo: string; apagado?: boolean }) {
  return (
    <View style={[styles.cartao, apagado && styles.cartaoApagado]}>
      <Text variant="Heading/Data 24" tone={apagado ? 'tertiary' : 'primary'}>
        {valor}
      </Text>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app, paddingHorizontal: screenGutter },
  conteudo: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: screenGutter, gap: space[32] },
  titulo: { color: color.text.accent, fontWeight: '400' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  cartao: { flexBasis: '48%', flexGrow: 1, gap: space[4], padding: space[14], borderRadius: radius.md, backgroundColor: color.surface.default },
  cartaoApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.border.subtle },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[14], borderRadius: radius.md, backgroundColor: color.surface.default },
  tag: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[6], paddingVertical: space[2], borderRadius: radius.sm, backgroundColor: color.surface.strong },
});
