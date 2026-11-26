import { Stack } from 'expo-router';

import { color } from '@/ds';

/** Onboarding (OB1–OB10). Fica numa pilha própria: ao terminar, o Início substitui a pilha inteira. */
export default function LayoutDoOnboarding() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: color.bg.app } }} />;
}
