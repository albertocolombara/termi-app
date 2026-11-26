# CLAUDE.md — Instruções para agentes

Você está no repositório do app de produção **Termi: Focus Flights**: um app de foco em que cada sessão é um voo real ao vivo. React Native + Expo, Android primeiro.

O dono do produto (Alberto) é designer e front-end, não dev mobile: o código é escrito principalmente por agentes. Escreva código que ele consiga ler e revisar, e explique decisões em português.

## 1. Leia antes de mexer

| Antes de… | Leia |
|---|---|
| Qualquer tarefa | Este arquivo e [README.md](README.md) |
| Implementar funcionalidade | [PRD.md](PRD.md) (requisitos `RF`, regras `RN`) e o caso de uso em [CASOS_DE_USO.md](CASOS_DE_USO.md) |
| Criar módulo, dependência, dado ou integração | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Fazer tela ou componente | [DESIGN.md](DESIGN.md) e o Figma (arquivo "Termi: Focus Flights", página Design; use o MCP do Figma se disponível) |
| Escolher o que fazer | [ROADMAP.md](ROADMAP.md) |
| Mexer na janela, no design system em código ou no módulo nativo | Protótipo `albertocolombara/termi-prototipo` (`src/janela`, `assets/janela`, branch `design-system` para `src/ds`, `modules/screen-state`) e ARCHITECTURE.md §18–19 |

Se um documento contradiz outro, **pare e pergunte**. Não escolha sozinho.

## 2. Princípios de produto que o código nunca pode violar

1. **O tempo focado nunca se perde.** Nenhum caminho (pousar antes, app fechado, reinício, erro, sem rede) apaga minutos, milhas, carimbos, saldo ou souvenirs.
2. **Nunca tirar o que foi conquistado.** Um souvenir comprado continua na mala mesmo se a assinatura acabar.
3. **Sem anúncios** e **nenhuma oferta que o usuário não pediu durante o voo.** Na econômica, tocar em qualquer recurso da primeira classe abre o paywall, a qualquer momento, inclusive em voo (RN-20). Exceção: no dial, a faixa acima de 3 h só aparece como primeira classe, sem abrir o paywall.
4. **Sair do app não tem consequência.** Não existe turbulência nem detecção de saída.
5. **Nunca recuperar voo** pagando ou de outra forma.
6. **Honestidade comercial:** preço, período grátis e data do lembrete visíveis antes do botão; sem contador de urgência; sem selo sem dado real.
7. **Companhias só pela bandeira do país.** Nunca logo ou pintura real desenhados pelo app. Exceção em teste (Alberto, 26/11/2026): a foto do avião real do Planespotters.net em "Sobre este voo", grátis para todos, com o crédito do fotógrafo e o link para a foto, seguindo os termos da API (sem cache em disco, sem servidor intermediário). Se não melhorar a imersão, sai.
8. **Conta nunca obrigatória.**

## 3. Stack e convenções técnicas

- **O protótipo é a base técnica.** Reaproveite a janela, o design system, o módulo nativo e o pipeline de recursos. **As regras de produto vêm do PRD:** onde o protótipo diverge (ex.: botão "Desembarcar", pausa de 10 min), siga o PRD e ajuste o código.
- **Expo SDK 58**, React Native 0.88, React 19.3, TypeScript ~6.0 (versões validadas no protótipo). Development build (sem Expo Go).
- **O Expo muda a cada SDK. Não confie na memória.** Antes de usar uma API do Expo, EAS ou RN:
  1. Confira a versão de `expo` no `package.json`.
  2. Leia a documentação da versão: `https://docs.expo.dev/versions/v<major>.0.0/`.
  3. Use https://docs.expo.dev/llms.txt como índice.
- Instale dependências **sempre** com `npx expo install <pacote>` (nunca `npm install` direto para pacotes de runtime).
- `android/` e `ios/` são gerados (Continuous Native Generation). **Nunca edite à mão.** Configure em `app.json`/`app.config.ts` e config plugins.
- Código nativo só em `modules/*` (Expo Modules API, Kotlin e Swift), acessado por `src/services`.
- **Expo Router, expo-sqlite, Zustand e TanStack Query** estão aprovados. Itens ainda marcados como **[Proposta]** na arquitetura (ex.: Sentry, Maestro) só viram padrão depois de aprovados. Ao iniciar uma fase que depende deles, confirme com o Alberto.

