/**
 * Motivo da viagem (Figma v3): 03b no cartão de embarque e 04B em voo. PRD: RF-13; UC-02 passo 6.
 *
 * Organização v3: objetivo do voo, categoria e a bagagem de mão (tarefas), cada tarefa com editar,
 * confirmar e excluir na própria linha. Enquanto o teclado está aberto, o botão do rodapé some: tocar
 * nele por engano fechava a folha no meio da digitação (anotação do Alberto no Figma v3).
 *
 * `resumo`: em voo, com o motivo já preenchido, abre no resumo (objetivo e tarefas para marcar) com
 * "Fechar resumo"; tocar no objetivo volta ao formulário. Cada mudança no resumo é salva na hora.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  adicionarTarefa,
  CATEGORIAS,
  FOCO_MAX_CARACTERES,
  motivoVazio,
  TAREFA_MAX_CARACTERES,
  TAREFAS_MAX,
  type Categoria,
  type MotivoDaViagem,
  type Tarefa,
} from '@/domain/sessao/motivo';
import { BottomSheet, Button, CategoriaFiltro, CategoriaTag, Checkbox, color, Icon, radius, space, Text, TextField, typography, type IconName } from '@/ds';
import { t } from '@/i18n';

const ICONE: Record<Categoria, IconName> = {
  estudo: 'categoriaEstudo',
  trabalho: 'categoriaTrabalho',
  leitura: 'categoriaLeitura',
  criacao: 'categoriaCriacao',
  outro: 'categoriaOutro',
};

/** Linha em edição: `-1` é a tarefa nova, ainda não adicionada. */
type Editando = { indice: number; texto: string } | null;

