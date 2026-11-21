/** Só em builds de teste: dados baixados desde que o app abriu, por tipo (consumo de dados, build-37). */
import { useEffect, useState } from 'react';

import { t } from '@/i18n';
import { dadosBaixados, type TipoDeDado } from '@/services/rede/medidor';

import { LinhaComValor, Secao } from './Grupo';

const mb = (b: number) => `${(b / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
const ORDEM: TipoDeDado[] = ['paisagem', 'globo', 'voos', 'trilha', 'nuvens', 'musica', 'outros'];

export function MedidorDeDados() {
  const [dados, setDados] = useState(dadosBaixados);
  useEffect(() => {
    const id = setInterval(() => setDados(dadosBaixados()), 2000);
    return () => clearInterval(id);
  }, []);
  const detalhe = ORDEM.filter((k) => dados.porTipo[k].pedidos > 0)
    .map((k) => `${t(`ajustes.dados.${k}`)} ${mb(dados.porTipo[k].bytes)}`)
    .join(' · ');
  return (
    <Secao titulo={t('ajustes.dados.titulo')}>
      <LinhaComValor
        titulo={t('ajustes.dados.total')}
        descricao={detalhe || t('ajustes.dados.nada')}
        valor={mb(dados.total)}
        onPress={() => setDados(dadosBaixados())}
      />
    </Secao>
  );
}
