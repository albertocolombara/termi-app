/**
 * Toca o som de fundo durante a sessão em voo, de qualquer tela e com o app em segundo plano.
 * Fica no layout raiz para não parar ao sair da tela do voo. Para no horário do pouso
 * ou quando a sessão é encerrada (pousar antes, pouso).
 */
import { useEffect, useState } from 'react';

import { useSomDeFundo } from '@/data/preferencias/somDeFundo';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { somEmUso } from '@/domain/sons/catalogo';
import { t } from '@/i18n';
import { useSomQueToca } from '@/services/audio';
import { useClasse } from '@/services/compras';

import { codigoDoLugar } from './formato';

export function SomDoVoo() {
  const sessao = useSessaoEmAndamento().data;
  const classe = useClasse();
  const { escolhido, volume } = useSomDeFundo();
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

  const tocando = !!sessao && antesDoPouso;
  useSomQueToca(somEmUso(escolhido, classe), volume, tocando, {
    titulo: sessao ? t('sons.tituloNaNotificacao', { voo: sessao.voo.callsign }) : '',
    subtitulo: sessao ? `${codigoDoLugar(sessao.voo.origem)} → ${codigoDoLugar(sessao.voo.destino)}` : '',
  });
  return null;
}
