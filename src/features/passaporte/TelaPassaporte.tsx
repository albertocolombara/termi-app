/**
 * M2 · Passaporte (Figma v3). PRD: RF-32; UC-10.
 * Resumo (carimbos, países, milhas) e as páginas do passaporte com 9 carimbos cada, em ordem de pouso.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarimbos, useVoosEncerrados } from '@/data/historico/useHistorico';
import { resumoDoDiario } from '@/domain/historico/historico';
import { color, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';

import { CarimboDoPassaporte, dataDoCarimbo } from './CarimboDoPassaporte';

const POR_PAGINA = 9;
/** Giro de cada posição da página (Figma M2), para os carimbos parecerem batidos à mão. */
const GIROS = [-8, 6, -4, -10, 7, -6, 4, 9, -3];

export function TelaPassaporte() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const carimbos = useCarimbos().data ?? [];
  const milhas = resumoDoDiario(useVoosEncerrados().data ?? []).milhas;
  const paises = new Set(carimbos.map((c) => c.pais).filter(Boolean)).size;
  const [pagina, setPagina] = useState(0);

  const largura = width - screenGutter * 2;
  const paginas: (typeof carimbos)[] = [];
  for (let i = 0; i < Math.max(1, carimbos.length); i += POR_PAGINA) paginas.push(carimbos.slice(i, i + POR_PAGINA));

  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPagina(Math.round(e.nativeEvent.contentOffset.x / largura));

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24], gap: space[24] }}
    >
      <View style={{ paddingHorizontal: screenGutter }}>
        <TopBar title={t('passaporte.titulo')} onBack={() => router.back()} />
      </View>

      <View style={{ gap: space[16] }}>
        <View style={[styles.resumo, { paddingHorizontal: screenGutter }]}>
          <Bloco valor={String(carimbos.length)} rotulo={t('passaporte.carimbos')} />
          <Bloco valor={String(paises)} rotulo={t('passaporte.paises')} />
          <Bloco valor={milhas.toLocaleString('pt-BR')} rotulo={t('passaporte.milhas')} />
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={aoRolar} snapToInterval={largura} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: screenGutter }}>
          {paginas.map((lista, n) => (
            <View key={n} style={[styles.pagina, { width: largura }]}>
              <View style={styles.cabecalhoDaPagina}>
                <Text variant="Caption/Strong 12" tone="onAccent">
                  {t('passaporte.cabecalho')}
                </Text>
                <Text variant="Caption/Regular 12" tone="onAccent">
                  {t('passaporte.pagina', { n: n + 1 })}
                </Text>
              </View>
              {lista.length === 0 ? (
                <Text variant="Body/Medium 14" tone="onAccent" style={{ textAlign: 'center', paddingVertical: space[40], opacity: 0.6 }}>
                  {t('passaporte.vazio')}
                </Text>
              ) : (
                <View style={styles.grade}>
                  {lista.map((c, i) => {
                    const codigo = c.aeroporto ?? '—';
                    const cidade = c.cidade ?? codigo;
                    return (
                      <View
                        key={c.id}
                        style={styles.casa}
                        accessible
                        accessibilityLabel={t('passaporte.carimboAcessivel', { cidade, codigo, data: dataDoCarimbo(c.data) })}
                      >
                        <CarimboDoPassaporte cidade={cidade} codigo={codigo} data={c.data} tamanho={Math.min(104, (largura - 32) / 3 - 4)} giro={GIROS[i % GIROS.length]} />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {paginas.length > 1 ? (
          <View style={styles.paginas}>
            {paginas.map((_, i) => (
              <View key={i} style={[styles.indicador, i === pagina && styles.indicadorAtivo]} />
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Bloco({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.bloco} accessible accessibilityLabel={`${valor} ${rotulo}`}>
      <Text variant="Heading/Data 24">{valor}</Text>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  resumo: { flexDirection: 'row', gap: space[8] },
  bloco: { flex: 1, gap: space[2], padding: space[12], borderRadius: radius.lg, backgroundColor: color.surface.subtle },
  pagina: {
    gap: space[14],
    paddingTop: space[16],
    paddingHorizontal: space[16],
    paddingBottom: space[20],
    minHeight: 455,
    backgroundColor: color.carimbo.papel,
    borderWidth: 1,
    borderColor: color.carimbo.bordaDoPapel,
  },
  cabecalhoDaPagina: { flexDirection: 'row', justifyContent: 'space-between' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[14] },
  casa: { width: '33.333%', alignItems: 'center', justifyContent: 'center', minHeight: 110 },
  paginas: { flexDirection: 'row', justifyContent: 'center', gap: space[6] },
  indicador: { width: 8, height: 4, borderRadius: 2, backgroundColor: color.surface.strong },
  indicadorAtivo: { width: 20, backgroundColor: color.accent.default },
});