export function FolhaMotivoDaViagem({
  visivel,
  inicial,
  onSalvar,
  onFechar,
  resumo = false,
}: {
  visivel: boolean;
  inicial: MotivoDaViagem;
  onSalvar: (m: MotivoDaViagem) => void;
  onFechar: () => void;
  /** Em voo: começa no resumo quando já há motivo. */
  resumo?: boolean;
}) {
  const [motivo, setMotivo] = useState(inicial);
  const [editando, setEditando] = useState<Editando>(null);
  const [noFormulario, setNoFormulario] = useState(!resumo || motivoVazio(inicial));
  const tecladoAberto = useTecladoAberto();

  // Cada abertura começa do que está salvo (ajuste de estado durante a renderização, sem efeito).
  const [aberta, setAberta] = useState(visivel);
  if (visivel !== aberta) {
    setAberta(visivel);
    if (visivel) {
      setMotivo(inicial);
      setEditando(null);
      setNoFormulario(!resumo || motivoVazio(inicial));
    }
  }

  const mudarNoResumo = (m: MotivoDaViagem) => {
    setMotivo(m);
    if (!noFormulario) onSalvar(m);
  };

  /** Fecha a linha em edição, aplicando o texto. Devolve as tarefas resultantes. */
  const aplicarEdicao = (tarefas: Tarefa[], e: Editando): Tarefa[] => {
    if (!e) return tarefas;
    if (e.indice < 0) return adicionarTarefa(tarefas, e.texto);
    const limpo = e.texto.trim().slice(0, TAREFA_MAX_CARACTERES);
    // Texto apagado: a tarefa sai da lista.
    return limpo ? tarefas.map((x, j) => (j === e.indice ? { ...x, texto: limpo } : x)) : tarefas.filter((_, j) => j !== e.indice);
  };

  const confirmar = (continuar = false) => {
    const tarefas = aplicarEdicao(motivo.tarefas, editando);
    mudarNoResumo({ ...motivo, tarefas });
    // Pelo teclado ("concluir"), já abre a próxima tarefa nova; pelo ✓, fecha.
    setEditando(continuar && editando?.indice === -1 && tarefas.length < TAREFAS_MAX && editando.texto.trim() ? { indice: -1, texto: '' } : null);
    if (!continuar) Keyboard.dismiss();
  };

  const excluir = (indice: number) => {
    if (indice >= 0) mudarNoResumo({ ...motivo, tarefas: motivo.tarefas.filter((_, j) => j !== indice) });
    setEditando(null);
    Keyboard.dismiss();
  };

  const salvar = () => {
    const final = { ...motivo, tarefas: aplicarEdicao(motivo.tarefas, editando) };
    onSalvar(final);
    if (!resumo) return;
    // Em voo: depois de salvar, volta para o resumo (ou fecha, se ficou vazio).
    setMotivo(final);
    setEditando(null);
    if (motivoVazio(final)) onFechar();
    else setNoFormulario(false);
  };

  const n = motivo.tarefas.length;
  const feitas = motivo.tarefas.filter((x) => x.feita).length;
  const cheia = n >= TAREFAS_MAX;

  const tarefas = (
    <View style={{ gap: space[2] }}>
      <View style={{ gap: space[6] }}>
        <View style={styles.cabecalhoDasTarefas}>
          <Text variant="Label/Medium 14" tone="secondary">
            {noFormulario ? t('motivo.bagagem') : t('motivo.tarefasTitulo')}
          </Text>
          {n > 0 ? (
            <Text variant="Caption/Medium 12" tone="muted" style={{ letterSpacing: 0 }}>
              {noFormulario ? (n === 1 ? t('motivo.umaTarefa') : t('motivo.tarefas', { n })) : t('motivo.concluidas', { feitas, total: n })}
            </Text>
          ) : null}
        </View>
        <View>
          {motivo.tarefas.map((tarefa, i) => (
            <View key={`${i}-${tarefa.texto}`}>
              {i > 0 ? <View style={styles.divisor} /> : null}
              {editando?.indice === i ? (
                <LinhaEmEdicao
                  texto={editando.texto}
                  onMudar={(texto) => setEditando({ indice: i, texto })}
                  onConfirmar={confirmar}
                  onExcluir={() => excluir(i)}
                />
              ) : (
                <LinhaDaTarefa
                  tarefa={tarefa}
                  onMarcar={(feita) => mudarNoResumo({ ...motivo, tarefas: motivo.tarefas.map((x, j) => (j === i ? { ...x, feita } : x)) })}
                  onEditar={() => {
                    if (editando) confirmar();
                    setEditando({ indice: i, texto: tarefa.texto });
                  }}
                />
              )}
            </View>
          ))}
          {editando?.indice === -1 ? (
            <View>
              {n > 0 ? <View style={styles.divisor} /> : null}
              <LinhaEmEdicao
                texto={editando.texto}
                placeholder={t('motivo.novaTarefaExemplo')}
                onMudar={(texto) => setEditando({ indice: -1, texto })}
                onConfirmar={confirmar}
                onExcluir={() => excluir(-1)}
              />
            </View>
          ) : null}
        </View>
      </View>
      {cheia ? (
        <Text variant="Caption/Regular 12" tone="tertiary" style={{ paddingVertical: space[12] }}>
          {t('motivo.limiteDeTarefas', { n: TAREFAS_MAX })}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            if (editando) confirmar();
            setEditando({ indice: -1, texto: '' });
          }}
          style={({ pressed }) => [styles.adicionar, pressed && { opacity: 0.7 }]}
        >
          <Text variant="Body/Medium 14" tone="tertiary">
            {t('motivo.adicionarTarefa')}
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <BottomSheet
      visible={visivel}
      onClose={onFechar}
      title={t('motivo.titulo')}
      subtitle={noFormulario ? t('motivo.subtitulo') : undefined}
      headerRight={
        !noFormulario ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setNoFormulario(true)}
            style={({ pressed }) => [styles.botaoEditar, pressed && { opacity: 0.8 }]}
          >
            <Icon name="editar" size={14} color={color.text.secondary} />
            <Text variant="Caption/Medium 12" tone="secondary">
              Editar
            </Text>
          </Pressable>
        ) : undefined
      }
      footer={
        tecladoAberto ? null : noFormulario ? (
          <Button size="medium" icon={null} label={t('motivo.salvar')} onPress={salvar} />
        ) : (
          <Button variant="secondary" size="medium" icon={null} label={t('motivo.fecharResumo')} onPress={onFechar} />
        )
      }
    >
      {noFormulario ? (
        <View style={{ gap: space[20] }}>
          <View style={{ gap: space[12] }}>
            <Text variant="Label/Medium 14" tone="secondary" nativeID="rotulo-objetivo">
              {t('motivo.foco')}
            </Text>
            <TextField
              value={motivo.foco}
              onChangeText={(foco) => setMotivo((m) => ({ ...m, foco }))}
              placeholder={t('motivo.focoExemplo')}
              maxLength={FOCO_MAX_CARACTERES}
              returnKeyType="done"
              accessibilityLabelledBy="rotulo-objetivo"
              accessibilityLabel={t('motivo.foco')}
            />
          </View>
          <View style={{ gap: space[12] }}>
            <Text variant="Label/Medium 14" tone="secondary">
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
          {tarefas}
        </View>
      ) : (
        <View style={{ gap: space[20] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint={t('motivo.editarObjetivo')}
            onPress={() => setNoFormulario(true)}
            style={({ pressed }) => [styles.objetivo, pressed && { opacity: 0.85 }]}
          >
            {motivo.categoria ? <CategoriaTag categoria={motivo.categoria} rotulo={t(`motivo.categorias.${motivo.categoria}`)} tamanho="medio" /> : null}
            {motivo.foco ? <Text variant="Body/Large Medium 16">{motivo.foco}</Text> : null}
          </Pressable>
          {tarefas}
        </View>
      )}
    </BottomSheet>
  );
}

