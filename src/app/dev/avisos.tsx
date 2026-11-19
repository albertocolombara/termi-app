import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { agendaDePausas, horariosDasPausas, INTERVALO_PADRAO, PAUSA_MAXIMA_MIN } from '@/domain/sessao/pausas';
import { Button, color, InfoBanner, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';
import {
  agendarAvisosDoVoo,
  alarmeExatoPermitido,
  cancelarAvisos,
  esconderNotificacaoFixa,
  mostrarNotificacaoFixa,
  pedirAlarmeExato,
  pedirPermissaoDeNotificacoes,
} from '@/services/avisos';

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Teste de avisos (ferramenta de desenvolvimento). Confirma no aparelho o que ficou pendente
 * no protótipo (build-8): o aviso de pouso tocando com a tela bloqueada e o app fechado.
 */
export default function AvisosDeTeste() {
  const insets = useSafeAreaInsets();
  const [exato, setExato] = useState<boolean | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const atualizar = useCallback(() => {
    alarmeExatoPermitido().then(setExato);
  }, []);
  useEffect(atualizar, [atualizar]);

  const testar = async (minutos: number) => {
    await pedirPermissaoDeNotificacoes();
    const embarque = Date.now();
    const pousoEm = embarque + minutos * 60_000;
    const pausas = horariosDasPausas(embarque, agendaDePausas(minutos, INTERVALO_PADRAO));
    const n = await agendarAvisosDoVoo({
      pousoEm,
      minutosDeVoo: minutos,
      cidadeDestino: 'Londres',
      pausas,
      pausaMin: PAUSA_MAXIMA_MIN,
    });
    mostrarNotificacaoFixa('BCN → LHR', pousoEm);
    setMensagem(t('avisos.agendados', { n, hora: hora(pousoEm) }));
    atualizar();
  };

  const cancelar = async () => {
    await cancelarAvisos();
    esconderNotificacaoFixa();
    setMensagem(t('avisos.cancelados'));
  };

  const status = exato === null ? t('avisos.desconhecido') : exato ? t('avisos.permitido') : t('avisos.naoPermitido');

  return (
    <ScrollView
      style={{ backgroundColor: color.bg.app }}
      contentContainerStyle={{ paddingTop: insets.top + space[12], paddingHorizontal: screenGutter, gap: space[20] }}
    >
      <TopBar title={t('comum.voltar')} onBack={() => router.back()} />
      <Text variant="Body/Medium 14" tone="secondary">
        {t('avisos.alarmesStatus', { status })}
      </Text>

      {exato === false && (
        <View style={{ gap: space[12] }}>
          <InfoBanner message={t('avisos.alarmesTexto')} />
          <Button
            variant="secondary"
            size="medium"
            label={t('avisos.alarmesBotao')}
            onPress={() => pedirAlarmeExato().then(setExato)}
          />
        </View>
      )}

      <Text variant="Body/Medium 14" tone="tertiary">
        {t('avisos.testarDescricao')}
      </Text>
      <Button label={t('avisos.testar', { min: 52 })} onPress={() => testar(52)} />
      <Button variant="secondary" size="medium" label={t('avisos.testeRapido')} onPress={() => testar(2)} />
      <Button variant="link" size="medium" label={t('avisos.cancelar')} onPress={cancelar} />

      {mensagem && <InfoBanner message={mensagem} />}
    </ScrollView>
  );
}
