# Arquitetura técnica — Termi: Focus Flights

> Arquitetura do app de produção (`termi-app`) e dos serviços de que ele depende.
> Base: protótipo técnico validado no Android (`albertocolombara/termi-prototipo`, build-8) e os docs do projeto "visao-do-produto.md", "prototipo-tecnico.md", "infra-e-politicas.md" e "validacao-dados-voos.md".
> **O protótipo é a base técnica:** janela, design system em código, módulo nativo, pipeline de recursos da janela e medições de desempenho são reaproveitados. **As regras de produto vêm do PRD:** onde o protótipo diverge (ex.: "Desembarcar", pausa de 10 min no ciclo de 50), ele é ajustado, e isso não conta como inconsistência.
> Última atualização: 19/11/2026.

Status das decisões: **[Decidido]** (tomada e validada), **[Proposta]** (recomendação pendente de validação), **[Pendente]** (em aberto).

---

## 1. Visão geral

O Termi é um app **local-first**: a sessão de foco roda inteira no aparelho, guiada pelo relógio, e funciona sem conexão depois do embarque. O servidor só publica arquivos estáticos (lista de voos por região e blocos de paisagem) e não sabe quem é o usuário. Compras passam pela loja via RevenueCat.

```mermaid
flowchart LR
  subgraph Externos
    ADSB[adsb.lol<br/>posições ao vivo]
    VRS[VRS Standing Data<br/>rotas, companhias, aeroportos]
    GIBS[NASA GIBS<br/>Blue/Black Marble, VIIRS, OSM Land/Water<br/>+ ESA WorldCover Sentinel-2]
    GEO[GeoNames<br/>lugares]
  end

  subgraph Servidor["Serviços próprios (fora deste repositório)"]
    COL[Coletor de voos<br/>a cada 10–20 min]
    TILEGEN[Gerador de blocos<br/>trabalho único]
  end

  subgraph CDN["Cloudflare R2 + CDN"]
    FJSON[(voos/região.json)]
    TILES[(blocos da paisagem)]
    ASSETS[(renders, sons, modelos 3D)]
  end

  subgraph App["termi-app (Expo / React Native)"]
    UI[Telas e design system]
    DOM[Domínio<br/>regras puras]
    DATA[Dados<br/>SQLite local, cache]
    WIN[Janela<br/>Skia + SkSL]
    NAT[Módulos nativos<br/>notificação fixa, alarmes]
  end

  RC[RevenueCat + Google Play Billing]
  SYNC[Backup / sincronização<br/>Pendente]

  ADSB --> COL
  VRS --> COL
  COL --> FJSON
  GIBS --> TILEGEN --> TILES
  GEO --> TILEGEN
  FJSON --> DATA
  TILES --> WIN
  ASSETS --> UI
  UI --> DOM --> DATA
  UI --> WIN
  DOM --> NAT
  UI --> RC
  DATA -.-> SYNC
```

**Escopo deste repositório [Proposta]:** só o app móvel. O coletor de voos e o gerador de blocos ficam em repositórios próprios (hoje o coletor de teste está em `albertocolombara/voo-ao-vivo-teste`). O contrato entre eles é o formato dos arquivos publicados (seção 9).

## 2. Stack tecnológica

| Camada | Tecnologia | Status | Responsabilidade |
|---|---|---|---|
| Framework | **React Native + Expo SDK 58** (development build, sem Expo Go) | [Decidido] | Base única Android e iOS |
| Linguagem | **TypeScript** (~6.0) | [Decidido] | Tipagem do app inteiro |
| React / RN | React 19.3, React Native 0.88, Reanimated 4.7, Skia 2.14 | [Decidido] (versões validadas no protótipo) | — |
| Janela | **@shopify/react-native-skia** (shader SkSL) | [Decidido] | Céu, terra, nuvens, asa e moldura |
| Animação de UI | **react-native-reanimated** 4 + worklets | [Decidido] | Animações e, a seguir, o ritmo da janela na thread de interface |
| Mascote | **Rive** (`.riv`, view model "Termi") | [Decidido] | Animações do Termi |
| Souvenirs 3D | **react-native-filament** | [Proposta] | Vitrine 3D com gesto de girar |
| Avisos | **expo-notifications** com gatilho de alarme exato (`setAlarmClock`) | [Decidido] | Pouso, início e fim do serviço de bordo. O serviço de bordo toca o sinal de apertar cintos (`assets/sons/aviso_cinto.ogg`, canal `servico-alarme`; com o sinal desligado nos Ajustes, canal `servico-sem-som`). Pouso e serviço de bordo tocam no volume de alarme (uso ALARM), mesmo com o celular no silencioso; o "Não perturbe" continua valendo. O Android abaixa o som de fundo enquanto o sinal toca |
| Sons de fundo | Serviço nativo próprio (`FlightSoundService`, ExoPlayer) no Android; **expo-audio** no iOS. Loops AAC em `assets/sons`; lofi em streaming do R2 | [Decidido] (20/11/2026) | Voo de cruzeiro e ruído branco (grátis); motores, cabine, chuva e lofi (primeira classe). Seção 10 |
| Notificação fixa | Módulo nativo próprio em Kotlin (`modules/screen-state`, Expo Modules API, do protótipo) | [Decidido] | Contagem regressiva até o pouso |
| Live Activity (iOS) | expo-widgets ou módulo Swift | [Proposta] | Fase iOS |
| Assinaturas | **RevenueCat** (Google Play Billing) | [Decidido] | Planos, vitalício, restauração, testes de preço |
| Navegação | **Expo Router** (rotas em `src/app/`) | [Decidido] | Navegação por arquivos, recomendada pelo Expo |
| Persistência local | **expo-sqlite** | [Decidido] | Voos, carimbos, mala, livro-caixa do saldo |
| Preferências | `expo-sqlite/kv-store` (vem com o expo-sqlite, sem dependência nova; em uso desde 20/11/2026 para vista da janela, som e classe de teste). AsyncStorage e MMKV ficam descartados se o Alberto aprovar | [Proposta] | Ajustes simples |
| Estado de UI | **Zustand** | [Decidido] | Sessão ativa e estado global leve |
| Dados remotos | **TanStack Query** | [Decidido] | Cache, idade e retentativa dos JSON de voos |
| Mapa/globo | Globo em Skia (SkSL) com blocos da NASA GIBS | [Decidido] | Ver ADR-11 e `src/globo` |
| Fontes | expo-font (Geist 400/500/600, Geist Pixel Grid) | [Decidido] | Tipografia do design system |
| Desfoque | expo-blur | [Proposta] | Efeito "Glass/Blur 12" |
| i18n | expo-localization + biblioteca de mensagens | [Proposta] | pt-BR no lançamento, en depois |
| Testes | Jest (jest-expo) + React Native Testing Library; Maestro para E2E | [Proposta] | Seção 14 |
| Erros em produção | Sentry | [Proposta] | Seção 14 |
| Build e distribuição | Repositório `albertocolombara/termi-app` no GitHub, com GitHub Actions gerando APK a cada push (como no protótipo); envio à Play a definir (EAS Submit ou manual) | [Decidido] / [Pendente] | Seção 15 |

Qualquer dependência nova passa pelas regras do [CLAUDE.md](CLAUDE.md) (instalar com `npx expo install`).

## 3. Organização em camadas

```mermaid
flowchart TB
  APP["src/app — rotas (Expo Router)"] --> FEAT["src/features — telas e lógica de cada domínio"]
  FEAT --> DS["src/ds — design system"]
  FEAT --> DOM["src/domain — regras de negócio puras"]
  FEAT --> SVC["src/services — áudio, avisos, compras, janela"]
  SVC --> DOM
  FEAT --> DATA["src/data — repositórios, SQLite, cliente do cache"]
  DATA --> DOM
  SVC --> NATIVE["modules/* — código nativo (Kotlin/Swift)"]
```

