/**
 * L1 · Loja do destino (Figma v3: "L1 · Loja do destino (depois do pouso)", ajustada pelo Alberto em
 * 25/11/2026). PRD: RF-29, RN-08, RN-13, RN-14, RN-20; UC-08 (passos 4–6, A1–A3, A6).
 *
 * Abre de dois lugares:
 * - da tela de pouso (E6), com a sessão: é a loja do pouso, para todos;
 * - das "Lojas" (L2), só com o país: no Plus compra a qualquer hora; na econômica o botão leva ao Plus.
 * A compra é uma transação só (`data/colecao/loja`), que confere as regras de novo antes de gravar.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useCatalogo } from '@/data/colecao/catalogo';
import { useComprarSouvenir, usePousosCompletos } from '@/data/colecao/useLoja';
import { useContagens, useSouvenirsNaMala } from '@/data/historico/useHistorico';
import { useSessaoEncerrada } from '@/data/sessoes/useSessaoEmAndamento';
import { souvenirDoPais } from '@/domain/colecao/catalogo';
import { pousouNoPais, situacaoDaCompra } from '@/domain/colecao/loja';
import { Button, color, InfoBanner, loja, Plus, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { nomeDoLugar } from '@/features/voo/formato';
import { t } from '@/i18n';
import { useClasse } from '@/services/compras';

import { FolhaMalaCheia } from './FolhaMalaCheia';
import { Medalha } from './Medalha';
import { Toldo } from './Toldo';

const ALTURA_DA_VITRINE = 240;

export function TelaLojaDoDestino({ pais, sessaoId }: { pais: string; sessaoId?: string }) {
  const insets = useSafeAreaInsets();
  const [agora] = useState(() => Date.now());
  const [malaCheiaAberta, setMalaCheiaAberta] = useState(false);
  const catalogo = useCatalogo();
  const classe = useClasse();
  const sessao = useSessaoEncerrada(sessaoId);
  const pousos = usePousosCompletos();
  const mala = useSouvenirsNaMala();
  const contagens = useContagens();
  const compra = useComprarSouvenir();

  const souvenir = souvenirDoPais(catalogo, pais, agora);
  const saldo = contagens.data?.saldo ?? 0;
  // Loja do pouso: a sessão existe, pousou de verdade e o destino é este país (RN-08).
  const s = sessao.data;
  const doPouso = !!s && s.resultado === 'pousou' && s.voo.destino.pais?.toUpperCase() === pais.toUpperCase();
  const ultimoPouso = pousos.data?.find((p) => p.pais?.toUpperCase() === pais.toUpperCase());
  const cidade = doPouso ? nomeDoLugar(s.voo.destino) : (ultimoPouso?.cidade ?? souvenir?.nome ?? pais);

  const voltar = () => (router.canGoBack() ? router.back() : router.dismissTo('/'));
  const topo = (
    <TopBar
      title={doPouso ? t('loja.voltarAoPouso') : t('loja.lojas')}
      onBack={voltar}
      saldo={t('loja.saldo', { valor: saldo.toLocaleString('pt-BR') })}
      saldoAcessivel={t('loja.saldoAcessivel', { valor: saldo })}
    />
  );

  const carregando = mala.isPending || contagens.isPending || pousos.isPending || (!!sessaoId && sessao.isPending);
  const aviso = carregando ? t('loja.carregando') : !souvenir ? t('loja.semSouvenir') : !doPouso && !pousouNoPais(pousos.data ?? [], pais) ? t('loja.semPouso') : null;
  if (aviso || !souvenir) {
    return (
      <View style={[styles.tela, { paddingTop: insets.top + space[6], paddingHorizontal: screenGutter, gap: space[24] }]}>
        {topo}
        <InfoBanner message={aviso ?? t('loja.semSouvenir')} />
      </View>
    );
  }

  const situacao = situacaoDaCompra({ souvenir, naMala: mala.data ?? [], saldo, classe, origem: doPouso ? 'pouso' : 'lojas' });
  const comprar = () => {
    if (situacao.tipo === 'mala_cheia') return setMalaCheiaAberta(true);
    compra.mutate(
      { souvenirId: souvenir.id, preco: souvenir.preco, classe, origem: doPouso ? 'pouso' : 'lojas', sessaoId: doPouso ? s.id : null },
      { onSuccess: (r) => r.tipo === 'mala_cheia' && setMalaCheiaAberta(true) },
    );
  };

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[16] }}>
        <View style={{ paddingHorizontal: screenGutter, paddingBottom: space[12] }}>{topo}</View>
        <Toldo />

        <View style={[styles.corpo, { flex: 1 }]}>
          <View style={{ gap: space[24] }}>
            <View style={styles.letreiro}>
              <Text variant="Caption/Strong 12" tone="accent" style={styles.letreiroTexto}>
                {t('loja.letreiro', { pais: souvenir.nome.toUpperCase() })}
              </Text>
              <Text variant="Heading/Screen 32" accessibilityRole="header" style={{ textAlign: 'center' }}>
                {t('loja.titulo', { cidade })}
              </Text>
            </View>

            <Vitrine>
              <Medalha souvenir={souvenir} tamanho={168} />
              <View style={styles.etiqueta} accessible accessibilityLabel={t('loja.preco', { valor: souvenir.preco })}>
                <Text variant="Label/Strong 14" tone="onAccent">
                  {t('loja.preco', { valor: souvenir.preco })}
                </Text>
              </View>
            </Vitrine>

            <View style={{ alignItems: 'center', gap: space[4] }}>
              <Text variant="Heading/Data 24">{souvenir.nome}</Text>
              <Text variant="Body/Small 13" tone="secondary">
                {t(`loja.metal.${souvenir.metal}`)}
              </Text>
            </View>
          </View>

          <Acoes
            situacao={situacao}
            preco={souvenir.preco}
            comprando={compra.isPending}
            erro={compra.isError}
            onComprar={comprar}
            onVoltar={voltar}
          />
        </View>
      </ScrollView>

      <FolhaMalaCheia visivel={malaCheiaAberta} onFechar={() => setMalaCheiaAberta(false)} />
    </View>
  );
}

function Acoes({
  situacao,
  preco,
  comprando,
  erro,
  onComprar,
  onVoltar,
}: {
  situacao: ReturnType<typeof situacaoDaCompra>;
  preco: number;
  comprando: boolean;
  erro: boolean;
  onComprar: () => void;
  onVoltar: () => void;
}) {
  const agoraNao = <Button variant="link" size="medium" label={t('loja.agoraNao')} onPress={onVoltar} style={{ alignSelf: 'center' }} />;
  switch (situacao.tipo) {
    case 'na_mala':
      return (
        <View style={styles.acoes}>
          <Text variant="Label/Medium 14" tone="secondary" style={{ textAlign: 'center' }}>
            {`✓ ${t('loja.naMala')}`}
          </Text>
          <Button variant="secondary" icon={null} label={t('loja.verNaMala')} onPress={() => router.push('/mala')} />
        </View>
      );
    case 'falta_saldo':
      return (
        <View style={styles.acoes}>
          <Text variant="Body/Small 13" tone="tertiary" style={{ textAlign: 'center' }}>
            {t('loja.faltam', { valor: situacao.faltam })}
          </Text>
          <Button variant="secondary" icon={null} label={t('loja.agoraNao')} onPress={onVoltar} />
        </View>
      );
    case 'so_no_plus':
      // RN-20: na econômica, tocar num recurso do Plus abre o paywall (foi o usuário quem pediu).
      return (
        <View style={styles.acoes}>
          <Text variant="Body/Small 13" tone="tertiary" style={{ textAlign: 'center' }}>
            {t('loja.soNoPlus')}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Plus tamanho="pequeno" />
          </View>
          <Button label={t('loja.comprarNoPlus')} icon={null} onPress={() => router.push('/primeira-classe')} />
          {agoraNao}
        </View>
      );
    default:
      return (
        <View style={styles.acoes}>
          {erro ? <InfoBanner message={t('loja.erro')} /> : null}
          <Button
            label={comprando ? t('loja.comprando') : t('loja.comprarPor', { valor: preco })}
            icon={null}
            disabled={comprando}
            onPress={onComprar}
          />
          {agoraNao}
        </View>
      );
  }
}

/** Vitrine (Figma v3: "Vitrine"): fundo afundado com luz quente, prateleira e sombra da medalha. */
function Vitrine({ children }: { children: React.ReactNode }) {
  const [largura, setLargura] = useState(0);
  return (
    <View style={styles.vitrine} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 ? (
        <Svg width={largura} height={ALTURA_DA_VITRINE} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="luz" cx="50%" cy="55%" rx="55%" ry="60%">
              <Stop offset="0" stopColor={loja.luzDaVitrine} />
              <Stop offset="1" stopColor={loja.luzDaVitrine} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={largura} height={ALTURA_DA_VITRINE} fill="url(#luz)" />
          <Rect x={0} y={ALTURA_DA_VITRINE - 26} width={largura} height={26} fill={color.surface.strong} />
          <Ellipse cx={largura / 2} cy={ALTURA_DA_VITRINE - 26} rx={75} ry={9} fill={loja.sombra} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  corpo: { justifyContent: 'space-between', gap: space[32], paddingHorizontal: screenGutter, paddingTop: space[16] },
  letreiro: { alignItems: 'center', gap: space[4] },
  letreiroTexto: { letterSpacing: 3 },
  vitrine: {
    height: ALTURA_DA_VITRINE,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.sunken,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: space[16],
  },
  etiqueta: {
    position: 'absolute',
    top: space[20],
    right: space[20],
    paddingVertical: space[6],
    paddingHorizontal: space[12],
    borderRadius: radius.tile,
    backgroundColor: color.accent.default,
  },
  acoes: { gap: space[8] },
});
