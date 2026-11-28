/**
 * "Sobre este voo": abre ao tocar no código do voo em voo (pedido do Alberto, 24/11/2026).
 * Só dados que já chegam pelo cache (sem consulta nova ao provedor de voos) e a companhia pela
 * bandeira do país. Em teste desde 26/11/2026: a foto do avião real no Planespotters.net, grátis
 * para todos, com o crédito do fotógrafo e o link para a página da foto (exceção à regra 7 aberta
 * pelo Alberto para avaliar a imersão; ver `services/fotos`).
 */
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import type { PosicaoProjetada } from '@/domain/voos/projecao';
import { distanciaKm } from '@/domain/voos/geo';
import { minutosDesde, nomeDaAeronave, pontoCardeal } from '@/domain/voos/infoDoVoo';
import type { Voo } from '@/domain/voos/tipos';
import { BottomSheet, Cauda, color, EmVooRota, radius, space, Text } from '@/ds';
import { t } from '@/i18n';
import { useFotoDoAviao } from '@/services/fotos';

import { codigoDoLugar, horaLocal, km, kmh, metros, nomeDoLugar } from './formato';

/** Estado da leitura do radar. `fora-da-area`: longe das áreas que o coletor lê; posição estimada, sem aviso. */
export type Radar = 'ok' | 'fora-da-area' | 'sem-sinal' | 'sem-internet';

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
        : radar === 'fora-da-area'
          ? t('infoDoVoo.radarForaDaArea', { hora: horaLocal(voo.coletadoEm) })
        : min < 1
          ? t('infoDoVoo.radarAgora')
          : t('infoDoVoo.radarOk', { min });
  const rumo = pos.noSolo ? voo.rumo : pos.rumo;
  const faltaKm = distanciaKm(pos, voo.destino);
  const totalKm = Math.max(1, distanciaKm(voo.origem, voo.destino));
  const progresso = Math.min(1, Math.max(0, 1 - faltaKm / totalKm));

  return (
    <BottomSheet
      visible={visivel}
      onClose={onFechar}
      title={voo.callsign}
      subtitle={voo.companhiaNome ?? undefined}
      icone={<Cauda pais={voo.companhiaPais} tamanho={32} />}
      headerRight={
        <View style={styles.radarPill}>
          <View style={[styles.radarPonto, { backgroundColor: radar === 'ok' ? color.status.success : color.text.tertiary }]} />
          <Text variant="Caption/Regular 12" tone="secondary" style={{ fontSize: 11.5 }}>
            {radar === 'ok' ? 'Radar ao vivo' : 'Estimado'}
          </Text>
        </View>
      }
      alturaMaxima="82%"
    >
      <View style={{ gap: space[16], paddingTop: space[4] }}>
        <FotoDoAviao hex={voo.hex} ativo={visivel} />

        <View style={{ gap: space[4] }}>
          <View style={styles.rota} accessible accessibilityLabel={`${t('infoDoVoo.rota')}: ${nomeDoLugar(voo.origem)} → ${nomeDoLugar(voo.destino)}`}>
            <Lugar codigo={codigoDoLugar(voo.origem)} cidade={nomeDoLugar(voo.origem)} />
            <EmVooRota progresso={progresso} />
            <Lugar codigo={codigoDoLugar(voo.destino)} cidade={nomeDoLugar(voo.destino)} direita />
          </View>
          <Text variant="Caption/Regular 12" tone="tertiary" style={{ textAlign: 'center' }}>
            {`${km(faltaKm)} restantes`}
          </Text>
        </View>

        <View style={styles.listaSuica}>
          <LinhaSuica rotulo={t('infoDoVoo.aeronave')} valor={nomeDaAeronave(voo.aeronave) ?? '—'} />
          <LinhaSuica rotulo={t('infoDoVoo.altitude')} valor={metros(pos.altitudePes) ?? '—'} />
          <LinhaSuica rotulo={t('infoDoVoo.velocidade')} valor={kmh(pos.noSolo ? 0 : voo.velocidadeNos)} />
          <LinhaSuica rotulo={t('infoDoVoo.rumo')} valor={rumo === null ? '—' : t('infoDoVoo.rumoValor', { graus: Math.round(rumo), ponto: pontoCardeal(rumo) })} />
          <LinhaSuica rotulo={t('infoDoVoo.posicao')} valor={`${pos.lat.toFixed(2)}°, ${pos.lon.toFixed(2)}°`} ultima />
        </View>

        <Text variant="Caption/Regular 12" tone="muted">
          {`${posicao} · ${t('infoDoVoo.fonte')}`}
        </Text>
      </View>
    </BottomSheet>
  );
}

/** Foto do avião real com o crédito; some se não houver foto ou se der erro. */
function FotoDoAviao({ hex, ativo }: { hex: string; ativo: boolean }) {
  const { foto, imagem, carregando } = useFotoDoAviao(hex, ativo);
  if (!carregando && (!foto || !imagem)) return null;
  const proporcao = foto ? foto.largura / foto.altura : 3 / 2;
  return (
    <View style={{ gap: space[6] }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={foto ? t('infoDoVoo.fotoAcessivel', { fotografo: foto.fotografo }) : t('infoDoVoo.fotoCarregando')}
        disabled={!foto}
        onPress={() => foto && Linking.openURL(foto.link).catch(() => {})}
        style={[styles.foto, { aspectRatio: proporcao }]}
      >
        {imagem ? <Image source={{ uri: imagem }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </Pressable>
      {foto ? (
        <Text variant="Caption/Regular 12" tone="tertiary" onPress={() => Linking.openURL(foto.link).catch(() => {})}>
          {t('infoDoVoo.fotoCredito', { fotografo: foto.fotografo })}
        </Text>
      ) : null}
    </View>
  );
}

function Lugar({ codigo, cidade, direita }: { codigo: string; cidade: string; direita?: boolean }) {
  return (
    <View style={{ gap: space[2], alignItems: direita ? 'flex-end' : 'flex-start', maxWidth: 86 }}>
      <Text variant="Heading/Data 24">{codigo}</Text>
      <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
        {cidade}
      </Text>
    </View>
  );
}

function LinhaSuica({ rotulo, valor, ultima }: { rotulo: string; valor: string; ultima?: boolean }) {
  return (
    <View style={[styles.linhaSuica, !ultima && styles.linhaSuicaDivisor]} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text variant="Body/Small 13" tone="tertiary">
        {rotulo}
      </Text>
      <Text variant="Label/Medium 14" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  radarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingVertical: space[4],
    paddingHorizontal: space[10],
    borderRadius: radius.full,
    backgroundColor: color.surface.card,
  },
  radarPonto: { width: 6, height: 6, borderRadius: 3 },
  foto: { width: '100%', borderRadius: radius.card, overflow: 'hidden', backgroundColor: color.surface.card },
  rota: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  listaSuica: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border.subtle },
  linhaSuica: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12], paddingVertical: space[12] },
  linhaSuicaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border.subtle },
});
