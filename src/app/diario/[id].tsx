import { useLocalSearchParams } from 'expo-router';

import { TelaDetalheDoVoo } from '@/features/historico/TelaDetalheDoVoo';

/** M3b · Detalhe de um voo do diário. */
export default function DetalheDoVoo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaDetalheDoVoo id={id} />;
}