Regras de dependência:

1. `src/domain` não importa React, React Native, Expo nem nada de E/S. São funções puras e testáveis (elegibilidade, rendimentos, pausas, níveis, projeção de posição).
2. `src/ds` não conhece regras de negócio.
3. `src/app` só compõe telas de `src/features`; não contém lógica.
4. Código nativo só é acessado por `src/services`.

## 4. Estrutura de diretórios [Proposta]

O repositório está vazio. Estrutura proposta, reaproveitando o protótipo onde indicado:

```text
termi-app/
├── app.json / app.config.ts     # Configuração Expo (permissões, plugins, fontes)
├── eas.json                     # Perfis de build (development, preview, production)
├── .env.example
├── assets/
│   ├── fonts/                   # Geist Pixel Grid (OFL); Geist vem do pacote do Google Fonts
│   ├── rive/                    # termi.riv
│   ├── janela/                  # Renders mínimos embutidos (o resto vem da CDN)
│   ├── sons/
│   └── souvenirs/               # Imagens 2D de fallback
├── modules/
│   └── screen-state/            # Notificação fixa com contagem (do protótipo)
├── src/
│   ├── app/                     # Rotas Expo Router
│   │   ├── _layout.tsx
│   │   ├── (onboarding)/
│   │   ├── index.tsx            # Início
│   │   ├── voo/                 # dial, partidas, cartão, embarque, em voo, pouso
│   │   ├── mala/
│   │   ├── passaporte.tsx
│   │   ├── diario/
│   │   ├── estatisticas.tsx
│   │   ├── primeira-classe/     # paywall, compra concluída, gerenciar
│   │   ├── ajustes/
│   │   ├── sobre.tsx
│   │   └── ajuda.tsx
│   ├── features/                # Um diretório por domínio, com componentes e hooks
│   │   ├── onboarding/ inicio/ embarque/ em-voo/ pouso/
│   │   ├── colecao/ historico/ monetizacao/ ajustes/ conta/
│   ├── domain/                  # Regras puras + testes
│   │   ├── sessao/              # máquina de estados, horários, pausas
│   │   ├── voos/                # elegibilidade, projeção, previsão de pouso
│   │   ├── economia/            # dinheiro, preços, livro-caixa
│   │   ├── colecao/             # souvenirs, carimbos, níveis
│   │   └── geo/                 # distância, sol, lugar sobrevoado
│   ├── data/
│   │   ├── db/                  # Esquema SQLite e migrações
│   │   ├── repos/               # Repositórios por entidade
│   │   └── remote/              # Cliente do cache de voos e dos blocos
│   ├── services/
│   │   ├── avisos/              # expo-notifications + notificação fixa
│   │   ├── audio/
│   │   ├── compras/             # RevenueCat
│   │   └── bloqueio/            # Deep flight (condicionado)
│   ├── janela/                  # Do protótipo: Janela.tsx, shader.ts, tiles.ts, geo.ts
│   ├── ds/                      # Do protótipo (branch design-system, PR #1): tokens e componentes
│   ├── i18n/
│   └── config/                  # Leitura das variáveis de ambiente
└── docs/                        # Opcional: ADRs detalhadas
```

`android/` e `ios/` não são versionados: são gerados pelo `expo prebuild` (Continuous Native Generation).

## 5. Modelo de dados

### 5.1 Entidades

| Entidade | Onde vive | Campos principais |
|---|---|---|
| **VooAoVivo** (`LiveFlight`) | Cache remoto (somente leitura) | `hex`, `callsign`, `companhiaPais`, `origem`, `destino`, `lat`, `lon`, `altitudePes`, `velocidadeNos`, `rumo`, `pousoPrevistoEm`, `coletadoEm`, `regiao` |
| **SessaoDeVoo** (`FlightSession`) | SQLite | `id`, `voo` (cópia do `LiveFlight` no embarque), `tempoEscolhidoMin`, `embarcouEm`, `pousoPrevistoEm`, `encerrouEm`, `resultado` (`em_voo`, `pousou`, `pousou_antes`, `cancelado`), `minutosFoco`, `milhas`, `dinheiro`, `lugarSobrevoado`, `vooDeOntem` (bool), `configPausa` |
| **MotivoDaViagem** | SQLite (1:1 com sessão) | `categoria`, `foco`, `tarefas[]` (`texto`, `feita`) |
| **ServicoDeBordo** | SQLite (N:1 com sessão) | `inicioPrevisto`, `iniciouEm`, `terminouEm`, `voltouAntes` |
| **Carimbo** | SQLite | `id`, `sessaoId` (ou `nivel` para carimbos de nível), `aeroporto`, `cidade`, `pais`, `data`, `estilo` |
| **Souvenir** (catálogo) | Catálogo remoto versionado na CDN, com cópia embutida para o primeiro uso [Proposta] | `id`, `pais`, `tipo` (`pais`, `cidade`, `rara`), `metal` (níquel, cobre, latão), `preco`, `nomeNativo`, `modelo3d`, `imagem2d`, `disponivelDesde` |
| **SouvenirNaMala** | SQLite | `souvenirId`, `compradoEm`, `sessaoId`, `preco`, `amostra` (bool) |
| **LancamentoDeSaldo** (livro-caixa) | SQLite | `id`, `tipo` (`credito_voo`, `compra_souvenir`), `valor`, `sessaoId`, `souvenirId`, `criadoEm` |
| **Nivel** | Derivado das milhas | `nivel`, `alcancadoEm`, `recompensas` |
| **Direito** (`Entitlement`) | RevenueCat (cache local) | `primeiraClasse` (bool), `plano`, `expiraEm`, `vitalicio` |
| **Ajustes** | Preferências | serviço de bordo, sons, avisos, tela e bateria, privacidade, apps permitidos |

Decisões do modelo:

- **O saldo é a soma do livro-caixa**, não um número solto. Isso facilita auditoria, sincronização sem conflito e evita perder dinheiro por bug.
- **A sessão guarda uma cópia do voo no embarque.** O voo real pode sumir do cache; o histórico não pode.
- **Milhas e minutos totais são derivados das sessões.** O nível também.
- **A coleção não tem tamanho fixo.** Hoje são 13 países, e novos entram em pouco tempo. Total, progresso e espaços pontilhados vêm do catálogo vigente; um país novo nunca substitui outro nem afeta souvenirs comprados. Com o catálogo remoto, países novos entram sem nova versão do app (o modelo 3D é baixado sob demanda) [Proposta].
- **Registros são só acrescentados** (voos, carimbos, souvenirs, lançamentos). Nada que foi conquistado é apagado por regra de negócio; só por pedido explícito do usuário (UC-16).

### 5.2 Relacionamentos

```mermaid
erDiagram
  SESSAO_DE_VOO ||--o| MOTIVO_DA_VIAGEM : tem
  SESSAO_DE_VOO ||--o{ SERVICO_DE_BORDO : registra
  SESSAO_DE_VOO ||--o| CARIMBO : "gera (só pouso completo)"
  SESSAO_DE_VOO ||--o{ LANCAMENTO_DE_SALDO : credita
  SESSAO_DE_VOO ||--o| SOUVENIR_NA_MALA : "permite compra"
  SOUVENIR ||--o{ SOUVENIR_NA_MALA : "é instância de"
  SOUVENIR_NA_MALA ||--|| LANCAMENTO_DE_SALDO : "debita"
  NIVEL ||--o| CARIMBO : "gera carimbo de nível"
```

