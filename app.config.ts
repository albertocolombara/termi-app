import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuração do app (substitui o app.json para poder ler variáveis de ambiente).
 * Tudo em `extra` e em EXPO_PUBLIC_* vai embutido no app: só valores públicos.
 */

const APP_ENV = (process.env.APP_ENV ?? 'development') as 'development' | 'preview' | 'production';

// Identificador provisório de desenvolvimento. O definitivo será escolhido antes do
// primeiro envio à Play (ROADMAP, Fase 1) e não poderá mudar depois da publicação.
const ANDROID_PACKAGE = 'com.albertocolombara.termiapp.dev';

// Cores de sistema (fundo do app, splash e ícone). Ver DESIGN.md.
const BG_APP = '#141218'; // color.bg.app
const TERMI_LARANJA = '#F28C28'; // Pendente: virar a variável brand/termi no Figma

const GEIST = './node_modules/@expo-google-fonts/geist';
const PIXEL = './assets/fonts/geist-pixel';
// Da Geist Pixel, só a forma Grid (painel de aeroporto). Ver src/ds/README.md.
const pixelFamilies = [['Geist Pixel Grid', 'Grid']] as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === 'production' ? 'Termi' : 'Termi (dev)',
  slug: 'termi-app',
  scheme: 'termi',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: BG_APP,
  ios: {
    bundleIdentifier: ANDROID_PACKAGE,
    supportsTablet: false,
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      backgroundColor: '#0E0F13',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Só as permissões de ARCHITECTURE.md §10. Localização entra com a tela "Voos perto de você".
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.VIBRATE',
    ],
    // Permissões que o template do Expo adiciona e o app não usa.
    blockedPermissions: [
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.RECORD_AUDIO', // o expo-audio pede por padrão; o app só toca som
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: BG_APP, image: './assets/splash-icon.png', imageWidth: 96 }],
    'expo-status-bar',
    // Sinal de apertar cintos do serviço de bordo (freesound 670297, kinoton, CC0), como som do canal de aviso.
    ['expo-notifications', { color: TERMI_LARANJA, sounds: ['./assets/sons/aviso_cinto.ogg'] }],
    'expo-asset',
    'expo-sqlite',
    // Sons de fundo, também com a tela bloqueada: o plugin declara o serviço de mídia (FOREGROUND_SERVICE e
    // FOREGROUND_SERVICE_MEDIA_PLAYBACK). Aprovado pelo Alberto em 20/11/2026 (ARCHITECTURE §10).
    ['expo-audio', { enableBackgroundPlayback: true, recordAudioAndroid: false, microphonePermission: false }],
    'expo-localization',
    [
      'expo-font',
      {
        android: {
          fonts: [
            {
              fontFamily: 'Geist',
              fontDefinitions: [
                { path: `${GEIST}/400Regular/Geist_400Regular.ttf`, weight: 400 },
                { path: `${GEIST}/500Medium/Geist_500Medium.ttf`, weight: 500 },
                { path: `${GEIST}/600SemiBold/Geist_600SemiBold.ttf`, weight: 600 },
              ],
            },
            ...pixelFamilies.map(([fontFamily, file]) => ({
              fontFamily,
              fontDefinitions: [{ path: `${PIXEL}/GeistPixel-${file}.ttf`, weight: 400 }],
            })),
          ],
        },
        ios: {
          fonts: [
            `${GEIST}/400Regular/Geist_400Regular.ttf`,
            `${GEIST}/500Medium/Geist_500Medium.ttf`,
            `${GEIST}/600SemiBold/Geist_600SemiBold.ttf`,
            ...pixelFamilies.map(([, file]) => `${PIXEL}/GeistPixel-${file}.ttf`),
          ],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv: APP_ENV,
  },
});
