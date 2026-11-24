/**
 * Progressão de milhas (aberta pelas milhas no menu lateral). PRD: RN-15, RF-33.
 *
 * Ainda não tem tela no Figma: montada com os componentes que já existem (TopBar, blocos de superfície,
 * a barra de progresso do menu lateral, tag de destaque) até o Alberto desenhar a versão final.
 * As recompensas de nível (adesivo e carimbo) ainda não existem no app, então não aparecem aqui
 * (CLAUDE.md §2.6: nada de prometer o que não há).
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoosEncerrados } from '@/data/historico/useHistorico';
import { resumoDoDiario } from '@/domain/historico/historico';
import { progressaoDeNiveis, statusDeViajante, type EtapaDaProgressao } from '@/domain/status/niveis';
import { color, Icon, InfoBanner, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';

const numero = (n: number) => n.toLocaleString('pt-BR');

export function TelaMilhas() {
  const insets = useSafeAreaInsets();
  const voos = useVoosEncerrados();
  const milhas = resumoDoDiario(voos.data ?? []).milhas;
  const status = statusDeViajante(milhas);
  const etapas = progressaoDeNiveis(milhas);
  const porcento = Math.round(status.progresso * 100);

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      <TopBar title={t('milhas.titulo')} onBack={() => router.back()} />

      {voos.isError ? <InfoBanner message={t('milhas.erro')} /> : null}

      {/* Onde a pessoa está agora */}
      <View style={styles.resumo}>
        <View style={{ gap: space[2] }}>
          <Text variant="Caption/Medium 12" tone="tertiary">
            {t('milhas.statusAtual')}
          </Text>
          <Text variant="Heading/Screen 32" tone="accent" accessibilityRole="header">
            {status.atual.nome}
          </Text>
        </View>
        <View style={{ gap: space[8] }}>
          <Text variant="Body/Small 13" tone="tertiary">
            {t('menu.milhasAcumuladas', { milhas: numero(milhas) })}
          </Text>
          <View style={styles.trilho} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: porcento }}>
            <View style={[styles.barra, { width: `${porcento}%` }]} />
          </View>
          <Text variant="Body/Small 13" tone="secondary">
            {status.proximo ? t('menu.faltam', { milhas: numero(status.faltam), nivel: status.proximo.nome }) : t('menu.nivelMaximo')}
          </Text>
        </View>
      </View>

      {/* Todos os status */}
      <View style={{ gap: space[4] }}>
        <Text variant="Caption/Medium 12" tone="muted" accessibilityRole="header">
          {t('milhas.niveis')}
        </Text>
        <View>
          {etapas.map((e) => (
            <Linha key={e.nivel.id} etapa={e} />
          ))}
        </View>
      </View>

      <View style={styles.aviso}>
        <Icon name="info" size={16} color={color.text.muted} />
        <Text variant="Caption/Regular 12" tone="tertiary" style={{ flex: 1 }}>
          {t('milhas.comoGanhar')}
        </Text>
      </View>
    </ScrollView>
  );
}

function Linha({ etapa }: { etapa: EtapaDaProgressao }) {
  const { nivel, estado, faltam } = etapa;
  const atual = estado === 'atual';
  const alcancado = estado === 'alcancado';
  const detalhe = estado === 'futuro' ? t('milhas.faltam', { milhas: numero(faltam) }) : alcancado ? t('milhas.alcancado') : t('milhas.voceEstaAqui');
  return (
    <View
      style={[styles.linha, atual && styles.linhaAtual]}
      accessible
      accessibilityLabel={`${nivel.nome}, ${t('milhas.aPartirDe', { milhas: numero(nivel.milhas) })}, ${detalhe}`}
    >
      <View style={[styles.marca, atual && styles.marcaAtual, alcancado && styles.marcaAlcancada]}>
        {alcancado || atual ? <Icon name="confirmacao" size={14} color={atual ? color.accent.on : color.accent.default} /> : null}
      </View>
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Body/Large 16" tone={estado === 'futuro' ? 'tertiary' : 'primary'}>
          {nivel.nome}
        </Text>
        <Text variant="Caption/Regular 12" tone="tertiary">
          {t('milhas.aPartirDe', { milhas: numero(nivel.milhas) })}
        </Text>
      </View>
      <Text variant="Caption/Medium 12" tone={atual ? 'accent' : 'tertiary'}>
        {detalhe}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  resumo: { gap: space[16], paddingVertical: space[16], paddingHorizontal: space[16], borderRadius: radius.xl, backgroundColor: color.surface.subtle },
  trilho: { height: 4, borderRadius: 2, backgroundColor: color.surface.strong, overflow: 'hidden' },
  barra: { height: 4, borderRadius: 2, backgroundColor: color.accent.default },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[14], paddingVertical: space[10], paddingHorizontal: space[12], borderRadius: radius.lg, minHeight: 56 },
  linhaAtual: { backgroundColor: color.surface.default },
  marca: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.border.default, alignItems: 'center', justifyContent: 'center' },
  marcaAlcancada: { borderColor: color.accent.default },
  marcaAtual: { borderColor: color.accent.default, backgroundColor: color.accent.default },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
});
