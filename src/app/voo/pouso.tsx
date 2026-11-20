import { useLocalSearchParams } from 'expo-router';

import { TelaPouso } from '@/features/voo/TelaPouso';

/** E6 · Pousou / E7 · Pousou antes (UC-06, UC-08). */
export default function Pouso() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <TelaPouso id={id} />;
}
