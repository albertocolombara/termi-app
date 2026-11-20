/** Seletor numérico do tempo de foco (Figma: "01b · Tempo de foco · seletor de tempo"). */
import { useState } from 'react';
import { View } from 'react-native';

import { duracaoMaxima, validarDuracao, type Classe } from '@/domain/sessao/duracao';
import { PASSO_DIAL_MIN } from '@/domain/voos/dial';
import { BottomSheet, Button, Chip, color, space, Text, TextField } from '@/ds';
import { t } from '@/i18n';

const ATALHOS = [25, 50, 90, 120];
const rotuloAtalho = (m: number) => (m % 60 === 0 ? `${m / 60} h` : `${m} min`);

export function SeletorDeTempo({
  visivel,
  inicial,
  classe,
  onConfirmar,
  onFechar,
}: {
  visivel: boolean;
  inicial: number;
  classe: Classe;
  onConfirmar: (min: number) => void;
  onFechar: () => void;
}) {
  const [texto, setTexto] = useState(String(inicial));
  const bruto = Number.parseInt(texto, 10);
  const min = Number.isFinite(bruto) ? Math.round(bruto / PASSO_DIAL_MIN) * PASSO_DIAL_MIN : NaN;
  const valido = Number.isFinite(min) && validarDuracao(min, classe).ok;
  const maxH = duracaoMaxima(classe) / 60;

  return (
    <BottomSheet
      visible={visivel}
      onClose={onFechar}
      title={t('dial.seletorTitulo')}
      subtitle={t('dial.seletorSubtitulo')}
      footer={
        <View style={{ gap: space[4] }}>
          <Button
            size="medium"
            icon={null}
            disabled={!valido}
            label={valido ? t('dial.confirmar', { min }) : t('dial.confirmarInvalido')}
            onPress={() => valido && onConfirmar(min)}
          />
          <Button variant="link" size="medium" label={t('comum.cancelar')} onPress={onFechar} style={{ alignSelf: 'center' }} />
        </View>
      }
    >
      <View style={{ gap: space[8], paddingTop: space[12] }}>
        <Text variant="Label/Medium 14" style={{ color: color.text.accent }}>
          {t('dial.minutos')}
        </Text>
        <TextField value={texto} onChangeText={(v) => setTexto(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} accessibilityLabel={t('dial.minutos')} />
        <Text variant="Caption/Regular 12" tone="tertiary">
          {t('dial.limites', { max: `${maxH} h` })}
        </Text>
        <View style={{ flexDirection: 'row', gap: space[8], paddingTop: space[8] }}>
          {ATALHOS.map((m) => (
            <Chip key={m} size="small" label={rotuloAtalho(m)} selected={min === m} onPress={() => setTexto(String(m))} />
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
