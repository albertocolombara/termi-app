import { QueryClient } from '@tanstack/react-query';

/** Cliente dos dados remotos (cache de voos, catálogo). Os JSON da CDN mudam a cada 10–20 min. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60_000, retry: 2 },
  },
});
