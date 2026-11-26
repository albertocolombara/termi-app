import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/** Número que cresce de 0 até `alvo` (ease-out). Com "reduzir movimento", aparece direto. */
export function useContagem(alvo: number, passo = 1, duracaoMs = 1600) {
  const reduzir = useReducedMotion();
  const [valor, setValor] = useState(reduzir ? alvo : 0);
  useEffect(() => {
    if (reduzir) return;
    const inicio = Date.now();
    let id = 0;
    const quadro = () => {
      const u = Math.min(1, (Date.now() - inicio) / duracaoMs);
      const e = 1 - (1 - u) ** 3;
      setValor(Math.round((alvo * e) / passo) * passo);
      if (u < 1) id = requestAnimationFrame(quadro);
      else setValor(alvo);
    };
    id = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(id);
  }, [alvo, passo, duracaoMs, reduzir]);
  return reduzir ? alvo : valor;
}
