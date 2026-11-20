import { Stack } from 'expo-router';

import { TelaPrimeiraClasse } from '@/features/primeira-classe/TelaPrimeiraClasse';

export default function PrimeiraClasse() {
  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <TelaPrimeiraClasse />
    </>
  );
}
