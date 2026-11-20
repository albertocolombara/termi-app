# Casos de uso — Termi: Focus Flights

> Interações principais entre usuários e sistema. Os requisitos (`RF-xx`) e regras (`RN-xx`) estão definidos em [PRD.md](PRD.md).
> Última atualização: 19/11/2026.

## Atores

| Ator | Descrição |
|---|---|
| **Viajante** | Usuário do app. Pode estar na **econômica** (grátis) ou na **primeira classe** (assinante ou vitalício). |
| **Sistema** | O app no aparelho (relógio da sessão, avisos agendados, cálculos de rendimento). |
| **Coletor de voos** | Serviço próprio que consulta o provedor de voos e publica o cache. |
| **Loja de apps** | Google Play (e App Store no futuro), via RevenueCat, para compras e assinaturas. |

## Índice

| Domínio | Casos |
|---|---|
| Início | [UC-01 Primeira abertura e onboarding](#uc-01) |
| Embarque | [UC-02 Embarcar por partidas](#uc-02) · [UC-03 Embarcar pelo caminho rápido](#uc-03) |
| Em voo | [UC-04 Focar durante o voo](#uc-04) · [UC-05 Fazer o serviço de bordo](#uc-05) · [UC-06 Pousar antes](#uc-06) · [UC-07 Usar o bloqueio de apps](#uc-07) |
| Pouso e coleção | [UC-08 Pousar e comprar o souvenir](#uc-08) · [UC-09 Ver a mala e o souvenir](#uc-09) · [UC-10 Subir de nível](#uc-10) |
| Histórico | [UC-11 Consultar o diário de bordo](#uc-11) · [UC-12 Consultar estatísticas](#uc-12) |
| Monetização | [UC-13 Assinar a primeira classe](#uc-13) · [UC-14 Gerenciar a assinatura](#uc-14) |
| Conta e dados | [UC-15 Criar conta e sincronizar](#uc-15) · [UC-16 Exportar ou apagar dados](#uc-16) |
| Sistema | [UC-S1 Atualizar o cache de voos](#uc-s1) |

Ações simples que já acontecem dentro dos fluxos (ver o passaporte, mudar um ajuste, ler Sobre o Termi) não têm caso de uso próprio.

---

## Início

<a id="uc-01"></a>
### UC-01 — Primeira abertura e onboarding

- **Objetivo:** entender o app, conceder as permissões necessárias e chegar ao primeiro voo, sem cadastro.
- **Ator principal:** Viajante (novo).
- **Pré-condições:** app instalado; primeira abertura.
- **Gatilho:** o Viajante abre o app.

**Fluxo principal**

1. O Sistema mostra a Abertura ("Embarque num voo de verdade").
2. O Sistema mostra Como funciona (tempo, voo real, serviço de bordo, rendimentos).
3. O Sistema mostra Avisos da tripulação e explica as notificações de pouso e serviço de bordo.
4. O Viajante aceita; o Sistema pede a permissão de notificações e, no Android 14+, a de "Alarmes e lembretes".
5. O Sistema mostra Voos perto de você e explica o uso da localização aproximada.
6. O Viajante aceita; o Sistema pede a localização aproximada.
7. O Sistema mostra a Oferta de boas-vindas (ver UC-13, variante boas-vindas).
8. O Viajante toca em "Continuar na econômica".
9. O Sistema leva ao dial, no plano grátis.

**Fluxos alternativos**

- **A1 — Recusa de permissão (passos 4 e 6):** o Sistema segue o onboarding. Sem notificações, o Início mostra o aviso de ativação (RF-48). Sem localização, a região padrão do painel é "Qualquer lugar".
- **A2 — Assina na oferta (passo 7):** segue UC-13 e, ao concluir, vai ao dial na primeira classe.

**Exceções e erros**

- **E1 — Compra falha ou é cancelada:** o Sistema volta à oferta sem mudar o preço nem o desconto.

**Pós-condições:** onboarding marcado como concluído; permissões registradas; Viajante no dial.

**Regras relacionadas:** RN-19, RN-20, RN-21. Requisitos: RF-01 a RF-04.

**Critérios de aceitação**

- [ ] Nenhum passo exige cadastro, e-mail ou telefone.
- [ ] Toda permissão do sistema é precedida da tela explicativa.
- [ ] "Continuar na econômica" está visível sem rolar a tela.
- [ ] O preço da oferta não muda ao tentar fechar a tela e não há contador.

---

## Embarque

<a id="uc-02"></a>
### UC-02 — Embarcar por partidas

- **Objetivo:** escolher um voo real que pouse no tempo de foco desejado e embarcar.
- **Ator principal:** Viajante.
- **Pré-condições:** onboarding concluído; conexão com a internet; cache de voos disponível.
- **Gatilho:** o Viajante toca em "Novo voo" no Início.

**Fluxo principal**

1. O Sistema toca a comemoração do Termi e abre o dial.
2. O Viajante escolhe o tempo de foco (15 min a 6 h).
3. O Sistema lê o cache de voos, projeta a posição de cada avião e mostra o painel de partidas com os voos elegíveis (RN-02), ordenados pela diferença em relação ao tempo escolhido.
4. O Viajante filtra por região (opcional) e escolhe um voo.
5. O Sistema mostra o cartão de embarque.
6. O Viajante anota o motivo da viagem (opcional: categoria, foco, checklist) e toca em embarcar.
7. O Sistema abre a tela de embarque: localiza o avião, baixa os blocos de paisagem da rota e prepara a janela, mostrando cada etapa.
8. O Sistema fixa o horário de pouso, agenda os avisos de pouso e de serviço de bordo e mostra a notificação fixa.
9. O Sistema abre a tela em voo (UC-04).

**Fluxos alternativos**

- **A1 — Tempo acima do plano (passo 2):** na econômica, a faixa acima de 3 h aparece visualmente como "primeira classe" e não pode ser escolhida; o paywall não abre, para não atrapalhar a escolha do tempo (exceção da RN-20).
- **A2 — Nenhum voo encaixa (passo 3):** o Sistema sugere tempos próximos com voos na região escolhida ou em "Qualquer lugar".
- **A3 — Dados de voo fora do ar (passo 3):** o Sistema oferece refazer o voo real de ontem, no mesmo horário (RN-12).
- **A4 — Paisagem não baixa (passo 7):** o Sistema oferece "Embarcar com o globo"; a janela fica disponível quando a conexão voltar.
- **A5 — Cancelar embarque (passo 7):** o Viajante toca em "Cancelar embarque"; o Sistema volta ao dial sem registrar voo.
- **A6 — Pular animações:** o Viajante pode pular a comemoração e a esteira.

**Exceções e erros**

- **E1 — Sem internet antes do embarque:** o Sistema explica que é preciso conexão para achar o avião e oferece tentar de novo.
- **E2 — O voo escolhido sumiu do cache ou pousou antes do embarque:** o Sistema avisa e volta ao painel com a lista atualizada.

**Pós-condições:** sessão de voo criada com o voo, o tempo escolhido, o horário de pouso, o motivo da viagem e a configuração do serviço de bordo.

**Regras relacionadas:** RN-01, RN-02, RN-03, RN-12, RN-24. Requisitos: RF-09 a RF-16.

**Critérios de aceitação**

- [ ] O dial não permite menos de 15 min.
- [ ] Todo voo listado pousa a até 10 min do tempo escolhido, segundo a projeção.
- [ ] Nenhum voo é identificado por logo de companhia.
- [ ] Os avisos de pouso e de serviço de bordo ficam agendados antes de a tela em voo abrir.
- [ ] Nenhuma chamada ao provedor de voos é feita a partir do aparelho (só leitura do cache).

<a id="uc-03"></a>
### UC-03 — Embarcar pelo caminho rápido

- **Objetivo:** embarcar com o mínimo de passos.
- **Ator principal:** Viajante.
- **Pré-condições:** as mesmas de UC-02.
- **Gatilho:** no dial, depois de escolher o tempo, o Viajante toca em "Embarcar no voo mais próximo".

**Fluxo principal**

1. O Sistema escolhe, no cache, o voo elegível com pouso mais próximo do tempo escolhido, respeitando o filtro de região atual.
2. O Sistema abre direto a tela de embarque (UC-02, passos 7 a 9), sem painel e sem cartão.

**Fluxos alternativos**

- **A1 — Nenhum voo encaixa:** igual a UC-02 A2.
- **A2 — Cancelar embarque:** igual a UC-02 A5.

**Exceções e erros:** as mesmas de UC-02.

**Pós-condições:** sessão criada sem motivo da viagem.

**Regras relacionadas:** RN-02. Requisito: RF-14.

**Critérios de aceitação**

- [ ] Do dial à tela em voo, sem tocar em nada além de "Embarcar no voo mais próximo" (e a eventual animação pulável).
- [ ] O caminho rápido não existe no Início.

---

## Em voo

<a id="uc-04"></a>
### UC-04 — Focar durante o voo

- **Objetivo:** acompanhar o voo enquanto foca, com liberdade para sair do app.
- **Ator principal:** Viajante.
- **Pré-condições:** sessão em andamento (UC-02 ou UC-03).
- **Gatilho:** a tela em voo abre.

**Fluxo principal**

1. O Sistema mostra a mensagem de boas-vindas: pode sair do app à vontade; não ligar o modo avião.
2. O Sistema mostra o globo com a posição projetada, a rota, a altitude e o tempo restante, e a janela ao vivo.
3. O Sistema toca o som de fundo escolhido e os avisos de cada fase do voo.
4. O Viajante bloqueia a tela ou troca de app; o Sistema desmonta a janela e para os relógios; a notificação fixa mostra a contagem.
5. O Viajante volta ao app; o Sistema remonta a janela na posição certa para a hora atual.
6. No horário de pouso, segue UC-08.

**Fluxos alternativos**

- **A1 — Trocar a vista da janela:** o Viajante abre "Vista da janela" e escolhe uma vista disponível no seu plano.
- **A2 — Item exclusivo na econômica:** o Viajante toca numa vista, som ou outro recurso da primeira classe; o Sistema abre o paywall (UC-13). O voo segue no horário; ao fechar o paywall, o Viajante volta à tela em voo. Se assinar, o recurso é liberado na hora.
- **A3 — Trocar o modo de câmera do globo:** seguir o avião ou visão de cima.
- **A4 — Serviço de bordo:** no horário, segue UC-05.
- **A5 — Pousar antes:** segue UC-06.

**Exceções e erros**

- **E1 — Sem sinal do radar:** o Sistema estima a posição e mostra o estado E4; o foco continua.
- **E2 — Sem internet:** o foco continua; a posição é estimada.
- **E3 — Em espera:** o horário chegou e o avião real ainda está no ar. O pouso completo está garantido; o Sistema oferece "Continuar até o pouso" e "Pousar agora" (RN-09a). Se o Viajante continuar, os minutos a mais contam, e o voo encerra quando ele tocar em "Pousar agora" ou o avião pousar.
- **E5 — Em solo:** o avião real pousou antes do horário. A janela mostra o avião no solo e o foco segue até o horário; no horário, segue UC-08 (RN-09b).
- **E4 — App encerrado pelo sistema ou aparelho reiniciado:** ao reabrir, o Sistema recupera a sessão pelo relógio; se o horário de pouso já passou, conclui o pouso.

**Pós-condições:** sessão continua até o pouso ou o pouso antecipado.

**Regras relacionadas:** RN-03, RN-04, RN-09, RN-09a, RN-09b, RN-20, RN-22. Requisitos: RF-17 a RF-26.

**Critérios de aceitação**

- [ ] Sair do app, bloquear a tela ou usar outro app não muda nada na sessão.
- [ ] Em segundo plano, a janela não desenha e nenhum relógio JavaScript roda.
- [ ] Nenhum paywall abre sozinho durante a sessão; só ao toque num recurso da primeira classe.
- [ ] O som de fundo não corta com a tela bloqueada.

<a id="uc-05"></a>
### UC-05 — Fazer o serviço de bordo

- **Objetivo:** fazer uma pausa curta sem perder nada.
- **Ator principal:** Sistema (inicia) e Viajante.
- **Pré-condições:** sessão em andamento; serviço de bordo ligado; o voo comporta a pausa (RN-07).
- **Gatilho:** chega o horário agendado da pausa.

**Fluxo principal**

1. O Sistema toca o aviso sonoro e envia a notificação de início, mesmo com o app fechado.
2. O Sistema mostra o estado E2 com a contagem regressiva de até 5 min.
3. A contagem termina; o Sistema toca o aviso e envia a notificação de fim.
4. O Sistema mostra "De volta ao foco" (E1) com o horário do pouso.

**Fluxos alternativos**

- **A1 — Voltar antes:** o Viajante toca em "Voltar ao foco"; o Sistema encerra a pausa e cancela o aviso de fim dela.
- **A2 — Serviço de bordo desligado ou voo de até 30 min:** nenhuma pausa é agendada.

**Exceções e erros**

- **E1 — Alarme exato não permitido:** o Sistema avisa nos Ajustes que os avisos podem atrasar e oferece abrir "Alarmes e lembretes".

**Pós-condições:** pausa registrada na sessão; o horário de pouso não muda.

**Regras relacionadas:** RN-03, RN-05, RN-06, RN-07. Requisito: RF-21.

**Critérios de aceitação**

- [ ] Ciclo de 25 min: voo de 52 min tem 1 pausa; de 1h30, 2; de 3 h, 5.
- [ ] Nenhuma pausa passa de 5 min, no intervalo de 25 ou de 50 min.
- [ ] Nenhuma pausa termina a menos de 10 min do pouso.
- [ ] Minutos, milhas, carimbo e loja são iguais com ou sem pausas.

<a id="uc-06"></a>
### UC-06 — Pousar antes

- **Objetivo:** encerrar o voo antes do pouso, sem perder o tempo focado.
- **Ator principal:** Viajante.
- **Pré-condições:** sessão em andamento.
- **Gatilho:** o Viajante toca em "Pousar antes".

**Fluxo principal**

1. O Sistema mostra a confirmação (E3): o que entra (minutos de foco, milhas do trecho voado, $1 por minuto voado) e o que não entra (carimbo e loja do destino).
2. O Viajante confirma.
3. O Sistema encerra a sessão, cancela os avisos pendentes e remove a notificação fixa.
4. O Sistema credita minutos, milhas e dinheiro e mostra o estado E7 ("Pousou antes, sobre [lugar sobrevoado]").

**Fluxos alternativos**

- **A1 — Continuar voando:** o Viajante toca em "Continuar voando"; nada muda.

**Exceções e erros**

- **E1 — Lugar sobrevoado desconhecido:** o Sistema registra só as coordenadas e mostra "sobre o oceano" ou a região mais próxima.

**Pós-condições:** voo registrado no diário como "Pousou antes"; saldo, milhas e estatísticas atualizados.

**Regras relacionadas:** RN-10, RN-11. Requisito: RF-23.

**Critérios de aceitação**

- [ ] "Continuar voando" é o botão principal da confirmação.
- [ ] Os minutos focados até o toque entram nas estatísticas.
- [ ] Nenhuma opção de recuperar o voo é oferecida.

<a id="uc-07"></a>
### UC-07 — Usar o bloqueio de apps (deep flight)

> **Condicionado:** só existe se o recurso for aprovado num teste na Play Store (RN-23).

- **Objetivo:** bloquear distrações durante o voo, com apps permitidos.
- **Ator principal:** Viajante (primeira classe).
- **Pré-condições:** primeira classe ativa; permissão de "Acesso ao uso" concedida.
- **Gatilho:** o Viajante ativa o bloqueio antes ou durante o voo.

**Fluxo principal**

1. O Viajante escolhe os apps permitidos (lista sem limite).
2. Durante o voo, ao abrir um app não permitido, o Sistema mostra a tela de bloqueio com o tempo restante.
3. No pouso, o bloqueio termina sozinho.

**Fluxos alternativos**

- **A1 — Ajustar a lista durante o voo.**
- **A2 — Saída de emergência:** o Viajante desativa o bloqueio a qualquer momento; o voo continua normalmente.

**Exceções e erros**

- **E1 — Permissão revogada:** o bloqueio para e o Sistema avisa; o voo continua.

**Pós-condições:** nenhuma alteração nos rendimentos do voo.

**Regras relacionadas:** RN-04, RN-23. Requisito: RF-40.

**Critérios de aceitação**

- [ ] Sempre existe uma saída de emergência acessível em até dois toques.
- [ ] O recurso não usa o serviço de Acessibilidade nem QUERY_ALL_PACKAGES.

---

## Pouso e coleção

<a id="uc-08"></a>
### UC-08 — Pousar e comprar o souvenir

- **Objetivo:** concluir o voo, receber os rendimentos e comprar o souvenir do destino.
- **Ator principal:** Sistema (pouso) e Viajante (compra).
- **Pré-condições:** sessão em andamento.
- **Gatilho:** chega o horário de pouso fixado no embarque, com o avião real no ar ou não (RN-09); ou o Viajante encerra o estado Em espera.

**Fluxo principal**

1. O Sistema toca o aviso de pouso e envia a notificação, mesmo com o app fechado.
2. O Sistema conclui a sessão e credita: minutos do voo inteiro, milhas da distância real, carimbo do aeroporto de destino e $1 por minuto.
3. O Sistema mostra a tela de pouso (E6): carimbo, rendimentos, serviços de bordo e motivo da viagem com as tarefas.
4. O Viajante toca em "Abrir a loja".
5. O Sistema mostra o souvenir do país de destino, o preço e a prévia dentro da mala.
6. O Viajante compra; o Sistema debita o saldo e guarda o souvenir na mala.

**Fluxos alternativos**

- **A1 — Saldo insuficiente:** o Sistema mostra quanto falta; o Viajante sai da loja.
- **A2 — Souvenir já comprado:** o Sistema mostra "Já está na sua mala".
- **A3 — Econômica com 3 souvenirs (mala de amostra cheia):** o Sistema mostra o aviso e, se o Viajante quiser, o paywall (UC-13).
- **A4 — Sobe de nível:** segue UC-10.
- **A5 — Não comprar agora:** o Viajante volta ao Início.

**Exceções e erros**

- **E1 — Destino sem medalha na coleção:** **[Pendente]** comportamento (ver PRD, decisões em aberto).
- **E2 — O app estava fechado no horário:** ao reabrir, o Sistema mostra a tela de pouso com os mesmos rendimentos.

**Pós-condições:** voo registrado como "Pousou"; carimbo no passaporte; saldo e mala atualizados.

**Regras relacionadas:** RN-08, RN-09, RN-13, RN-14. Requisitos: RF-27 a RF-29.

**Critérios de aceitação**

- [ ] O dinheiro creditado é igual aos minutos do voo inteiro, pausas incluídas.
- [ ] O souvenir comprado não pode ser removido por nenhuma ação posterior (cancelamento, downgrade, reinstalação com backup).
- [ ] A loja só abre depois de um pouso completo.

<a id="uc-09"></a>
### UC-09 — Ver a mala e o souvenir

- **Objetivo:** ver a coleção e cada souvenir em detalhe.
- **Ator principal:** Viajante.
- **Pré-condições:** nenhuma.
- **Gatilho:** o Viajante toca no Termi no Início ou em "Sua mala" no menu.

**Fluxo principal**

1. O Sistema anima a mala abrindo e mostra os souvenirs organizados, os que faltam pontilhados, a barra de progresso e o saldo.
2. O Viajante toca num souvenir.
3. O Sistema abre a vitrine 3D com as informações do souvenir.
4. O Viajante gira o souvenir com o dedo; ao soltar, ele volta de frente.

**Fluxos alternativos**

- **A1 — Mala vazia:** estado vazio com convite ao primeiro voo.
- **A2 — Ver o carimbo:** o Viajante toca em "Ver o carimbo no passaporte".
- **A3 — Econômica:** o Sistema mostra o aviso discreto da mala de amostra e "Conhecer a primeira classe".

**Exceções e erros**

- **E1 — Modelo 3D não carrega:** o Sistema mostra a imagem 2D do souvenir.

**Pós-condições:** nenhuma.

**Regras relacionadas:** RN-14, RN-16. Requisitos: RF-06, RF-30, RF-31.

**Critérios de aceitação**

- [ ] Com "reduzir movimento", a mala abre sem a animação.
- [ ] Um país novo no catálogo aparece pontilhado na mala e atualiza o total da barra de progresso, sem afetar os souvenirs já comprados.
- [ ] A vitrine funciona sem conexão para os souvenirs já comprados.

<a id="uc-10"></a>
### UC-10 — Subir de nível de viajante

- **Objetivo:** reconhecer o progresso acumulado.
- **Ator principal:** Sistema.
- **Pré-condições:** as milhas acumuladas passam um limite de nível (RN-15).
- **Gatilho:** crédito de milhas num pouso ou pouso antecipado.

**Fluxo principal**

1. O Sistema detecta o novo nível.
2. O Sistema mostra o novo status, o adesivo colado no Termi e o carimbo de nível no passaporte.
3. No nível Nômade, o Sistema também entrega a medalha rara.

**Fluxos alternativos:** nenhum.

**Exceções e erros:** nenhum.

**Pós-condições:** nível, adesivo e carimbo registrados; visíveis no Início, em Sua mala e no Perfil.

**Regras relacionadas:** RN-15. Requisito: RF-33.

**Critérios de aceitação**

- [ ] As recompensas são iguais na econômica e na primeira classe.
- [ ] Nenhum nível credita dinheiro do jogo.

---

## Histórico

<a id="uc-11"></a>
### UC-11 — Consultar o diário de bordo

- **Objetivo:** rever os voos e o que foi feito em cada um.
- **Ator principal:** Viajante.
- **Pré-condições:** nenhuma.
- **Gatilho:** "Diário de bordo" no menu lateral.

**Fluxo principal**

1. O Sistema lista os voos agrupados por dia (cauda, rota, código, horário, categoria, tempo, resultado).
2. O Viajante filtra por categoria (opcional).
3. O Viajante abre um voo; o Sistema mostra horários, rendimentos, motivo da viagem com tarefas e serviços de bordo.

**Fluxos alternativos**

- **A1 — Diário vazio:** estado vazio com convite ao primeiro voo.

**Exceções e erros:** nenhum.

**Pós-condições:** nenhuma.

**Regras relacionadas:** RN-10. Requisito: RF-34.

**Critérios de aceitação**

- [ ] "Pousou antes" aparece em cor neutra, sem linguagem de fracasso.
- [ ] O motivo da viagem anotado no embarque aparece no detalhe.

<a id="uc-12"></a>
### UC-12 — Consultar estatísticas

- **Objetivo:** ver a evolução do foco.
- **Ator principal:** Viajante.
- **Pré-condições:** nenhuma.
- **Gatilho:** "Estatísticas" no menu lateral.

**Fluxo principal**

1. O Sistema mostra a semana: total com comparação, foco por dia e por categoria, voos, pousos, pousos antecipados, serviços de bordo, sequência e recorde.
2. Na primeira classe, o Viajante alterna para mês e ano.

**Fluxos alternativos**

- **A1 — Econômica toca em mês ou ano:** o Sistema abre o paywall (UC-13).

**Exceções e erros:** nenhum.

**Pós-condições:** nenhuma.

**Regras relacionadas:** RN-03. Requisito: RF-35.

**Critérios de aceitação**

- [ ] As pausas não descontam minutos.
- [ ] Os minutos de "Pousou antes" entram no total.

---

## Monetização

<a id="uc-13"></a>
### UC-13 — Assinar a primeira classe

- **Objetivo:** assinar ou comprar o vitalício.
- **Ator principal:** Viajante (econômica).
- **Pré-condições:** conexão com a loja. Pode acontecer dentro ou fora de um voo; em voo, o voo segue no horário.
- **Gatilho:** um dos pontos de entrada da RN-20.

**Fluxo principal**

1. O Sistema mostra o paywall: carrossel de benefícios e os três planos, com o anual selecionado.
2. O Viajante escolhe o plano; o Sistema atualiza o botão e as condições (período grátis e data do aviso no anual; renovação no mensal; pagamento único no vitalício).
3. O Viajante confirma; a Loja de apps processa o pagamento.
4. O Sistema mostra a compra concluída (P4) com o selo "Primeira classe ativa" e a data do lembrete antes da cobrança.
5. O Sistema libera os recursos da primeira classe.

**Fluxos alternativos**

- **A1 — Variante boas-vindas:** no fim do onboarding e depois do 3º voo, o anual mostra R$ 59,90 no 1º ano, com o preço cheio riscado e "−33%".
- **A2 — Continuar na econômica:** o Sistema fecha o paywall sem perda.
- **A3 — Restaurar compras:** o Sistema consulta a loja e reativa a primeira classe se houver compra.

**Exceções e erros**

- **E1 — Pagamento recusado ou cancelado:** o Sistema volta ao paywall, com os mesmos preços.
- **E2 — Loja indisponível:** o Sistema avisa e mantém a econômica.

**Pós-condições:** direito "primeira classe" ativo e registrado.

**Regras relacionadas:** RN-18 a RN-21. Requisitos: RF-36, RF-37, RF-39.

**Critérios de aceitação**

- [ ] Preço, período grátis e data do lembrete visíveis antes do botão.
- [ ] Única etiqueta de destaque: "Economize 50%" no anual.
- [ ] O slide do bloqueio de apps só aparece se o recurso estiver aprovado.

<a id="uc-14"></a>
### UC-14 — Gerenciar a assinatura

- **Objetivo:** ver o plano, restaurar, gerenciar ou cancelar.
- **Ator principal:** Viajante (primeira classe).
- **Pré-condições:** primeira classe ativa ou compra anterior.
- **Gatilho:** "Primeira classe" no menu (abre P5 para quem assina).

**Fluxo principal**

1. O Sistema mostra o plano atual, a próxima cobrança, o lembrete antes da cobrança, "Gerenciar no Google Play", "Restaurar compras" e "Cancelar".
2. O Viajante cancela em dois toques (via loja).
3. O Sistema mantém a primeira classe até o fim do período pago.

**Fluxos alternativos**

- **A1 — Vitalício:** sem cobrança nem cancelamento; mostra "Compra única".

**Exceções e erros**

- **E1 — Assinatura expirada:** o Sistema volta à econômica; souvenirs, carimbos, milhas e histórico continuam.

**Pós-condições:** direito atualizado conforme a loja.

**Regras relacionadas:** RN-21; princípio "nunca tirar o que foi conquistado". Requisito: RF-38.

**Critérios de aceitação**

- [ ] Ao expirar, nenhum souvenir comprado sai da mala.
- [ ] Estatísticas antigas de mês e ano continuam guardadas (só a visualização volta a exigir a primeira classe).

---

## Conta e dados

<a id="uc-15"></a>
### UC-15 — Criar conta e sincronizar

> Provedor: **Supabase** (ADR-10). Método de entrada (Google; Apple no iOS) ainda é proposta.

- **Objetivo:** proteger o progresso e usá-lo em outro aparelho.
- **Ator principal:** Viajante.
- **Pré-condições:** conexão com a internet.
- **Gatilho:** "Criar conta para sincronizar" no Perfil.

**Fluxo principal**

1. O Viajante escolhe o método de entrada.
2. O Sistema cria a conta e envia o progresso local.
3. O Sistema confirma a sincronização.

**Fluxos alternativos**

- **A1 — Entrar num aparelho novo:** o Sistema baixa o progresso e o combina com o local sem perder nada.

**Exceções e erros**

- **E1 — Falha de rede:** o progresso continua local; o Sistema tenta de novo depois.
- **E2 — Conflito entre aparelhos:** o Sistema une os registros (voos, souvenirs, carimbos) em vez de sobrescrever.

**Pós-condições:** progresso salvo no servidor.

**Regras relacionadas:** princípio 1 e 2 do PRD. Requisitos: RF-42, RF-43.

**Critérios de aceitação**

- [ ] A conta nunca é exigida para usar o app.
- [ ] Nenhuma sincronização apaga voos, carimbos ou souvenirs.

<a id="uc-16"></a>
### UC-16 — Exportar ou apagar dados

- **Objetivo:** controlar os próprios dados (LGPD).
- **Ator principal:** Viajante.
- **Pré-condições:** nenhuma.
- **Gatilho:** Ajustes > Privacidade.

**Fluxo principal**

1. O Viajante toca em "Exportar dados"; o Sistema gera um arquivo com voos, motivos, carimbos, souvenirs e estatísticas e abre o compartilhamento.
2. Ou o Viajante toca em "Apagar dados"; o Sistema explica o que será apagado (incluindo a conta, se houver) e pede confirmação.
3. O Sistema apaga os dados locais e no servidor.

**Fluxos alternativos**

- **A1 — Assinatura ativa:** o Sistema avisa que apagar os dados não cancela a assinatura na loja.

**Exceções e erros**

- **E1 — Falha ao apagar no servidor:** o Sistema avisa e tenta de novo.

**Pós-condições:** dados exportados ou apagados.

**Requisito:** RF-45.

**Critérios de aceitação**

- [ ] Apagar exige confirmação explícita.
- [ ] O arquivo exportado é legível (ex.: JSON ou CSV).

---

## Sistema

<a id="uc-s1"></a>
### UC-S1 — Atualizar o cache de voos

- **Objetivo:** manter uma lista de voos atual para todos os usuários sem consultas por usuário.
- **Ator principal:** Coletor de voos.
- **Pré-condições:** chave do provedor válida; armazenamento de destino disponível.
- **Gatilho:** agendamento a cada 10 a 20 min.

**Fluxo principal**

1. O Coletor consulta as regiões no provedor de voos (adsb.lol), em rodízio.
2. O Coletor cruza as posições com a base de rotas, descarta rotas incoerentes e calcula a previsão de pouso.
3. O Coletor grava um JSON por região no armazenamento público (Cloudflare R2, atrás da CDN).

**Fluxos alternativos**

- **A1 — Uma região falha:** o Coletor mantém o arquivo anterior daquela região, com o horário da coleta.

**Exceções e erros**

- **E1 — Provedor fora do ar ou cota esgotada:** o app detecta o cache velho e oferece o voo de ontem (RN-12).

**Pós-condições:** arquivos por região atualizados com carimbo de horário.

**Regras relacionadas:** RN-02, RN-12. Requisito: RNF-09.

**Critérios de aceitação**

- [ ] O número de chamadas ao provedor por dia não depende do número de usuários e fica abaixo da cota.
- [ ] Cada arquivo traz o horário da coleta, para o app calcular a idade dos dados.
