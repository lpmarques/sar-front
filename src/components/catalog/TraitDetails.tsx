import { useParams, useNavigate, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, Container, Grid, List, Paper, Space, Table, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { QueryLoader } from '../common/QueryLoader';
import {
  getPlant,
  getPlantTraitValueList,
  Source,
  sourceTypeToText,
  TraitValueReadData,
} from '../../apis/catalog';
import { UserReadData } from '../../apis/core';
import { useLanguage } from '../../hooks/useLanguage';
import { StickyHeaderTable, TraitValue } from '.';

export default function TraitDetails() {
  const { plantId, traitKey } = useParams();

  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  const traitValuesQueryOptions = {
    queryKey: ['traitValues', plantId!, `trait_keys=${traitKey}`],
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
        <Text fs="italic" fz="h3" pb={15}>{plant.data.acceptedScientificName}</Text>
        <Text fz="h3" pb={15}><Text span inherit fw={600}>{acceptedValue.traitName}</Text> ({acceptedValue.sectionName})</Text>
        <Grid columns={10} justify="space-between" mb={15}>
          <Grid.Col span={{base: 10, sm: 4}}>
            <AcceptedValue data={acceptedValue} />
            <Space h={15} />
            <AcceptedValueEndorsements data={acceptedValue} />
          </Grid.Col>
          <Grid.Col span={{base: 10, sm: 6}}>
            <AcceptedValueSource data={acceptedValue.source!} />
          </Grid.Col>
        </Grid>
        <ValueHistory data={everAcceptedValues} />
        <Space h={15} />
        <ValueChangeProposals data={proposedValues} />
      </Container>}
    </QueryLoader>
  )
}

function SourceContent({ data }: { data: Source }) {
  return (
    <>
      <Text pb={10}><Text span c="dimmed">Tipo:</Text> <span>{sourceTypeToText[data.type]}</span></Text>
      <Text pb={10}><Text span c="dimmed">Título:</Text> <span>{data.publicationTitle}</span></Text>
      <Text pb={10}><Text span c="dimmed">Ano:</Text> <span>{data.year}</span></Text>
      {data.publicationAuthors && <Text pb={10}><Text span c="dimmed">Autores:</Text> <span>{data.publicationAuthors.join("; ")}</span></Text>}
      <Text pb={10}><Text span c="dimmed">Publicado por:</Text> <span>{data.publisher}</span></Text>
    </>
  )
}

function SourceRef({ source }: { source: Source }) {
  const openSourceContentModal = () => modals.open({
    title: `Fonte [${source.id}]`,
    children: <SourceContent data={source}/>
  })

  return (
    <Link to="." onClick={openSourceContentModal}>[{source.id}]</Link>
  )
}

function UserName({ user }: { user: UserReadData }) {
  return (
    <Link to={`/users/${user.id}`} target="_blank">{user.firstName} {user.lastName}</Link>
  )
}

function AcceptedValue({ data }: { data: TraitValueReadData }) {
  return (
    <>
    <Paper withBorder ta="center" p={15}>
      <Text fz="h5" fw={600} pb={10}>Versão aceita</Text>
      <TraitValue data={data}/>
    </Paper>
    </>
  )
}

function AcceptedValueSource({ data }: { data: Source }) {
  return (
    <Paper withBorder p={15}>
      <Text fz="h5" ta="center" fw={600} pb={10}>Fonte</Text>
      <SourceContent data={data} />
    </Paper>
  )
}

function AcceptedValueEndorsements({ data }: { data: TraitValueReadData }) {
  return (
    <Paper withBorder ta="center" p={15}>
      <Text fz="h5" fw={600} pb={10}>Confirmações</Text>
      <Text fz="h2">{data.endorsements}</Text>
    </Paper>
  )
}

function ValueHistory({ data }: { data: TraitValueReadData[] }) {
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
        <SourceRef source={item.source!}/>
      </Table.Td>
      <Table.Td>
        <UserName user={item.contentAuthor!} />
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

function ValueChangeProposals({ data }: { data: TraitValueReadData[] }) {
  const { lang } = useLanguage();

  const sortedValues = data.sort((a, b) =>
    b.acceptedAt!.localeCompare(a.createdAt!)
  );

  const header = (
      <Table.Tr>
        <Table.Th fz="h6" fw={550} w={200}>Proposta</Table.Th>
        <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
        <Table.Th fz="h6" fw={550}>Confirmações</Table.Th>
        <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
        <Table.Th fz="h6" fw={550}>Proposta em</Table.Th>
      </Table.Tr>
  );
  
  const rows = sortedValues.map((item: TraitValueReadData) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <TraitValue data={item}/>
      </Table.Td>
      <Table.Td>
        <SourceRef source={item.source!}/>
      </Table.Td>
      <Table.Td>{item.endorsements}</Table.Td>
      <Table.Td>
        <UserName user={item.contentAuthor!} />
      </Table.Td>
      <Table.Td>{new Date(item.createdAt!).toLocaleDateString(lang)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p={15} mb={25}>
      <Text fz="h5" fw={600} pb={10}>Propostas de alteração</Text>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={220} />
    </Paper>
  )
}
