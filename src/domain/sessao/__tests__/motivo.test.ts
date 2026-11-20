import {
  adicionarTarefa,
  FOCO_MAX_CARACTERES,
  MOTIVO_VAZIO,
  motivoVazio,
  normalizarMotivo,
  TAREFAS_MAX,
  type Categoria,
} from '../motivo';

describe('motivo da viagem', () => {
  it('é vazio quando nada foi preenchido, mesmo com espaços', () => {
    expect(motivoVazio(MOTIVO_VAZIO)).toBe(true);
    expect(motivoVazio({ categoria: null, foco: '   ', tarefas: [{ texto: ' ', feita: false }] })).toBe(true);
    expect(motivoVazio({ ...MOTIVO_VAZIO, categoria: 'estudo' })).toBe(false);
  });

  it('normaliza texto, descarta tarefas vazias e respeita os limites', () => {
    const n = normalizarMotivo({
      categoria: 'leitura',
      foco: '  ' + 'a'.repeat(FOCO_MAX_CARACTERES + 10),
      tarefas: [{ texto: '  Resumir  ', feita: true }, { texto: '', feita: false }],
    });
    expect(n.foco).toHaveLength(FOCO_MAX_CARACTERES);
    expect(n.tarefas).toEqual([{ texto: 'Resumir', feita: true }]);
  });

  it('descarta categoria desconhecida', () => {
    expect(normalizarMotivo({ ...MOTIVO_VAZIO, categoria: 'viagem' as Categoria }).categoria).toBeNull();
  });

  it('adiciona tarefas até o limite', () => {
    let lista = adicionarTarefa([], '  Fazer exercícios ');
    expect(lista).toEqual([{ texto: 'Fazer exercícios', feita: false }]);
    expect(adicionarTarefa(lista, '   ')).toBe(lista);
    for (let i = 0; i < 20; i++) lista = adicionarTarefa(lista, `t${i}`);
    expect(lista).toHaveLength(TAREFAS_MAX);
  });
});
