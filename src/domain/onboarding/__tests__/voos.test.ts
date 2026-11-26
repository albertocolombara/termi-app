import type { Voo } from '@/domain/voos/tipos';

import { avioesNoAr, momentoDoDia, rotasDeExemplo, vooDaJanela, vooEmDestaque, voosDeExemplo } from '../voos';

const AGORA = Date.UTC(2026, 10, 26, 12);
const aeroporto = (cidade: string, pais: string, lat: number, lon: number) => ({ iata: cidade.slice(0, 3).toUpperCase(), icao: null, nome: null, cidade, pais, lat, lon });

function voo(hex: string, minutos: number, extra: Partial<Voo> = {}): Voo {
  return {
    hex,
    callsign: `TST${hex}`,
    companhia: 'TST',
    companhiaPais: 'BR',
    companhiaNome: `Companhia ${hex}`,
    aeronave: null,
    origem: aeroporto('Recife', 'BR', -8.1, -34.9),
    destino: aeroporto('Lisboa', 'PT', 38.7, -9.1),
    lat: 10,
    lon: -25,
    altitudePes: 36_000,
    velocidadeNos: 480,
    rumo: 40,
    distanciaRestanteKm: minutos * 14,
    pousoPrevistoEm: AGORA + minutos * 60_000,
    coletadoEm: AGORA,
    regiao: 'teste',
    ...extra,
  };
}

describe('voos do onboarding', () => {
  it('conta cada avião no ar uma vez', () => {
    expect(avioesNoAr([voo('a', 60), voo('a', 60), voo('b', 30), voo('c', -5)], AGORA)).toBe(2);
  });

  it('destaque: rota internacional mais longa com pelo menos 45 min', () => {
    const domestico = voo('d', 400, { destino: aeroporto('Salvador', 'BR', -12.9, -38.5) });
    const curto = voo('c', 30);
    const longo = voo('l', 300);
    const medio = voo('m', 120);
    expect(vooEmDestaque([domestico, curto, medio, longo], AGORA)?.hex).toBe('l');
    expect(vooEmDestaque([curto], AGORA)).toBeNull();
  });

  it('janela: prefere o voo na hora dourada', () => {
    const a = voo('a', 200, { lat: 0 });
    const b = voo('b', 100, { lat: 50 });
    const sol = (lat: number) => (lat > 40 ? 5 : 60);
    expect(vooDaJanela([a, b], AGORA, sol)?.hex).toBe('b');
  });

  it('momento do dia pela elevação do sol', () => {
    expect(momentoDoDia(30, 29)).toBe('dia');
    expect(momentoDoDia(-20, -21)).toBe('noite');
    expect(momentoDoDia(4, 3)).toBe('por-do-sol');
    expect(momentoDoDia(4, 5)).toBe('nascer-do-sol');
  });

  it('exemplos: perto do tempo e de companhias diferentes', () => {
    const lista = [
      voo('a', 120, { companhiaNome: 'X' }),
      voo('b', 118, { companhiaNome: 'X' }),
      voo('c', 125, { companhiaNome: 'Y' }),
      voo('d', 60, { companhiaNome: 'Z' }),
      voo('e', 130, { companhiaNome: 'W' }),
    ];
    expect(voosDeExemplo(lista, 120, AGORA).map((v) => v.hex)).toEqual(['a', 'c', 'e']);
    expect(voosDeExemplo(lista.slice(0, 2), 120, AGORA).map((v) => v.hex)).toEqual(['a', 'b']);
  });

  it('rotas de exemplo sem repetir o par de cidades', () => {
    expect(rotasDeExemplo([voo('a', 100), voo('b', 200)])).toHaveLength(1);
  });
});
