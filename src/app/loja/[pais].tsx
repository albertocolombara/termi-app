import { useLocalSearchParams } from 'expo-router';

import { TelaLojaDoDestino } from '@/features/loja/TelaLojaDoDestino';

/** L1 · Loja do destino (UC-08). `sessao` vem da tela de pouso; sem ela, é a loja aberta pelas Lojas do Plus. */
export default function LojaDoDestino() {
  const { pais, sessao } = useLocalSearchParams<{ pais: string; sessao?: string }>();
  return <TelaLojaDoDestino pais={pais ?? ''} sessaoId={sessao} />;
}
