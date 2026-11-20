/**
 * Toca o som de fundo durante a sessão em voo, de qualquer tela e com o app em segundo plano.
 * Fica no layout raiz para não parar ao sair da tela do voo. Para no horário do pouso
 * ou quando a sessão é encerrada (pousar antes, pouso).
 *
 * Num embarque feito agora, espera o fim da animação do Termi (useSomLiberado). Se o app abriu
 * com o voo já em andamento, toca direto.
 */
import { useEffect, useState } from 'react';

import { useSomDeFundo } from '@/data/preferencias/somDeFundo';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { somEmUso } from '@/domain/sons/catalogo';
import { t } from '@/i18n';
import { useSomQueToca } from '@/services/audio';
import { useClasse } from '@/services/compras';

import { codigoDoLugar } from './formato';
import { useSomLiberado } from './somLiberado';

export function SomDoVoo() {
  const sessao = useSessaoEmAndamento().data;
  const classe = useClasse();
  const { escolhido, volume } = useSomDeFundo();
  const liberado = useSomLiberado((s) => s.sessaoId);
  const [abriuEm] = useState(() => Date.now());
  const pouso = sessao?.pousoPrevistoEm ?? 0;
  const [antesDoPouso, setAntesDoPouso] = useState(() => Date.now() < pouso);

  useEffect(() => {
    const falta = pouso - Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAntesDoPouso(falta > 0);
    if (falta <= 0) return;
    const id = setTimeout(() => setAntesDoPouso(false), falta);
    return () => clearTimeout(id);
  }, [pouso]);

  // Embarque feito com o app já aberto: espera a animação. Voo que já estava em andamento: toca.
  const embarqueAgora = !!sessao && sessao.embarcouEm >= abriuEm;
  const podeTocar = !!sessao && (!embarqueAgora || liberado === sessao.id);
  const tocando = podeTocar && antesDoPouso;
  const rota = sessao ? `${codigoDoLugar(sessao.voo.origem)} → ${codigoDoLugar(sessao.voo.destino)}` : '';
  useSomQueToca(somEmUso(escolhido, classe), volume, tocando, {
    rota,
    pousoEm: pouso,
    titulo: sessao ? t('sons.tituloNaNotificacao', { voo: sessao.voo.callsign }) : '',
    subtitulo: rota,
  });
  return null;
}
