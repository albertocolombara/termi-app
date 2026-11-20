/**
 * Boas-vindas do voo (RF-24) com cara de notificação: aparece no começo do voo e pode ser fechada
 * no "×" (ou some sozinha depois de 90 s, quem decide é a tela).
 */
import { Suitcase } from '@/ds';
import { t } from '@/i18n';

import { AvisoNoApp } from './AvisoNoApp';

export function AvisoDeBoasVindas({ voo, origem, destino, onFechar }: { voo: string; origem: string; destino: string; onFechar: () => void }) {
  return (
    <AvisoNoApp
      icone={<Suitcase size={26} />}
      titulo={t('emVoo.boasVindasTitulo', { voo })}
      texto={t('emVoo.boasVindasTexto', { origem, destino })}
      rotuloFechar={t('emVoo.fecharBoasVindas')}
      onFechar={onFechar}
    />
  );
}
