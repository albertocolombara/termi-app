/**
 * Diagnóstico (ferramenta de desenvolvimento): o último erro de JS guardado e os últimos fechamentos
 * que o Android registrou, com um botão para compartilhar o texto (WhatsApp, e-mail…).
 */
import { useEffect, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, color, radius, screenGutter, space, Text, TopBar } from '@/ds';
import { t } from '@/i18n';
import { testarSinal } from '@/services/avisos';
import { audioDosAvisos, sinaisTocados, avisosAgendados, avisosRecebidos, fechamentosRecentes, ultimoCrashJava, ultimoErroJs, type AvisoAgendado } from '@/services/diagnostico';

const hora = (ms: number) => new Date(ms).toLocaleString('pt-BR');

export default function Diagnostico() {
  const insets = useSafeAreaInsets();
  const [erro] = useState(ultimoErroJs);
  const [saidas] = useState(fechamentosRecentes);
  const [java] = useState(ultimoCrashJava);
  const [recebidos] = useState(avisosRecebidos);
  const [agendados, setAgendados] = useState<AvisoAgendado[]>([]);
  const [audio] = useState(audioDosAvisos);
  const [sinais] = useState(sinaisTocados);
  const [teste, setTeste] = useState<string | null>(null);
  useEffect(() => {
    avisosAgendados().then(setAgendados);
  }, []);
  const testar = (tipo: 'servico' | 'pouso') => {
    const em = Date.now() + 10_000;
    testarSinal(tipo, 10)
      .then((modo) => {
        setTeste(`${t('dev.testeAgendado', { hora: new Date(em).toLocaleTimeString('pt-BR') })} (${modo})`);
        avisosAgendados().then(setAgendados);
      })
      .catch((e: unknown) => setTeste(String(e)));
  };
  const horaCurta = (ms: number | null) => (ms ? new Date(ms).toLocaleTimeString('pt-BR') : '?');

  const texto = [
    `== ${t('dev.diagnosticoErroJs')}`,
    erro ? `${hora(erro.quando)} fatal=${erro.fatal}\n${erro.mensagem}\n${erro.pilha}` : t('dev.diagnosticoSemErro'),
    `\n== Som dos avisos`,
    audio,
    `\n== Sinais tocados pelo app`,
    sinais || 'nenhum',
    `\n== Avisos agendados`,
    agendados.length ? agendados.map((a) => `${horaCurta(a.quando)} [${a.canal ?? 'sem canal'}] ${a.titulo}`).join('\n') : 'nenhum',
    `\n== Avisos recebidos (com o app vivo)`,
    recebidos.length ? recebidos.map((a) => `${horaCurta(a.quando)} [${a.canal ?? 'sem canal'}] app=${a.app} ${a.titulo}`).join('\n') : 'nenhum',
    `\n== ${t('dev.diagnosticoCrashJava')}`,
    java || t('dev.diagnosticoSemCrashJava'),
    `\n== ${t('dev.diagnosticoFechamentos')}`,
    ...(saidas.length
      ? saidas.map((s) => `${hora(s.quando)} ${s.motivo} pss=${Math.round(s.pss / 1024)}MB\n${s.descricao}\n${s.pilha.slice(0, 4000)}`)
      : [t('dev.diagnosticoSemFechamentos')]),
  ].join('\n');

  return (
    <ScrollView
      style={{ backgroundColor: color.bg.app }}
      contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[24], paddingHorizontal: screenGutter, gap: space[16] }}
    >
      <TopBar title={t('dev.diagnostico')} onBack={() => router.back()} />
      <Button size="medium" icon={null} label={t('dev.diagnosticoCompartilhar')} onPress={() => Share.share({ message: texto }).catch(() => {})} />
      <Button size="medium" variant="secondary" icon={null} label={t('dev.testarServico')} onPress={() => testar('servico')} />
      <Button size="medium" variant="secondary" icon={null} label={t('dev.testarPouso')} onPress={() => testar('pouso')} />
      {teste ? (
        <Text variant="Body/Medium 14" tone="secondary">
          {teste}
        </Text>
      ) : null}
      <View style={{ padding: space[12], borderRadius: radius.xl, backgroundColor: color.surface.default }}>
        <Text variant="Caption/Regular 12" tone="secondary" selectable>
          {texto}
        </Text>
      </View>
    </ScrollView>
  );
}
