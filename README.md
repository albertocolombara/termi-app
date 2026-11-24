# Termi: Focus Flights

> Nome provisório. **Termi** é a mala-personagem do app (de "terminal").

App de foco em que **cada sessão é um voo real que está acontecendo agora**. Você escolhe quanto tempo quer focar, embarca num avião que está no ar e pousa nesse tempo, e foca até o pouso, com pausas no serviço de bordo (Pomodoro).

**Status:** Fase 1 (fundação técnica) em andamento. A base técnica é o protótipo [`albertocolombara/termi-prototipo`](https://github.com/albertocolombara/termi-prototipo), que validou no Android a janela, os avisos, o desempenho e a bateria. As regras de produto vêm do [PRD.md](PRD.md).

---

## Problema

Os apps de foco tratam a sessão como decoração arbitrária, punem quem sai do app (os minutos se perdem), vendem recuperação de sessão, mostram ofertas durante o foco e falham em avisar o fim. Quem estuda muitas horas por dia, muitas vezes no celular, fica sem uma ferramenta que respeite isso.

## Proposta de valor

- **Voo real e ao vivo**, sem aeroporto de partida para configurar.
- **Céu real** pela posição e pela hora do voo, visto da janela do passageiro.
- **Sons por fase do voo** (avisos do comandante, serviço de bordo, descida, pouso).
- **Pausa sem perda** e **liberdade para sair do app**: o tempo focado nunca se perde.
- **Coleção ligada a lugares reais:** o souvenir é comprado ao pousar no país.
- **Sem anúncios.** Monetização só por assinatura e plano vitalício.

## Público-alvo

No Brasil: vestibulandos, concurseiros e universitários que estudam muitas horas por dia. Na expansão: o público do "study with me".

## Principais funcionalidades (v1)

| Área | Funcionalidades |
|---|---|
| Embarque | Dial de 15 min a 6 h, painel de partidas com voos ao vivo, filtros de região, cartão de embarque com motivo da viagem, caminho rápido |
| Em voo | Globo, janela ao vivo (5 vistas), sons por fase, serviço de bordo, notificação fixa, "Pousar antes" |
| Pouso e coleção | Carimbo no passaporte, milhas, dinheiro do jogo, loja do destino, mala com souvenirs 3D (13 países no início, com novos em breve), status de viajante |
| Histórico | Diário de bordo e estatísticas |
| Monetização | Econômica (grátis) e primeira classe: mensal, anual e vitalício |

Escopo completo e regras: [PRD.md](PRD.md).

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| App | React Native + Expo SDK 58 (development build), TypeScript |
| Janela | @shopify/react-native-skia (shader SkSL) + renders do Blender |
| Animações | Reanimated 4, Rive (Termi) |
| Avisos | expo-notifications com alarme exato; módulo Kotlin para a notificação fixa |
| Assinaturas | RevenueCat (Google Play Billing) |
| Dados de voo | Cache próprio por região (coletor + adsb.lol), servido pelo Cloudflare R2 |
| Paisagem | Blocos Sentinel-2 (ESA WorldCover 2021) e NASA GIBS (Blue/Black Marble) no Cloudflare R2 |

Itens ainda marcados como proposta (Sentry, Maestro, EAS, entre outros) e as pendências estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## Estrutura de diretórios

Estrutura do código (as pastas `features/` e as telas do produto entram a partir da Fase 3):

```text
termi-app/
├── assets/          # fontes, renders da janela, ícones (blocos de teste baixados por script)
├── modules/         # código nativo (Kotlin/Swift) via Expo Modules: screen-state (notificação fixa)
├── scripts/         # baixar-blocos-dev.mjs
└── src/
    ├── app/         # rotas (Expo Router)
    ├── features/    # telas e lógica por domínio
    ├── domain/      # regras de negócio puras (testadas)
    ├── data/        # SQLite, repositórios, cliente do cache de voos
    ├── services/    # avisos, áudio, compras, bloqueio
    ├── janela/      # janela ao vivo (Skia)
    ├── ds/          # design system
    ├── config/      # variáveis de ambiente públicas
    └── i18n/
```

Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md#4-estrutura-de-diretórios-proposta).

## Requisitos para execução

- Node.js 22 (o mesmo do CI)
- Para builds locais: Java 17 (Temurin) e Android SDK
- Um aparelho Android físico (a janela, os avisos e a bateria precisam ser testados no aparelho)

## Instalação e configuração

```bash
npm ci                    # instala e baixa os blocos de teste da janela (rota Barcelona → Londres)
cp .env.example .env      # preencha os valores (opcional na Fase 1)
npx expo run:android      # gera o projeto nativo e instala o development build no aparelho
```

`android/` e `ios/` são gerados e não devem ser versionados nem editados à mão.

**APK de teste sem ambiente local:** em GitHub → Actions → "APK Android" → "Run workflow". O APK sai em Releases. O workflow também roda a cada junção na `main`. Como o repositório é privado, cada build gasta minutos do plano (2.000/mês no grátis); a checagem de tipos, lint e testes roda a cada push e é rápida.

**Ferramentas de desenvolvimento** (só fora de produção, no Início): catálogo do design system, janela de teste e teste de avisos e notificação fixa.

## Variáveis de ambiente

Veja [.env.example](.env.example). Resumo:

| Variável | Pública? | Uso |
|---|---|---|
| `APP_ENV` | — | `development`, `preview` ou `production` |
| `EXPO_PUBLIC_FLIGHT_CACHE_URL` | Sim | Base dos arquivos de voos por região |
| `EXPO_PUBLIC_TILES_BASE_URL` | Sim | Base dos blocos da paisagem |
| `EXPO_PUBLIC_ASSETS_BASE_URL` | Sim | Renders, sons e modelos 3D |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Sim (chave pública do SDK) | Compras no Android |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` | Sim (chave publicável) | Conta e sincronização |

Nenhum segredo vai para o app. A chave do adsb.lol e as credenciais de escrita do R2 ficam só no coletor de voos.

## Comandos

| Comando | O que faz |
|---|---|
| `npx expo start` | Servidor de desenvolvimento |
| `npm run android` | Build e instalação de desenvolvimento no Android |
| `npx expo install <pacote>` | Instala dependência na versão compatível com o SDK (use `EXPO_OFFLINE=1` se a rede bloquear api.expo.dev) |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | Lint |
| `npm test` | Testes unitários (Jest) |
| `npm run blocos:dev` | Baixa de novo os blocos de teste da janela |
| `npx expo-doctor` | Diagnóstico de dependências |

## Documentação

| Documento | Conteúdo |
|---|---|
| [PRD.md](PRD.md) | Produto: problema, público, requisitos, regras de negócio, MVP, métricas |
| [CASOS_DE_USO.md](CASOS_DE_USO.md) | Interações usuário–sistema com fluxos, exceções e critérios de aceitação |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitetura, modelo de dados, integrações, riscos e decisões |
| [DESIGN.md](DESIGN.md) | Design system, tokens, componentes, acessibilidade, animações |
| [CLAUDE.md](CLAUDE.md) | Instruções para agentes de IA que trabalham no repositório |
| [ROADMAP.md](ROADMAP.md) | Fases de desenvolvimento com checklists |

Referências externas: Figma "Termi: Focus Flights" (https://www.figma.com/design/JfjmulB7Itgc59PGQBJvr5) e os docs do projeto no Claude ("visao-do-produto.md", "prototipo-tecnico.md", "infra-e-politicas.md", "validacao-dados-voos.md").

## Créditos de dados

Dados de voo: [adsb.lol](https://adsb.lol) (ODbL). Imagens da Terra: NASA GIBS (Blue Marble, Black Marble, VIIRS, mapa de terra e água do OpenStreetMap, ODbL) e ESA WorldCover 2021 (© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium, CC BY 4.0). Lugares: GeoNames. O uso de dados da NASA não implica apoio da NASA. As companhias aéreas aparecem só pela bandeira do país e não têm relação com o app.
