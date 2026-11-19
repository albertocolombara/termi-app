/** Textos em português (Brasil). Toda frase de interface sai daqui (CLAUDE.md §5). */
export const ptBR = {
  inicio: {
    titulo: 'Termi',
    subtitulo: 'Fundação técnica do app. As telas do produto entram nas próximas fases.',
    ferramentas: 'Ferramentas de desenvolvimento',
  },
  dev: {
    designSystem: 'Design system',
    designSystemDescricao: 'Catálogo de tokens e componentes do Figma',
    janela: 'Janela de teste',
    janelaDescricao: 'Voo Barcelona → Londres com os blocos de teste',
    avisos: 'Avisos e notificação fixa',
    avisosDescricao: 'Alarmes exatos, serviço de bordo e pouso',
  },
  avisos: {
    canalPouso: 'Pouso',
    canalServico: 'Serviço de bordo',
    servicoTitulo: 'Serviço de bordo',
    servicoCorpo: 'Pausa de até {min} min. Levante, beba água.',
    fimServicoTitulo: 'Fim do serviço de bordo',
    fimServicoCorpo: 'Apertem os cintos: de volta ao foco.',
    pousoTitulo: 'Você pousou em {cidade}',
    pousoCorpo: '{min} min de voo. Abra para ver o que o voo rendeu.',
    fixaTitulo: '{rota} · em voo',
    fixaTexto: 'Pouso às {hora}',
    alarmesTitulo: 'Avisos no horário certo',
    alarmesTexto:
      'Para o pouso e o serviço de bordo tocarem na hora exata com a tela bloqueada, permita "Alarmes e lembretes" para o Termi. Sem isso, o Android pode atrasar os avisos.',
    alarmesBotao: 'Permitir alarmes e lembretes',
    alarmesStatus: 'Alarmes exatos: {status}',
    permitido: 'permitido',
    naoPermitido: 'não permitido',
    desconhecido: 'desconhecido',
    testar: 'Testar voo de {min} min',
    testarDescricao:
      'Agenda o pouso e as pausas como num voo real (pausas de 5 min a cada 25 min) e mostra a notificação fixa.',
    testeRapido: 'Teste rápido: pouso em 2 min',
    cancelar: 'Cancelar avisos agendados',
    agendados: '{n} aviso(s) agendado(s). Pouso às {hora}.',
    cancelados: 'Avisos cancelados.',
  },
  janela: {
    qualidade: 'Qualidade',
    quadros: 'Quadros por segundo',
    nuvensSatelite: 'Nuvens de satélite',
    diagnostico: 'Medidor',
    sobrevoando: 'Sobrevoando {lugar}',
  },
  comum: {
    voltar: 'Voltar',
  },
} as const;
