import { voo, AGORA } from '@/domain/voos/__tests__/fabrica';

import { contagens, voosEncerrados, type BancoDeLeitura } from '../repositorio';

const bancoFalso = (linhas: unknown[], primeira: unknown = null): BancoDeLeitura => ({
  getAllAsync: async <T,>() => linhas as T[],
  getFirstAsync: async <T,>() => primeira as T,
});

describe('repositório do histórico', () => {
  it('lê os voos encerrados com o motivo e o intervalo do serviço de bordo', async () => {
    const v = voo(55);
    const [lido] = await voosEncerrados(
      bancoFalso([
        {
          id: 's1',
          voo_json: JSON.stringify(v),
          tempo_escolhido_min: 55,
          embarcou_em: AGORA,
          encerrou_em: AGORA + 55 * 60_000,
          minutos_foco: 55,
          milhas: 480,
          resultado: 'pousou_antes',
          intervalo_servico: 'desligado',
          categoria: 'estudo',
          foco: 'Cálculo',
        },
      ]),
    );
    expect(lido).toMatchObject({
      id: 's1',
      callsign: v.callsign,
      resultado: 'pousou_antes',
      minutosFoco: 55,
      intervaloServico: 'desligado',
      categoria: 'estudo',
      foco: 'Cálculo',
    });
  });

  it('saldo e contagens começam em zero', async () => {
    expect(await contagens(bancoFalso([], { saldo: null, carimbos: 0, souvenirs: 0 }))).toEqual({ saldo: 0, carimbos: 0, souvenirs: 0 });
  });
});