## 4. Organização do código

```text
src/app/        rotas (Expo Router) — só composição, sem lógica
src/features/   telas, componentes e hooks por domínio
src/domain/     regras de negócio puras (sem React, sem E/S) + testes
src/data/       SQLite, repositórios, cliente do cache de voos e blocos
src/services/   avisos, áudio, compras, bloqueio, ponte com módulos nativos
src/janela/     janela ao vivo (Skia/SkSL)
src/ds/         design system (espelho do Figma)
src/i18n/       textos
modules/        código nativo
```

Regras de dependência: `domain` não importa nada de UI ou E/S; `ds` não conhece regras de negócio; `app` não tem lógica.

## 5. Padrões de nomenclatura

- **Domínio e telas em português sem acentos**, com os termos do produto: `sessao`, `pousarAntes`, `servicoDeBordo`, `mala`, `passaporte`, `diarioDeBordo`. Isso mantém o código igual ao vocabulário do PRD.
- **Componentes do design system com os nomes do Figma** (`Button`, `Chip`, `ListOption`, `FirstClassSeal` para "Selo · Primeira classe"), como já está no protótipo.
- **Tokens** com os nomes do Figma: `color.accent.default`, `typography['Body/Large 16']`.
- Arquivos de componente em `PascalCase.tsx`; hooks `useAlgo.ts`; funções e variáveis `camelCase`; constantes `UPPER_SNAKE_CASE`; pastas em `kebab-case`.
- Rotas em português (`/voo/partidas`, `/mala`, `/primeira-classe`).
- Textos de interface nunca fixos no componente: sempre em `src/i18n` (pt-BR primeiro).
- Terminologia de interface fixa: Econômica / Plus (a assinatura; antes "Primeira classe" e "Termi Premium", renomeada pelo Alberto no Figma v3 em 24/11/2026; no código os nomes internos `primeira`, `primeiraClasse` continuam), Novo voo, Partidas, Cartão de embarque, Serviço de bordo, Pousar antes / Pousou antes, Sua mala, Passaporte, Diário de bordo. Nunca "Desembarcar" nem "desistir".

## 6. Implementando funcionalidades

1. Identifique os `RF`, `RN` e `UC` envolvidos e cite-os no PR.
2. Regras de negócio vão para `src/domain` como funções puras, **com testes antes da tela**. Exemplos obrigatórios: tempo mínimo de 15 min; pausa de no máximo 5 min em qualquer intervalo; pausas da RN-07 (52 min → 1; 1h30 → 2; 3 h → 5); rendimentos de pouso e de pouso antecipado; elegibilidade (±10 min); níveis.
3. **A coleção cresce.** Hoje são 13 países e outros entram em pouco tempo. Nunca fixe o total no código ou nos textos; leia do catálogo.
4. A sessão é guiada pelo relógio (`embarcouEm`, `pousoPrevistoEm`). Nada de timers em segundo plano para manter o estado.
5. Escritas que creditam algo (voo + carimbo + lançamento de saldo) acontecem numa única transação.
6. Registros conquistados são só acrescentados; nada de `DELETE` fora do fluxo "Apagar dados" pedido pelo usuário.
7. Implemente todos os estados da tela: carregando, vazio, erro, sem rede, e os estados de voo E1–E8 quando aplicável.
8. Recursos premium checam o direito do RevenueCat num único lugar (`services/compras`), nunca espalhado.
9. Bloqueio de apps só entra quando o ROADMAP indicar que a Play aprovou o teste.

## 7. Alterações na arquitetura

- Não troque tecnologia decidida (Expo, Skia, Rive, RevenueCat, alarme exato, cache compartilhado) sem uma ADR nova em ARCHITECTURE.md e aprovação.
- **Nunca** adicione consulta ao provedor de voos a partir do aparelho. O app só lê o cache.
- Nova dependência nativa: justifique (peso no APK, memória, manutenção) e prefira módulos do Expo.
- Mudou uma decisão? Atualize o documento correspondente no mesmo PR.

## 8. Segurança e dados

