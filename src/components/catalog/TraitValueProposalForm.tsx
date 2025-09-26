import { useNavigate } from 'react-router';
import { Text, Paper, Divider, Button } from '@mantine/core';
import { isNotEmpty, useField } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTraitValue,
  PlantReadData,
  Range,
  TraitReadData,
  TraitValue,
  TraitValueReadData,
} from '../../apis/catalog';
import { QueryOptions, showMutationError } from '../../apis/common';
import { showError, showSuccess } from '../common/notifications';
import { CommentInput, SourceSelect, TraitValueInput } from '.';

export default function TraitValueProposalForm({
  plant,
  trait,
  traitValuesQueryOptions
}: {
  plant: PlantReadData,
  trait: TraitReadData,
  traitValuesQueryOptions: QueryOptions<TraitValueReadData[]>
}) {

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const values = useQuery(traitValuesQueryOptions);
  const acceptedValue = values.data && values.data.find(item => item.contentStatus === "accepted");
  const proposedValues = values.data ? values.data.filter(item => item.contentStatus === "proposed") : [];

  const proposalCreation = useMutation({
    mutationFn: createTraitValue,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: traitValuesQueryOptions.queryKey });
      navigate("..", {relative: "path"});
    },
    onError: showMutationError
  });

  const getinitialTraitValue = () => {
    if (acceptedValue)
      return acceptedValue.value;
    
    switch (trait.type) {
      case "string":
        return "";
      case "string[]":
        return [];
      case "number":
        return trait.numericValueMin;
      case "range":
        return [trait.numericValueMin, trait.numericValueMax] as Range;
      default:
        return false;
    }
  }

  const validateTraitValue = (value: TraitValue) => {
    const valueRep = JSON.stringify(value);

    if (value === null || value === undefined)
      return 'Campo obrigatório';
      
    if (acceptedValue && valueRep === JSON.stringify(acceptedValue.value))
      return 'A proposta não pode ser igual à versão aceita';
    
    if (proposedValues.some((item) => valueRep === JSON.stringify(item.value)))
      return 'A proposta não pode ser igual a outra proposta já feita';

    switch (trait.type) {
      case "string":
        let str = value as string;
        if (str.trim().length == 0) return 'Campo obrigatório';
        return trait.textValueOptions.includes(value as string) ? null : 'Item inválido';
      case "string[]":
        let list = value as string[];
        if (list.length == 0) return 'Campo obrigatório';
        return list.every((item) => trait.textValueOptions.includes(item)) ? null : 'Um ou mais itens estão inválidos';
      case "number":
        let num = value as number;
        return (num >= trait.numericValueMin && num <= trait.numericValueMax) ? null : 'Valor fora dos limites permitidos';
      case "range":
        let range = value as Range;
        if (range[0] >= range[1]) return 'O valor mínimo precisa ser menor que o valor máximo';
        if (range[0] < trait.numericValueMin) return 'Valor mínimo abaixo do limite permitido';
        if (range[1] > trait.numericValueMax) return 'Valor máximo acima do limite permitido';
        return null;
    }
  };

  const valueField = useField<TraitValue>({
    mode: 'controlled',
    initialValue: getinitialTraitValue(),
    validate: (value) => validateTraitValue(value)
  });

  const sourceField = useField<string | undefined>({
    initialValue: undefined,
    validate: isNotEmpty('Campo obrigatório')
  });

  const commentMaxChars = 300;
  const commentField = useField<string>({
    initialValue: '',
    validateOnChange: true,
    validate: (value) => {
      if (value && value.length > commentMaxChars) return 'Comentário ultrapassa o limite máximo de caracteres';
      return null;
    }
  });

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const valueError = await valueField.validate();
    const sourceError = await sourceField.validate();
    const commentError = await commentField.validate();
    if (valueError || sourceError || commentError) {
      showError("Há campos inválidos no formulário.", "Erro");
      return;
    }

    const comment = commentField.getValue().trim();

    proposalCreation.mutate({
      plantId: plant.id,
      traitId: trait.id,
      value: valueField.getValue()!,
      sourceId: Number(sourceField.getValue()),
      contentProposerComment: comment.length > 0 ? comment : undefined,
    });
  }
  
  const divider = <Divider mt={25} mb={15} />;

  return (
    <>
    <Paper withBorder style={{ backgroundColor: "#f0f2f2" }} ta="center" p={15} mb={20}>
      <Text fz="h5" fw={600} pb={10}>Versão proposta</Text>
      <TraitValueInput trait={trait} field={valueField} aria-label="Versão proposta"/>
      {divider}
      <Text fz="h5" fw={600} pb={10}>Fonte</Text>
      <SourceSelect field={sourceField} />
      {divider}
      <Text fz="h5" fw={600} pb={10}>Comentário <Text span size="sm" c="dimmed">(opcional)</Text></Text>
      <CommentInput field={commentField} maxChars={commentMaxChars} placeholder="Se achar pertinente, fale mais aqui sobre sua proposta." />
      {divider}
      <Button type="submit" color="teal" onClick={handleSubmit}>Publicar proposta</Button>
    </Paper>
    </>
  )
}
