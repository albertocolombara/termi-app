/**
 * M5 · Ajustes. PRD: RF-44, RN-07 (intervalo do serviço de bordo), RN-18.
 * Só os ajustes que já fazem efeito no app. Os que dependem de recursos ainda não feitos
 * (avisos do comandante, lembrete de voo, manter tela ligada, reduzir movimento do app,
 * conta, restaurar compras, voos perto de você) entram junto com eles. Exportar e apagar dados: FolhaDados (UC-16).
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mostrarFerramentasDev } from '@/config/env';
import { useAjustes, type QualidadeDaJanela } from '@/data/preferencias/ajustes';
import { useSomDeFundo } from '@/data/preferencias/somDeFundo';
import type { IntervaloServicoDeBordo } from '@/domain/sessao/pausas';
import { somEmUso } from '@/domain/sons/catalogo';
import { BottomSheet, color, ListOption, screenGutter, space, TopBar } from '@/ds';
import { FolhaSons } from '@/features/voo/FolhaSons';
import { t, type ChaveDeTexto } from '@/i18n';
import { useClasse, useTrocarClasseDeTeste } from '@/services/compras';

import { FolhaDados } from './FolhaDados';
import { LinhaComInterruptor, LinhaComValor, ScrubberDeVolume, Secao } from './Grupo';
import { MedidorDeDados } from './MedidorDeDados';

const QUALIDADES: { valor: QualidadeDaJanela; nome: ChaveDeTexto; descricao: ChaveDeTexto }[] = [
  { valor: 'automatica', nome: 'ajustes.qualidade.automatica', descricao: 'ajustes.qualidade.automaticaDescricao' },
  { valor: 'alta', nome: 'ajustes.qualidade.alta', descricao: 'ajustes.qualidade.altaDescricao' },
  { valor: 'economica', nome: 'ajustes.qualidade.economica', descricao: 'ajustes.qualidade.economicaDescricao' },
];

type Folha = 'intervalo' | 'som' | 'qualidade' | null | 'dados';

export function TelaAjustes() {
  const insets = useSafeAreaInsets();
  const a = useAjustes();
  const som = useSomDeFundo();
  const classe = useClasse();
  const trocarClasse = useTrocarClasseDeTeste();
  const [folha, setFolha] = useState<Folha>(null);
  const servicoLigado = a.servicoDeBordo !== 'desligado';
  const ultimoIntervalo: Exclude<IntervaloServicoDeBordo, 'desligado'> = a.servicoDeBordo === 50 ? 50 : 25;
  const somAtual = somEmUso(som.escolhido, classe);
  const qualidade = QUALIDADES.find((q) => q.valor === a.qualidadeDaJanela) ?? QUALIDADES[0];

  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[32], paddingHorizontal: screenGutter, gap: space[24] }}>
        <TopBar title={t('ajustes.titulo')} onBack={() => router.back()} />

        <Secao titulo={t('ajustes.voo')}>
          <LinhaComInterruptor
            titulo={t('ajustes.servicoDeBordo')}
            descricao={servicoLigado ? t('ajustes.servicoDeBordoDescricao', { min: a.servicoDeBordo as number }) : t('ajustes.servicoDeBordoDesligado')}
            valor={servicoLigado}
            onMudar={(v) => a.mudar({ servicoDeBordo: v ? ultimoIntervalo : 'desligado' })}
          />
          {servicoLigado ? (
            <LinhaComValor titulo={t('ajustes.intervalo')} valor={t('ajustes.aCada', { min: a.servicoDeBordo as number })} onPress={() => setFolha('intervalo')} />
          ) : null}
        </Secao>

        <Secao titulo={t('ajustes.somEAvisos')}>
          <LinhaComValor
            titulo={t('ajustes.somDeFundo')}
            valor={somAtual ? t(`sons.${somAtual}.nome` as ChaveDeTexto) : t('sons.nenhum')}
            onPress={() => setFolha('som')}
          />
          <LinhaComInterruptor
            titulo={t('ajustes.avisoDePouso')}
            descricao={t('ajustes.avisoDePousoDescricao')}
            valor={a.avisoDePouso}
            onMudar={(v) => a.mudar({ avisoDePouso: v })}
          />
          <LinhaComInterruptor
            titulo={t('ajustes.somDoServico')}
            descricao={t('ajustes.somDoServicoDescricao')}
            valor={a.somDoServico}
            onMudar={(v) => a.mudar({ somDoServico: v })}
          />
          <ScrubberDeVolume label={t('ajustes.volumeDosAvisos')} value={a.volumeDosAvisos} onChange={(v) => a.mudar({ volumeDosAvisos: v })} />
        </Secao>

        <Secao titulo={t('ajustes.telaEBateria')}>
          <LinhaComInterruptor
            titulo={t('ajustes.economiaDeBateria')}
            descricao={t('ajustes.economiaDeBateriaDescricao')}
            valor={a.economiaDeBateria}
            // Economia e 30 quadros por segundo não andam juntos: ligar um desliga o outro (Alberto, build-33).
            onMudar={(v) => a.mudar(v ? { economiaDeBateria: true, janelaFluida: false } : { economiaDeBateria: false })}
          />
          <LinhaComValor titulo={t('ajustes.qualidadeDaJanela')} valor={t(qualidade.nome)} onPress={() => setFolha('qualidade')} />
          <LinhaComInterruptor
            titulo={t('ajustes.janelaFluida')}
            descricao={t('ajustes.janelaFluidaDescricao')}
            valor={a.janelaFluida}
            onMudar={(v) => a.mudar(v ? { janelaFluida: true, economiaDeBateria: false } : { janelaFluida: false })}
          />
        </Secao>

        <Secao titulo={t('ajustes.contaEPrivacidade')}>
          <LinhaComValor
            titulo={t('ajustes.primeiraClasse')}
            descricao={mostrarFerramentasDev ? t('ajustes.primeiraClasseDescricao') : undefined}
            valor={classe === 'primeira' ? t('ajustes.classePrimeira') : t('ajustes.classeEconomica')}
            // No app de teste, troca a classe; nos outros, abre o Plus (paywall ou gerenciar).
            onPress={() => (mostrarFerramentasDev ? trocarClasse(classe === 'primeira' ? 'economica' : 'primeira') : router.push('/primeira-classe'))}
          />
          <LinhaComValor titulo={t('ajustes.seusDadosTitulo')} valor={t('ajustes.exportarOuApagar')} onPress={() => setFolha('dados')} />
        </Secao>

        {mostrarFerramentasDev ? <MedidorDeDados /> : null}
      </ScrollView>

      <FolhaDados visivel={folha === 'dados'} onFechar={() => setFolha(null)} />

      <BottomSheet visible={folha === 'intervalo'} onClose={() => setFolha(null)} title={t('ajustes.intervalo')} subtitle={t('ajustes.intervaloSubtitulo')}>
        {([25, 50] as const).map((min) => (
          <ListOption
            key={min}
            icon="crewServiceTile"
            title={t('ajustes.aCada', { min })}
            description={min === 25 ? t('ajustes.intervalo25') : t('ajustes.intervalo50')}
            selected={a.servicoDeBordo === min}
            onPress={() => {
              a.mudar({ servicoDeBordo: min });
              setFolha(null);
            }}
          />
        ))}
      </BottomSheet>

      <BottomSheet visible={folha === 'qualidade'} onClose={() => setFolha(null)} title={t('ajustes.qualidadeDaJanela')} subtitle={t('ajustes.qualidadeSubtitulo')}>
        {QUALIDADES.map((q) => (
          <ListOption
            key={q.valor}
            icon="window"
            title={t(q.nome)}
            description={t(q.descricao)}
            selected={a.qualidadeDaJanela === q.valor}
            onPress={() => {
              a.mudar({ qualidadeDaJanela: q.valor });
              setFolha(null);
            }}
          />
        ))}
      </BottomSheet>

      <FolhaSons
        visivel={folha === 'som'}
        classe={classe}
        emUso={somAtual}
        volume={som.volume}
        onEscolher={som.escolher}
        onVolume={som.ajustarVolume}
        onPrimeiraClasse={() => {
          setFolha(null);
          router.push('/primeira-classe');
        }}
        onFechar={() => setFolha(null)}
      />
    </View>
  );
}