## 6. Fluxo de dados

### 6.1 Escolher e embarcar

```mermaid
sequenceDiagram
  participant U as Viajante
  participant A as App
  participant C as CDN (R2)
  participant N as Avisos (sistema)
  U->>A: escolhe tempo no dial
  A->>C: GET voos/{regiao}.json (com cache)
  C-->>A: lista + coletadoEm
  A->>A: projeta posições até agora; filtra |pouso − tempo| ≤ 10 min
  U->>A: escolhe voo
  A->>C: baixa blocos da rota (~9 MB/h)
  A->>A: fixa pousoPrevistoEm; cria SessaoDeVoo
  A->>N: agenda pouso e serviços de bordo (alarme exato)
  A->>N: mostra notificação fixa
```

- **Sem consulta por usuário ao provedor de voos [Decidido].** Posição, rota e velocidade vêm do cache; o app projeta o resto.
- **Filtro de região no aparelho.** A localização (se concedida) só escolhe a região padrão; não sai do aparelho.

### 6.2 Sessão de voo (máquina de estados)

```mermaid
stateDiagram-v2
  [*] --> Embarcando
  Embarcando --> Cancelado: Cancelar embarque
  Embarcando --> EmVoo: blocos prontos ou embarcar com o globo
  EmVoo --> ServicoDeBordo: horário da pausa
  ServicoDeBordo --> EmVoo: fim da pausa ou Voltar ao foco
  EmVoo --> ConfirmarPousoAntes: Pousar antes
  ConfirmarPousoAntes --> EmVoo: Continuar voando
  ConfirmarPousoAntes --> PousouAntes: confirmar
  EmVoo --> EmSolo: avião real pousou antes do horário
  EmSolo --> Pousou: horário de pouso
  EmVoo --> EmEspera: horário chegou e o avião real segue no ar
  EmEspera --> Pousou: Pousar agora ou o avião real pousa
  EmVoo --> Pousou: horário de pouso
  Pousou --> [*]
  PousouAntes --> [*]
  Cancelado --> [*]
```

- **O relógio manda.** O estado é calculado a partir de `embarcouEm`, `pousoPrevistoEm`, das pausas e do relógio do aparelho. Ao reabrir o app (ou depois de o sistema encerrá-lo), a sessão é reconstruída sem perda.
- **O horário de pouso é fixado no embarque [Decidido, validado no protótipo].** Os avisos agendados dependem disso.
- **[Decidido] Em espera e Em solo (PRD RN-09, 19/11/2026).** O aviso de pouso toca no horário fixado e o pouso completo é creditado nesse horário, com o app aberto ou fechado. Se o app estiver aberto e o cache mostrar o avião ainda no ar, a tela oferece "Continuar até o pouso" (minutos a mais creditados quando o usuário encerra ou o avião pousa). Se o cache mostrar que o avião pousou antes do horário, a janela passa ao estado em solo e o foco segue até o horário. A janela no solo precisa de desenho no Figma **[Pendente]**.

### 6.3 Pouso e rendimentos

Funções puras em `src/domain`:

- `rendimentos(sessao, agora)` → minutos, milhas (distância real voada no período), dinheiro ($1/min), carimbo (só pouso completo), loja (só pouso completo).
- `agendaDePausas(duracao, intervalo)` → lista de pausas que respeitam RN-05 a RN-07 (pausa de no máximo 5 min, em qualquer intervalo).
- `elegivel(voo, tempoEscolhido, agora)` → RN-02.
- `nivel(milhasTotais)` → RN-15.

## 7. Gerenciamento de estado

| Tipo de estado | Ferramenta | Exemplos |
|---|---|---|
| Persistente e conquistado | SQLite (fonte da verdade) | sessões, carimbos, mala, livro-caixa |
| Sessão ativa | Zustand, derivado do SQLite + relógio | estado do voo, tempo restante |
| Remoto | TanStack Query | voos por região, idade do cache |
| Assinatura | RevenueCat SDK + cache local | `primeiraClasse` |
| Preferências | AsyncStorage/MMKV | ajustes |
| Animações | Reanimated / Rive view model | `pensando`, `novoVoo`, `esteira`, `embarcou` |

## 8. Autenticação e autorização

- **Sem login para usar o app [Decidido].** O usuário é anônimo; o RevenueCat usa um ID anônimo do app.
- **Conta opcional para sincronizar [Decidido]; provedor [Pendente].** Opções a avaliar:

| Opção | Prós | Contras |
|---|---|---|
| Supabase (Auth + Postgres) | SQL, RLS, plano grátis, combina com o livro-caixa | Mais um serviço para operar |
| Firebase (Auth + Firestore) | Login com Google simples no Android | Modelo de documentos; lock-in |
| Só Android Auto Backup + login da loja | Zero servidor | Não sincroniza entre aparelhos; iOS diferente |

  **Decidido (19/11/2026): Supabase** (Postgres + Auth), projeto `eavuayeisrnzzpdbpugt`, região São Paulo. Plano grátis no desenvolvimento e no teste fechado; Pro no lançamento, pelos backups diários **[Proposta]**. Configuração: Data API ligada, sem exposição automática de tabelas novas e RLS ligado em toda tabela nova (cada usuário só lê e grava as próprias linhas). Só a chave publicável vai para o app; a chave secreta nunca sai do painel. Login: Google (e Apple no iOS) **[Proposta]**. Sincronização por eventos acrescentados (sessões, lançamentos, souvenirs), com união em vez de sobrescrita.
- **Autorização de recursos pagos:** decidida no app pelo direito do RevenueCat. Os recursos premium são locais (duração, vistas, sons, estatísticas), então não há API a proteger. A integridade do saldo é local; como a moeda não vale dinheiro real, o risco de fraude é aceito.

## 9. Integrações e serviços externos

| Serviço | Uso | Restrições |
|---|---|---|
| **adsb.lol** | Posições ao vivo (só pelo coletor) | Dados ODbL; crédito obrigatório; chave concedida com uso comercial; 1.000 chamadas/dia e 300/hora com chave; avisar ida à produção; planejar receptor ADS-B próprio |
| **VRS Standing Data** | Rotas e aeroportos | Cobertura de rotas varia: 51% (Los Angeles) a 91% (Tóquio) |
| **NASA GIBS** | Blue/Black Marble, VIIRS, OSM Land/Water (máscara do mar; © colaboradores do OpenStreetMap, ODbL) | Uso livre com crédito; sem logo nem sugestão de apoio da NASA; sem garantia de disponibilidade, por isso os blocos são copiados para o R2 |
| **ESA WorldCover 2021** (AWS Open Data, `esa-worldcover-s2` e `esa-worldcover`) | Composto Sentinel-2 RGBNIR (10 m) e mapa de cobertura (área construída) para a paisagem e as luzes | CC BY 4.0, uso comercial com crédito: "© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium" (Sobre o Termi). Desde 21/11/2026, no lugar do Landsat WELD e do GMIS |
| **OpenFlights** | País de cada companhia (bandeira na cauda) | Dados ODbL; crédito obrigatório; base desatualizada em companhias novas, corrigida à mão no coletor |
| **GeoNames** | Nomes de lugares (lugar sobrevoado) | Crédito |
| **Cloudflare R2 + CDN** | Arquivos de voos, blocos, renders e assets | Blocos do mundo (menos a Antártida): ~7,8 GB, medidos em 20/11/2026 |
| **GitHub Actions** (repo público `voo-ao-vivo-teste`) | Coletor durante o desenvolvimento e o teste fechado, gravando no R2 (decidido pelo Alberto em 19/11/2026: sem custo e sem servidor) | Antes do lançamento: Oracle Cloud Always Free (configuração automática) ou Cloudflare Workers pago (US$ 5/mês) **[Pendente]**. O Actions não pode ser parte de serviço em produção |
| **RevenueCat / Google Play Billing** | Compras | Chave pública no app; segredos só no painel |
| **Rive** | Animações do Termi | Exportar `.riv` do arquivo na nuvem |

