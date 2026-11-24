/**
 * P1 · Primeira classe (paywall padrão, Figma 192:4265). PRD: RN-19, RN-20, RN-21; RF-25.
 *
 * Abre só pelo toque do usuário (ex.: vista ou som com cadeado, também em voo). O voo segue no
 * horário com o paywall aberto; fechar volta para onde estava.
 *
 * A compra de verdade entra com o RevenueCat (Fase 4). Até lá, em builds de teste, o botão liga a
 * primeira classe de teste (`services/compras`) e o texto diz isso; em produção, o botão fica desligado.
 * Restaurar compras, Termos e Privacidade entram junto com a compra e as páginas publicadas.
 */
import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mostrarFerramentasDev } from '@/config/env';
import {
  AVISO_ANTES_DA_COBRANCA_DIAS,
  DIAS_GRATIS,
  economiaDoAnual,
  emReais,
  PLANOS,
  PRECO_CENTAVOS,
  type Plano,
} from '@/domain/compras/planos';
import { Button, color, Icon, IconButton, IndicadorDePaginas, PaywallPlano, Plus, radius, screenGutter, space, Text, type IconName } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';
import { useTrocarClasseDeTeste } from '@/services/compras';

type Beneficio = { id: string; titulo: ChaveDeTexto; texto: ChaveDeTexto };

/**
 * Benefícios do carrossel. O Figma tem também Coleção, Bloqueio de apps e Estatísticas: entram aqui
 * quando existirem no app (o paywall não vende o que ainda não dá para usar).
 */
const BENEFICIOS: Beneficio[] = [
  { id: 'voos-longos', titulo: 'primeiraClasse.voosLongosTitulo', texto: 'primeiraClasse.voosLongosTexto' },
  { id: 'vistas', titulo: 'primeiraClasse.vistasTitulo', texto: 'primeiraClasse.vistasTexto' },
  { id: 'sons', titulo: 'primeiraClasse.sonsTitulo', texto: 'primeiraClasse.sonsTexto' },
];

/** Passa sozinho a cada 3,5 s (Figma: "Paywall / Benefícios"). */
const PASSA_A_CADA_MS = 3500;
const ALTURA_DA_ILUSTRACAO = 272;

export function TelaPrimeiraClasse() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const largura = Math.min(width, 440) - 2 * screenGutter;
  const [plano, setPlano] = useState<Plano>('anual');
  const trocarClasse = useTrocarClasseDeTeste();

  const preco = emReais(PRECO_CENTAVOS[plano]);
  const dias = DIAS_GRATIS[plano];
  const cta =
    plano === 'anual' ? t('primeiraClasse.ctaAnual', { dias }) : plano === 'mensal' ? t('primeiraClasse.ctaMensal', { preco }) : t('primeiraClasse.ctaVitalicio', { preco });
  const condicoes =
    plano === 'anual'
      ? t('primeiraClasse.condicoesAnual', { dias, preco, aviso: AVISO_ANTES_DA_COBRANCA_DIAS })
      : plano === 'mensal'
        ? t('primeiraClasse.condicoesMensal', { preco })
        : t('primeiraClasse.condicoesVitalicio', { preco });

  const fechar = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const assinar = () => {
    if (!mostrarFerramentasDev) return;
    trocarClasse('primeira');
    fechar();
  };

  return (
    <View style={[styles.tela, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[12] }]}>
      <View style={[styles.topo, { width: largura }]}>
        <Plus />
        <IconButton icon="fechar" accessibilityLabel={t('primeiraClasse.fechar')} onPress={fechar} style={styles.fechar} />
      </View>

      <View style={styles.meio}>
        <Carrossel largura={largura} />
      </View>

      <View style={[styles.oferta, { width: largura }]}>
        <View style={styles.planos} accessibilityRole="radiogroup" accessibilityLabel={t('primeiraClasse.planos')}>
          {PLANOS.map((p) => {
            const nome = t(NOME_DO_PLANO[p]);
            const precoDoPlano = emReais(PRECO_CENTAVOS[p]);
            const periodo = t(PERIODO_DO_PLANO[p]);
            return (
              <PaywallPlano
                key={p}
                nome={nome}
                preco={precoDoPlano}
                periodo={periodo}
                selecionado={plano === p}
                etiqueta={p === 'anual' && economiaDoAnual() > 0 ? t('primeiraClasse.economize', { pct: economiaDoAnual() }) : undefined}
                accessibilityLabel={t('primeiraClasse.planoAcessivel', { nome, preco: precoDoPlano, periodo })}
                onPress={() => setPlano(p)}
              />
            );
          })}
        </View>
        {/* Preço, período grátis e data do lembrete visíveis antes do botão (CLAUDE.md §2.6). */}
        <Button label={cta} onPress={assinar} disabled={!mostrarFerramentasDev} />
        <Text variant="Caption/Regular 12" tone="tertiary" style={styles.centro}>
          {condicoes}
        </Text>
        <Text variant="Caption/Regular 12" tone="secondary" style={styles.centro}>
          {mostrarFerramentasDev ? t('primeiraClasse.teste') : t('primeiraClasse.emBreve')}
        </Text>
        <Button variant="link" size="medium" label={t('primeiraClasse.continuarNaEconomica')} onPress={fechar} style={{ alignSelf: 'center' }} />
      </View>
    </View>
  );
}

