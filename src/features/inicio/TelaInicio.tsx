/**
 * I1 · Início (Figma v3: com histórico, sem histórico, rota selecionada; X8 com avisos desligados).
 * PRD: RF-07, RF-08; Início v3 decidido pelo Alberto em 24/11/2026:
 * - globo pontilhado com as rotas voadas (GloboDeRotas), girando devagar e interativo;
 * - resumo do diário (voos e tempo de foco) com "Ver diário";
 * - último voo com "Repetir" (caminho rápido com o mesmo tempo de foco);
 * - marca do Plus no cabeçalho só na econômica (abre o paywall: RN-20); some para quem já é Plus.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContagens, useVoosEncerrados } from '@/data/historico/useHistorico';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { resumoDoDiario, rotasVoadas, dataRelativa, type VooDoDiario } from '@/domain/historico/historico';
import { Avatar, Button, Cauda, color, Icon, Plus, radius, screenGutter, space, Text } from '@/ds';
import { GloboDeRotas } from '@/globo-rotas/GloboDeRotas';
import { statusDeViajante } from '@/domain/status/niveis';
import { t } from '@/i18n';
import { useClasse } from '@/services/compras';

import { duracao, duracaoTotal, nomeDoLugar } from '../voo/formato';
import { useRelogio } from '../voo/useRelogio';
import { MenuLateral } from './MenuLateral';
import { useAvisosDePouso } from './useAvisosDePouso';
import { useRepetirVoo } from './useRepetirVoo';

export function TelaInicio() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focada = useIsFocused();
  const classe = useClasse();
  const voos = useVoosEncerrados();
  const contagens = useContagens();
  const sessao = useSessaoEmAndamento();
  const avisos = useAvisosDePouso();
  const { repetir, procurando } = useRepetirVoo();
  const [menuAberto, setMenuAberto] = useState(false);
  // Relógio de minuto: datas do último voo e da rota, saudação; em segundo plano ele para, e o globo junto.
  const { agora, ativo } = useRelogio(60_000);
  const [alturaDoGlobo, setAlturaDoGlobo] = useState(0);

  const lista = voos.data ?? [];
  const resumo = resumoDoDiario(lista);
  const rotas = rotasVoadas(lista);
  const ultimo = lista[0];
  const semHistorico = voos.isSuccess && lista.length === 0;

  return (
    <View style={[styles.tela, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24] }]}>
      <View style={{ gap: space[16] }}>
        {/* Cabeçalho */}
        <View style={styles.cabecalho}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('inicio.abrirMenu')}
            hitSlop={4}
            onPress={() => setMenuAberto(true)}
            style={({ pressed }) => [styles.perfil, pressed && { opacity: 0.8 }]}
          >
            <Avatar />
            <View>
              <Text variant="Caption/Regular 12" tone="secondary">
                {saudacao(agora)}
              </Text>
              <Text variant="Body/Large 16" tone="secondary" style={{ letterSpacing: 0, lineHeight: 24 }}>
                {statusDeViajante(resumo.milhas).atual.nome}
              </Text>
            </View>
          </Pressable>
          <View style={styles.direita}>
            {/* Só na econômica: quem já é Plus não vê o convite (Alberto, build-66). */}
            {classe !== 'primeira' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('inicio.plusAcessivel')}
                onPress={() => router.push('/primeira-classe')}
                style={({ pressed }) => pressed && { opacity: 0.8 }}
              >
                <Plus />
              </Pressable>
            ) : null}
            <View style={styles.saldo} accessible accessibilityLabel={t('inicio.saldoAcessivel', { valor: contagens.data?.saldo ?? 0 })}>
              <Text variant="Label/Strong 14">{t('inicio.saldo', { valor: (contagens.data?.saldo ?? 0).toLocaleString('pt-BR') })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divisor} />

        {/* Resumo do diário de bordo */}
        <View style={styles.resumo}>
          <View style={styles.indicadores}>
            <Indicador valor={String(resumo.concluidos)} rotulo={resumo.concluidos === 1 ? t('inicio.vooConcluido') : t('inicio.voosConcluidos')} />
            <Indicador valor={duracaoTotal(resumo.minutos)} rotulo={t('inicio.tempoDeFoco')} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/diario')}
            style={({ pressed }) => [styles.verDiario, pressed && { opacity: 0.8 }]}
          >
            <Text variant="Label/Medium 14" tone="secondary">
              {t('inicio.verDiario')}
            </Text>
            <Icon name="chevronRight" />
          </Pressable>
        </View>
      </View>

      {/* Globo de rotas: ocupa o espaço que sobra (412 × 412 no Figma) */}
      <View style={styles.areaDoGlobo} onLayout={(e) => setAlturaDoGlobo(Math.round(e.nativeEvent.layout.height))}>
        {alturaDoGlobo > 0 && voos.isSuccess ? (
          <GloboDeRotas
            rotas={rotas}
            largura={width}
            altura={Math.min(alturaDoGlobo, width + space[24])}
            agora={agora}
            ativo={focada && ativo && !menuAberto}
            // Também quando só há voos que pousaram antes: eles não desenham rota.
            dica={voos.isSuccess && rotas.length === 0 ? { titulo: t('inicio.dicaTitulo'), texto: t('inicio.dicaTexto') } : null}
          />
        ) : null}
      </View>

      <View style={{ gap: space[24], paddingHorizontal: screenGutter }}>
        {semHistorico ? (
          <View style={{ gap: space[12], paddingHorizontal: space[8] }}>
            <Text variant="Heading/Data 24" tone="accent" style={{ textAlign: 'center' }}>
              {t('inicio.primeiroVooTitulo')}
            </Text>
            <Text variant="Body/Medium 14" tone="secondary" style={{ textAlign: 'center' }}>
              {t('inicio.primeiroVooTexto')}
            </Text>
          </View>
        ) : null}

        {avisos.desligados ? <AvisosDesligados onAtivar={avisos.ativar} /> : null}

        {ultimo && !sessao.data ? (
          <UltimoVoo voo={ultimo} agora={agora} procurando={procurando} onRepetir={() => repetir(ultimo.tempoEscolhidoMin)} />
        ) : null}

        {sessao.data ? (
          <Button label={t('inicio.vooEmAndamentoDescricao')} onPress={() => router.push('/voo/em-voo')} />
        ) : (
          <Button
            label={t('inicio.novoVoo')}
            onPress={() => router.push('/voo')}
            // Só na tela do primeiro voo, uma sombra leve dá destaque ao botão (anotação do Figma v3).
            style={semHistorico ? styles.sombraDoBotao : undefined}
          />
        )}
      </View>

      <MenuLateral
        visivel={menuAberto}
        onFechar={() => setMenuAberto(false)}
        classe={classe}
        milhas={resumo.milhas}
        souvenirs={contagens.data?.souvenirs ?? 0}
        carimbos={contagens.data?.carimbos ?? 0}
      />
    </View>
  );
}

