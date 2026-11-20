/**
 * 03b · Motivo da viagem (bottom sheet). PRD: RF-13; UC-02 passo 6.
 * Tudo opcional. O que for anotado aqui só vira registro no embarque; fechar sem salvar descarta a edição.
 */
import { useState } from 'react';
import { View } from 'react-native';

import {
  adicionarTarefa,
  CATEGORIAS,
  FOCO_MAX_CARACTERES,
  TAREFA_MAX_CARACTERES,
  TAREFAS_MAX,
  type Categoria,
  type MotivoDaViagem,
} from '@/domain/sessao/motivo';
import { BottomSheet, Button, CategoriaFiltro, CheckboxItem, color, radius, space, Text, TextField, type IconName } from '@/ds';
import { t } from '@/i18n';

const ICONE: Record<Categoria, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};

export function FolhaMotivoDaViagem({
  visivel,
  inicial,
  onSalvar,
  onFechar,
}: {
  visivel: boolean;
  inicial: MotivoDaViagem;
  onSalvar: (m: MotivoDaViagem) => void;
  onFechar: () => void;
}) {
  const [motivo, setMotivo] = useState(inicial);
  const [novaTarefa, setNovaTarefa] = useState<string | null>(null);

  // Cada abertura começa do que está salvo (ajuste de estado durante a renderização, sem efeito).
  const [aberta, setAberta] = useState(visivel);
  if (visivel !== aberta) {
    setAberta(visivel);
    if (visivel) {
      setMotivo(inicial);
      setNovaTarefa(null);
    }
  }

  const confirmarTarefa = () => {
    if (novaTarefa === null) return;
    setMotivo((m) => ({ ...m, tarefas: adicionarTarefa(m.tarefas, novaTarefa) }));
    setNovaTarefa(null);
  };

  const salvar = () => {
    const tarefas = novaTarefa ? adicionarTarefa(motivo.tarefas, novaTarefa) : motivo.tarefas;
    onSalvar({ ...motivo, tarefas });
  };

  const n = motivo.tarefas.length;
  const cheia = n >= TAREFAS_MAX;

  return (
    <BottomSheet
      visible={visivel}
      onClose={onFechar}
      title={t('motivo.titulo')}
      subtitle={t('motivo.subtitulo')}
      footer={<Button size="medium" icon={null} label={t('motivo.salvar')} onPress={salvar} />}
    >
      <View style={{ gap: space[12] }}>
        <View style={{ gap: space[6] }}>
          <Text variant="Label/Medium 14" tone="tertiary">
            {t('motivo.categoria')}
          </Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space[8] }}>
            {CATEGORIAS.map((c) => (
              <CategoriaFiltro
                key={c}
                label={t(`motivo.categorias.${c}`)}
                icon={ICONE[c]}
                selected={motivo.categoria === c}
                // Tocar de novo na selecionada desmarca: a categoria é opcional.
                onPress={() => setMotivo((m) => ({ ...m, categoria: m.categoria === c ? null : c }))}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space[6] }}>
          <Text variant="Label/Medium 14" tone="secondary" nativeID="rotulo-foco">
            {t('motivo.foco')}
          </Text>
          <TextField
            value={motivo.foco}
            onChangeText={(foco) => setMotivo((m) => ({ ...m, foco }))}
            placeholder={t('motivo.focoExemplo')}
            maxLength={FOCO_MAX_CARACTERES}
            returnKeyType="done"
            accessibilityLabelledBy="rotulo-foco"
            accessibilityLabel={t('motivo.foco')}
          />
        </View>

        {n > 0 || novaTarefa !== null ? (
          <View style={{ backgroundColor: color.bg.system, borderRadius: radius.md, paddingTop: space[12], paddingBottom: space[4], paddingHorizontal: space[12], gap: space[12] }}>
            <Text variant="Label/Medium 14" tone="tertiary">
              {n === 0 ? t('motivo.bagagem') : n === 1 ? t('motivo.bagagemUmaTarefa') : t('motivo.bagagemTarefas', { n })}
            </Text>
            <View>
              {motivo.tarefas.map((tarefa, i) => (
                <CheckboxItem
                  key={`${i}-${tarefa.texto}`}
                  label={tarefa.texto}
                  checked={tarefa.feita}
                  onChange={(feita) => setMotivo((m) => ({ ...m, tarefas: m.tarefas.map((x, j) => (j === i ? { ...x, feita } : x)) }))}
                  onRemove={() => setMotivo((m) => ({ ...m, tarefas: m.tarefas.filter((_, j) => j !== i) }))}
                  removeLabel={t('motivo.removerTarefa')}
                />
              ))}
              {novaTarefa !== null ? (
                <View style={{ paddingBottom: space[8] }}>
                  <TextField
                    autoFocus
                    value={novaTarefa}
                    onChangeText={setNovaTarefa}
                    onSubmitEditing={confirmarTarefa}
                    returnKeyType="done"
                    placeholder={t('motivo.novaTarefaExemplo')}
                    maxLength={TAREFA_MAX_CARACTERES}
                    accessibilityLabel={t('motivo.novaTarefa')}
                  />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {cheia ? (
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('motivo.limiteDeTarefas', { n: TAREFAS_MAX })}
          </Text>
        ) : (
          <Button
            variant="link"
            size="small"
            label={t('motivo.adicionarTarefa')}
            onPress={() => setNovaTarefa((v) => v ?? '')}
            style={{ alignSelf: 'flex-start' }}
          />
        )}
        {n > 0 ? (
          <Text variant="Caption/Regular 12" tone="tertiary">
            {t('motivo.dicaRemover')}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}
