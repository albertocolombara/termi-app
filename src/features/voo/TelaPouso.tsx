/**
 * E6 · Pousou e E7 · Pousou antes (Figma v3: telas reorganizadas). PRD: RN-08, RN-10, RF-27, RF-28; UC-06, UC-08.
 * Lê o que foi gravado no encerramento (nada é recalculado aqui).
 *
 * E6: carimbo com a animação de "bater", o que o voo rendeu, o motivo da viagem e "Voltar ao início".
 * E7: carimbo apagado ("sem carimbo"), o que o voo rendeu, o aviso de carimbo e loja e o diário.
 * E6 também abre a loja do destino (bloco "Loja de Londres" do Figma), quando o país tem souvenir
 * na coleção (UC-08 passo 4). País sem souvenir: o bloco aparece desabilitado, "Loja indisponível
 * nessa cidade" (Figma 570:13515, Alberto em 25/11/2026; UC-08 E1).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalogo } from '@/data/colecao/catalogo';
import { useSessaoEncerrada } from '@/data/sessoes/useSessaoEmAndamento';
import { souvenirDoPais } from '@/domain/colecao/catalogo';
import { Button, CategoriaTag, color, Icon, InfoBanner, radius, screenGutter, space, Text } from '@/ds';
import { t } from '@/i18n';

import { Carimbo } from './Carimbo';
import { codigoDoLugar, duracao, nomeDoLugar } from './formato';

const dataDoCarimbo = (ms: number) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ').toUpperCase();

export function TelaPouso({ id }: { id: string | undefined }) {
  const insets = useSafeAreaInsets();
  const q = useSessaoEncerrada(id);
  const s = q.data;
  const catalogo = useCatalogo();
  const [agora] = useState(() => Date.now());

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
  const { motivo } = s;
  const temMotivo = !!(motivo.categoria || motivo.foco || motivo.tarefas.length);
  const feitas = motivo.tarefas.filter((x) => x.feita).length;
  const tudoFeito = motivo.tarefas.length > 0 && feitas === motivo.tarefas.length;
  const verNoDiario = () => router.push({ pathname: '/diario/[id]', params: { id: s.id } });
  const souvenir = pousou ? souvenirDoPais(catalogo, s.voo.destino.pais, agora) : null;
  const abrirLoja = () => souvenir && router.push({ pathname: '/loja/[pais]', params: { pais: souvenir.pais, sessao: s.id } });

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
          {/* Geist (Heading/Screen 32), não a Pixel: pedido do Alberto no build-47. */}
          <Text variant="Heading/Screen 32" tone="accent" accessibilityRole="header">
            {pousou ? t('pouso.titulo', { cidade }) : t('pouso.tituloAntes')}
          </Text>
        </View>

        <View style={{ gap: space[6] }}>
          <View
            style={styles.areaDoCarimbo}
            accessible
            accessibilityLabel={pousou ? t('pouso.carimboAcessivel', { cidade, codigo, data: dataDoCarimbo(s.encerrouEm) }) : t('pouso.semCarimbo')}
          >
            <Carimbo cidade={cidade} codigo={codigo} data={dataDoCarimbo(s.encerrouEm)} apagado={!pousou} legenda={pousou ? undefined : t('pouso.semCarimbo')} />
          </View>
          {pousou ? (
            <View style={{ alignItems: 'center', gap: space[4] }}>
              <Text variant="Body/Large 16">{t('pouso.carimboDe', { cidade })}</Text>
              <Text variant="Caption/Regular 12" tone="tertiary">
                {t('pouso.adicionadoAoPassaporte')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* O que o voo rendeu (v4 Clean: faixa unboxed de 3 colunas com hairlines) */}
        <View style={{ gap: space[12] }}>
          <View style={styles.grade}>
            <Bloco valor={t('pouso.minutos', { tempo: duracao(s.minutosFoco) })} rotulo={t('pouso.focados')} />
            <View style={styles.divisor} />
            <Bloco valor={t('pouso.milhas', { milhas: s.milhas.toLocaleString('pt-BR') })} rotulo={t('pouso.milhasRotulo')} />
            <View style={styles.divisor} />
            <Bloco valor={t('pouso.dolares', { dolares: s.dolares })} rotulo={t('pouso.paraSouvenirs')} />
          </View>
          {pousou ? null : (
            <View style={styles.aviso}>
              <Icon name="info" size={16} color={color.text.muted} />
              <Text variant="Caption/Regular 12" tone="tertiary" style={{ flex: 1 }}>
                {t('pouso.carimboELoja', { cidade })}
              </Text>
            </View>
          )}
        </View>

        <View style={{ gap: space[12] }}>
          {pousou && temMotivo ? (
            <Pressable accessibilityRole="button" onPress={verNoDiario} style={({ pressed }) => [styles.linha, pressed && { opacity: 0.85 }]}>
              {tudoFeito ? <Icon name="incluido" size={20} /> : <Icon name="logbook" />}
              <View style={{ flex: 1, gap: space[4] }}>
                <Text variant="Label/Medium 14" numberOfLines={1}>
                  {motivo.foco || t('pouso.salvoNoDiario')}
                </Text>
                <View style={styles.meta}>
                  {motivo.categoria ? <CategoriaTag categoria={motivo.categoria} rotulo={t(`motivo.categorias.${motivo.categoria}`)} /> : null}
                  {motivo.tarefas.length ? (
                    <Text variant="Caption/Regular 12" tone="tertiary">
                      {t('pouso.tarefasFeitas', { feitas, total: motivo.tarefas.length })}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Icon name="chevronRight" />
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={verNoDiario} style={({ pressed }) => [styles.linha, styles.linhaApagada, pressed && { opacity: 0.85 }]}>
              <Icon name="logbook" />
              <Text variant="Label/Medium 14" style={{ flex: 1 }}>
                {t('pouso.vooSalvoNoDiario')}
              </Text>
              <Icon name="chevronRight" />
            </Pressable>
          )}
          {souvenir ? (
            <Pressable accessibilityRole="button" onPress={abrirLoja} style={({ pressed }) => [styles.linha, styles.linhaLoja, pressed && { opacity: 0.85 }]}>
              <Icon name="store" />
              <View style={{ flex: 1, gap: space[4] }}>
                <Text variant="Label/Medium 14">{t('loja.abrirLoja', { cidade })}</Text>
                <Text variant="Caption/Regular 12" tone="tertiary">
                  {t('loja.abrirLojaDescricao')}
                </Text>
              </View>
              <Icon name="chevronRight" color={color.accent.default} />
            </Pressable>
          ) : pousou ? (
            <View
              style={[styles.linha, styles.linhaIndisponivel]}
              accessible
              accessibilityState={{ disabled: true }}
              accessibilityLabel={`${t('loja.indisponivelTitulo', { cidade })}. ${t('loja.indisponivelTexto')}`}
            >
              <Icon name="store" color={color.state.disabledContainer} />
              <View style={{ flex: 1, gap: space[4] }}>
                <Text variant="Label/Medium 14" tone="disabled">
                  {t('loja.indisponivelTitulo', { cidade })}
                </Text>
                <Text variant="Caption/Regular 12" tone="disabled">
                  {t('loja.indisponivelTexto')}
                </Text>
              </View>
              <Icon name="chevronRight" color={color.state.disabledContainer} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ gap: space[4] }}>
        {/* "Pousou antes" sem destaque amarelo (CLAUDE.md §9): voltar ao início é a ação secundária. */}
        <Button variant={pousou ? 'primary' : 'secondary'} label={t('pouso.voltarAoInicio')} onPress={() => router.dismissTo('/')} />
        {pousou ? null : (
          <Button variant="link" size="medium" label={t('pouso.novoVoo')} onPress={() => router.replace('/voo')} style={{ alignSelf: 'center' }} />
        )}
      </View>
    </ScrollView>
  );
}

function Bloco({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.bloco}>
      <Text variant="Nav/Title 20">{valor}</Text>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app, paddingHorizontal: screenGutter },
  conteudo: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: screenGutter, gap: space[32] },
  areaDoCarimbo: { paddingVertical: space[8], alignItems: 'center' },
  grade: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.subtle,
    paddingVertical: space[14],
  },
  divisor: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: color.border.subtle },
  bloco: { flex: 1, gap: space[2], paddingHorizontal: space[6] },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[14], paddingHorizontal: space[16], borderRadius: radius.card, backgroundColor: color.surface.card },
  // E7: linha do diário mais discreta, sem borda pesada.
  linhaApagada: { backgroundColor: color.surface.cardMuted },
  // País sem souvenir: fosco e calmo, sem tracejado agressivo.
  linhaIndisponivel: { backgroundColor: color.surface.cardMuted },
  // E6: loja do destino em destaque âmbar suave.
  linhaLoja: { borderWidth: 1, borderColor: color.border.accent, backgroundColor: color.accent.container },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[6], flexWrap: 'wrap' },
});
