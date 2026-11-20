import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { Button, color, Icon, InfoBanner, screenGutter, space, Text } from '@/ds';
import { codigoDoLugar, horaLocal } from '@/features/voo/formato';
import { t } from '@/i18n';

/**
 * Provisório: confirma que a sessão foi gravada e mostra a contagem pelo relógio.
 * A tela em voo completa (globo, janela, painel inferior, Pousar antes) é o próximo passo da Fase 3.
 */
export default function EmVoo() {
  const insets = useSafeAreaInsets();
  const sessao = useSessaoEmAndamento();
  const agora = useAgora();
  const s = sessao.data;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg.flight, paddingTop: insets.top + space[24], paddingBottom: insets.bottom + space[24], paddingHorizontal: screenGutter, gap: space[20] }}>
      {s ? (
        <>
          <View style={{ gap: space[6] }}>
            <Text variant="Label/Medium 14" tone="tertiary">
              {s.voo.companhiaNome ? `${s.voo.callsign} · ${s.voo.companhiaNome}` : s.voo.callsign}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[10] }}>
              <Text variant="Heading/Screen 32">{codigoDoLugar(s.voo.origem)}</Text>
              <Icon name="plane" size={20} color={color.accent.default} />
              <Text variant="Heading/Screen 32">{codigoDoLugar(s.voo.destino)}</Text>
            </View>
          </View>
          <Text variant="Display/Data 52">{t('emVoo.restante', { min: Math.max(0, Math.ceil((s.pousoPrevistoEm - agora) / 60_000)) })}</Text>
          <Text variant="Body/Large 16" tone="secondary">
            {t('emVoo.pousoAs', { hora: horaLocal(s.pousoPrevistoEm) })}
          </Text>
          <InfoBanner message={t('emVoo.provisorio')} />
        </>
      ) : (
        <InfoBanner message={sessao.isPending ? t('dial.procurando') : t('emVoo.nenhuma')} />
      )}
      <Button variant="secondary" size="small" label={t('emVoo.voltarAoInicio')} onPress={() => router.dismissTo('/')} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

/** Hora atual, atualizada a cada 15 s só com o app aberto (em segundo plano nada roda). */
function useAgora() {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = setInterval(() => setAgora(Date.now()), 15_000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        setAgora(Date.now());
        id ??= setInterval(() => setAgora(Date.now()), 15_000);
      } else if (id) {
        clearInterval(id);
        id = null;
      }
    });
    return () => {
      if (id) clearInterval(id);
      sub.remove();
    };
  }, []);
  return agora;
}
