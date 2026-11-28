/** OB3 · No que você precisa focar (Figma 579:8862). Múltipla escolha; as categorias só ficam guardadas. */
import { View } from 'react-native';
import { router } from 'expo-router';

import { useOnboarding } from '@/data/preferencias/onboarding';
import { alternarCategoria } from '@/domain/onboarding/plano';
import { CATEGORIAS, type Categoria } from '@/domain/sessao/motivo';
import { space, type IconName } from '@/ds';
import { t } from '@/i18n';

import { CartaoDeOpcoes, OpcaoMarcavel } from './Opcoes';
import { Cabecalho, TelaDoOnboarding } from './TelaDoOnboarding';

export const ICONE_DA_CATEGORIA: Record<Categoria, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};

export function TelaFoco() {
  const categorias = useOnboarding((s) => s.categorias);
  const mudar = useOnboarding((s) => s.mudar);
  return (
    <TelaDoOnboarding etapa={1} rolar cta={{ label: t('onboarding.continuar'), onPress: () => router.push('/onboarding/tempo') }}>
      <View style={{ gap: space[24], paddingBottom: space[8] }}>
        <Cabecalho titulo={t('onboarding.focarTitulo')} texto={t('onboarding.focarTexto')} />
        <CartaoDeOpcoes>
          {CATEGORIAS.map((c) => (
            <OpcaoMarcavel
              key={c}
              icone={ICONE_DA_CATEGORIA[c]}
              rotulo={t(`motivo.categorias.${c}`)}
              marcada={categorias.includes(c)}
              onPress={() => mudar({ categorias: alternarCategoria(categorias, c) })}
            />
          ))}
        </CartaoDeOpcoes>
      </View>
    </TelaDoOnboarding>
  );
}
