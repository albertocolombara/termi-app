/**
 * E3 · Pousar antes (confirmação). PRD: RN-10; UC-06.
 * Mostra o que fica (minutos, milhas do trecho, $) e o que não entra (carimbo e loja). Nada é penalidade.
 * O botão principal é "Continuar voando"; "Pousar agora" é o link.
 */
import { StyleSheet, View } from 'react-native';

import { fimPousandoAntes } from '@/domain/sessao/encerramento';
import { rendimentos } from '@/domain/sessao/rendimentos';
import type { SessaoGravada } from '@/data/sessoes/repositorio';
import { BottomSheet, Button, color, Icon, radius, space, Text } from '@/ds';
import { t } from '@/i18n';

import { codigoDoLugar, duracao, duracaoPorExtenso, nomeDoLugar } from './formato';

export function FolhaPousarAntes({
  visivel,
  sessao,
  agora,
  onContinuar,
  onPousar,
}: {
  visivel: boolean;
  sessao: SessaoGravada;
  agora: number;
  onContinuar: () => void;
  onPousar: () => void;
}) {
  const r = rendimentos(fimPousandoAntes(sessao, agora));
  const falta = Math.max(1, Math.ceil((sessao.pousoPrevistoEm - agora) / 60_000));
  return (
    <BottomSheet
      visible={visivel}
      onClose={onContinuar}
      title={t('pousarAntes.titulo')}
      subtitle={t('pousarAntes.subtitulo', { falta: duracaoPorExtenso(falta), cidade: nomeDoLugar(sessao.voo.destino) })}
      footer={
        <View style={{ gap: space[4] }}>
          <Button size="medium" icon={null} label={t('pousarAntes.continuar')} onPress={onContinuar} />
          <Button variant="link" size="medium" label={t('pousarAntes.pousarAgora')} onPress={onPousar} style={{ alignSelf: 'center' }} />
        </View>
      }
    >
      <View style={{ gap: space[14], paddingTop: space[4] }}>
        <View style={styles.metricas}>
          <Metrica valor={duracao(r.minutos)} rotulo={t('pouso.focados')} />
          <View style={styles.divisor} />
          <Metrica valor={`+${r.milhas.toLocaleString('pt-BR')}`} rotulo={t('pouso.milhasRotulo')} />
          <View style={styles.divisor} />
          <Metrica valor={`+$ ${r.dolares}`} rotulo={t('pouso.paraSouvenirs')} destaque />
        </View>
        <View style={styles.avisoCarimbo}>
          <Icon name="passport" size={16} color={color.text.tertiary} />
          <Text variant="Caption/Regular 12" tone="tertiary" style={{ flex: 1 }}>
            {t('pousarAntes.semCarimbo', { codigo: codigoDoLugar(sessao.voo.destino), cidade: nomeDoLugar(sessao.voo.destino) })}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

function Metrica({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <View style={styles.bloco}>
      <Text variant="Nav/Title 20" tone={destaque ? 'accent' : 'primary'}>
        {valor}
      </Text>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricas: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[16],
    paddingHorizontal: space[8],
    borderRadius: radius.cta,
    backgroundColor: color.surface.card,
  },
  divisor: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: color.border.subtle },
  bloco: { flex: 1, alignItems: 'center', gap: space[2] },
  avisoCarimbo: { flexDirection: 'row', alignItems: 'center', gap: space[10], paddingHorizontal: space[4] },
});
