import { filtrarPorRegiao, filtrosDisponiveis } from '../regioes';
import { voo } from './fabrica';

describe('filtros de região', () => {
  const lista = [{ voo: voo(50, { regiao: 'frankfurt' }) }, { voo: voo(52, { regiao: 'sao-paulo' }) }, { voo: voo(55, { regiao: 'nova-regiao' }) }];

  it('agrupa as regiões do coletor', () => {
    expect(filtrarPorRegiao(lista, 'europa')).toHaveLength(1);
    expect(filtrarPorRegiao(lista, 'qualquer')).toHaveLength(3);
  });

  it('só oferece filtros com voos', () => {
    expect(filtrosDisponiveis(lista)).toEqual(['qualquer', 'europa', 'america-do-sul']);
  });
});
