import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, Container, Grid, List, Paper, Space, Table, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCircleDashedPlus, IconInfoCircle } from '@tabler/icons-react';
import { QueryLoader } from '../common/QueryLoader';
import {
  getPlant,
  getPlantTraitValueList,
  TraitValueReadData,
} from '../../apis/catalog';
import { SourceReadData } from '../../apis/core';
import { useLanguage } from '../../hooks/useLanguage';
import { UserName } from '../user/';
import { EndorsementCounter, SourceContent, SourceRef, StickyHeaderTable, TraitValue } from '.';
import classes from '../common/Clickable.module.css';

export default function TraitDetails() {
  const { plantId, traitKey } = useParams();
  const navigate = useNavigate();

  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  const traitValuesQueryOptions = {
    queryKey: ['plantTraitValueList', plantId!, `trait_keys=${traitKey}`],
    queryFn: getPlantTraitValueList
  };

  const plant = useQuery(plantQueryOptions);
  const { data } = useQuery(traitValuesQueryOptions);
  let acceptedValue: TraitValueReadData | undefined;
  let proposedValues: TraitValueReadData[] = [];
  let everAcceptedValues: TraitValueReadData[] = [];
  if (data) {
    acceptedValue = data.find(item => item.contentStatus === "accepted");
    proposedValues = data.filter(item => item.contentStatus === "proposed");
    everAcceptedValues = data.filter(item => item.acceptedAt);
  }
  
  return (
    <QueryLoader {...traitValuesQueryOptions}>
      {plant.data && acceptedValue &&
      <Container size={1000}>
        {/* TODO: adicionar descrição para cada traço e opções de valores
         <Alert variant="light" color="blue" title="Ciclo de vida" icon={<IconInfoCircle />}>
          <Text fz="md" pb={10}>Diz respeito ao tempo de vida da planta, podendo assumir uma das seguintes categorias:</Text>
          <List>
            <List.Item fz="sm">anual, quando dura em torno de um ano;</List.Item>
            <List.Item fz="sm">bianual, quando dura em torno de dois anos;</List.Item>
            <List.Item fz="sm">perene, quando dura mais de dois anos.</List.Item>
          </List>
        </Alert> */}
        {/* <Space h={20} /> */}
        <UnstyledButton onClick={() => navigate(`/plants/${plantId}`)}>
          <Text fs="italic" fz="h3" pb={15}>{plant.data.acceptedScientificName}</Text>
        </UnstyledButton>
        <Text fz="h3" pb={15}><Text span inherit fw={600}>{acceptedValue.traitName}</Text> ({acceptedValue.sectionName})</Text>
        <Grid columns={10} justify="space-between" mb={15}>
          <Grid.Col span={{base: 10, sm: 4}}>
            <AcceptedValue data={acceptedValue} />
            <Space h={15} />
            <AcceptedValueEndorsements data={acceptedValue} dataQueryKey={traitValuesQueryOptions.queryKey} />
          </Grid.Col>
          <Grid.Col span={{base: 10, sm: 6}}>
            <AcceptedValueSource data={acceptedValue.source!} />
          </Grid.Col>
        </Grid>
        <ValueHistory data={everAcceptedValues} dataQueryKey={traitValuesQueryOptions.queryKey} />
        <Space h={15} />
        <ValueChangeProposals data={proposedValues} dataQueryKey={traitValuesQueryOptions.queryKey} />
      </Container>}
    </QueryLoader>
  )
}

function AcceptedValue({ data }: { data: TraitValueReadData }) {
  return (
    <>
    <Paper withBorder style={{ backgroundColor: "#bef7ce" }} ta="center" p={15}>
      <Text fz="h5" fw={600} pb={10}>Versão aceita</Text>
      <TraitValue data={data}/>
    </Paper>
    </>
  )
}

