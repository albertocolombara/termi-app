/**
 * Exportar ou apagar meus dados (Ajustes › Conta e privacidade; UC-16, RF-45, LGPD).
 * Bottom sheet v4 Clean: ações em linhas limpas com ícone e divisor hairline, e confirmação dedicada.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Directory } from 'expo-file-system';
import { Storage } from 'expo-sqlite/kv-store';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';

import { apagarDados, exportarDados, nomeDoArquivo } from '@/data/privacidade/dados';
import { BottomSheet, Button, color, haptic, Icon, InfoBanner, radius, space, Text } from '@/ds';
import { t } from '@/i18n';
import { cancelarAvisos } from '@/services/avisos';
import { useClasse } from '@/services/compras';

const DESTRUTIVO = '#F05252';
const DESTRUTIVO_FUNDO = 'rgba(240, 82, 82, 0.14)';
const DESTRUTIVO_BOTAO = '#D9383A';

/** Chaves do aparelho ligadas ao voo em andamento (as preferências ficam). */
const CHAVES_DO_VOO = ['voo.continuarAtePouso', 'servico.voltouAoFoco'];

type Estado = { tipo: 'escolha' } | { tipo: 'confirmar' } | { tipo: 'exportado'; arquivo: string } | { tipo: 'erro'; mensagem: string };

export function FolhaDados({ visivel, onFechar }: { visivel: boolean; onFechar: () => void }) {
  const db = useSQLiteContext();
  const qc = useQueryClient();
  const plus = useClasse() === 'primeira';
  const [estado, setEstado] = useState<Estado>({ tipo: 'escolha' });
  const [ocupado, setOcupado] = useState(false);

  const fechar = () => {
    setEstado({ tipo: 'escolha' });
    onFechar();
  };

  const exportar = async () => {
    setOcupado(true);
    try {
      const pasta = await Directory.pickDirectoryAsync();
      const dados = await exportarDados(db, Date.now(), Constants.expoConfig?.version ?? null);
      const nome = nomeDoArquivo(Date.now());
      pasta.createFile(nome, 'application/json').write(JSON.stringify(dados, null, 2));
      setEstado({ tipo: 'exportado', arquivo: nome });
    } catch (e) {
      // Fechar o seletor de pasta sem escolher não é erro.
      if (!String(e).toLowerCase().includes('cancel')) setEstado({ tipo: 'erro', mensagem: t('dados.erroExportar') });
    } finally {
      setOcupado(false);
    }
  };

  const apagar = async () => {
    setOcupado(true);
    try {
      await apagarDados(db);
      await cancelarAvisos();
      for (const chave of CHAVES_DO_VOO) {
        try {
          Storage.removeItemSync(chave);
        } catch {
          // segue: a chave pode não existir
        }
      }
      qc.clear();
      fechar();
      router.dismissAll();
      router.replace('/');
    } catch {
      setEstado({ tipo: 'erro', mensagem: t('dados.erroApagar') });
    } finally {
      setOcupado(false);
    }
  };

  if (estado.tipo === 'confirmar') {
    return (
      <BottomSheet
        visible={visivel}
        onClose={fechar}
        title={t('dados.confirmarTitulo')}
        subtitle={t('dados.confirmarTexto')}
        footer={
          <View style={{ gap: space[4] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: ocupado, busy: ocupado }}
              disabled={ocupado}
              onPress={() => {
                haptic.toque();
                apagar();
              }}
              style={({ pressed }) => [styles.botaoDestrutivo, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, ocupado && { opacity: 0.6 }]}
            >
              {ocupado ? <ActivityIndicator size="small" color={color.text.primary} /> : <Icon name="excluir" size={16} color={color.text.primary} />}
              <Text variant="Button/Label 16" style={{ color: color.text.primary }}>
                {ocupado ? t('dados.apagando') : t('dados.apagarTudo')}
              </Text>
            </Pressable>
            <Button variant="link" size="medium" label={t('dados.cancelar')} onPress={() => setEstado({ tipo: 'escolha' })} style={{ alignSelf: 'center' }} />
          </View>
        }
      >
        <View style={{ gap: space[12] }}>
          <View style={styles.notaCard}>
            <Icon name="info" size={18} color={color.text.tertiary} />
            <Text variant="Body/Small 13" tone="secondary" style={{ flex: 1 }}>
              {t('dados.ficam')}
            </Text>
          </View>
          {plus ? <InfoBanner message={t('dados.assinatura')} /> : null}
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visivel} onClose={fechar} title={t('dados.titulo')} subtitle={t('dados.subtitulo')}>
      <View style={{ gap: space[12] }}>
        {estado.tipo === 'exportado' ? <InfoBanner message={t('dados.exportado', { arquivo: estado.arquivo })} /> : null}
        {estado.tipo === 'erro' ? <InfoBanner message={estado.mensagem} /> : null}

        <View style={styles.cartao}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dados.exportar')}
            accessibilityHint={t('dados.exportarTexto')}
            disabled={ocupado}
            onPress={exportar}
            style={({ pressed }) => [styles.linha, pressed && { opacity: 0.78 }]}
          >
            <View style={styles.iconeWrap}>
              <Icon name="logbook" size={18} color={color.text.primary} />
            </View>
            <View style={{ flex: 1, gap: space[2] }}>
              <Text variant="Body/Large Medium 16" style={styles.tituloLinha}>
                {ocupado ? t('dados.exportando') : t('dados.exportar')}
              </Text>
              <Text variant="Caption/Regular 12" tone="tertiary">
                {t('dados.exportarTexto')}
              </Text>
            </View>
            {ocupado ? <ActivityIndicator size="small" color={color.text.secondary} /> : <Icon name="chevronRight" size={16} color={color.text.tertiary} />}
          </Pressable>

          <View style={styles.divisor} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dados.apagar')}
            accessibilityHint={t('dados.apagarDescricao')}
            disabled={ocupado}
            onPress={() => setEstado({ tipo: 'confirmar' })}
            style={({ pressed }) => [styles.linha, pressed && { opacity: 0.78 }]}
          >
            <View style={[styles.iconeWrap, styles.iconeDestrutivo]}>
              <Icon name="excluir" size={18} color={DESTRUTIVO} />
            </View>
            <View style={{ flex: 1, gap: space[2] }}>
              <Text variant="Body/Large Medium 16" style={[styles.tituloLinha, { color: DESTRUTIVO }]}>
                {t('dados.apagar')}
              </Text>
              <Text variant="Caption/Regular 12" tone="tertiary">
                {t('dados.apagarDescricao')}
              </Text>
            </View>
            <Icon name="chevronRight" size={16} color={DESTRUTIVO} />
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: radius.card,
    backgroundColor: color.surface.card,
    paddingHorizontal: space[14],
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[14],
  },
  iconeWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeDestrutivo: {
    backgroundColor: DESTRUTIVO_FUNDO,
  },
  botaoDestrutivo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    minHeight: 50,
    paddingHorizontal: space[20],
    borderRadius: radius.cta,
    backgroundColor: DESTRUTIVO_BOTAO,
  },
  tituloLinha: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: color.border.subtle },
  notaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[10],
    padding: space[14],
    borderRadius: radius.card,
    backgroundColor: color.surface.card,
  },
});