/** Figma: "Checkbox item" com o lápis de editar à direita. */
function LinhaDaTarefa({ tarefa, onMarcar, onEditar }: { tarefa: Tarefa; onMarcar: (v: boolean) => void; onEditar: () => void }) {
  return (
    <View style={styles.linha}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tarefa.feita }}
        onPress={() => onMarcar(!tarefa.feita)}
        style={({ pressed }) => [styles.marcar, pressed && { opacity: 0.8 }]}
      >
        <Checkbox checked={tarefa.feita} />
        <Text variant="Body/Large 16" tone={tarefa.feita ? 'tertiary' : 'primary'} style={tarefa.feita && styles.feita} numberOfLines={2}>
          {tarefa.texto}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('motivo.editarTarefa', { tarefa: tarefa.texto })} hitSlop={14} onPress={onEditar}>
        <Icon name="editar" />
      </Pressable>
    </View>
  );
}

/** Tarefa sendo escrita: campo com borda amarela, ✓ para confirmar e lixeira para excluir. */
function LinhaEmEdicao({
  texto,
  placeholder,
  onMudar,
  onConfirmar,
  onExcluir,
}: {
  texto: string;
  placeholder?: string;
  onMudar: (t: string) => void;
  onConfirmar: (continuar?: boolean) => void;
  onExcluir: () => void;
}) {
  return (
    <View style={styles.linha}>
      <TextInput
        autoFocus
        value={texto}
        onChangeText={onMudar}
        onSubmitEditing={() => onConfirmar(true)}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={color.text.tertiary}
        selectionColor={color.accent.default}
        cursorColor={color.accent.default}
        underlineColorAndroid="transparent"
        maxLength={TAREFA_MAX_CARACTERES}
        accessibilityLabel={t('motivo.novaTarefa')}
        style={styles.campoDaTarefa}
      />
      {/* Espaço maior entre confirmar e excluir, para não tocar no errado (Alberto, build-46). */}
      <View style={styles.acoesDaTarefa}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('motivo.confirmarTarefa')} hitSlop={10} onPress={() => onConfirmar(false)} style={styles.acao}>
          <Icon name="confirmarTarefa" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('motivo.removerTarefa')} hitSlop={10} onPress={onExcluir} style={styles.acao}>
          <Icon name="excluir" />
        </Pressable>
      </View>
    </View>
  );
}

function useTecladoAberto() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setAberto(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setAberto(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return aberto;
}

const styles = StyleSheet.create({
  cabecalhoDasTarefas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: color.border.subtle },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[10], minHeight: 48 },
  marcar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[10], minHeight: 48 },
  feita: { textDecorationLine: 'line-through' },
  campoDaTarefa: {
    ...typography['Body/Large 16'],
    flex: 1,
    height: 40,
    paddingHorizontal: space[12],
    paddingVertical: 0,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.border.accent,
    borderRadius: radius.lg,
    backgroundColor: color.bg.system,
  },
  adicionar: { alignSelf: 'flex-start', paddingVertical: space[12] },
  acoesDaTarefa: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  acao: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  objetivo: { gap: space[6], padding: space[16], borderRadius: radius.card, backgroundColor: color.surface.card },
  botaoEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingVertical: space[6],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border.pillOutline,
  },
});
