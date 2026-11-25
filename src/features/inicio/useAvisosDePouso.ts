/**
 * Situação dos avisos de pouso para o Início (X8): desligados nos Ajustes ou sem permissão de
 * notificação no Android. "Ativar" liga o ajuste e pede a permissão.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAjustes } from '@/data/preferencias/ajustes';
import { pedirPermissaoDeNotificacoes } from '@/services/avisos';

export function useAvisosDePouso() {
  const ligadoNosAjustes = useAjustes((a) => a.avisoDePouso);
  const mudar = useAjustes((a) => a.mudar);
  const [permitido, setPermitido] = useState<boolean | null>(null);

  const conferir = useCallback(() => {
    Notifications.getPermissionsAsync()
      .then((r) => setPermitido(r.granted))
      .catch(() => setPermitido(null));
  }, []);

  useEffect(() => {
    conferir();
    // Voltou dos ajustes do Android: confere de novo.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && conferir());
    return () => sub.remove();
  }, [conferir]);

  const ativar = useCallback(async () => {
    mudar({ avisoDePouso: true });
    setPermitido(await pedirPermissaoDeNotificacoes().catch(() => false));
  }, [mudar]);

  return { desligados: !ligadoNosAjustes || permitido === false, ativar };
}
