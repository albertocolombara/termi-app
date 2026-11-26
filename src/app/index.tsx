import { useEffect } from 'react';
import { Redirect } from 'expo-router';

import { useOnboarding } from '@/data/preferencias/onboarding';
import { useVoosEncerrados } from '@/data/historico/useHistorico';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { TelaInicio } from '@/features/inicio/TelaInicio';

/**
 * Primeira abertura: onboarding (UC-01). Quem já voou (app atualizado, com histórico ou voo em
 * andamento) não passa por ele: o onboarding fica marcado como visto.
 */
export default function Inicio() {
  const concluido = useOnboarding((s) => s.concluido);
  const mudar = useOnboarding((s) => s.mudar);
  const voos = useVoosEncerrados();
  const sessao = useSessaoEmAndamento();
  const jaVoou = (voos.data?.length ?? 0) > 0 || !!sessao.data;
  const carregando = voos.isPending || sessao.isPending;

  useEffect(() => {
    if (!concluido && jaVoou) mudar({ concluido: true });
  }, [concluido, jaVoou, mudar]);

  if (!concluido && !jaVoou) {
    if (carregando) return null;
    return <Redirect href="/onboarding" />;
  }
  return <TelaInicio />;
}
