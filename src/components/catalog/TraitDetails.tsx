import { useParams, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Container, Grid, Group, List, Paper, Space, Table, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCircleDashedPlus, IconInfoCircle, IconX } from '@tabler/icons-react';
import { QueryLoader } from '../common/QueryLoader';
import {
  deleteTraitValue,
  getPlant,
  getPlantTraitValueList,
  PlantReadData,
  TraitValueReadData,
} from '../../apis/catalog';
import { SourceReadData, UserReadData } from '../../apis/core';
import { useLanguage } from '../../hooks/useLanguage';
import { UserName } from '../user/';
import { EndorsementCounter, SourceContent, SourceRef, StickyHeaderTable, TraitValueDisplay } from '.';
import classes from '../common/Clickable.module.css';
import { useAuth } from '../../hooks/useAuth';
import { showSuccess } from '../common/notifications';
import { showMutationError } from '../../apis/common';

export default function TraitDetails() {
  const { plantId, traitSlug } = useParams();
  const navigate = useNavigate();

  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  const traitValuesQueryOptions = {
    queryKey: ['plantTraitValueList', plantId!, `trait_slugs=${traitSlug}`],
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
          <Text fs="italic" fz="h3" pb={15}>{plant.data.acceptedTaxonName}</Text>
        </UnstyledButton>
        <Text fz="h3" pb={15}>
          [{acceptedValue.sectionName}] <Text span inherit fw={600}>{acceptedValue.traitName}</Text>
        </Text>
        <Grid columns={10} justify="space-between" mb={15}>
          <Grid.Col span={{base: 10, sm: 5}}>
            <AcceptedValue data={acceptedValue} />
            <Space h={15} />
            <AcceptedValueEndorsements data={acceptedValue} dataQueryKey={traitValuesQueryOptions.queryKey} />
          </Grid.Col>
          <Grid.Col span={{base: 10, sm: 5}}>
            <AcceptedValueSource data={acceptedValue.source!} />
          </Grid.Col>
        </Grid>
        <ValueHistory data={everAcceptedValues} />
        <Space h={15} />
        <ValueChangeProposals plant={plant.data} proposals={proposedValues} proposalsQueryKey={traitValuesQueryOptions.queryKey} />
      </Container>}
    </QueryLoader>
  )
}

function AcceptedValue({ data }: { data: TraitValueReadData }) {
  return (
    <>
    <Paper withBorder style={{ backgroundColor: "#bef7ce" }} ta="center" p={15}>
      <Text fz="h5" fw={600} pb={10}>Versão aceita</Text>
      <TraitValueDisplay data={data}/>
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
          contentId={data.contentId}
          contentProposer={data.contentProposer!}
          initialCount={{"value": data.endorsements!, "queryKey": dataQueryKey}}
        />
      </Paper>
    </Tooltip>
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
    <Table.Tr key={item.contentId}>
      <Table.Td>
        <TraitValueDisplay data={item}/>
      </Table.Td>
      <Table.Td>
        <SourceRef source={item.source!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserName user={item.contentProposer!} fz="sm" />
      </Table.Td>
      <Table.Td>{new Date(item.proposedAt!).toLocaleString(lang)}</Table.Td>
      <Table.Td>{new Date(item.acceptedAt!).toLocaleString(lang)}</Table.Td>
      <Table.Td>{item.rejectedAt && new Date(item.rejectedAt).toLocaleString(lang)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder p={15}>
      <Text fz="h5" fw={600} pb={10}>Histórico de versões</Text>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={220} />
    </Paper>
  )
}

function ValueChangeProposals({ plant, proposals, proposalsQueryKey }: { plant: PlantReadData, proposals: TraitValueReadData[], proposalsQueryKey: string[] }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sortedValues = proposals.sort((a, b) =>
    b.proposedAt!.localeCompare(a.proposedAt!)
  );

  const proposalDeletion = useMutation({
    mutationFn: deleteTraitValue,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: proposalsQueryKey });
    },
    onError: showMutationError
  });

  const openProposalDeleteConfirmModal = (proposal: TraitValueReadData) => modals.openConfirmModal({
    title: 'Deseja mesmo excluir essa proposta?',
    children: (
      <>
      <Text size="sm" mb={20}>
          Ao confirmar, você <strong>removerá</strong> a seguinte proposta para 
          o traço <Text span fw={600}>{proposal.traitName}</Text>
          &nbsp;da planta <Text span fs="italic" fw={600}>{plant.acceptedTaxonName}:</Text>
      </Text>
      <Container ta="center" px={0} mb={40}>
        <TraitValueDisplay data={proposal}/>
      </Container>
      </>
    ),
    labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
    confirmProps: { color: 'red' },
    onConfirm: () => proposalDeletion.mutate(proposal.contentId),
  })

  const header = (
    <Table.Tr>
      <Table.Th fz="h6" fw={550} w={200}>Proposta</Table.Th>
      <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
      <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
      <Table.Th fz="h6" fw={550}>Proposta em</Table.Th>
      <Table.Th fz="h6" fw={550} w={170}>Aprovações</Table.Th>
      <Table.Th w={80}></Table.Th>
    </Table.Tr>
  );
  
  const rows = sortedValues.map((item: TraitValueReadData) => (
    <Table.Tr key={item.contentId}>
      <Table.Td>
        <TraitValueDisplay data={item}/>
      </Table.Td>
      <Table.Td>
        <SourceRef source={item.source!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserName user={item.contentProposer!} fz="sm" />
      </Table.Td>
      <Table.Td>{new Date(item.proposedAt!).toLocaleString(lang)}</Table.Td>
      <Table.Td>
        <EndorsementCounter
          contentId={item.contentId}
          contentProposer={item.contentProposer!}
          initialCount={{"value": item.endorsements!, "queryKey": proposalsQueryKey}}
          justify="left"
          textProps={{"fz": "xl"}}
          iconProps={{"size": 22}}
        />
      </Table.Td>
      <Table.Td>
        { user?.id === item.contentProposer?.id &&
        <Button size="compact-xs" color="red" onClick={() => openProposalDeleteConfirmModal(item)}>
          <IconX size={15} />
        </Button>}
      </Table.Td>
    </Table.Tr>
  ));

  rows.push(
    <Table.Tr key={0}>
      <Table.Td colSpan={6} align="center" onClick={() => navigate('edit')} className={classes.row}>
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