**Contrato do cache de voos [Decidido, aprovado pelo Alberto em 19/11/2026]** — publicado no R2 desde 20/11/2026 pelo coletor (`voo-ao-vivo-teste`, `src/publicar.mjs`).

`/voos/indice.json` — regiões publicadas e a idade de cada uma:

```json
{
  "versao": 1,
  "atualizadoEm": "2026-11-20T00:20:34Z",
  "regioes": {
    "londres-paris": { "nome": "Londres-Paris", "coletadoEm": "2026-11-20T00:20:34Z", "voos": 27 }
  }
}
```

`/voos/{regiao}.json` — um arquivo por região (12 regiões; cada uma atualizada a cada 20 min):

```json
{
  "versao": 1,
  "regiao": "londres-paris",
  "nome": "Londres-Paris",
  "coletadoEm": "2026-11-20T00:20:34Z",
  "atribuicao": "Dados de voo: adsb.lol (ODbL 1.0) · Rotas: Virtual Radar Server Standing Data (CC0 1.0) · Companhias: OpenFlights (ODbL 1.0)",
  "voos": [
    {
      "hex": "4ca7b5",
      "callsign": "RYR123",
      "companhia": "RYR",
      "companhiaPais": "IE",
      "aeronave": "B738",
      "origem":  { "iata": "BCN", "icao": "LEBL", "nome": "Barcelona", "lat": 41.30, "lon": 2.08 },
      "destino": { "iata": "LGW", "icao": "EGKK", "nome": "London Gatwick", "lat": 51.15, "lon": -0.19 },
      "lat": 45.12, "lon": 1.98,
      "altitudePes": 37000, "velocidadeNos": 450, "rumo": 335,
      "distanciaRestanteKm": 700,
      "pousoPrevistoEm": "2026-11-20T01:32:00Z"
    }
  ]
}
```

- **Mudanças em relação à primeira proposta:** origem e destino trazem nome e coordenadas (o globo desenha a rota sem outra base de aeroportos no app); entram `companhia`, `aeronave`, `distanciaRestanteKm`, `nome` da região e `atribuicao`; o índice é novo.
- **Compatibilidade:** campo novo não muda a `versao`; remover ou mudar o sentido de um campo muda. O app ignora campos que não conhece e trata `null` em `companhiaPais`, `aeronave`, `rumo` e nos códigos de aeroporto.
- **Frescor:** o app mostra os voos com a posição projetada a partir de `coletadoEm`. Região que veio sem nenhum avião não é publicada (falha do provedor); o arquivo anterior continua valendo.
- **País da companhia:** OpenFlights (ODbL) com correções manuais no coletor; cobre 99% dos voos acompanhados.

**Voo de ontem (RN-12) [Proposta, em teste desde 20/11/2026]:** a cada coleta, o arquivo da região também vai para `/historico/{regiao}/{HHMM}.json`, onde HHMM é a faixa de 20 min do dia em UTC (`0000` a `2340`). Cada faixa é sobrescrita 24 h depois; se a coleta parar, o arquivo continua sendo o de ontem. Com os dados ao vivo fora do ar, o app lê a faixa do horário atual, confere que o `coletadoEm` tem entre ~23 h e ~25 h e oferece os voos como se fosse ontem: a posição é projetada a partir do `coletadoEm` + 24 h e o pouso previsto também ganha 24 h. Custo: 864 arquivos fixos e ~860 gravações a mais por dia, dentro do plano grátis do R2.

**Catálogo da coleção [Proposta]** (`/colecao/catalogo.json`): `versao`, `atualizadoEm` e a lista de souvenirs (campos da seção 5.1), com URLs dos modelos 3D e imagens 2D. O app guarda a última versão e funciona offline com ela.

## 10. Segurança e proteção de dados

- **Nenhum segredo no app.** Tudo em `EXPO_PUBLIC_*` é público por definição. A chave do adsb.lol e as credenciais de escrita do R2 ficam só no coletor.
- **R2 público só para leitura**, por domínio próprio.
- **Dados pessoais mínimos:** sem nome obrigatório, sem telefone, sem anúncios, sem SDK de rastreamento publicitário. Motivos da viagem e tarefas ficam no aparelho (e no backend de sincronização, se o usuário criar conta).
- **Localização aproximada**, opcional, usada só no aparelho para escolher a região padrão.
- **LGPD:** exportar e apagar dados (UC-16); política de privacidade em Sobre o Termi.
- **Permissões Android:** `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE` e `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (som de fundo, abaixo); para o bloqueio de apps (condicionado), "Acesso ao uso" e serviço em primeiro plano `specialUse`. **Proibidos:** serviço de Acessibilidade para bloqueio e `QUERY_ALL_PACKAGES`. O `expo-audio` traz `MODIFY_AUDIO_SETTINGS` (permissão normal, sem pedido ao usuário); o `RECORD_AUDIO` que ele pede por padrão está bloqueado no `app.config.ts`.
- **Som em segundo plano [Decidido em 20/11/2026 pelo Alberto]:** o som continua com a tela bloqueada e o app fechado (visão §9, item 10), **sem o controle de mídia do Android** (pausar, voltar, duração): pausar e trocar de som só pelo app, como no FocusFlight (Alberto, 20/11/2026). **Implementação [Decidido, testado pelo Alberto no aparelho na build 31, 20/11/2026]:** no Android, serviço próprio em `modules/screen-state` (`FlightSoundService`), em primeiro plano do tipo `mediaPlayback` (`FOREGROUND_SERVICE` e `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, tipo aceito pela Play para áudio), com ExoPlayer (media3, a mesma versão que o expo-audio já traz) e **sem MediaSession**, por isso o sistema não mostra o player. A notificação do serviço é a notificação fixa do voo, com a contagem até o pouso. O som entra com fade, para sozinho no horário do pouso (com fade, mesmo com o app fechado) e usa o foco de áudio do ExoPlayer: ligação pausa e devolve com o serviço mantido; outro app de música (perda definitiva do foco) encerra o serviço, e o som volta num serviço novo quando o Termi é aberto. Isso segue o "Background audio hardening" do Android 17: o serviço só é iniciado com o app à vista (tem *while-in-use*), fica ativo nas interrupções curtas e para na perda definitiva. Sem MediaSession não há regra contrária na documentação do tipo `mediaPlayback`; a notificação obrigatória do serviço é a do voo. O serviço existe só enquanto o som toca: do fim da animação do embarque ao pouso, e nunca com "Sem som". **Lofi [Decidido em 20/11/2026 pelo Alberto]:** playlist no R2 (`musica/lofi/{id}.m4a` e `musica/lofi/playlist.json`; álbum "Lo-fi And Chill" de HoliznaCC0, CC0; 31 faixas, 86 min, AAC 96 kbps, 64 MB), fora do APK. O serviço toca as faixas embaralhadas em streaming, com cache de 60 MB no aparelho e buffer de até 10 min à frente; faixa que falha é pulada; sem rede ao começar, toca o voo de cruzeiro. ~40 MB de dados por hora de lofi. Novas faixas entram pelo workflow "Música" do coletor, sem atualizar o app. No iOS, segue o expo-audio. Na Play, declarar o uso do serviço de mídia.

## 11. Validação e tratamento de erros

