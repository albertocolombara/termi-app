/**
 * E3 · Pousar antes (confirmação). PRD: RN-10; UC-06.
 * Mostra o que fica (minutos, milhas do trecho, $) e o que não entra (carimbo e loja). Nada é penalidade.
 * O botão principal é "Continuar voando"; "Pousar agora" é o link.
 */
import { View } from 'react-native';

import { fimPousandoAntes } from '@/domain/sessao/encerramento';
import { rendimentos } from '@/domain/sessao/rendimentos';
import type { SessaoGravada } from '@/data/sessoes/repositorio';
import { BottomSheet, Button, Icon, space, Text, type IconName } from '@/ds';
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
      <View style={{ gap: space[12], paddingTop: space[4] }}>
        <Item icone="incluido" texto={t('pousarAntes.minutosEDinheiro', { tempo: duracao(r.minutos), dolares: r.dolares })} />
        <Item icone="incluido" texto={t('pousarAntes.milhas', { milhas: r.milhas.toLocaleString('pt-BR') })} />
        <Item
          icone="naoIncluido"
          texto={t('pousarAntes.semCarimbo', { codigo: codigoDoLugar(sessao.voo.destino), cidade: nomeDoLugar(sessao.voo.destino) })}
          apagado
        />
        <Text variant="Caption/Regular 12" tone="muted" style={{ paddingTop: space[4] }}>
          {t('pousarAntes.nadaSePerde')}
        </Text>
      </View>
    </BottomSheet>
  );
}

function Item({ icone, texto, apagado }: { icone: IconName; texto: string; apagado?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[10] }}>
      <Icon name={icone} />
      <Text variant="Body/Medium 14" tone={apagado ? 'tertiary' : 'primary'} style={{ flex: 1 }}>
        {texto}
      </Text>
    </View>
  );
}