- Nenhum segredo no app. Tudo que é `EXPO_PUBLIC_*` vai embutido e é público.
- Nunca commite `.env`, chaves ou credenciais. Use `.env.example` com placeholders.
- Sem SDK de anúncios ou rastreamento publicitário.
- Localização: só aproximada, opcional, usada no aparelho.
- Logs e relatórios de erro sem dados pessoais (motivo da viagem e tarefas não vão para logs).
- Permissões Android: só as listadas em ARCHITECTURE.md §10. **Proibido:** serviço de Acessibilidade para bloqueio e `QUERY_ALL_PACKAGES`.

## 9. UX/UI

- Use **só tokens semânticos** de `src/ds` (`color.*`, `space`, `radius`, `typography`). Nada de hex solto.
- Um botão principal (amarelo) por tela, só onde há próxima ação clara. "Pousar antes" é secundário.
- "Pousou antes" em cor neutra.
- Respeite "reduzir movimento": animações do Termi, beacon da asa, carrossel e transições longas param.
- Animações de ritual (comemoração, esteira) sempre puláveis.
- Rótulos de acessibilidade em botões de ícone e no Termi; área de toque de 48 dp.
- Componente novo: confira se existe no Figma; se não existir, pergunte antes de inventar.

## 10. Performance (lições medidas)

- Memória de textura da janela **abaixo de ~150 MB** (acima de 256 MB o Skia trava).
- Janela a 10 fps por padrão, 2 fps em economia; em segundo plano, desmontada.
- Blocos de paisagem baixados no embarque, nunca embutidos no APK de produção.
- Meça no aparelho (Samsung M35 e um Android mais fraco) antes de dar por pronto qualquer coisa da janela.

## 11. Testes e validação

Antes de declarar uma tarefa pronta:

```bash
npx tsc --noEmit
npx expo lint
npm test
```

- `src/domain` com testes unitários para toda regra nova ou alterada.
- Mudança em avisos, sessão ou janela: teste no aparelho (tela bloqueada, app fechado, Android 14+) e descreva o resultado no PR.
- Não diga que testou no aparelho se não testou. Diga o que falta testar.

## 12. Dependências

- `npx expo install` para instalar; `npx expo install --fix` e `npx expo-doctor` para corrigir versões.
- Não adicione bibliotecas para algo que o Expo ou o código existente já fazem.
- Registre no PR o motivo de cada dependência nova.

## 13. Git

- Branch padrão: `main`. Trabalhe em branches `tipo/descricao-curta` (`feat/dial`, `fix/aviso-pouso`, `docs/prd`).
- Commits em português, no imperativo, curtos e específicos ("Agenda avisos do serviço de bordo como alarme exato").
- Um assunto por PR, com: o que mudou, `RF`/`RN`/`UC` relacionados, como foi testado, o que falta.
- Push de branch e merge do próprio PR são permitidos com a checagem verde (decidido pelo Alberto em 19/11/2026). PRs que mudam regra de produto ou arquitetura esperam a revisão do Alberto, salvo quando só registram uma decisão dele.
- Nunca force push na `main`.
- Nunca commite `android/`, `ios/`, `.env`, builds ou blocos de paisagem.

## 14. Proibido

- Anúncios; paywall, banner ou lembrete de assinatura que abre sozinho durante o voo; contador de urgência; selos sem dado real.
- Penalizar saída do app; turbulência; recuperação de voo.
- Logos ou pinturas de companhias aéreas desenhados pelo app (a foto creditada do Planespotters é a exceção em teste, regra 7); logo da NASA ou sugestão de apoio da NASA.
- Consulta por usuário ao adsb.lol; segredos no app.
- Editar `android/` ou `ios/` à mão.
- Fixar o número de países da coleção.
- Apagar ou reduzir progresso conquistado por regra de negócio.
- Marcar tarefa do ROADMAP como concluída sem evidência (código mergeado, teste ou medição).
- Apresentar como decidido o que está marcado como [Proposta] ou [Pendente].

## 15. Quando uma tarefa está concluída

- [ ] Atende aos `RF`/`RN` e aos critérios de aceitação do `UC` correspondente.
- [ ] Tipos, lint e testes passando.
- [ ] Estados de carregamento, vazio e erro implementados.
- [ ] Visual conferido com o Figma; só tokens semânticos.
- [ ] Acessibilidade básica (rótulos, reduzir movimento, área de toque).
- [ ] Testado no aparelho quando envolve sessão, avisos, áudio, janela ou bateria.
- [ ] Documentos atualizados se alguma decisão mudou; ROADMAP marcado com evidência.