- **Dados remotos validados na entrada** (ex.: schema com Zod [Proposta]). Voo inválido é descartado, nunca derruba a lista.
- **Idade do cache:** se `coletadoEm` passar de um limite [Pendente, sugerido 45 min], o app trata como "Dados fora do ar" e oferece o voo de ontem.
- **Erros de rede** têm estado próprio (PRD, seção 10) e retentativa.
- **Escritas locais em transação** (crédito do voo + carimbo + lançamento juntos).
- **Erro nunca apaga progresso.** Em dúvida, a sessão é concluída a favor do usuário (pelo relógio).

## 12. Performance e escalabilidade

Lições medidas no protótipo (Samsung M35). Detalhes dos testes na seção 18:

- **Memória de textura abaixo de ~150 MB.** Acima de 256 MB (cache de GPU do Skia) o app travou a ~2 fps.
- **Paisagem em resolução reduzida e ampliada;** asa e moldura em resolução cheia, redesenhadas só quando a luz muda.
- **10 fps por padrão, 2 fps em economia, 30 fps opcional** (Ajustes > "Janela a 30 quadros por segundo", desligado por padrão). Desde a build-28 o relógio da janela roda na thread de interface (`useFrameCallback` + `useDerivedValue`): cada quadro é montado sem passar pelo JavaScript, o que tira o teto de ~21 fps do timer em JS. A posição e o deslocamento das nuvens são interpolados entre as leituras de 1 s da tela (antes a paisagem andava em degraus de 1 s). **[Pendente]** medir 30 fps no M35 e num Android mais fraco (bateria, temperatura, memória) antes de decidir se fica.
- **Segundo plano sem trabalho:** janela desmontada e relógios parados (1% de bateria em 25 min de tela bloqueada).
- **Dados móveis (20/11/2026, depois de 2,01 GB num dia de testes na build 33).** O que o app baixa e como:
  - Paisagem da janela: ~6 MB por hora de rota com o Sentinel-2 (36,7 MB num voo de 5h45, medido pelo Alberto em 24/11/2026), a próxima 1 h à frente; fica no cache do aparelho. Desde 24/11/2026 só baixa com a janela à vista (no globo ou com a tela desligada, nada); ao voltar para a janela, baixa da posição atual em diante.
  - Posição do avião durante o voo: só o arquivo da região do avião a cada 5 min (comprimido em gzip desde 21/11/2026: ~5 a 25 KB); antes eram as 12 regiões (~0,7 MB), só para atualizar um avião. Se o avião não está mais na região (saiu dela ou passou por trecho sem radar), procura em todas as regiões no máximo a cada 20 min, e o voo segue projetado a partir da última leitura boa (24/11/2026; antes ficava preso à região do embarque e nunca mais se corrigia).
  - Trilha do globo: cada faixa de 20 min do histórico é baixada uma vez por abertura do app; antes todas eram baixadas de novo a cada 20 min.
  - Globo: blocos do Blue e do Black Marble recomprimidos em WebP no R2 (`globo/{dia|noite}/{z}/{linha}/{coluna}.webp`, níveis 1 a 7, 34.142 blocos, 149 MB, workflow "Blocos do globo" do coletor, 20/11/2026), guardados no cache do aparelho (até ~800 arquivos). O mosaico noturno só é baixado quando a região vista está de noite. Antes vinham do GIBS a cada abertura do globo (o Black Marble só existe em PNG, ~300 KB por bloco): 17 a 29 MB medidos pelo Alberto num voo de 25 min (build-38).
  - Nuvens: ~0,3 a 1 MB por voo. Lofi (primeira classe): ~40 MB por hora de música.
  - Builds de teste mostram nos Ajustes os dados baixados desde que o app abriu, por tipo (o lofi não entra na conta).
  - **[Pendente]** O R2 não comprime os JSON (o `r2.dev` serve sem gzip); com domínio próprio e compressão da Cloudflare, os arquivos de voos caem a uma fração.
- **Texturas comprimidas** (KTX2/Basis) no app nativo [Proposta].
- **Blocos baixados no embarque,** fora do APK (o protótipo embute ~21 MB de blocos só para Barcelona → Londres; ~26 MB com renders e mapas-base).
- **Escala:** o servidor não cresce com usuários; o custo é de leitura na CDN (~US$ 0,40/mês com 1.000 usuários ativos por dia).

## 13. Previsão de pouso (risco principal de dados)

Medição de 19/11/2026 com 1.247 pousos reais (coletor `voo-ao-vivo-teste`, previsão v3), pela faixa da previsão:

| Previsão inicial | Erro típico | Dentro de ±10 min |
|---|---|---|
| 30–59 min | 3,6 min | 84% |
| 60–89 min | 3,6 min | 82% |
| 3–6 h | 27 min | 17% |
| 6 h+ | 24 min | 24% |

Um modelo de regressão com os mesmos dados (ajuste na metade mais antiga, conferência na outra) não passou de ~25% nos voos longos: a mesma rota varia ~10 min de um dia para o outro (vento, desvios, espera), e uma foto do avião no embarque não prevê isso. Perto do fim (~30 min antes), a previsão acerta 86% dentro de ±10 min. Com o tempo do usuário fixo (PRD RN-09), a previsão deixou de afetar minutos e recompensas: ela só decide quão perto do fim do foco o avião real pousa (estados Em espera e Em solo).

Melhorias possíveis, sem prazo: histórico da mesma rota em dias anteriores e vento em altitude. Faixas oferecidas na v1: ver PRD §12.

## 14. Testes e observabilidade

| Nível | Ferramenta [Proposta] | Cobertura mínima |
|---|---|---|
| Unidade | Jest (jest-expo) | Todo `src/domain`: pausas (exemplos da RN-07), rendimentos, elegibilidade, níveis, livro-caixa |
| Componente | React Native Testing Library | Componentes de `src/ds` e telas com regras (paywall, confirmação de pousar antes) |
| E2E | Maestro | Onboarding → caminho rápido → pousar antes; compra em ambiente de teste |
| Aparelho | Manual, roteiro fixo | Aviso de pouso com tela bloqueada (Android 14+), bateria, fps, memória; Samsung M35 e um Android mais fraco |

Observabilidade:

- **Erros:** Sentry [Proposta], sem dados pessoais.
- **Métricas de produto:** [Pendente] ferramenta. Precisa medir conversão, planos, voos concluídos e retenção (PRD, seção 15) sem SDK publicitário.
- **Diagnóstico na tela** (do protótipo: medidor de tela/JS/paisagem, camadas, quadros, qualidade, céu e nuvens) só em builds de desenvolvimento.

## 15. Ambientes e deploy

| Ambiente | Uso | Distribuição |
|---|---|---|
| `development` | Desenvolvimento com development build | `npx expo run:android` ou EAS `development` |
| `preview` | Testes internos | APK por GitHub Actions a cada push na `main` (como o protótipo) ou EAS `preview`; Play teste interno |
| `production` | Lançamento | EAS Build + Submit para a Play (teste fechado → produção) [Proposta] |

- O CI do protótipo gera só `arm64-v8a`, com memória limitada (Gradle 2 GB, Kotlin 1,5 GB) para caber no runner; o app de produção deve gerar AAB com as ABIs exigidas pela Play [Proposta].
- Atualizações OTA (EAS Update) só para JS; mudanças nativas exigem novo build.
- Política da Play antes do lançamento: declaração de alarmes exatos; teste do bloqueio de apps.

## 16. Decisões arquiteturais (ADRs resumidas)

