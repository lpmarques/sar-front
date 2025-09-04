import { useNavigate, useParams } from 'react-router';
import { Container, UnstyledButton, Text, Paper, Modal, Select, Divider, Button, Group, TextInput } from '@mantine/core';
import { isNotEmpty, useField } from '@mantine/form';
import { IconPlus, IconX } from '@tabler/icons-react';
import { QueryFunction, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTraitValue,
  getPlant,
  getPlantTraitValueList,
  getTraitList,
  PlantReadData,
  Range,
  TraitReadData,
  TraitValueReadData,
} from '../../apis/catalog';
import { getSourceList, SourceReadData } from '../../apis/core';
import { QueryLoader } from '../common/QueryLoader';
import { SourceContent, SourceForm, TraitValueDisplay, TraitValueInput } from '.';
import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { TraitValueField, traitValueFieldToTraitValue, traitValueToTraitValueField } from './TraitValueInput';
import { showError, showSuccess } from '../common/notifications';
import { showMutationError } from '../../apis/common';

export default function TraitEdit() {
  const { plantId, traitSlug } = useParams();
  const navigate = useNavigate();
  
  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  const traitsQueryOptions = {
    queryKey: ['traitList'],
    queryFn: getTraitList
  };
  const traitValuesQueryOptions = {
    queryKey: ['plantTraitValueList', plantId!, `trait_slugs=${traitSlug}`],
    queryFn: getPlantTraitValueList
  };
  
  const plant = useQuery(plantQueryOptions);
  const traits = useQuery(traitsQueryOptions);
  const values = useQuery(traitValuesQueryOptions);

  const trait = traits.data && traits.data.find(item => item.slug === traitSlug!);
  const acceptedValue = values.data && values.data.find(item => item.contentStatus === "accepted");
  const proposedValues = values.data && values.data.filter(item => item.contentStatus === "proposed");
  
  return (
    <QueryLoader {...traitValuesQueryOptions}>
      {plant.data && trait && acceptedValue && proposedValues &&
      <Container size={1000}>
        <UnstyledButton onClick={() => navigate(`/plants/${plantId}`)}>
          <Text fs="italic" fz="h3" pb={15}>{plant.data.acceptedTaxonName}</Text>
        </UnstyledButton>
        <Text fz="h3" pb={15}>
          [{acceptedValue.sectionName}]&nbsp;
          <UnstyledButton fz="h3" fw={600} onClick={() => navigate(`/plants/${plantId}/trait/${traitSlug}`)}>
            {acceptedValue.traitName}
          </UnstyledButton> - <Text span inherit fw={600}>Proposta de Alteração</Text>
        </Text>
        <AcceptedValue data={acceptedValue} />
        <ValueProposalForm plant={plant.data} trait={trait} acceptedValue={acceptedValue} proposedValues={proposedValues} proposedValuesQueryKey={traitValuesQueryOptions.queryKey} />
      </Container>}
    </QueryLoader>
  )
}

function ValueProposalForm({plant, trait, acceptedValue, proposedValues, proposedValuesQueryKey}: {plant: PlantReadData, trait: TraitReadData, acceptedValue: TraitValueReadData, proposedValues: TraitValueReadData[], proposedValuesQueryKey: string[] }) {
  const [opened, {open, close}] = useDisclosure(false);
  const [selectedSource, setSelectedSource] = useState<SourceReadData>();
  const navigate = useNavigate();
    
  const queryClient = useQueryClient();

  const sourcesQueryOptions = {
    queryKey: ['sourceList'],
    queryFn: getSourceList,
  }
  const sources = useQuery(sourcesQueryOptions);

  const sourceOptions = sources.data ? sources.data.map((source: SourceReadData) => ({
    value: source.id.toString(),
    label: `[${source.id}] "${source.title}" (${source.year})`
  })) : [];

  const setSelectedSourceById = async (id: number) => {
    const data = await queryClient.fetchQuery(sourcesQueryOptions);
    setSelectedSource(data.find(source => source.id === id));
  }

  const traitValueCreation = useMutation({
    mutationFn: createTraitValue,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: proposedValuesQueryKey });
      navigate("..", {relative: "path"});
    },
    onError: showMutationError
  });

  const initialTraitValue = traitValueToTraitValueField(trait.type, acceptedValue.value);

  const validateTraitValue = (proposedValue: TraitValueField) => {
    const value = traitValueFieldToTraitValue(trait.type, proposedValue);
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
        if (range.minimum >= range.maximum) return 'O valor mínimo precisa ser menor que o valor máximo';
        if (range.minimum < trait.numericValueMin) return 'Valor mínimo abaixo do limite permitido';
        if (range.minimum > trait.numericValueMax) return 'Valor máximo acima do limite permitido';
        return null;
    }
  };

  const valueField = useField<TraitValueField>({
    initialValue: initialTraitValue,
    validate: (value) => validateTraitValue(value)
  });

  const sourceField = useField<string | undefined>({
    mode: 'controlled',
    initialValue: undefined,
    onValueChange: (value) => {
      setSelectedSourceById(Number(value));
    },
    validate: isNotEmpty('Campo obrigatório')
  });

  const commentMaxChars = 300;
  const commentField = useField<string | undefined>({
    mode: 'controlled',
    initialValue: undefined,
    validateOnChange: true,
    validate: (value) => {
      if (value && value.length > commentMaxChars) return 'Comentário ultrapassa o limite máximo de caracteres';
      return null;
    }
  });

  const handleNewSourceButtonClick = () => {
    setSelectedSource(undefined);
    sourceField.reset;
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
    if (valueError || sourceError || commentError) {
      throw showError("Há campos inválidos no formulário.", "Erro");
    } else {
      traitValueCreation.mutate({
        plantId: plant.id,
        traitId: trait.id,
        value: traitValueFieldToTraitValue(trait.type, valueField.getValue()),
        sourceId: Number(sourceField.getValue()),
        contentProposerComment: commentField.getValue(),
      });
    }
  }
  
  const divider = <Divider mt={25} mb={15} />;
  const comment = commentField.getValue();
  const commentLength = comment ? comment.length : 0;

  return (
    <>
    <Paper withBorder style={{ backgroundColor: "#f0f2f2" }} ta="center" p={15} mb={10}>
      <Text fz="h5" fw={600} pb={10}>Versão proposta</Text>
      <TraitValueInput trait={trait} field={valueField} aria-label="Versão proposta"/>
      {["range", "boolean"].includes(trait.type) && 
      <Text size="xs" c="red">{valueField.error}</Text>}
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
        <Text size="xs" c={commentLength > commentMaxChars ? "red" : "dimmed"} pt={5} aria-label="Comentário opcional">
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

function AcceptedValue({ data }: { data: TraitValueReadData }) {
  return (
    <Paper withBorder style={{ backgroundColor: "#bef7ce" }} ta="center" p={15} mb={10}>
      <Text fz="h5" fw={600} pb={10}>Versão aceita</Text>
      <TraitValueDisplay data={data}/>
    </Paper>
  )
}