function saudacao(agora: number) {
  const h = new Date(agora).getHours();
  if (h >= 5 && h < 12) return t('inicio.bomDia');
  if (h >= 12 && h < 18) return t('inicio.boaTarde');
  return t('inicio.boaNoite');
}

function Indicador({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={{ gap: 3 }} accessible accessibilityLabel={`${valor} ${rotulo}`}>
      <Text variant="Body/Large Medium 16" style={{ lineHeight: 24 }}>
        {valor}
      </Text>
      <Text variant="Caption/Regular 12" tone="muted">
        {rotulo}
      </Text>
    </View>
  );
}

/** Figma: bloco "Último voo" com "Repetir". */
function UltimoVoo({ voo, agora, procurando, onRepetir }: { voo: VooDoDiario; agora: number; procurando: boolean; onRepetir: () => void }) {
  const antes = voo.resultado === 'pousou_antes';
  return (
    <View style={styles.ultimo}>
      <Text variant="Caption/Regular 12" tone="tertiary">
        {t('inicio.ultimoVoo')}
      </Text>
      <View style={styles.linhaDoUltimo}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/diario/[id]', params: { id: voo.id } })}
          style={({ pressed }) => [styles.vooDoUltimo, pressed && { opacity: 0.8 }]}
        >
          <Cauda pais={voo.companhiaPais} />
          <View style={{ flex: 1, gap: space[2] }}>
            <Text variant="Label/Medium 14" numberOfLines={1}>
              {t('inicio.rota', { origem: nomeDoLugar(voo.origem), destino: nomeDoLugar(voo.destino) })}
            </Text>
            <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
              {t('inicio.quando', { duracao: duracao(voo.minutosFoco), data: dataRelativa(voo.encerrouEm, agora) })}
              {/* "Pousou antes" em cor neutra (CLAUDE.md §9); "pousou" em verde, como no Figma. */}
              <Text variant="Caption/Regular 12" style={{ color: antes ? color.text.tertiary : color.status.success }}>
                {antes ? t('inicio.pousouAntes') : t('inicio.pousou')}
              </Text>
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('inicio.repetirAcessivel', { duracao: duracao(voo.tempoEscolhidoMin) })}
          accessibilityState={{ busy: procurando, disabled: procurando }}
          disabled={procurando}
          hitSlop={12}
          onPress={onRepetir}
          style={({ pressed }) => [styles.repetir, (pressed || procurando) && { opacity: 0.6 }]}
        >
          <Icon name="repetirVoo" />
          <Text variant="Caption/Regular 12" tone="secondary">
            {t('inicio.repetir')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** X8 · Aviso de avisos de pouso desligados (Figma: "Aviso · avisos desligados"). */
function AvisosDesligados({ onAtivar }: { onAtivar: () => void }) {
  return (
    <View style={styles.aviso}>
      <Icon name="avisosDesligados" />
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Label/Strong 14" style={{ color: color.status.warning }}>
          {t('inicio.avisosDesligadosTitulo')}
        </Text>
        <Text variant="Body/Small 13" tone="secondary">
          {t('inicio.avisosDesligadosTexto')}
        </Text>
      </View>
      <Pressable accessibilityRole="button" hitSlop={12} onPress={onAtivar} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        <Text variant="Label/Strong 14">{t('inicio.ativar')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg.app },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[8], paddingHorizontal: screenGutter },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  direita: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  saldo: {
    paddingVertical: space[6],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  divisor: { height: 1, marginHorizontal: space[16] + 1.5, backgroundColor: color.surface.subtle },
  resumo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[8], paddingHorizontal: screenGutter },
  indicadores: { flexDirection: 'row', alignItems: 'center', gap: space[32] },
  verDiario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    height: 36,
    paddingLeft: space[12],
    paddingRight: space[8],
    borderRadius: radius.tile,
    backgroundColor: color.surface.subtle,
  },
  areaDoGlobo: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ultimo: { gap: space[6], padding: space[12], borderRadius: radius.xl, borderWidth: 1, borderColor: color.border.subtle },
  linhaDoUltimo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  vooDoUltimo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  repetir: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: 36 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    paddingHorizontal: space[14],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.aviso.borda,
    backgroundColor: color.aviso.fundo,
  },
  sombraDoBotao: { boxShadow: `0 6px 24px ${color.plus.borda}` },
});
