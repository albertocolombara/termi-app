/**
 * M1b · Souvenir em destaque (Figma v3, 479:14713). Abre ao tocar numa medalha comprada em Sua mala.
 * A medalha aparece grande, em 3D, e gira com o dedo (volta de frente ao soltar). Abaixo: nome, tipo
 * com o motivo, onde foi comprada, em qual voo e por quanto.
 * Comprada na loja remota (Plus): não há voo, então a linha "Voo" não aparece.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useCatalogo } from '@/data/colecao/catalogo';
import { useSouvenirDaMala } from '@/data/colecao/useLoja';
import { useContagens } from '@/data/historico/useHistorico';
import { useSessaoEncerrada } from '@/data/sessoes/useSessaoEmAndamento';
import { color, InfoBanner, loja, screenGutter, space, Text, TopBar } from '@/ds';
import { MedalhaGiratoria } from '@/features/loja/MedalhaGiratoria';
import { nomeDoLugar } from '@/features/voo/formato';
import { t } from '@/i18n';

const TAMANHO = 260;

const dataLonga = (ms: number) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ');

export function TelaSouvenir({ souvenirId }: { souvenirId: string }) {
  const insets = useSafeAreaInsets();
  const catalogo = useCatalogo();
  const compra = useSouvenirDaMala(souvenirId);
  const sessao = useSessaoEncerrada(compra.data?.sessaoId ?? undefined);
  const saldo = useContagens().data?.saldo ?? 0;
  const souvenir = catalogo.find((s) => s.id === souvenirId);

  const topo = (
    <TopBar
      title={t('mala.titulo')}
      onBack={() => router.back()}
      saldo={t('loja.saldo', { valor: saldo.toLocaleString('pt-BR') })}
      saldoAcessivel={t('loja.saldoAcessivel', { valor: saldo })}
    />
  );

  if (compra.isPending || !compra.data || !souvenir) {
    return (
      <View style={[styles.tela, { paddingTop: insets.top + space[6], paddingHorizontal: screenGutter, gap: space[24] }]}>
        {topo}
        <InfoBanner message={compra.isPending ? t('mala.carregando') : t('mala.naoEncontrado')} />
      </View>
    );
  }

  const c = compra.data;
  const voo = sessao.data?.voo;
  const lugar = voo ? nomeDoLugar(voo.destino) : t('mala.lojaRemota');
  const tipo = t(`loja.metal.${souvenir.metal}`);

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24], paddingHorizontal: screenGutter, gap: space[24] }}
    >
      {topo}

      <Destaque>
        <MedalhaGiratoria souvenir={souvenir} tamanho={TAMANHO} />
      </Destaque>

      <View style={{ alignItems: 'center', gap: space[4] }}>
        <Text variant="Heading/Screen 32" accessibilityRole="header">
          {souvenir.nome}
        </Text>
        <Text variant="Body/Medium 14" tone="tertiary">
          {souvenir.motivo ? t('loja.tipoComMotivo', { tipo, motivo: souvenir.motivo }) : tipo}
        </Text>
      </View>

      <View style={{ paddingVertical: space[4] }}>
        <Linha rotulo={t('mala.compradaEm')} valor={t('mala.compradaOnde', { lugar, data: dataLonga(c.compradoEm) })} />
        {voo ? (
          <Linha
            rotulo={t('mala.voo')}
            valor={t('mala.vooRota', { voo: voo.callsign, origem: nomeDoLugar(voo.origem), destino: nomeDoLugar(voo.destino) })}
          />
        ) : null}
        <Linha rotulo={t('mala.valor')} valor={t('mala.valorDolares', { valor: c.preco })} ultima />
      </View>
    </ScrollView>
  );
}

/** Medalha com a luz fria da vitrine atrás e a sombra embaixo (Figma: "Luz de vitrine" e "Sombra"). */
function Destaque({ children }: { children: React.ReactNode }) {
  const [largura, setLargura] = useState(0);
  const altura = TAMANHO + 80;
  return (
    <View style={{ height: altura, alignItems: 'center', justifyContent: 'flex-start', paddingTop: space[24] }} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 ? (
        <Svg width={largura} height={altura} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="luzDaMala" cx="50%" cy="45%" rx="50%" ry="55%">
              <Stop offset="0" stopColor={loja.luzDaMala} />
              <Stop offset="0.65" stopColor={loja.luzDaMala} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="sombraDaMala" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={loja.sombraDaMala} stopOpacity={0.8} />
              <Stop offset="1" stopColor={loja.sombraDaMala} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={largura / 2} cy={altura * 0.45} rx={largura / 2} ry={altura * 0.55} fill="url(#luzDaMala)" />
          <Ellipse cx={largura / 2} cy={space[24] + TAMANHO + 34} rx={80} ry={10} fill="url(#sombraDaMala)" />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

function Linha({ rotulo, valor, ultima }: { rotulo: string; valor: string; ultima?: boolean }) {
  return (
    <View style={[styles.linha, !ultima && styles.divisor]} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text variant="Body/Medium 14" tone="tertiary">
        {rotulo}
      </Text>
      <Text variant="Label/Medium 14" style={{ flexShrink: 1, textAlign: 'right' }} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12], paddingVertical: space[12] },
  divisor: { borderBottomWidth: 1, borderBottomColor: color.border.subtle },
});
