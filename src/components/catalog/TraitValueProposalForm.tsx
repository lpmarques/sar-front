import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Container, Text, Paper, Modal, Select, Divider, Button, Group, TextInput } from '@mantine/core';
import { isNotEmpty, useField } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTraitValue,
  PlantReadData,
  Range,
  TraitReadData,
  TraitValue,
  TraitValueReadData,
} from '../../apis/catalog';
import { showMutationError } from '../../apis/common';
import { getSourceList, SourceReadData } from '../../apis/core';
import { showError, showSuccess } from '../common/notifications';
import { useAuth } from '../../hooks/useAuth';
import { SourceContent, SourceForm, TraitValueInput } from '.';

export default function TraitValueProposalForm({plant, trait, acceptedValue, proposedValues, proposedValuesQueryKey}: {plant: PlantReadData, trait: TraitReadData, acceptedValue: TraitValueReadData, proposedValues: TraitValueReadData[], proposedValuesQueryKey: string[] }) {
  const { user } = useAuth();
  const [opened, {open, close}] = useDisclosure(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sourcesQueryOptions = {
    queryKey: ['sourceList'],
    queryFn: getSourceList,
  }
  const sources = useQuery(sourcesQueryOptions);

  const visibleSources = useMemo(() => {
    // TODO: implement filters on source endpoint, allowing for separate querying of user and non-user static sources, without need for client-side deduplication
    const staticSources = sources.data ? sources.data.filter((source) => source.isStatic) : [];
    const userSources = sources.data ? sources.data.filter((source) => source.creatorId == user?.id) : [];
    return userSources.concat(staticSources).sort(
      (a, b) => a.id - b.id
    ).reduce(
      (unique: SourceReadData[], item) => {
        if (unique.length === 0 || item !== unique[unique.length-1])
          unique.push(item);
        return unique;
      }, []
    );
  }, [sources]);

  const sourceOptions = visibleSources.map((source: SourceReadData) => {
    const title = source.fieldValues.find(item => item.field === "Título")?.value;
    return {
      value: source.id.toString(),
      label: `[${source.id}] ` + source.type + (title ? `: ${title}` : "")
    }
  });
  const traitValueCreation = useMutation({
    mutationFn: createTraitValue,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: proposedValuesQueryKey });
      navigate("..", {relative: "path"});
    },
    onError: showMutationError
  });

  const validateTraitValue = (value: TraitValue) => {
    const valueRep = JSON.stringify(value);

    if (value === null)
      return 'Campo obrigatório';
      
    if (valueRep === JSON.stringify(acceptedValue.value))
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
    initialValue: acceptedValue.value,
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

  const handleNewSourceButtonClick = () => {
    sourceField.reset();
    open();
  }

  const handleNewSourceSubmit = (newSourceId: number) => {
    queryClient.invalidateQueries(sourcesQueryOptions);
    sourceField.setValue(String(newSourceId));
    close();
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const valueError = await valueField.validate();
    const sourceError = await sourceField.validate();
    const commentError = await commentField.validate();
    if (valueError || sourceError || commentError)
      throw showError("Há campos inválidos no formulário.", "Erro");

    const comment = commentField.getValue().trim()

    traitValueCreation.mutate({
      plantId: plant.id,
      traitId: trait.id,
      value: valueField.getValue(),
      sourceId: Number(sourceField.getValue()),
      contentProposerComment: comment.length > 0 ? comment : undefined,
    });
  }
  
  const divider = <Divider mt={25} mb={15} />;
  const comment = commentField.getValue();
  const commentLength = comment ? comment.length : 0;

  const selectedSource = visibleSources.find(source => source.id === Number(sourceField.getValue()));

  return (
    <>
    <Paper withBorder style={{ backgroundColor: "#f0f2f2" }} ta="center" p={15} mb={10}>
      <Text fz="h5" fw={600} pb={10}>Versão proposta</Text>
      <TraitValueInput trait={trait} field={valueField} aria-label="Versão proposta"/>
      {divider}
      <Text fz="h5" fw={600} pb={10}>Fonte</Text>
      <Group gap={10} align="start" justify="center" mb={20}>
        <Select
          key={sourceField.key}
          data={sourceOptions}
          searchable
          aria-label="Fonte"
          {...sourceField.getInputProps()}
          />
        {/* <Button size="xs" color="gray" title="Remover seleção" onClick={unselectSource}><IconX /></Button> */}
        <Button size="xs" color="teal" title="Cadastrar nova fonte" onClick={handleNewSourceButtonClick}><IconPlus /></Button>
      </Group>
      { selectedSource && 
      <SourceContent data={selectedSource} />}
      {divider}
      <Text fz="h5" fw={600} pb={10}>Comentário <Text span size="sm" c="dimmed">(opcional)</Text></Text>
      <Container size={700}>
        <TextInput
          key={commentField.key}
          placeholder="Se achar pertinente, fale mais aqui sobre sua proposta."
          {...commentField.getInputProps()}
        />
        <Text size="xs" c={commentLength > commentMaxChars ? "red" : "dimmed"} pt={5}>
          {commentLength}/{commentMaxChars}
        </Text>
      </Container>
      {divider}
      <Button type="submit" color="teal" onClick={handleSubmit}>Publicar proposta</Button>
    </Paper>
    <Modal opened={opened} onClose={close} title="Procurou uma fonte e não achou? Cadastre-a aqui:">
      <SourceForm onSubmit={handleNewSourceSubmit}/>
    </Modal>
    </>
  )
}
