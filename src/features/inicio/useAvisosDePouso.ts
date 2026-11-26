/**
 * Situação dos avisos de pouso para o Início (X8): desligados nos Ajustes ou sem permissão de
 * notificação no Android. "Ativar" liga o ajuste e pede a permissão.
 *
 * Também confere "Alarmes e lembretes" (SCHEDULE_EXACT_ALARM). Sem ela, o Android entrega os avisos
 * atrasados e juntos: no teste de 26/11/2026, o início e o fim do serviço de bordo chegaram no mesmo
 * minuto. No Android 14+ ela vem negada num app recém-instalado.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAjustes } from '@/data/preferencias/ajustes';
import { alarmeExatoPermitido, pedirAlarmeExato, pedirPermissaoDeNotificacoes } from '@/services/avisos';

export function useAvisosDePouso() {
  const ligadoNosAjustes = useAjustes((a) => a.avisoDePouso);
  const mudar = useAjustes((a) => a.mudar);
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [exato, setExato] = useState<boolean | null>(null);

  const conferir = useCallback(() => {
    Notifications.getPermissionsAsync()
      .then((r) => setPermitido(r.granted))
      .catch(() => setPermitido(null));
    alarmeExatoPermitido()
      .then(setExato)
      .catch(() => setExato(null));
  }, []);

  useEffect(() => {
    conferir();
    // Voltou dos ajustes do Android: confere de novo.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && conferir());
    return () => sub.remove();
  }, [conferir]);

  const desligados = !ligadoNosAjustes || permitido === false;
  const ativar = useCallback(async () => {
    if (desligados) {
      mudar({ avisoDePouso: true });
      setPermitido(await pedirPermissaoDeNotificacoes().catch(() => false));
      return;
    }
    // Abre "Alarmes e lembretes" do Android; ao voltar, o AppState confere de novo.
    await pedirAlarmeExato().catch(() => false);
  }, [desligados, mudar]);

  return { desligados, atrasados: !desligados && exato === false, ativar };
}
