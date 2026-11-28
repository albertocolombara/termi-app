/**
 * OB9 · Avisos da tripulação (Figma 579:9093). Mostra como os avisos aparecem e pede a permissão
 * de notificação e, se faltar, a de alarmes exatos (sem ela o Android atrasa os avisos).
 * "Agora não" segue sem pedir nada.
 */
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAjustes } from '@/data/preferencias/ajustes';
import { color, Icon, radius, space, Text } from '@/ds';
import { t, type ChaveDeTexto } from '@/i18n';
import { alarmeExatoPermitido, pedirAlarmeExato, pedirPermissaoDeNotificacoes } from '@/services/avisos';

import { Cabecalho, TelaDoOnboarding } from './TelaDoOnboarding';

const EXEMPLOS: { titulo: ChaveDeTexto; texto: ChaveDeTexto; ha: string }[] = [
  { titulo: 'onboarding.exemploPouso', texto: 'onboarding.exemploPousoTexto', ha: '5m' },
  { titulo: 'onboarding.exemploFimDoServico', texto: 'onboarding.exemploFimDoServicoTexto', ha: '10m' },
  { titulo: 'onboarding.exemploServico', texto: 'onboarding.exemploServicoTexto', ha: '15m' },
];

export function TelaAvisos() {
  const mudarAjustes = useAjustes((s) => s.mudar);
  const seguir = () => router.push('/onboarding/janela');

  const ativar = async () => {
    mudarAjustes({ avisoDePouso: true });
    const permitido = await pedirPermissaoDeNotificacoes().catch(() => false);
    // Sem "Alarmes e lembretes", abre o ajuste do Android; o onboarding segue por trás.
    if (permitido && (await alarmeExatoPermitido()) === false) pedirAlarmeExato().catch(() => false);
    seguir();
  };

  return (
    <TelaDoOnboarding rolar cta={{ label: t('onboarding.ativarAvisos'), onPress: ativar }} link={{ label: t('onboarding.agoraNao'), onPress: seguir }}>
      <View style={{ gap: space[40] + space[12] }}>
        <Cabecalho titulo={t('onboarding.avisosTitulo')} texto={t('onboarding.avisosTexto')} />
        <View style={{ gap: space[10] }} accessible accessibilityLabel={t('onboarding.exemploDeAvisos')}>
          {EXEMPLOS.map((e) => (
            <Notificacao key={e.titulo} titulo={t(e.titulo)} texto={t(e.texto)} ha={e.ha} />
          ))}
          {/* As notificações somem no fundo (degradê do Figma). */}
          <View pointerEvents="none" style={styles.esmaecer} />
        </View>
      </View>
    </TelaDoOnboarding>
  );
}

/** Notificação de exemplo, no formato do Android. */
function Notificacao({ titulo, texto, ha }: { titulo: string; texto: string; ha: string }) {
  return (
    <View style={styles.notificacao} importantForAccessibility="no-hide-descendants">
      <View style={styles.icone}>
        <Icon name="suitcaseLine" size={18} color={color.brand.termi} />
      </View>
      <View style={{ flex: 1, gap: space[4] }}>
        <View style={styles.cabecalho}>
          <Text variant="Body/Large Medium 16" numberOfLines={1} style={{ flexShrink: 1 }}>
            {titulo}
          </Text>
          <Text variant="Caption/Regular 12" tone="secondary">
            • {ha}
          </Text>
        </View>
        <Text variant="Body/Small 13" tone="secondary">
          {texto}
        </Text>
      </View>
      <View style={styles.expandir}>
        <Icon name="chevronRight" size={14} color={color.text.secondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notificacao: { flexDirection: 'row', alignItems: 'center', gap: space[14], padding: space[16], borderRadius: radius.lg, backgroundColor: color.surface.card },
  icone: { width: 24, height: 24, borderRadius: radius.sm, backgroundColor: color.bg.app, alignItems: 'center', justifyContent: 'center' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  expandir: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.surface.strong, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  esmaecer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(180deg, transparent 0%, ${color.bg.app} 100%)` },
});
