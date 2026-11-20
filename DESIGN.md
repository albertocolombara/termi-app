# Design — Termi: Focus Flights

> Fundamentos visuais e de interação. **A fonte principal é o Figma**: arquivo "Termi: Focus Flights" (https://www.figma.com/design/JfjmulB7Itgc59PGQBJvr5), página **Design** (telas) e página **Design System** (tokens e componentes).
> Tokens e componentes conferidos nas variáveis e na página Design System do Figma em 19/11/2026. O design system já existe em código no protótipo (`src/ds`, branch `design-system`, PR #1 de `termi-prototipo`), com os mesmos nomes; ele é a base do app. Se o Figma e este documento divergirem, vale o Figma; atualize este arquivo.
> Última atualização: 19/11/2026.

---

## 1. Direção visual

**Uma cabine de avião à noite, com uma janela para o mundo real.**

- **Escuro por padrão.** Fundo quase preto (`ink`), conteúdo branco em opacidades, amarelo como único acento de ação. O tema escuro é o único tema na v1.
- **O real em destaque.** A janela (céu, terra, nuvens reais) e os souvenirs em metal realista são os elementos mais ricos da tela. A interface ao redor fica sóbria para não competir.
- **O Termi traz o calor.** A mala laranja com olhinhos é o personagem e o ponto de afeto; aparece em poses diferentes conforme o momento (não há pose oficial).
- **Linguagem de aviação** em textos e estados: embarque, partidas, cartão de embarque, serviço de bordo, pousar antes, passaporte, diário de bordo, primeira classe, econômica.

## 2. Princípios de UX/UI

1. **Poucos passos até embarcar.** Caminho rápido no dial; animações de ritual sempre puláveis.
2. **Nunca punir.** "Pousar antes" e "Pousou antes" usam cor neutra e linguagem sem fracasso. Nada de vermelho para o usuário que encerrou o voo.
3. **Uma ação principal por tela.** O botão amarelo aparece só onde há uma próxima ação clara.
4. **Foco em voo.** Durante a sessão, nenhuma oferta, nenhum paywall, interface mínima.
5. **Honestidade visual.** Preços, período grátis e datas sempre visíveis; nenhum selo sem dado real ("mais escolhido", "melhor valor").
6. **Respeitar o sistema.** "Reduzir movimento" desliga animações e pulsos; avisos explicados antes das permissões.

## 3. Identidade visual

| Elemento | Definição | Status |
|---|---|---|
| **Termi** | Mala laranja com olhinhos; avatar do app e guardiã da coleção | Decidido; animações em Rive |
| **Ícone do app** | Mala laranja com olhinhos sobre fundo preto | Decidido |
| **Termi Premium** | Termi em ouro com reflexo. Variante Grande (≥ ~36 px) com etiqueta de bagagem prioritária creme e estrela dourada; variante Pequena (16–24 px) sem etiqueta. Só marca status; nunca substitui o Termi laranja das telas | Decidido |
| **Dourado** | Reservado à primeira classe (selo, Termi Premium, anel do avatar) | Decidido |
| **Souvenirs** | Medalhas cunhadas em metal realista: países em níquel/prata, cidades em cobre, raras em latão; nome do país na forma nativa, em arco, fonte Bahnschrift (日本 em Yu Gothic Bold) | Decidido |
| **Companhias** | Cauda pintada com a bandeira do país; nunca logo ou pintura real | Decidido |
| Nome | "Termi: Focus Flights" | Provisório |

**Papéis das cores de destaque (decidido em 19/11/2026):**

- **Amarelo** (`yellow/500`): só ações e seleção, como a sinalização dos aeroportos.
- **Laranja do Termi** (`#F28C28` no ícone e na notificação): só o personagem e a marca. Fica como está; um laranja mais forte se destacaria demais num avatar.
- **Laranja internacional** (`orange-intl/500`, `#F44A22`, via `status.warning`): avisos. Referência: "Aviso · avisos desligados" no Figma (tela X8).

A variável `brand/termi` (alias de `orange/500`) existe no Figma e no código desde 19/11/2026. A ilustração da mala no Figma ainda usa a cor solta; ligar à variável quando a mala for revisada.

## 4. Tipografia

Famílias: **Geist** (400, 500, 600) e **Geist Pixel Grid** (display; a forma da Geist Pixel que mais lembra um painel físico de aeroporto, decidida em 19/11/2026). Letter-spacing e line-height no Figma são em %; o código converte para pontos.

| Estilo (nome do Figma) | Família | Peso | Tamanho | Espaçamento | Altura de linha | Uso |
|---|---|---|---|---|---|---|
| Display/Pixel 32 | Geist Pixel Grid | 400 | 32 | −6% | 120% | Números de destaque estilo painel de aeroporto |
| Display/Data 52 | Geist | 600 | 52 | −3% | 120% | Tempo no dial, contagem grande |
| Heading/Screen 32 | Geist | 600 | 32 | −6% | 120% | Título de tela |
| Heading/Data 24 | Geist | 500 | 24 | −3% | 120% | Dados em destaque |
| Heading/Sheet 22 | Geist | 600 | 22 | 0 | 130% | Título de bottom sheet |
| Button/Large 24 | Geist | 600 | 24 | −3% | 120% | Botão grande |
| Button/Medium 20 | Geist | 600 | 20 | 0 | 130% | Botão médio |
| Nav/Title 20 | Geist | 400 | 20 | −3% | 130% | Barra superior |
| Body/Large 16 | Geist | 400 | 16 | −3% | 130% | Texto principal |
| Body/Large Medium 16 | Geist | 500 | 16 | 0 | 130% | Texto principal com ênfase |
| Body/Medium 14 | Geist | 400 | 14 | −3% | 130% | Texto secundário |
| Label/Medium 14 | Geist | 500 | 14 | 0 | 130% | Rótulos |
| Label/Strong 14 | Geist | 600 | 14 | 0 | 130% | Rótulos fortes |
| Body/Small 13 | Geist | 400 | 13 | 0 | 130% | Notas |
| Caption/Medium 12 | Geist | 500 | 12 | −3% | 130% | Legendas |
| Caption/Regular 12 | Geist | 400 | 12 | −3% | 130% | Legendas |
| Caption/Strong 12 | Geist | 600 | 12 | 0 | 130% | Legendas fortes, caixa alta de selos |

O app embute só a forma Grid; as outras quatro formas saíram (economia de ~3,4 MB no APK). No Figma, o estilo `Display/Pixel 32` deve usar Geist Pixel Grid.

## 5. Paleta de cores

### Primitivos (não usar direto em componentes)

| Token | Valor |
|---|---|
| `yellow/500` | `#FFC629` |
| `yellow/900` | `#2A2416` |
| `orange/500` | `#FF9F1C` |
| `orange-intl/500` | `#F44A22` (laranja internacional) |
| `green/500` | `#44CE32` |
| `brown/950` | `#151106` |
| `ink/950` | `#010911` |
| `ink/900` | `#141218` |
| `ink/850` | `#1D1B20` |
| `ink/800` | `#26242A` |
| `white/100`, `black/100` | `#FFFFFF`, `#000000` |
| `white/a05` … `white/a80` | Branco a 5, 8, 10, 15, 20, 25, 40, 60, 65 e 80% |
| `black/a25`, `black/a55` | Preto a 25 e 55% |

### Dourado da primeira classe

Gradiente linear da esquerda para a direita, como no código do protótipo: `#D9992B` (0) → `#FFE8A3` (0,35) → `#F2C24F` (0,6) → `#C98A21` (1). Borda `rgba(255,242,196,0.70)`; texto `#2A1A04`. No Figma está aplicado nos componentes "Selo · Primeira classe" e "Termi Premium", mas ainda não é variável. **[Proposta]** Criar as variáveis `gold/*`.

## 6. Tokens semânticos (coleção "Cor", modo Escuro)

| Grupo | Token | Primitivo | Uso |
|---|---|---|---|
| Fundo | `bg.app` | ink/900 | Fundo padrão das telas |
| | `bg.flight` | ink/950 | Telas em voo |
| | `bg.sheet` | ink/800 | Bottom sheets |
| | `bg.system` | ink/850 | Barras do sistema |
| | `bg.scrim` | black/a55 | Escurecimento atrás de sheets |
| Superfície | `surface.subtle` | white/a05 | Cards, banners, linhas de ação |
| | `surface.default` | white/a08 | Chips, item selecionado, ícones |
| | `surface.strong` | white/a10 | Botões de ícone, controle segmentado |
| | `surface.sunken` | black/a25 | Linhas de tabela, segmento ativo |
| | `surface.track` | white/a15 | Trilho do slider, toggle desligado |
| | `surface.inverse` | white/100 | Knob, progresso inativo |
| Acento | `accent.default` | yellow/500 | CTAs, seleção, progresso |
| | `accent.subtle` | yellow/900 | Fundo de selos |
| | `accent.on` | brown/950 | Conteúdo sobre o amarelo |
| Marca | `brand.termi` | orange/500 | Termi, marca e ícones de voo (avião, serviço de bordo) |
| Status | `status.warning` | orange-intl/500 | Avisos |
| | `status.success` | green/500 | Sucesso, "ao vivo" |
| Texto | `text.primary` | white/100 | |
| | `text.secondary` | white/a80 | |
| | `text.tertiary` | white/a65 | |
| | `text.muted` | white/a60 | |
| | `text.accent` | yellow/500 | |
| | `text.onAccent` | brown/950 | |
| Borda | `border.subtle` | white/a10 | |
| | `border.default` | white/a15 | |
| | `border.input` | white/a20 | Campos |
| | `border.strong` | white/a25 | |
| | `border.control` | white/a40 | Radio, checkbox |
| | `border.accent` | yellow/500 | Foco, seleção |

Regra: componentes usam **só tokens semânticos**. Um primitivo novo só entra para criar um token semântico.

## 7. Espaçamento, grid e raio

- **Escala de espaçamento (variáveis do Figma):** 0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40.
- **Largura de referência:** 412 px (Figma). Margem lateral padrão (`screenGutter`) de 16.
- **Grid:** coluna única com margens de 16; listas e cards ocupam a largura útil.
- **Raio:** `xs` 2, `sm` 4, `md` 6, `tile` 8, `lg` 10, `xl` 12, `2xl` 16, `screen` 28, `full` 999.
- **Efeitos:** `Glow/Accent` (brilho amarelo de 6 px), `Shadow/Small` (0 1 3 preto 60%), `Glass/Blur 12` (desfoque de fundo; no código precisa do expo-blur).
- **Área de toque:** mínimo de 48 × 48 dp no Android (com `hitSlop` de 8 quando o desenho é menor).

## 8. Hierarquia visual

1. **Personagem ou mundo real** (Termi no Início, janela em voo, souvenir na vitrine).
2. **Dado principal** (tempo no dial, tempo restante, saldo, rendimentos do pouso) em `Display` ou `Heading/Data`.
3. **Ação principal** (botão amarelo).
4. **Contexto** em `Body` com `text.secondary` ou `text.tertiary`.
5. **Ações de apoio** como link.

### Botões

| Tipo | Visual | Onde usar |
|---|---|---|
| **Principal** | Amarelo (`accent.default`), texto `accent.on` | Só onde há uma próxima ação clara: "Novo voo", paywall, "Continuar voando", "Abrir a loja", retentativas de erro |
| **Secundário** | Fundo escuro com borda sutil, texto branco | Ação que não deve pesar: "Pousar antes", fim de voo antecipado, estados vazios, "Ver o carimbo no passaporte" |
| **Link** | Texto branco a 80%, sublinhado | Apoio abaixo do principal: "Voltar ao início", "Gerenciar assinatura", "Pousar agora", "Continuar na econômica" |

Tamanhos: Large, Medium e Small.

## 9. Componentes de interface

Componentes da página Design System do Figma, já em código no protótipo (PR #1):

| Componente | Variantes / observações |
|---|---|
| Button | Primary, Secondary, Link × Large, Medium, Small; com ícone opcional |
| Icon button | Com indicador opcional |
| Chip | Large, Small; selecionado |
| Segmented control | Segmentos com estado ativo |
| Radio, Checkbox, Checkbox item | Checklist de tarefas usa Checkbox item |
| Toggle, Toggle row | Ajustes |
| Slider | Arrastar ou tocar |
| Text field | Borda amarela no foco |
| List option | Selected, Default, Locked (com Badge / Premium) |
| Action row | Linhas do menu e dos ajustes |
| Info banner | Message, Live status |
| Badge / Premium | Etiqueta "1ª classe" com cadeado |
| Selo · Primeira classe | Pílula dourada; texto editável |
| Top bar + Step progress | Onboarding e telas internas |
| Section header | |
| Bottom sheet | Alça centralizada no topo (padrão do MD3); vista da janela, motivo da viagem, confirmações |
| Ícones | 31 ícones de traço (`Icon/*`), incluindo `Icon/Termi Premium` |
| Illustration/Suitcase | Mala laranja (ilustração) |

Composições de tela, também na página Design System e ainda não levadas para o código: Avatar (Classe=Econômica/Primeira), Termi Premium, Menu lateral e Menu lateral / Item, Início / Cabeçalho, Início / Rodapé, Em voo / Painel superior, Em voo / Painel inferior, Em voo / Botão · Som, Em voo / Botão · Vista da janela, Paywall / Benefícios, Paywall / Plano, Paywall / Planos e Paywall / Planos · boas-vindas. A "Identificação do voo" (variante Cauda), citada na visão do produto, não está nessa página: confirmar onde fica.

## 10. Estados interativos

| Estado | Tratamento |
|---|---|
| Padrão | Tokens da seção 6 |
| Pressionado | Leve redução de opacidade ou escala (≈ 0,97), com resposta imediata |
| Foco (teclado/leitor) | Borda `border.accent` |
| Selecionado | `surface.default` + borda ou check amarelo |
| Desabilitado | Opacidade reduzida; sem mudar a cor de acento |
| Bloqueado (premium) | Badge / Premium com cadeado; na econômica, o toque abre o paywall, dentro e fora do voo |
| Carregando | Etapas reais descritas em texto (ex.: tela de embarque), nunca só um spinner genérico quando há etapas conhecidas |

## 11. Padrões de navegação

- **Sem barra de abas.** O Início é a raiz; o resto é acessado pelo **menu lateral** (abre pelo avatar no topo).
- **Fluxo linear do voo:** Início → dial → partidas → cartão de embarque → embarque → em voo → pouso → loja → Início. Voltar sai do fluxo até o dial; durante o voo, sair só por "Pousar antes".
- **Bottom sheets** para escolhas contextuais (vista da janela, motivo da viagem, confirmações).
- **Transições com significado:** Termi abrindo a mala (~1,4 s, Smart Animate no Figma), comemoração antes do dial (3,2 s), esteira no embarque.

## 12. Responsividade

- **Retrato** apenas na v1.
- Base de 412 px; o layout estica na largura com margens de 16 e centraliza conteúdo em telas largas.
- Testar em telas de 360 dp (Android compacto) até 430 dp.
- **[Pendente]** Suporte a tablet (o protótipo declara `supportsTablet` no iOS, sem layout específico).
- Fonte do sistema ampliada: os textos devem quebrar linha sem cortar; o dial e os dados grandes podem limitar a escala.

## 13. Acessibilidade

- **Contraste:** `text.primary` a `text.muted` sobre `bg.app` ficam acima de 4,5:1 (branco a 60% sobre `#141218` ≈ 7:1). Verificar textos sobre a janela e sobre o dourado.
- **Reduzir movimento:** animações do Termi, beacon da asa, carrossel automático e transições longas param ou viram cortes.
- **Leitor de tela:** todos os botões de ícone com rótulo; o Termi tem rótulo de ação ("Abrir a mala"); o souvenir 3D tem descrição textual.
- **Não depender só de cor:** "Pousou" e "Pousou antes" têm texto, não só cor; itens premium têm cadeado e texto.
- **Áreas de toque** de 48 dp.
- **Avisos sonoros** sempre acompanhados de notificação visual.

## 14. Microinterações e animações

### Tokens de movimento (Material Design 3)

Mesmos valores nas transições dos componentes no Figma (Smart Animate) e em `src/ds/motion.ts`:

| Elemento | Duração | Easing |
|---|---|---|
| Chip, rádio, checkbox, segmento, opção de lista | 200 ms | padrão `cubic-bezier(0.2, 0, 0, 1)` |
| Toggle (bolinha desliza e trilho muda de cor juntos) | 300 ms | padrão |
| Bottom sheet abrindo | 400 ms | enfatizado de entrada `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| Bottom sheet fechando | 300 ms | enfatizado de saída `cubic-bezier(0.3, 0, 0.8, 0.15)` |
| Navegação para o paywall | 300 ms | padrão |

No controle segmentado, o indicador do segmento ativo desliza até o segmento tocado. Com "reduzir movimento", as trocas são instantâneas.

### Animações de personagem e cena

| Animação | Duração | Onde |
|---|---|---|
| `termi_inicio_pensando` (loop: olha, balões com medalhas, volta) | 6,4 s | Início |
| `termi_inicio_idle` (flutua, pisca, olha) | 4,8 s | Outras telas |
| `termi_novo_voo_comemora` | 3,2 s | "Novo voo" → dial |
| `termi_espera_loop` (esteira) | 0,8 s | Tela de embarque |
| `termi_embarcou` (pulinho, sai pela esteira) | 2,6 s | Fim do embarque |
| Mala abrindo | ~1,4 s | Início → Sua mala |
| Carrossel do paywall | 3,5 s por slide | Paywall |
| Beacon da fuselagem | 1 pulso a cada 3,6 s, fraco | Janela (entardecer e noite) |

Controle pelo view model "Termi" no Rive: `pensando`, `novoVoo`, `esteira`, `embarcou`. As animações que se encadeiam começam na mesma pose, para não haver salto. Sem strobe e sem luz vermelha de navegação na asa.

## 15. Feedback e mensagens do sistema

- **Tom:** tripulação gentil. Frases curtas, em português do Brasil, com metáforas de aviação sem exagero.
- **Sem culpa:** "Pousou antes, sobre os Alpes", nunca "Você desistiu".
- **Avisos do comandante** em fases reais do voo; interruptor próprio.
- **Notificações:** pouso (com som, mesmo em silencioso), início e fim do serviço de bordo, notificação fixa com contagem.
- **Item da primeira classe tocado na econômica** → paywall, a qualquer momento. Em voo, nada de oferta que o usuário não pediu.
- **Confirmações** mostram o que acontece antes do toque (ex.: o que entra e o que não entra ao pousar antes).

## 16. Estados vazios, carregamento e erro

Telas no Figma: "Estados do voo · v2" (E1–E8 e E5b) e "Erros e estados vazios · v2". Atualizadas em 20/11/2026 para a regra do tempo do usuário (PRD RN-09):

- **E5 · Em espera:** "Seu tempo de foco acabou"; pouso completo garantido; "Pousar agora" (principal) e "Continuar até o pouso" (secundário), com a linha "os minutos a mais também contam".
- **E5b · Continuando até o pouso:** tela em voo com aviso de tempo extra, "~N min" no topo, "Tempo extra +N min" no rodapé e "Pousar agora" no lugar de "Pousar antes".
- **E8 · Em solo:** aviso "O avião pousou em [cidade]", "Foco termina em N min", altitude 0 m e "Em solo em [IATA]"; "Pousar antes" continua, porque o tempo do usuário não acabou.
- **Janela com o avião no solo (taxiando ou no portão):** render ainda não existe **[Pendente]** (Blender).

**Em voo / Rota** (componente, página Design System): barra de rota do painel inferior, com variantes `Progresso` = 0, 25, 50, 75, 90, 100. No app o avião anda de forma contínua pela fração do voo entre o embarque e o pouso; trecho voado em laranja, restante em branco 65%.

| Situação | Padrão |
|---|---|
| Estado vazio (mala, diário) | Termi + frase curta + botão secundário para o primeiro voo |
| Carregamento com etapas (embarque) | Termi na esteira + lista de etapas reais + "Cancelar embarque" |
| Erro recuperável (rede, dados fora do ar) | Explicação + alternativa útil (voo de ontem, tempos próximos, embarcar com o globo) + botão principal de retentar |
| Erro em voo | Nunca interrompe o foco; aviso discreto (ex.: "Sem sinal do radar") |

## 17. Consistência entre telas

- Nomes de componentes e tokens **iguais no Figma e no código**.
- Terminologia fixa: Econômica / Primeira classe; Novo voo; Partidas; Cartão de embarque; Serviço de bordo; Pousar antes / Pousou antes; Sua mala; Passaporte; Diário de bordo; Estatísticas.
- Moeda sempre com `$` e sem casas decimais.
- Mala e passaporte se adaptam a qualquer número de países: hoje 13, com novos em breve.
- Fundo `bg.flight` em todas as telas de voo; `bg.app` no resto.

## 18. Evolução do design system

1. **Figma primeiro.** Novo token ou componente nasce no Figma, com nome no padrão "Grupo/Nome", e depois é espelhado em `src/ds`.
2. **Tokens semânticos antes de valores.** Nenhum hex solto em telas.
3. **Variantes antes de componentes novos.** Avaliar se uma variante resolve.
4. **Registrar diferenças** entre Figma e código no `src/ds/README.md` (hoje: desfoque sem expo-blur, mala vetorial simplificada, curvas simplificadas em alguns ícones).
5. **Composições de tela** (Avatar, Paywall, Menu lateral) entram no código junto com as telas que as usam.
6. **Mudança de identidade** (ex.: laranja oficial, nome final) é decisão de produto: atualizar PRD, DESIGN e Figma juntos.