| # | Decisão | Status | Motivo / trade-off |
|---|---|---|---|
| ADR-01 | React Native + Expo | Decidido | Android primeiro e iOS na mesma base; o autor é designer e o código é escrito com IA. Custo: módulos nativos para alarmes, notificação fixa e bloqueio. |
| ADR-02 | Janela em Skia (SkSL) com renders do Blender | Decidido | Validado a 60 fps de UI e baixo consumo. Custo: orçamento de textura apertado. |
| ADR-03 | Cache de voos compartilhado, sem consulta por usuário | Decidido | Chamadas ao provedor fixas; custo baixo. Custo: posição projetada, não ao vivo, entre coletas. |
| ADR-04 | Sessão guiada pelo relógio, pouso fixado no embarque | Decidido | Avisos confiáveis com o app fechado; sem trabalho em segundo plano. Custo: atraso real tratado como "Em espera". |
| ADR-05 | Sem turbulência, sem controle de saída | Decidido | Princípio de produto; evita serviço em segundo plano. |
| ADR-06 | Avisos como alarme exato (`setAlarmClock`) | Decidido | Doze adiava avisos aproximados. Custo: permissão "Alarmes e lembretes" e política da Play. |
| ADR-07 | Blocos e assets em Cloudflare R2 + CDN | Decidido | GIBS sem garantia; saída grátis. |
| ADR-08 | Local-first com SQLite e livro-caixa | Decidido | Funciona offline; facilita sincronização por união. |
| ADR-09 | Expo Router, Zustand e TanStack Query | Decidido | Padrão atual do Expo. |
| ADR-10 | Supabase para conta e sincronização | Decidido | Postgres combina com o livro-caixa e com a sincronização por união; plano grátis suficiente para o beta (~1 a 3 mil usuários sincronizando por alguns meses; o limite é o banco de 500 MB); sem backup automático no grátis. Ver seção 8. |
| ADR-11 | Globo em Skia (SkSL) | Decidido (19/11/2026, após o build-5 no M35) | MapLibre Native não tem globo. Teste em `src/globo` (ferramenta "Globo de teste"). v2: blocos da NASA GIBS (Blue Marble Next Generation e Black Marble, 500 m por pixel no nível 7) carregados no nível de detalhe do zoom, em três mosaicos (perto, longe, noite) sobre a imagem mundial; gestos de pinça e arraste com "Centralizar"; rota restante em pontos no chão, que diminuem com a distância; cidades com 150 mil habitantes ou mais (GeoNames), mais cidades conforme aproxima. ~70 MB de textura; não fica montado junto com a janela. No teste os blocos vêm direto do GIBS; em produção, do R2. Prévia: `docs/imagens/globo-previa.png`. Limite: abaixo de ~250 km de distância a imagem de 500 m fica borrada. **v3 (21/11/2026, decidido pelo Alberto):** do nível 8 ao 10 o globo usa os blocos da paisagem da janela (Sentinel-2, `w8` e `w10`, até 61 m por pixel), com a cor levada ao tom do Blue Marble no shader; o mosaico de longe continua no Blue Marble (cobre o mar); de perto as luzes vêm da camada `l9`. Mesma pasta do aparelho da janela (`cache/paisagem`). Sem arquivos novos no R2. Descartados: Google Maps SDK (plano, sem globo), Maps 3D SDK (experimental, sem pacote para React Native, sem visual próprio), Mapbox (custo por usuário acima de 25 mil por mês) e MapLibre Native (sem globo). No modo Seguir a câmera fica alinhada ao rumo, então a rota à frente aparece reta (mantido assim). Falta medir em Android mais fraco e com ferramenta de memória. |
| ADR-12 | Rive para o Termi; Filament para souvenirs 3D | Decidido / Proposta | Rive já tem as animações; Filament a validar em peso e memória. |
| ADR-13 | Protótipo como base técnica; PRD como base de produto | Decidido | Janela, design system, módulo nativo, recursos e medições já validados no aparelho são reaproveitados. Regras de produto divergentes no protótipo são ajustadas ao PRD. |
| ADR-14 | Catálogo da coleção remoto e versionado | Proposta | Novos países entram em pouco tempo; evita depender de nova versão na loja. Custo: download e cache dos modelos 3D. |

## 17. Riscos técnicos e pontos em aberto

| Risco | Impacto | Mitigação |
|---|---|---|
| Previsão de pouso imprecisa em voos longos | Médio: o pouso real pode ficar ~25 min longe do fim do foco | Tempo do usuário fixo (RN-09); estados Em espera e Em solo; seguir medindo |
| Política da Play para alarmes exatos | Alto: avisos atrasam | SCHEDULE_EXACT_ALARM com pedido no onboarding; tentar USE_EXACT_ALARM com argumento de timer |
| Bloqueio de apps rejeitado pela Play | Médio | Não prometer no paywall até aprovar; "Acesso ao uso" + `specialUse` |
| Memória de textura em aparelhos fracos | Médio | Níveis de qualidade, KTX2, teste em aparelho fraco |
| Dependência do adsb.lol (cota, disponibilidade) | Médio | Cache, voo de ontem, receptor próprio |
| Cobertura de rotas desigual por região | Baixo/Médio | Curadoria da lista; descartar rotas incoerentes |
| Peso de Rive + Filament + Skia no APK e na memória | Médio | Medir no aparelho; carregar sob demanda |
| Backend de sincronização não definido | Alto para RNF-10 | Decidir antes da fase de dados (ROADMAP) |
| Globo sem biblioteca pronta | Baixo | Globo em Skia aprovado no M35 (ADR-11); falta medir bateria, memória com ferramenta e Android mais fraco |
| Nome/marca "Termi" provisório | Médio | Confirmar com agente de PI antes de investir na identidade |

## 18. Validação técnica realizada (protótipo)

Testes no Samsung M35, de 18 a 19/11/2026. Os resultados são a base das restrições da seção 12.

| Build | O que mudou | Resultado |
|---|---|---|
| build-4 | Janela com shader provisório (vista para frente), timer com tela bloqueada, regra dos 10 s | Tudo funcionou; a vista estava errada (cockpit). Decisão: tirar a turbulência |
| build-5 | Janela real (shader da "Janela ao vivo · com Blender" em SkSL) | App travado, ~2 fps em qualquer qualidade. Causa: texturas acima de 300 MB, além do cache de GPU do Skia (256 MB), reenviadas a cada quadro |
| build-6 | Texturas reduzidas para ~145 MB | Tela 60 fps, JS 60 fps; paisagem 9 fps com meta de 10. Com meta de 30, chega a 21 (limite do timer em JavaScript, não da GPU; a qualidade não muda o resultado). Janela igual à do protótipo web (aprovada). Avisos do serviço de bordo no horário num voo curto |
| build-7 | App parado em segundo plano (janela desmontada, relógios parados) | 1% de bateria em 25 min com a tela bloqueada (no build-6: de 35% para 33%). **O aviso de pouso não tocou** com a tela bloqueada |
| build-8 | Pedido de "Alarmes e lembretes" e avisos como `setAlarmClock` | Corrige a causa provável do build-7 (no Android 14+ o alarme exato vem negado e o expo-notifications cai para alarme aproximado, adiado pelo Doze). **Falta confirmar no aparelho** |

Outras medições:

- **Bateria com a tela ligada:** o app gastou 0,5% em 10 min (Configurações → Bateria, sem contar a tela).
- **Diagnóstico usado nos testes:** medidor (tela, JS, paisagem), camadas (paisagem, asa, moldura), quadros (2, 10, 30), qualidade (Econômica, Normal, Máxima), céu (hora real, dia, entardecer, noite) e nuvens (satélite ou geradas).
- **Build no CI:** APK de ~64 MB, dos quais ~26 MB são arquivos da janela (renders, mapas-base e blocos de Barcelona → Londres), que no app final serão baixados no embarque.
- **Termi em Rive (19/11):** state machine testada (pensando → comemora → pensando; pensando → espera → embarcou; volta ao Início depois do embarque).
- **Dados de voo:** ver seção 13 e o doc "validacao-dados-voos.md".

