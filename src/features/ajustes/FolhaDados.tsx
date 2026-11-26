/**
 * Exportar ou apagar meus dados (Ajustes › Privacidade; UC-16, RF-45, LGPD).
 * Não há tela própria no Figma: usa a folha e os botões do design system, como as outras escolhas
 * dos Ajustes. Apagar pede uma segunda confirmação, com o que será apagado e o que fica.
 *
 * Exportar grava um JSON numa pasta que o usuário escolhe (seletor do Android, sem permissão nova).
 */
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Directory } from 'expo-file-system';
import { Storage } from 'expo-sqlite/kv-store';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';

import { apagarDados, exportarDados, nomeDoArquivo } from '@/data/privacidade/dados';
import { BottomSheet, Button, InfoBanner, space, Text } from '@/ds';
import { t } from '@/i18n';
import { cancelarAvisos } from '@/services/avisos';
import { useClasse } from '@/services/compras';

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
            <Button variant="secondary" size="medium" icon={null} label={ocupado ? t('dados.apagando') : t('dados.apagarTudo')} disabled={ocupado} onPress={apagar} />
            <Button variant="link" size="medium" label={t('dados.cancelar')} onPress={fechar} style={{ alignSelf: 'center' }} />
          </View>
        }
      >
        <View style={{ gap: space[8] }}>
          <Text variant="Body/Small 13" tone="secondary">
            {t('dados.ficam')}
          </Text>
          {plus ? <InfoBanner message={t('dados.assinatura')} /> : null}
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visivel}
      onClose={fechar}
      title={t('dados.titulo')}
      subtitle={t('dados.subtitulo')}
      footer={<Button variant="link" size="medium" label={t('dados.fechar')} onPress={fechar} style={{ alignSelf: 'center' }} />}
    >
      <View style={{ gap: space[12] }}>
        {estado.tipo === 'exportado' ? <InfoBanner message={t('dados.exportado', { arquivo: estado.arquivo })} /> : null}
        {estado.tipo === 'erro' ? <InfoBanner message={estado.mensagem} /> : null}
        <Button variant="secondary" size="medium" icon={null} label={ocupado ? t('dados.exportando') : t('dados.exportar')} disabled={ocupado} onPress={exportar} />
        <Text variant="Caption/Regular 12" tone="tertiary">
          {t('dados.exportarTexto')}
        </Text>
        <Button variant="secondary" size="medium" icon={null} label={t('dados.apagar')} disabled={ocupado} onPress={() => setEstado({ tipo: 'confirmar' })} />
      </View>
    </BottomSheet>
  );
}