function AcceptedValueSource({ data }: { data: SourceReadData }) {
  return (
    <Paper withBorder p={15}>
      <Text fz="h5" ta="center" fw={600} pb={10}>Fonte</Text>
      <SourceContent data={data} />
    </Paper>
  )
}

function AcceptedValueEndorsements({ data, dataQueryKey }: { data: TraitValueReadData, dataQueryKey: string[] }) {
  return (
    <Tooltip withArrow label="Se concorda com essa versão, deixe o seu jóinha." position="bottom">
      <Paper withBorder ta="center" p={15}>
        <Text fz="h5" fw={600} pb={10}>Aprovações</Text>
        <EndorsementCounter
          contentType="plant_value"
          contentId={data.id}
          initialCount={{"value": data.endorsements!, "queryKey": dataQueryKey}}
          countTextProps={{"fz": "h2"}}
        />
      </Paper>
    </Tooltip>
  )
}

function ValueHistory({ data, dataQueryKey }: { data: TraitValueReadData[], dataQueryKey: string[] }) {
  const { lang } = useLanguage();

  const sortedValues = data.sort((a, b) =>
    b.acceptedAt!.localeCompare(a.acceptedAt!)
  );

  const header = (
    <Table.Tr>
      <Table.Th fz="h6" fw={550} w={200}>Versão</Table.Th>
      <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
      <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
      <Table.Th fz="h6" fw={550}>Proposta em</Table.Th>
      <Table.Th fz="h6" fw={550}>Aceita em</Table.Th>
      <Table.Th fz="h6" fw={550}>Substituída em</Table.Th>
    </Table.Tr>
  );
  
  const rows = sortedValues.map((item: TraitValueReadData) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <TraitValue data={item}/>
      </Table.Td>
      <Table.Td>
        <SourceRef source={item.source!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserName user={item.contentAuthor!} fz="sm" />
      </Table.Td>
      <Table.Td>{new Date(item.createdAt!).toLocaleDateString(lang)}</Table.Td>
      <Table.Td>{new Date(item.acceptedAt!).toLocaleDateString(lang)}</Table.Td>
      <Table.Td>{item.rejectedAt && new Date(item.rejectedAt).toLocaleDateString(lang)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p={15}>
      <Text fz="h5" fw={600} pb={10}>Histórico de versões</Text>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={220} />
    </Paper>
  )
}

function ValueChangeProposals({ data, dataQueryKey }: { data: TraitValueReadData[], dataQueryKey: string[] }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const sortedValues = data.sort((a, b) =>
    b.acceptedAt!.localeCompare(a.createdAt!)
  );

  const header = (
    <Table.Tr>
      <Table.Th fz="h6" fw={550} w={200}>Proposta</Table.Th>
      <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
      <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
      <Table.Th fz="h6" fw={550}>Proposta em</Table.Th>
      <Table.Th fz="h6" fw={550}>Aprovações</Table.Th>
    </Table.Tr>
  );
  
  const rows = sortedValues.map((item: TraitValueReadData) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <TraitValue data={item}/>
      </Table.Td>
      <Table.Td>
        <SourceRef source={item.source!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserName user={item.contentAuthor!} fz="sm" />
      </Table.Td>
      <Table.Td>{new Date(item.createdAt!).toLocaleDateString(lang)}</Table.Td>
      <Table.Td>
        <EndorsementCounter
          contentType="plant_value"
          contentId={item.id}
          initialCount={{"value": item.endorsements!, "queryKey": dataQueryKey}}
        />
      </Table.Td>
    </Table.Tr>
  ));

  rows.push(
    <Table.Tr key={0}>
      <Table.Td colSpan={5} align="center" onClick={() => navigate('edit')} className={classes.row}>
        <IconCircleDashedPlus className={classes.icon} size={35}/>
      </Table.Td>
    </Table.Tr>
  )

  return (
    <Paper withBorder p={15} mb={25}>
      <Text fz="h5" fw={600} pb={10}>Propostas de alteração</Text>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={220} />
    </Paper>
  )
}
