/**
 * L2 · Loja remota (Plus) e L2b (econômica, bloqueada): "Itens desbloqueados". Figma v3, ajustadas
 * pelo Alberto em 25/11/2026 (build-70). PRD: RN-14, RN-20; UC-08 A6. Abre pela mala ("Loja remota").
 *
 * Um cartão por país onde já houve pouso completo, do mais recente ao mais antigo, 4 por página.
 * - Plus: o cartão mostra o preço da loja remota (25% acima do pouso) e abre a vitrine (L1) daquele
 *   país para confirmar a compra.
 * - Econômica: a tela aparece para o usuário saber que existe; o cartão mostra a marca Plus com
 *   cadeado e tocar nele (ou em "Conhecer o Plus") abre o paywall (RN-20).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalogo } from '@/data/colecao/catalogo';
import { usePousosCompletos } from '@/data/colecao/useLoja';
import { useContagens, useSouvenirsNaMala } from '@/data/historico/useHistorico';
import { emPaginas, lojasDosPousos, precoNaLoja, type LojaDoPouso } from '@/domain/colecao/loja';
import { Button, color, IndicadorDePaginas, InfoBanner, Plus, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';
import { useClasse } from '@/services/compras';

import { Medalha } from './Medalha';

const POR_PAGINA = 4;

const dataCurta = (ms: number, agora: number) =>
  new Date(ms).toDateString() === new Date(agora).toDateString()
    ? t('loja.hoje')
    : new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace(/\./g, '').replace(/ de /g, ' ');

export function TelaLojas() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [agora] = useState(() => Date.now());
  const [pagina, setPagina] = useState(0);
  const catalogo = useCatalogo();
  const classe = useClasse();
  const plus = classe === 'primeira';
  const pousos = usePousosCompletos();
  const mala = useSouvenirsNaMala();
  const saldo = useContagens().data?.saldo ?? 0;

  const lojas = lojasDosPousos(catalogo, pousos.data ?? []);
  const paginas = emPaginas(lojas, POR_PAGINA);
  const naMala = new Set(mala.data ?? []);
  const larguraDaPagina = width - 2 * screenGutter;

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[16] }}>
        <View style={{ paddingHorizontal: screenGutter, paddingBottom: space[8] }}>
          <TopBar
            title={t('mala.titulo')}
            onBack={() => router.back()}
            saldo={t('loja.saldo', { valor: saldo.toLocaleString('pt-BR') })}
            saldoAcessivel={t('loja.saldoAcessivel', { valor: saldo })}
          />
        </View>

        <View style={styles.corpo}>
          <View style={{ gap: space[20] }}>
            <View style={styles.letreiro}>
              <Text variant="Heading/Screen 32" accessibilityRole="header" style={{ textAlign: 'center' }}>
                {t('loja.lojasTitulo')}
              </Text>
              <Text variant="Body/Small 13" tone="secondary" style={{ textAlign: 'center' }}>
                {plus ? t('loja.lojasSubtitulo') : t('loja.lojasSubtituloEconomica')}
              </Text>
            </View>

            {pousos.isPending || mala.isPending ? (
              <InfoBanner message={t('loja.carregando')} />
            ) : lojas.length === 0 ? (
              <View style={{ gap: space[12] }}>
                <InfoBanner message={t('loja.lojasVazio')} />
                <Button variant="secondary" icon={null} label={t('loja.novoVoo')} onPress={() => router.push('/voo')} />
              </View>
            ) : (
              <View style={{ gap: space[16], alignItems: 'center' }}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ width: larguraDaPagina }}
                  onMomentumScrollEnd={(e) => setPagina(Math.round(e.nativeEvent.contentOffset.x / larguraDaPagina))}
                >
                  {paginas.map((itens, i) => (
                    <View key={i} style={[styles.grade, { width: larguraDaPagina }]}>
                      {itens.map((l) => (
                        <Cartao key={l.souvenir.id} loja={l} naMala={naMala.has(l.souvenir.id)} plus={plus} agora={agora} largura={(larguraDaPagina - space[12]) / 2} />
                      ))}
                    </View>
                  ))}
                </ScrollView>
                {paginas.length > 1 ? <IndicadorDePaginas total={paginas.length} atual={pagina} /> : null}
              </View>
            )}
          </View>

          {plus ? null : <Button label={t('loja.conhecerPlus')} icon={null} onPress={() => router.push('/primeira-classe')} />}
        </View>
      </ScrollView>
    </View>
  );
}

function Cartao({ loja, naMala, plus, agora, largura }: { loja: LojaDoPouso; naMala: boolean; plus: boolean; agora: number; largura: number }) {
  const { souvenir } = loja;
  const onde = t('loja.pousouEm', { cidade: loja.cidade ?? loja.aeroporto ?? souvenir.nome, data: dataCurta(loja.data, agora) });
  const preco = precoNaLoja(souvenir, 'lojas');
  const conteudo = (
    <>
      <View style={{ alignItems: 'center', gap: space[6] }}>
        <Medalha souvenir={souvenir} tamanho={84} />
        <Text variant="Label/Strong 14">{souvenir.nome}</Text>
        <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
          {onde}
        </Text>
      </View>
      {naMala ? (
        <Text variant="Label/Medium 14" tone="secondary">{`✓ ${t('loja.naMalaCartao')}`}</Text>
      ) : plus ? (
        <View style={styles.preco}>
          <Text variant="Label/Strong 14" tone="accent">
            {t('loja.precoCartao', { valor: preco })}
          </Text>
        </View>
      ) : (
        <Plus bloqueado />
      )}
    </>
  );
  if (naMala) {
    return (
      <View style={[styles.cartao, { width: largura }]} accessible accessibilityLabel={`${souvenir.nome}, ${onde}. ${t('loja.naMalaCartao')}`}>
        {conteudo}
      </View>
    );
  }
  // Plus: abre a vitrine (L1) para confirmar. Econômica: abre o paywall (RN-20).
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        plus ? t('loja.comprarAcessivel', { nome: souvenir.nome, valor: preco }) : t('loja.soNoPlusAcessivel', { nome: souvenir.nome })
      }
      onPress={() => (plus ? router.push({ pathname: '/loja/[pais]', params: { pais: souvenir.pais } }) : router.push('/primeira-classe'))}
      style={({ pressed }) => [styles.cartao, { width: largura }, pressed && { opacity: 0.85 }]}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  corpo: { flex: 1, justifyContent: 'space-between', gap: space[24], paddingHorizontal: screenGutter, paddingTop: space[12] },
  letreiro: { alignItems: 'center', gap: space[6] },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12], alignContent: 'flex-start' },
  cartao: {
    alignItems: 'center',
    gap: space[12],
    paddingTop: space[16],
    paddingBottom: space[14],
    paddingHorizontal: space[12],
    borderRadius: radius.card,
    backgroundColor: color.surface.card,
  },
  preco: { paddingVertical: space[4], paddingHorizontal: space[12], borderRadius: radius.full, backgroundColor: color.accent.badge },
});