const NOME_DO_PLANO: Record<Plano, ChaveDeTexto> = { anual: 'primeiraClasse.anual', mensal: 'primeiraClasse.mensal', vitalicio: 'primeiraClasse.vitalicio' };
const PERIODO_DO_PLANO: Record<Plano, ChaveDeTexto> = {
  anual: 'primeiraClasse.porAno',
  mensal: 'primeiraClasse.porMes',
  vitalicio: 'primeiraClasse.pagamentoUnico',
};

function Carrossel({ largura }: { largura: number }) {
  const reduzir = useReducedMotion();
  const lista = useRef<FlatList<Beneficio>>(null);
  const [atual, setAtual] = useState(0);
  const [mexeu, setMexeu] = useState(false);

  // Passa sozinho até o usuário arrastar; com "reduzir movimento", não passa (CLAUDE.md §9).
  useEffect(() => {
    if (reduzir || mexeu) return;
    const id = setTimeout(() => {
      const proximo = (atual + 1) % BENEFICIOS.length;
      lista.current?.scrollToIndex({ index: proximo, animated: true });
      setAtual(proximo);
    }, PASSA_A_CADA_MS);
    return () => clearTimeout(id);
  }, [atual, reduzir, mexeu]);

  return (
    <View style={{ gap: space[14], alignItems: 'center' }}>
      <FlatList
        ref={lista}
        data={BENEFICIOS}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: largura, flexGrow: 0 }}
        getItemLayout={(_, i) => ({ length: largura, offset: largura * i, index: i })}
        onScrollBeginDrag={() => setMexeu(true)}
        onMomentumScrollEnd={(e) => setAtual(Math.round(e.nativeEvent.contentOffset.x / largura))}
        renderItem={({ item }) => (
          <View style={{ width: largura, gap: space[14], alignItems: 'center' }}>
            <Ilustracao id={item.id} largura={largura} />
            <View style={{ gap: space[6], alignItems: 'center', paddingHorizontal: space[16] }}>
              <Text variant="Heading/Sheet 22" style={styles.centro} accessibilityRole="header">
                {t(item.titulo)}
              </Text>
              <Text variant="Body/Medium 14" tone="secondary" style={styles.centro}>
                {t(item.texto)}
              </Text>
            </View>
          </View>
        )}
      />
      <IndicadorDePaginas total={BENEFICIOS.length} atual={atual} />
    </View>
  );
}

const FOTO: Record<string, number> = {
  'voos-longos': require('../../../assets/janela/miniatura_sem-moldura.jpg'),
  vistas: require('../../../assets/janela/miniatura_asa-completa.jpg'),
};

const SONS: { icone: IconName; nome: ChaveDeTexto }[] = [
  { icone: 'soundEngine', nome: 'sons.motores.nome' },
  { icone: 'soundCabin', nome: 'sons.cabine.nome' },
  { icone: 'soundRain', nome: 'sons.chuva.nome' },
  { icone: 'soundLofi', nome: 'sons.lofi.nome' },
];

function Ilustracao({ id, largura }: { id: string; largura: number }) {
  const foto = FOTO[id];
  return (
    <View style={[styles.ilustracao, { width: largura }]} importantForAccessibility="no-hide-descendants">
      {foto ? (
        <>
          <Image source={foto} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.degrade} />
        </>
      ) : null}
      {id === 'voos-longos' ? (
        <View style={styles.chip}>
          <Text variant="Heading/Sheet 22" style={{ color: color.accent.on }}>
            {t('primeiraClasse.voosLongosChip')}
          </Text>
        </View>
      ) : null}
      {id === 'sons' ? (
        <View style={styles.sons}>
          {SONS.map((s) => (
            <View key={s.icone} style={styles.som}>
              <Icon name={s.icone} size={32} color={color.accent.default} />
              <Text variant="Caption/Medium 12" tone="secondary" numberOfLines={2} style={styles.centro}>
                {t(s.nome)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app, alignItems: 'center', gap: space[16] },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fechar: { backgroundColor: 'transparent' },
  meio: { flex: 1, justifyContent: 'center' },
  oferta: { gap: space[12] },
  planos: { flexDirection: 'row', justifyContent: 'space-between', gap: space[12], paddingTop: space[12] },
  centro: { textAlign: 'center' },
  ilustracao: { height: ALTURA_DA_ILUSTRACAO, borderRadius: radius['2xl'], overflow: 'hidden', backgroundColor: color.surface.sunken },
  degrade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(180deg, transparent 55%, ${color.bg.app} 100%)` },
  chip: {
    position: 'absolute',
    bottom: space[24],
    alignSelf: 'center',
    backgroundColor: color.accent.default,
    borderRadius: radius.full,
    paddingHorizontal: space[16],
    paddingVertical: space[6],
  },
  sons: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[10] },
  som: { width: 80, height: 112, paddingHorizontal: space[4], borderRadius: radius.xl, backgroundColor: color.surface.default, alignItems: 'center', justifyContent: 'center', gap: space[10] },
});
