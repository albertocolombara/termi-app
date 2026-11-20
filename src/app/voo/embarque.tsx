import { useLocalSearchParams } from 'expo-router';

import { TelaEmbarque } from '@/features/voo/TelaEmbarque';

/** 05 · Embarcando. `?rapido=1` quando vem do caminho rápido do dial (UC-03): sessão sem motivo da viagem. */
export default function Embarque() {
  const { rapido } = useLocalSearchParams<{ rapido?: string }>();
  return <TelaEmbarque caminhoRapido={rapido === '1'} />;
}
