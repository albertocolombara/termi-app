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
import { useOnboarding } from '@/data/preferencias/onboarding';
import { useSessaoEmAndamento } from '@/data/sessoes/useSessaoEmAndamento';
import { estatisticas } from '@/domain/historico/estatisticas';
import { resumoDoDiario, rotasVoadas } from '@/domain/historico/historico';
import { Avatar, Button, color, Icon, Plus, radius, screenGutter, space, Text } from '@/ds';
import { GloboDeRotas } from '@/globo-rotas/GloboDeRotas';
import { statusDeViajante } from '@/domain/status/niveis';
import { t } from '@/i18n';
import { useClasse } from '@/services/compras';

import { duracao, duracaoTotal } from '../voo/formato';
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
  const hojeStats = estatisticas(lista, 'dia', agora);
  const metaDiariaH = useOnboarding((s) => s.metaDiariaH);
  const metaMin = metaDiariaH * 60;
  const progressoMeta = metaMin > 0 ? Math.min(1, hojeStats.minutos / metaMin) : 0;
  const ultimo = lista[0];
  const semHistorico = voos.isSuccess && lista.length === 0;

  return (
    <View style={[styles.tela, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24] }]}>
      <View style={{ gap: space[12] }}>
        {/* Cabeçalho 1:1 v4 Clean */}
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
              <Text variant="Caption/Regular 12" tone="tertiary">
                {saudacao(agora)}
              </Text>
              <Text variant="Body/Large Medium 16" style={{ lineHeight: 22 }}>
                {statusDeViajante(resumo.milhas).atual.nome}
              </Text>
            </View>
          </Pressable>
          {/* Pílula unificada Plus | $ saldo (quando já é Plus, padding simétrico para centralizar o saldo) */}
          <View style={[styles.pilulaTopo, classe === 'primeira' && styles.pilulaTopoSemPlus]}>
            {classe !== 'primeira' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('inicio.plusAcessivel')}
                onPress={() => router.push('/primeira-classe')}
                style={({ pressed }) => pressed && { opacity: 0.8 }}
              >
                <Plus tamanho="pequeno" />
              </Pressable>
            ) : null}
            <View style={styles.saldoTexto} accessible accessibilityLabel={t('inicio.saldoAcessivel', { valor: contagens.data?.saldo ?? 0 })}>
              <Text variant="Body/Small 13" tone="primary">
                {t('inicio.saldo', { valor: (contagens.data?.saldo ?? 0).toLocaleString('pt-BR') })}
              </Text>
            </View>
          </View>
        </View>

        {/* Faixa compacta de resumo + Diário › (Figma I1 · Opção 1) */}
        <View style={{ paddingHorizontal: screenGutter }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/diario')}
            style={({ pressed }) => [styles.barraResumo, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.resumoItens}>
              <View style={styles.resumoPar}>
                <Text variant="Caption/Strong 12" style={{ fontSize: 12.5 }}>{String(resumo.concluidos)}</Text>
                <Text variant="Caption/Regular 12" tone="tertiary">{resumo.concluidos === 1 ? 'voo' : 'voos'}</Text>
              </View>
              <View style={styles.resumoPar}>
                <Text variant="Caption/Strong 12" style={{ fontSize: 12.5 }}>{duracaoTotal(resumo.minutos)}</Text>
                <Text variant="Caption/Regular 12" tone="tertiary">foco</Text>
              </View>
              {hojeStats.sequencia >= 2 ? (
                <View style={styles.resumoPar}>
                  <Text variant="Caption/Strong 12" style={{ fontSize: 12.5 }}>
                    {`${hojeStats.sequencia >= 3 ? '🔥 ' : ''}${hojeStats.sequencia}d`}
                  </Text>
                  <Text variant="Caption/Regular 12" tone="tertiary">
                    seguidos
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.diarioLink}>
              <Text variant="Caption/Regular 12" tone="tertiary">Diário</Text>
              <Icon name="chevronRight" size={14} color={color.text.tertiary} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Globo de rotas: ocupa o espaço que sobra */}
      <View style={styles.areaDoGlobo} onLayout={(e) => setAlturaDoGlobo(Math.round(e.nativeEvent.layout.height))}>
        {alturaDoGlobo > 0 && voos.isSuccess ? (
          <GloboDeRotas
            rotas={rotas}
            largura={width}
            altura={Math.min(alturaDoGlobo, width + space[24])}
            agora={agora}
            ativo={focada && ativo && !menuAberto}
            dica={voos.isSuccess && rotas.length === 0 ? { titulo: t('inicio.dicaTitulo'), texto: t('inicio.dicaTexto') } : null}
          />
        ) : null}
      </View>

      <View style={{ gap: space[16], paddingHorizontal: screenGutter }}>
        {semHistorico ? (
          <View style={{ gap: space[8], paddingHorizontal: space[8] }}>
            <Text variant="Heading/Data 24" tone="accent" style={{ textAlign: 'center' }}>
              {t('inicio.primeiroVooTitulo')}
            </Text>
            <Text variant="Body/Medium 14" tone="secondary" style={{ textAlign: 'center' }}>
              {t('inicio.primeiroVooTexto')}
            </Text>
          </View>
        ) : (
          /* Meta de hoje (Figma I1 · Opção 1) */
          <View style={styles.metaHoje}>
            <View style={styles.metaLinha}>
              <Text variant="Caption/Regular 12" tone="tertiary">Meta de hoje</Text>
              <View style={styles.resumoPar}>
                <Text variant="Caption/Strong 12" style={{ fontSize: 12.5 }}>{duracaoTotal(hojeStats.minutos)}</Text>
                <Text variant="Caption/Regular 12" tone="tertiary">{`de ${metaDiariaH}h`}</Text>
              </View>
            </View>
            <View style={styles.metaTrilho}>
              <View style={[styles.metaBarra, { width: `${Math.round(progressoMeta * 100)}%` }]} />
            </View>
          </View>
        )}

        {avisos.desligados || avisos.atrasados ? <AvisosDesligados atrasados={avisos.atrasados} onAtivar={avisos.ativar} /> : null}

        {sessao.data ? (
          <Button label={t('inicio.vooEmAndamentoDescricao')} onPress={() => router.push('/voo/em-voo')} />
        ) : ultimo ? (
          /* Split CTA (Figma I1 · Opção 1): [✈ 52 min / Rápido] + [Novo voo →] */
          <View style={styles.splitCta}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('inicio.repetirAcessivel', { duracao: duracao(ultimo.tempoEscolhidoMin) })}
              accessibilityState={{ busy: procurando, disabled: procurando }}
              disabled={procurando}
              onPress={() => repetir(ultimo.tempoEscolhidoMin)}
              style={({ pressed }) => [styles.botaoRapido, (pressed || procurando) && { opacity: 0.75 }]}
            >
              <Icon name="departures" size={18} color={color.accent.default} />
              <View>
                <Text variant="Label/Medium 14" numberOfLines={1}>
                  {duracao(ultimo.tempoEscolhidoMin)}
                </Text>
                <Text variant="Caption/Regular 12" tone="tertiary" style={{ fontSize: 11, lineHeight: 14 }}>
                  Rápido
                </Text>
              </View>
            </Pressable>
            <Button label={t('inicio.novoVoo')} onPress={() => router.push('/voo')} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button
            label={t('inicio.novoVoo')}
            onPress={() => router.push('/voo')}
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

function AvisosDesligados({ atrasados, onAtivar }: { atrasados?: boolean; onAtivar: () => void }) {
  return (
    <View style={styles.aviso}>
      <Icon name="avisosDesligados" />
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="Label/Strong 14" style={{ color: color.status.warning }}>
          {atrasados ? t('inicio.avisosAtrasadosTitulo') : t('inicio.avisosDesligadosTitulo')}
        </Text>
        <Text variant="Body/Small 13" tone="secondary">
          {atrasados ? t('inicio.avisosAtrasadosTexto') : t('inicio.avisosDesligadosTexto')}
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
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[6], paddingHorizontal: screenGutter },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  pilulaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    paddingVertical: space[4],
    paddingLeft: space[6],
    paddingRight: space[12],
    borderRadius: radius.full,
    backgroundColor: color.surface.card,
  },
  pilulaTopoSemPlus: {
    paddingLeft: space[12],
    paddingRight: space[12],
  },
  saldoTexto: { paddingVertical: space[2] },
  barraResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: space[14],
    borderRadius: radius.lg,
    backgroundColor: color.surface.card,
  },
  resumoItens: { flexDirection: 'row', alignItems: 'center', gap: space[12], flexWrap: 'wrap' },
  resumoPar: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  diarioLink: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  areaDoGlobo: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  metaHoje: { gap: space[8] },
  metaLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaTrilho: { height: 3, borderRadius: radius.full, backgroundColor: color.surface.default, overflow: 'hidden' },
  metaBarra: { height: '100%', borderRadius: radius.full, backgroundColor: color.accent.default },
  splitCta: { flexDirection: 'row', alignItems: 'center', gap: space[10] },
  botaoRapido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[10],
    minHeight: 54,
    paddingHorizontal: space[14],
    borderRadius: radius.cta,
    backgroundColor: color.surface.card,
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[14],
    paddingHorizontal: space[16],
    borderRadius: radius.card,
    backgroundColor: color.aviso.fundo,
  },
  sombraDoBotao: { boxShadow: `0 6px 24px ${color.plus.borda}` },
});
