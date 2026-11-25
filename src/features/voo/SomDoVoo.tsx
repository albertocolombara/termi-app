/**
 * Toca o som de fundo durante a sessão em voo, de qualquer tela e com o app em segundo plano.
 * Fica no layout raiz para não parar ao sair da tela do voo. Para no horário do pouso
 * ou quando a sessão é encerrada (pousar antes, pouso).
 *
 * Num embarque feito agora, espera o fim da animação do Termi (useSomLiberado). Se o app abriu
 * com o voo já em andamento, toca direto.
 *
 * Sinais (Alberto, 25/11/2026): com o som de fundo tocando, o sinal de cintos (começo e fim de cada
 * serviço de bordo) e o aviso da comissária no pouso são tocados pelo próprio app, com o som de fundo
 * baixando 1 s antes. As notificações desses momentos passam a vir sem som; sem som de fundo
 * (Silêncio), voltam a tocar pela notificação. Por isso os avisos são reagendados quando isso muda.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAjustes } from '@/data/preferencias/ajustes';
import { useSomDeFundo } from '@/data/preferencias/somDeFundo';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { useContinuandoDesde } from '@/data/sessoes/continuarAtePouso';
import { useIndicesQueVoltaram } from '@/data/sessoes/voltouAoFoco';
import { agendaDePausas, horariosDasPausas, PAUSA_MAXIMA_MIN } from '@/domain/sessao/pausas';
import { somEmUso } from '@/domain/sons/catalogo';
import { t } from '@/i18n';
import { useSomQueToca } from '@/services/audio';
import { agendarAvisosDoVoo } from '@/services/avisos';
import { useClasse } from '@/services/compras';

import { codigoDoLugar, nomeDoLugar } from './formato';
import { useSomLiberado } from './somLiberado';

/** Teto do som em "Continuar até o pouso": o voo encerra antes, quando o avião real pousa. */
const LIMITE_DE_CONTINUACAO_MS = 3 * 3_600_000;

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
  // "Continuar até o pouso" (RN-09a): o som segue depois do horário (build-66: parava no horário e
  // nenhum som voltava). Termina quando a sessão encerra (o avião real pousou ou "Pousar agora").
  const continuando = useContinuandoDesde(sessao?.id ?? '') !== undefined;
  const tocando = podeTocar && (antesDoPouso || continuando);
  const rota = sessao ? `${codigoDoLugar(sessao.voo.origem)} → ${codigoDoLugar(sessao.voo.destino)}` : '';
  const ajustes = useAjustes();
  const voltaram = useIndicesQueVoltaram(sessao?.id ?? '');
  const pausas = useMemo(
    () => (sessao ? horariosDasPausas(sessao.embarcouEm, agendaDePausas(Math.round((sessao.pousoPrevistoEm - sessao.embarcouEm) / 60_000), sessao.intervaloServico)) : []),
    [sessao],
  );
  const sinais = useMemo(
    () => (ajustes.somDoServico ? pausas.flatMap((p, i) => (voltaram.includes(i) ? [p.inicio] : [p.inicio, p.fim])) : []),
    [pausas, voltaram, ajustes.somDoServico],
  );
  const somAtual = somEmUso(escolhido, classe);
  useSomQueToca(somAtual, volume, tocando, {
    rota,
    // Continuando: o serviço de som não tem um horário de pouso; a sessão é que o encerra.
    pousoEm: continuando ? pouso + LIMITE_DE_CONTINUACAO_MS : pouso,
    titulo: sessao ? t('sons.tituloNaNotificacao', { voo: sessao.voo.callsign }) : '',
    subtitulo: rota,
    sinais,
    volumeDoSinal: ajustes.volumeDoSinal,
    anunciarPouso: ajustes.avisoDePouso && !continuando,
  });

  // Quem toca os sinais: o app (com som de fundo) ou a notificação (sem). Reagenda quando muda.
  const somDeFundo = tocando && !!somAtual && volume > 0;
  const agendadoCom = useRef<string | null>(null);
  useEffect(() => {
    if (!sessao || !podeTocar || Date.now() >= sessao.pousoPrevistoEm) return;
    const chave = `${sessao.id}:${somDeFundo}:${ajustes.somDoServico}:${ajustes.avisoDePouso}`;
    if (agendadoCom.current === chave) return;
    agendadoCom.current = chave;
    agendarAvisosDoVoo({
      pousoEm: sessao.pousoPrevistoEm,
      minutosDeVoo: Math.round((sessao.pousoPrevistoEm - sessao.embarcouEm) / 60_000),
      cidadeDestino: nomeDoLugar(sessao.voo.destino),
      pausas,
      pausaMin: PAUSA_MAXIMA_MIN,
      avisoDePouso: ajustes.avisoDePouso,
      somDoServico: ajustes.somDoServico,
      somDeFundo,
      pausasEncerradas: voltaram,
    }).catch(() => {
      agendadoCom.current = null;
    });
  }, [sessao, podeTocar, somDeFundo, ajustes.somDoServico, ajustes.avisoDePouso, pausas, voltaram]);
  return null;
}