**App de produção, build-1 (19/11, Samsung M35):** a janela de teste manteve o desempenho do protótipo, e o **aviso de pouso tocou no horário com a tela bloqueada e o app fechado** (pendência do build-8 resolvida: alarme exato com a permissão "Alarmes e lembretes"). O catálogo do design system abriu, com ajustes visuais pedidos (ver ROADMAP, Fase 1).

**App de produção, build-5 (19/11, Samsung M35):** globo v2 aprovado pelo Alberto. Blocos ficam nítidos em 2 a 3 s depois do gesto, às vezes menos; pinça, arraste e Centralizar funcionaram; nenhum travamento no uso.

Falta testar: Android mais fraco que o M35; paisagem pela thread de interface; bateria e memória do globo medidas com ferramenta.

## 19. Recursos visuais: como foram gerados

### 19.1 Janela

**Origem.** O protótipo web "Janela ao vivo · com Blender" (https://claude.ai/artifact/4Bo3hcNDDDizLeZ6pXBYvd) foi aprovado e portado para SkSL no app, com a mesma câmera, terra, nuvens, céu e contas de rota e sol.

**Modelo 3D (Blender).** Arquivo `janela_23A.blend` (pasta `Documentos\Termi Blender` do Alberto). Cada vista da janela é uma **posição de câmera no mesmo modelo**. A vista pronta é a de um assento atrás da asa, olhando para o lado esquerdo: mostra o bordo de fuga, as carenagens dos flaps e o sharklet, sem motor.

**Renders.** Pasta `D:\Projetos 2026\Termi\Termi Blender`:

| Arquivos | Conteúdo |
|---|---|
| `Janela nova (v3)/tras_asa_v3_*` | Asa realista (`janela_25_janela_realista.blend`), fundo transparente: dia, entardecer, noite, beacon e strobe. **Em uso desde a build-53** |
| `Janela nova (v3)/tras_moldura_v3_*` | Moldura realista nas três luzes, e a versão `_fechada` (cabine escura, com a persiana fechada). **Em uso desde a build-53** (fechada desde a build-54) |
| `Janela nova (v3)/tras_persiana_v3_*` | Persiana nas três luzes e a máscara do vão. **Em uso desde a build-54** |
| `Janela nova (v3)/App (otimizado)` | Versões em WebP das camadas acima (fonte dos arquivos de `assets/janela`) |
| `Vistas · divulgação/Miniaturas` | Miniaturas da folha "Vista da janela" (`thumb_janela`, `thumb_janela_asa`, `thumb_sem_moldura`) |
| `Asa antiga/`, `tras_moldura_*`, `mini_*` | Versões anteriores; não usar |

As camadas separadas compõem as três vistas do lançamento sem render extra: **Janela** (só a moldura, grátis), **Asa** (asa + moldura, Plus) e **Sem moldura** (só a asa, Plus). "Com asa" e "Asa e motor" saíram do lançamento (decisão do Alberto em 24/11/2026).

No app, as camadas entram como WebP de 1080 × 1440 com transparência: `asa_dia`, `asa_entardecer`, `asa_noite`, `asa_beacon` e `moldura_dia`, `moldura_entardecer`, `moldura_noite` (em `assets/janela`). A troca entre as três luzes é suave, pela altura real do sol. A render v3 do entardecer já vem quente, então o filtro quente do protótipo web saiu. As miniaturas saem das do Alberto, reduzidas para 240 × 320.

**Câmera.** O shader da janela usa a mesma câmera da render v3 ("Câmera · janela v3" em `janela_25_janela_realista.blend`): olha reto para a esquerda, nivelada, lente de 25 mm (tangente do meio ângulo vertical 0,72). Antes usava a câmera da 23A, 12° para baixo e virada para trás, e a asa v3 parecia apontar para baixo (build-53).

**Persiana (build-54).** Começa um pouco abaixada; um toque no vidro fecha, outro volta à posição inicial (0,6 s; sem animação com "reduzir movimento"). Camadas de trás para frente: paisagem, asa, moldura misturada com a moldura fechada conforme a persiana desce, persiana deslocada na vertical e recortada pela máscara (`domain/janela/persiana.ts`). A persiana existe nas vistas com moldura (Janela e Asa). Ela não é salva: cada voo começa com a persiana na posição inicial. Para economizar memória, o app só carrega as luzes que estão aparecendo, e a moldura fechada só depois do primeiro toque.

**Luzes da asa.** Só a luz branca de posição, fixa, na ponta (entardecer e noite) e o beacon vermelho da fuselagem em pulso lento e fraco (um a cada 3,6 s). Sem strobe e sem luz vermelha de navegação. Os pulsos param com "reduzir movimento".

**Camadas desenhadas ao vivo (shader SkSL).** Terra como esfera (raio 6.371 km) vista da altitude real do avião, a partir da posição e do rumo. A altitude vem do cache e da projeção (cruzeiro, e descida em linha reta nos últimos 30 min); a câmera fica entre 2,5 km e 13 km (abaixo de 2,5 km os blocos de 61 m/px ficariam borrados) e usa 10,5 km quando a altitude é desconhecida (pedido do Alberto, 20/11/2026):

| Camada | Fonte | Textura na GPU |
|---|---|---|
| Terra perto do avião | Sentinel-2 (ESA WorldCover 2021, 10 m), blocos no nível 10 (~61 m/px) | Atlas 2048 × 2048 |
| Terra a média distância | Sentinel-2, blocos no nível 8 (~244 m/px) | Atlas 1024 × 1024 |
| Terra longe (dia) | Blue Marble, mapa-base `base_dia.jpg` | 2048 × 1792 |
| Terra longe (noite) | Black Marble, `base_noite.jpg`, e detalhe `det_noite.jpg` | 2048 × 1792 e 1280 × 1536 |
| Cidades à noite | Camada `l9` (nível 9): R = área construída do WorldCover (forma), G = luz real do Black Marble (brilho). O shader soma um brilho de fundo e pontos de luz na escala de quadras; a cor vai do laranja da periferia ao branco quente dos centros (21/11/2026; antes, GMIS num liga/desliga de cor fixa que saturava) | Atlas 1024 × 1024 |
| Nuvens | Máscara de nuvens do VIIRS (NOAA-20) do mundo inteiro, atualizada a cada 3 h pela coleta "Nuvens" (passagens diurna e noturna; a janela usa a mais recente pela hora solar local), usada como cobertura por região das nuvens geradas por ruído (fbm). Camada a 7,5 km de altitude: na descida o avião a atravessa e as nuvens ficam por cima. Sem rede: só as geradas | Dois mosaicos 2×2 de 1024 × 1024 (dia e noite) |
| Céu | Calculado: cor pela altura do sol, horizonte, brilho quente no nascer e no pôr, disco do sol, estrelas à noite, névoa pela distância | — |

Ajuste de cor final leve (dessaturação 12% e brilho +12%). A sombra das nuvens na terra só existe nas qualidades Normal e Máxima.

**Nuvens no R2 [Decidido em 20/11/2026 pelo Alberto]:** `nuvens/{dia|noite}/{linha}/{coluna}.webp` (20 × 10 blocos de 18°, nível 4 da grade do GIBS, ~4 km/px, cinza 0 = céu limpo, 255 = nuvem) e `nuvens/indice.json` com a versão. Mesmos nomes a cada atualização: o espaço fica fixo em ~22 MB, sem apagar nada. O app baixa os blocos da rota no embarque (`data/nuvens`), pede com `?v=versão` e guarda no cache em `nuvens/{versão}/`, apagando as versões antigas. Por voo, ~0,3 a 1 MB.

**Blocos de terra.** Grade EPSG:4326 do GIBS (blocos de 512 px; cada bloco cobre 288/2^z graus), em WebP. No protótipo ficavam empacotados em `.bin` dentro do APK (~21 MB, só Barcelona → Londres).

**Sentinel-2 no lugar do Landsat [Decidido em 21/11/2026 pelo Alberto]:** `w10` e `w8` regravadas com o composto Sentinel-2 2021 do ESA WorldCover (WebP 70) e a camada de luzes `l9` no lugar da `i9`. Gerador `blocos/gerar_s2.py` do coletor. Cor casada com o Landsat (a janela foi calibrada nele); rios e lagos com a cor real (meia saturação, brilho limitado); o mar (máscara do OSM) fica todo com a cor do Blue Marble (rodada v2, 21/11/2026: na v1 a água rasa e barrenta do mar virava manchas laranja na Coreia e o mosaico deixava retângulos de 1° no mar). O R2 tem de ficar nos 10 GB grátis (Alberto): gerados em 21/11/2026 (20 partes, ~55 min, sem erros): `w10` 208.462 blocos, 7,22 GB; `w8` 14.855, 0,52 GB; `l9` 33.605, 0,26 GB; total ~8,0 GB (R2 inteiro ~8,3 GB). Sobraram 6.036 blocos `w10` e 1.414 `w8` do Landsat (0,15 GB) que não foram regravados, a apagar com o modo "limpar" do workflow; a `i9` só sai quando nenhum app em teste a usar. No aparelho a pasta mudou de `cache/blocos` para `cache/paisagem` (a antiga é apagada no primeiro download). Antes (Landsat WELD e GMIS, 20/11/2026):

**Em produção [Decidido, 20/11/2026]:** um arquivo por bloco no R2, em `/blocos/{camada}/{linha}/{coluna}.webp`, com cache de 1 ano (imutável). Bloco ausente = oceano ou nada a desenhar (o app trata 404 como vazio). Cobre toda a terra menos a Antártida (decisão do Alberto, 19/11/2026). Gerado pelo workflow "Blocos de paisagem" do coletor (`blocos/gerar.py`), em 20/11/2026:

| Camada | Blocos | Tamanho |
|---|---|---|
| `w10` (perto do avião) | 212.788 | 7,20 GB |
| `w8` (distância média) | 16.076 | 0,52 GB |
| `i9` (cidades à noite, GMIS; sai depois da troca) | 30.372 | 0,11 GB |
| **Total** | **259.236** | **~7,8 GB** (dentro dos 10 GB grátis do R2) |

Por voo: ~250 blocos (~9 MB) por hora, baixados no embarque; no modo Econômica, sem o nível 10, ~3 MB por hora.

**Download no embarque (20/11/2026, `domain/voos/blocosDaRota.ts` e `data/blocos`):** o app junta o mosaico 4×4 de cada camada em volta de cada ponto da rota (da posição projetada até o destino, a cada 10 km) e baixa do R2 com 6 pedidos ao mesmo tempo para `cache/blocos/{camada}/{linha}/{coluna}.webp`. O 404 vira um arquivo vazio (oceano), para não pedir de novo. Até 5% de falhas a janela aguenta; acima disso, a tela oferece "Embarcar com o globo" (UC-02 A4). Desde 20/11/2026 o embarque espera só os primeiros 40 min da rota (10 pedidos ao mesmo tempo). Durante o voo, com a tela aberta **e a janela à vista** (24/11/2026), o app mantém baixada só a **próxima 1 h** à frente do avião e confere a cada 10 min (`data/blocos/useBlocosDoVoo.ts`); antes baixava a rota inteira até o destino de uma vez. Por enquanto baixa as três camadas em qualquer qualidade; pular o nível 10 na qualidade Econômica entra com o ajuste de qualidade.

**Níveis de qualidade.**

| Qualidade | Resolução da paisagem em relação à tela | Terra perto (nível 10) | Sombra de nuvem |
|---|---|---|---|
| Econômica | 0,75× | Não | Não |
| Normal | 1,25× | Sim | Sim |
| Máxima | 2× | Sim | Sim |

A paisagem é desenhada num canvas menor e ampliada; asa e moldura ficam sempre em resolução cheia e só são redesenhadas quando a luz muda.

**Rota e sol.** Posição por arco de grande círculo, rumo e altura do sol calculados pela data, hora e posição (`geo.ts`). O protótipo voa Barcelona → Londres na velocidade real, porque os blocos empacotados cobrem esse trajeto.

**Pendências da janela.** Medir a memória com a persiana no aparelho; o mosaico Sentinel-2 é a mediana de 2021 (sem estação: falta ajuste por estação); o sol sempre bate do mesmo lado da asa; texturas comprimidas (KTX2/Basis) no app nativo.

### 19.2 Souvenirs (medalhas)

- **Referência:** o Alberto gera uma imagem por país, no estilo das medalhas existentes, sem texto e com a faixa lisa embaixo.
- **Modelagem no Blender** (`Medalhas/blender`): as formas principais viram relevo de verdade; os detalhes finos (rosto, dobras, chama) vêm do sombreado da imagem, como textura por cima. A imagem de referência não é ampliada; o desenho vai até a borda e pode ser cortado por ela.
- **Padrão:** mesmo corpo e borda; campo em prata polida (espelho), relevo em prata jateada com bordas escurecidas; faixa lisa separada por filete curvo, com o nome do país em relevo, em arco, na fonte Bahnschrift, na forma nativa (日本 em Yu Gothic Bold).
- **Tripo descartada:** gerava modelos pesados e irregulares entre si.
- **Prontas:** Portugal, EUA, Brasil, Reino Unido, Japão e França. Prévia da vitrine: "Termi · Souvenir" (https://claude.ai/artifact/72WA1o8ii1Q7QcPLmKqY7f), com luz de estúdio escura e luz rasante; o grão jateado e o escurecimento das bordas ficam no material do app.
- **No app [Proposta]:** exportar em glTF/GLB para o react-native-filament, com imagem 2D de reserva.

### 19.3 Termi (Rive)

- Arquivo no Rive (nuvem): https://editor.rive.app/file/untitled/2737902 (ainda "Untitled"), artboard "Termi" de 400 × 400, fundo transparente, feito a partir das referências em `Mascote/Animações do Termi` (feitas no HyperFrames).
- Animações e view model descritos em DESIGN.md §14. Halo laranja atrás do Termi (desligado na esteira) e sombra no chão que encolhe quando ele pula.
- Arquivo renomeado para "Termi Animações". Exportado em 20/11/2026 para `assets/rive/termi.riv` (20 KB) e tocado no app com **rive-react-native 9.8.6** (runtime Android 11.10), por data binding: `AutoBind(true)` e os hooks `useRiveBoolean`/`useRiveTrigger` no view model "Termi" (`src/features/termi/TermiAnimado.tsx`). Primeiro uso: a esteira do embarque (`espera` → `embarcou` até o fim, pulável com um toque).
- **Olhar (20/11/2026):** propriedades `olharX` e `olharY` no view model, ligadas por data binding a um grupo "Olhar" que envolve os olhos (o Y com o conversor "{Input} − 66", a posição de base). As animações continuam mexendo nos olhos por dentro do grupo. Primeiro uso: o Termi curioso no dial, com os olhos seguindo o botão.
- Pendências: trocar o ícone provisório das moedas; medir peso do runtime no APK e na memória.
