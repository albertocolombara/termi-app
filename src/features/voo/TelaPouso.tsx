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
import { Button, Cauda, color, Icon, InfoBanner, radius, screenGutter, space, Text } from '@/ds';
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
      <View style={{ gap: space[20] }}>
        <View style={{ gap: space[10] }}>
          <View style={styles.cabecalhoLinha}>
            <Cauda pais={s.voo.companhiaPais} tamanho={20} />
            <View style={styles.callsignBadge}>
              <Text variant="Caption/Regular 12" tone="secondary" style={{ fontSize: 11 }}>
                {s.voo.callsign}
              </Text>
            </View>
            <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1} style={{ flex: 1 }}>
              {`${nomeDoLugar(s.voo.origem)} → ${cidade}`}
            </Text>
          </View>
          <Text variant="Heading/Screen 32" style={{ fontSize: 28, lineHeight: 34, fontWeight: '500' }} accessibilityRole="header">
            {pousou ? t('pouso.titulo', { cidade }) : t('pouso.tituloAntes')}
          </Text>
        </View>

        {/* Cartão de papel marfim quente 1:1 (Figma 05 · Pouso · Clean) */}
        <View style={styles.cartaoPapel}>
          <View
            style={styles.areaDoCarimbo}
            accessible
            accessibilityLabel={pousou ? t('pouso.carimboAcessivel', { cidade, codigo, data: dataDoCarimbo(s.encerrouEm) }) : t('pouso.semCarimbo')}
          >
            <Carimbo cidade={cidade} codigo={codigo} data={dataDoCarimbo(s.encerrouEm)} apagado={!pousou} legenda={pousou ? undefined : t('pouso.semCarimbo')} />
          </View>
          {pousou ? (
            <View style={{ alignItems: 'center', gap: space[4] }}>
              <Text variant="Body/Large Medium 16" tone="onPaper">
                {t('pouso.carimboDe', { cidade })}
              </Text>
              <Text variant="Caption/Regular 12" tone="onPaper" style={{ opacity: 0.6 }}>
                {t('pouso.adicionadoAoPassaporte')}
              </Text>
            </View>
          ) : null}

          <View style={styles.divisorPapel} />

          <View style={styles.grade}>
            <Bloco valor={t('pouso.minutos', { tempo: duracao(s.minutosFoco) })} rotulo={t('pouso.focados')} />
            <View style={styles.divisorVerticalPapel} />
            <Bloco valor={t('pouso.milhas', { milhas: s.milhas.toLocaleString('pt-BR') })} rotulo={t('pouso.milhasRotulo')} />
            <View style={styles.divisorVerticalPapel} />
            <Bloco valor={`+${t('pouso.dolares', { dolares: s.dolares })}`} rotulo={t('pouso.paraSouvenirs')} destaque />
          </View>
        </View>

        {pousou ? null : (
          <View style={styles.aviso}>
            <Icon name="info" size={16} color={color.text.muted} />
            <Text variant="Caption/Regular 12" tone="tertiary" style={{ flex: 1 }}>
              {t('pouso.carimboELoja', { cidade })}
            </Text>
          </View>
        )}

        {/* Linha silenciosa do diário abaixo do cartão (Figma 05 · Pouso · Clean) */}
        <Pressable accessibilityRole="button" onPress={verNoDiario} style={({ pressed }) => [styles.linhaDiario, pressed && { opacity: 0.75 }]}>
          <View style={[styles.checkCirculo, !tudoFeito && styles.checkNeutro]}>
            <Icon name={tudoFeito ? 'confirmacao' : 'logbook'} size={12} color={tudoFeito ? color.status.success : color.text.secondary} />
          </View>
          <Text variant="Body/Small 13" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {pousou && temMotivo
              ? [motivo.foco || t('pouso.salvoNoDiario'), motivo.tarefas.length ? t('pouso.tarefasFeitas', { feitas, total: motivo.tarefas.length }) : null].filter(Boolean).join(' · ')
              : t('pouso.vooSalvoNoDiario')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Text variant="Caption/Regular 12" tone="tertiary">Diário</Text>
            <Icon name="chevronRight" size={14} color={color.text.tertiary} />
          </View>
        </Pressable>
      </View>

      <View style={{ gap: space[4] }}>
        {souvenir ? (
          <>
            <Button label={t('loja.abrirLoja', { cidade })} onPress={abrirLoja} />
            <Button variant="link" size="medium" label={t('pouso.voltarAoInicio')} onPress={() => router.dismissTo('/')} style={{ alignSelf: 'center' }} />
          </>
        ) : (
          <>
            {/* "Pousou antes" sem destaque amarelo (CLAUDE.md §9): voltar ao início é a ação secundária. */}
            <Button variant={pousou ? 'primary' : 'secondary'} label={t('pouso.voltarAoInicio')} onPress={() => router.dismissTo('/')} />
            {pousou ? null : (
              <Button variant="link" size="medium" label={t('pouso.novoVoo')} onPress={() => router.replace('/voo')} style={{ alignSelf: 'center' }} />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Bloco({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <View style={styles.bloco}>
      <Text variant="Nav/Title 20" tone="onPaper" style={destaque ? { color: '#B57B14' } : undefined}>
        {valor}
      </Text>
      <Text variant="Caption/Regular 12" tone="onPaper" style={{ opacity: 0.55 }}>
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app, paddingHorizontal: screenGutter },
  conteudo: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: screenGutter, gap: space[24] },
  cabecalhoLinha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  callsignBadge: { paddingVertical: 2, paddingHorizontal: space[6], borderRadius: radius.xs, backgroundColor: color.surface.card },
  cartaoPapel: {
    backgroundColor: color.surface.paper,
    borderRadius: radius.sheet,
    padding: space[24],
    gap: space[16],
  },
  areaDoCarimbo: { paddingVertical: space[6], alignItems: 'center' },
  divisorPapel: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(11, 13, 18, 0.12)' },
  grade: { flexDirection: 'row', alignItems: 'center', paddingTop: space[4] },
  divisorVerticalPapel: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(11, 13, 18, 0.12)' },
  bloco: { flex: 1, alignItems: 'center', gap: space[2], paddingHorizontal: space[4] },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  linhaDiario: { flexDirection: 'row', alignItems: 'center', gap: space[10], paddingVertical: space[8] },
  checkCirculo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.status.successContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkNeutro: { backgroundColor: color.surface.card },
});
