import Constants from 'expo-constants';

/** Variáveis públicas do app (ver .env.example). Nada aqui é segredo. */
export const env = {
  appEnv: (Constants.expoConfig?.extra?.appEnv ?? 'development') as 'development' | 'preview' | 'production',
  flightCacheUrl: process.env.EXPO_PUBLIC_FLIGHT_CACHE_URL ?? '',
  tilesBaseUrl: process.env.EXPO_PUBLIC_TILES_BASE_URL ?? '',
  assetsBaseUrl: process.env.EXPO_PUBLIC_ASSETS_BASE_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
  flightCacheMaxAgeMin: Number(process.env.EXPO_PUBLIC_FLIGHT_CACHE_MAX_AGE_MIN ?? 45),
};

/** Ferramentas de desenvolvimento só aparecem fora de produção. */
export const mostrarFerramentasDev = env.appEnv !== 'production';
