import { useLocalSearchParams } from 'expo-router';

import { TelaSouvenir } from '@/features/mala/TelaSouvenir';

/** M1b · Souvenir em destaque (tocar numa medalha da mala). */
export default function Souvenir() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaSouvenir souvenirId={id ?? ''} />;
}
