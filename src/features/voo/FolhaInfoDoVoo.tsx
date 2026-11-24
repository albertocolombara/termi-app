/**
 * "Sobre este voo": abre ao tocar no código do voo em voo (pedido do Alberto, 24/11/2026).
 * Só dados que já chegam pelo cache (sem consulta nova ao provedor) e a companhia só pela
 * bandeira do país (regra 7: sem foto, logo ou pintura).
 */
import { StyleSheet, View } from 'react-native';

import type { PosicaoProjetada } from '@/domain/voos/projecao';
import { distanciaKm } from '@/domain/voos/geo';
import { minutosDesde, nomeDaAeronave, pontoCardeal } from '@/domain/voos/infoDoVoo';
import type { Voo } from '@/domain/voos/tipos';
import { BottomSheet, Button, Cauda, color, radius, space, Text } from '@/ds';
import { t } from '@/i18n';

import { codigoDoLugar, horaLocal, km, kmh, metros, nomeDoLugar } from './formato';

type Radar = 'ok' | 'sem-sinal' | 'sem-internet';

export function FolhaInfoDoVoo({
  visivel,
  voo,
  pos,
  radar,
  agora,
  onFechar,
}: {
  visivel: boolean;
  voo: Voo;
  pos: PosicaoProjetada;
  radar: Radar;
  agora: number;
  onFechar: () => void;
}) {
  const min = minutosDesde(voo.coletadoEm, agora);
  const posicao =
    radar === 'sem-sinal'
      ? t('infoDoVoo.radarPerdido', { hora: horaLocal(voo.coletadoEm) })
      : radar === 'sem-internet'
        ? t('infoDoVoo.radarSemInternet', { hora: horaLocal(voo.coletadoEm) })
        : min < 1
          ? t('infoDoVoo.radarAgora')
          : t('infoDoVoo.radarOk', { min });
  const rumo = pos.noSolo ? voo.rumo : pos.rumo;

  return (
    <BottomSheet
      visible={visivel}
      onClose={onFechar}
      title={voo.callsign}
      subtitle={voo.companhiaNome ?? undefined}
      icone={<Cauda pais={voo.companhiaPais} tamanho={36} />}
      footer={<Button size="medium" variant="secondary" icon={null} label={t('infoDoVoo.fechar')} onPress={onFechar} />}
    >
      <View style={{ gap: space[16], paddingTop: space[4] }}>
        <View style={styles.rota} accessible accessibilityLabel={`${t('infoDoVoo.rota')}: ${nomeDoLugar(voo.origem)} → ${nomeDoLugar(voo.destino)}`}>
          <Lugar codigo={codigoDoLugar(voo.origem)} cidade={nomeDoLugar(voo.origem)} />
          <Text variant="Body/Medium 14" tone="tertiary">
            →
          </Text>
          <Lugar codigo={codigoDoLugar(voo.destino)} cidade={nomeDoLugar(voo.destino)} direita />
        </View>

        <View style={styles.grade}>
          <Bloco rotulo={t('infoDoVoo.aeronave')} valor={nomeDaAeronave(voo.aeronave) ?? '—'} largo />
          <Bloco rotulo={t('infoDoVoo.altitude')} valor={metros(pos.altitudePes) ?? '—'} />
          <Bloco rotulo={t('infoDoVoo.velocidade')} valor={kmh(pos.noSolo ? 0 : voo.velocidadeNos)} />
          <Bloco rotulo={t('infoDoVoo.rumo')} valor={rumo === null ? '—' : t('infoDoVoo.rumoValor', { graus: Math.round(rumo), ponto: pontoCardeal(rumo) })} />
          <Bloco rotulo={t('infoDoVoo.faltam')} valor={km(distanciaKm(pos, voo.destino))} />
          <Bloco rotulo={t('infoDoVoo.pouso')} valor={horaLocal(voo.pousoPrevistoEm)} />
          <Bloco rotulo={t('infoDoVoo.posicao')} valor={`${pos.lat.toFixed(2)}°, ${pos.lon.toFixed(2)}°`} />
        </View>

        <View style={{ gap: space[6] }}>
          <Text variant="Label/Medium 14" tone={radar === 'ok' ? 'secondary' : 'primary'}>
            {posicao}
          </Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('infoDoVoo.comoFunciona')}
          </Text>
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('infoDoVoo.fonte')}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

function Lugar({ codigo, cidade, direita }: { codigo: string; cidade: string; direita?: boolean }) {
  return (
    <View style={{ flex: 1, gap: space[4], alignItems: direita ? 'flex-end' : 'flex-start' }}>
      <Text variant="Heading/Screen 32">{codigo}</Text>
      <Text variant="Body/Medium 14" tone="tertiary" numberOfLines={1}>
        {cidade}
      </Text>
    </View>
  );
}

function Bloco({ rotulo, valor, largo }: { rotulo: string; valor: string; largo?: boolean }) {
  return (
    <View style={[styles.bloco, largo && styles.blocoLargo]} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
      <Text variant="Label/Medium 14">{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rota: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  bloco: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: space[4],
    padding: space[12],
    borderRadius: radius.md,
    backgroundColor: color.surface.strong,
  },
  blocoLargo: { flexBasis: '100%' },
});
