import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Hora atual para as telas do voo, atualizada a cada `intervaloMs` só com o app na frente.
 * Em segundo plano o relógio para (CLAUDE.md §6.4); ao voltar, a tela recalcula tudo pela hora certa.
 */
export function useRelogio(intervaloMs = 1000) {
  const [estado, setEstado] = useState(() => ({ agora: Date.now(), ativo: AppState.currentState === 'active' }));
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const ligar = () => {
      id ??= setInterval(() => setEstado({ agora: Date.now(), ativo: true }), intervaloMs);
    };
    const desligar = () => {
      if (id) clearInterval(id);
      id = null;
    };
    if (AppState.currentState === 'active') ligar();
    const sub = AppState.addEventListener('change', (st) => {
      const ativo = st === 'active';
      setEstado({ agora: Date.now(), ativo });
      if (ativo) ligar();
      else desligar();
    });
    return () => {
      desligar();
      sub.remove();
    };
  }, [intervaloMs]);
  return estado;
}
