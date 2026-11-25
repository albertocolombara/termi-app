import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

/** Cliente dos dados remotos (cache de voos, catálogo). Os JSON da CDN mudam a cada 10–20 min. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60_000, retry: 2 },
  },
});

/**
 * No React Native o TanStack Query não sabe quando o app vai para segundo plano: os
 * `refetchInterval` ("só com a tela aberta") continuavam rodando com a tela desligada enquanto o
 * serviço do som mantinha o app vivo (todas as regiões a cada 5 min pelo Início, a região do
 * avião, a trilha). Com isto, só com o app à vista; ao voltar, atualiza o que estiver velho.
 */
focusManager.setEventListener((mudou) => {
  const s = AppState.addEventListener('change', (estado) => mudou(estado === 'active'));
  return () => s.remove();
});
