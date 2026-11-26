/**
 * OB4 · Por quanto tempo você foca (Figma 579:8907). Escolha única.
 * A resposta define o tempo em que o dial abre e o intervalo do serviço de bordo (Ajustes).
 */
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAjustes } from '@/data/preferencias/ajustes';
import { useOnboarding } from '@/data/preferencias/onboarding';
import { OPCOES_DE_TEMPO, planoDoTempo, type OpcaoDeTempo } from '@/domain/onboarding/plano';
import { space } from '@/ds';
import { useNovoVoo } from '@/features/voo/novoVoo';
import { t } from '@/i18n';

import { CartaoDeOpcoes, OpcaoUnica } from './Opcoes';
import { Cabecalho, TelaDoOnboarding } from './TelaDoOnboarding';

export function TelaTempo() {
  const tempo = useOnboarding((s) => s.tempo);
  const mudar = useOnboarding((s) => s.mudar);
  const mudarAjustes = useAjustes((s) => s.mudar);
  const setTempo = useNovoVoo((s) => s.setTempo);

  const continuar = () => {
    const plano = planoDoTempo(tempo);
    mudar({ tempoEscolhido: true });
    mudarAjustes({ servicoDeBordo: plano.servicoDeBordo });
    setTempo(plano.tempoMin);
    router.push('/onboarding/meta');
  };

  return (
    <TelaDoOnboarding etapa={2} rolar cta={{ label: t('onboarding.continuar'), onPress: continuar }}>
      <View style={{ gap: space[40], paddingBottom: space[24] }} accessibilityRole="radiogroup">
        <Cabecalho titulo={t('onboarding.tempoTitulo')} texto={t('onboarding.tempoTexto')} />
        <CartaoDeOpcoes>
          {OPCOES_DE_TEMPO.map((o: OpcaoDeTempo) => (
            <OpcaoUnica
              key={o}
              titulo={t(`onboarding.tempo${o}`)}
              descricao={t(`onboarding.tempo${o}Descricao`)}
              marcada={tempo === o}
              onPress={() => mudar({ tempo: o })}
            />
          ))}
        </CartaoDeOpcoes>
      </View>
    </TelaDoOnboarding>
  );
}
