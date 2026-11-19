# Design system · Termi Focus Flights

Espelho em código da página **Design System** do Figma ([arquivo](https://www.figma.com/design/JfjmulB7Itgc59PGQBJvr5/Termi--Focus-Flights?node-id=135-7952)). Os nomes seguem o Figma para facilitar a conversa entre os dois lados.

```tsx
import { Button, Chip, Text, color, space } from '@/ds';
```

O catálogo (`Catalogo.tsx`) abre em **Início → Ferramentas de desenvolvimento → Design system** (rota `/dev/design-system`, só fora de produção) e mostra tudo funcionando no aparelho.

## Tokens (`tokens.ts`)

| Figma | Código |
| --- | --- |
| Coleção **Primitivos** | `palette['yellow/500']` … (não use direto nos componentes) |
| Coleção **Cor** | `color.bg.app`, `color.surface.default`, `color.accent.default`, `color.text.tertiary`, `color.border.input` … |
| Coleção **Espaçamento** | `space[16]` |
| Coleção **Raio** | `radius.lg`, `radius['2xl']`, `radius.full` |
| Estilos de texto | `typography['Body/Large 16']` ou `<Text variant="Body/Large 16" />` |
| Estilos de efeito | `effects['Glow/Accent']`, `effects['Shadow/Small']` |

Letter-spacing e line-height vêm do Figma em %, e `tokens.ts` converte para pontos.

## Fontes

Embutidas no build pelo plugin do `expo-font` (`app.config.ts`):

- **Geist** 400/500/600 (`@expo-google-fonts/geist`). Use `fontWeight` com a família `Geist`; o Android escolhe o arquivo pelo peso.
- **Geist Pixel Grid** (`assets/fonts/geist-pixel/GeistPixel-Grid.ttf`, licença OFL), família `Geist Pixel Grid`, usada pelo estilo `Display/Pixel 32`. É a forma que mais lembra um painel físico de aeroporto (decidido em 19/11/2026). A fonte original é variável, com o eixo "Element Shape"; a forma Grid foi gerada como arquivo estático, porque o RN não escolhe eixos de fonte variável de forma confiável no Android. As outras formas saíram do app.

## Movimento

`motion.ts` traz os tokens de movimento do Material Design 3, os mesmos das transições dos componentes no Figma:

| Uso | Duração | Easing |
| --- | --- | --- |
| Chip, rádio, checkbox, segmento, opção de lista | 200 ms (`short4`) | padrão `cubic-bezier(0.2, 0, 0, 1)` |
| Toggle | 300 ms (`medium2`) | padrão |
| Bottom sheet abrindo | 400 ms (`medium4`) | enfatizado de entrada `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| Bottom sheet fechando | 300 ms (`medium2`) | enfatizado de saída `cubic-bezier(0.3, 0, 0.8, 0.15)` |

`useStateProgress(ativo)` dá um progresso de 0 a 1 para interpolar cor e posição. Com "reduzir movimento" ligado no aparelho, a troca é instantânea.

## Componentes

| Figma | Código |
| --- | --- |
| Button (Primary/Secondary/Link × Large/Medium/Small) | `<Button variant size icon />` |
| Icon button | `<IconButton icon indicator />` |
| Chip | `<Chip size="large" | "small" selected />` |
| Segment + Segmented control | `<SegmentedControl segments value onChange />` |
| Radio, Checkbox, Checkbox item | `<Radio />`, `<Checkbox />`, `<CheckboxItem />` |
| Toggle, Toggle row | `<Toggle />`, `<ToggleRow />` |
| Slider | `<Slider value onChange />` (arrastar ou tocar) |
| Text field | `<TextField />` (borda amarela com foco) |
| List option (Selected/Default/Locked) | `<ListOption selected locked />` |
| Action row | `<ActionRow />` |
| Info banner (Message/Live status) | `<InfoBanner message />`, `<InfoBanner type="live" />` |
| Badge / Premium | `<PremiumBadge />` |
| Selo · Primeira classe | `<FirstClassSeal />` |
| Top bar + Step progress | `<TopBar title time step />`, `<StepProgress step />` |
| Section header | `<SectionHeader title />` |
| Bottom sheet | `<BottomSheet visible onClose title subtitle footer>` |
| Icon/* | `<Icon name="soundEngine" />` (30 ícones) |

## Diferenças conhecidas em relação ao Figma

- **Vidro (`Glass/Blur 12`)**: componente `Glass` (expo-blur). No Android, o desfoque só acontece sobre o conteúdo de um `GlassTarget` e a partir do Android 12; nos outros casos fica só a superfície translúcida. Sobre a janela em voo, medir bateria antes de usar.
- **Mala laranja**: no Figma é um traçado de bitmap que não exporta limpo. `<Suitcase />` é uma versão vetorial simplificada.
- Alguns ícones de traço (alto-falante, janela, chuva, ajuda) tiveram curvas simplificadas na conversão. O desenho é o mesmo.
- **Ainda não estão no código**: Avatar, Termi Premium (ilustrações), Menu lateral, Início/Cabeçalho, Em voo/Painéis e Paywall. São composições de tela; entram quando essas telas forem implementadas.
