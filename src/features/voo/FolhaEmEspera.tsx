/**
 * E5 · Em espera: o horário do usuário chegou e o avião real ainda está no ar. PRD: RN-09, RN-09a.
 * O pouso completo já está garantido; continuar é opcional e cada minuto a mais conta como foco.
 * Figma v3: "E5 · Em espera (horário chegou, avião ainda no ar) · proposta", no padrão do E3.
 * Sem "×": fechar a folha sem escolher é pousar agora (nada se perde).
 */
import { View } from 'react-native';

import { fimPousando } from '@/domain/sessao/encerramento';
import { rendimentos } from '@/domain/sessao/rendimentos';
import type { SessaoGravada } from '@/data/sessoes/repositorio';
import { BottomSheet, Button, Icon, space, Text } from '@/ds';
import { t } from '@/i18n';

import { codigoDoLugar, duracao, duracaoPorExtenso, nomeDoLugar } from './formato';

export function FolhaEmEspera({
  visivel,
  sessao,
  minutosAtePousoReal,
  onContinuar,
  onPousar,
}: {
  visivel: boolean;
  sessao: SessaoGravada;
  /** Previsão do avião real, em minutos. */
  minutosAtePousoReal: number;
  onContinuar: () => void;
  onPousar: () => void;
}) {
  const r = rendimentos(fimPousando(sessao));
  return (
    <BottomSheet
      visible={visivel}
      onClose={onPousar}
      title={t('emEspera.titulo')}
      subtitle={t('emEspera.subtitulo', {
        tempo: duracao(r.minutos),
        cidade: nomeDoLugar(sessao.voo.destino),
        falta: duracaoPorExtenso(Math.max(1, minutosAtePousoReal)),
      })}
      footer={
        <View style={{ gap: space[4] }}>
          <Button size="medium" icon={null} label={t('emEspera.continuar')} onPress={onContinuar} />
          <Button variant="link" size="medium" label={t('emEspera.pousarAgora')} onPress={onPousar} style={{ alignSelf: 'center' }} />
        </View>
      }
    >
      <View style={{ gap: space[12], paddingTop: space[4] }}>
        <Item texto={t('emEspera.garantido', { tempo: duracao(r.minutos), dolares: r.dolares })} />
        <Item texto={t('emEspera.carimbo', { codigo: codigoDoLugar(sessao.voo.destino), cidade: nomeDoLugar(sessao.voo.destino) })} />
        <Item texto={t('emEspera.extra')} />
        <Text variant="Caption/Regular 12" tone="muted" style={{ paddingTop: space[4] }}>
          {t('emEspera.opcional')}
        </Text>
      </View>
    </BottomSheet>
  );
}

function Item({ texto }: { texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[10] }}>
      <Icon name="incluido" />
      <Text variant="Body/Medium 14" style={{ flex: 1 }}>
        {texto}
      </Text>
    </View>
  );
}
