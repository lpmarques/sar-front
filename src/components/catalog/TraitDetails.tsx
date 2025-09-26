import { useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, Grid, Group, List, Paper, Space, Table, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCircleDashedPlus, IconInfoCircle, IconTrash, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteTraitValue,
  getPlant,
  getPlantTraitValueList,
  PlantReadData,
  TraitValueReadData,
} from '../../apis/catalog';
import { QueryOptions, showMutationError } from '../../apis/common';
import { showError, showSuccess } from '../common/notifications';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { UserAvatar } from '../user/';
import ClickableText from '../common/ClickableText';
import ClickableRow from '../common/ClickableRow';
import { EndorsementCounter, SourceDetails, SourceRef, TraitValueDisplay } from '.';

export default function TraitDetails() {
  const { plantId, traitSlug } = useParams();
  const navigate = useNavigate();

  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  const traitsQueryOptions = {
    queryKey: [
      'traitList',

    ]
  }
  const traitValuesQueryOptions = {
    queryKey: [
      'plantTraitValueList',
      plantId!,
      `trait_slugs=${traitSlug}`,
      'with_user_endorsement_info=true',
    ],
    queryFn: getPlantTraitValueList
  };

  const plant = useQuery(plantQueryOptions);
  const { data } = useQuery(traitValuesQueryOptions);

  const acceptedValue = data?.find(item => item.contentStatus === "accepted");
  const proposedValues = data ? data.filter(item => item.contentStatus === "proposed") : [];
  const everAcceptedValues = data ? data.filter(item => item.acceptedAt) : [];
  
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
        <ClickableText fs="italic" fz="h3" pb={15} onClick={() => navigate(`/plants/${plantId}`)}>
          {plant.data.acceptedTaxonName}
        </ClickableText>
        <Text fz="h3" pb={15}>
          [{acceptedValue.sectionName}] <Text span inherit fw={600}>{acceptedValue.traitName}</Text>
        </Text>
        <Grid columns={10} justify="space-between" mb={15}>
          <Grid.Col span={{base: 10, sm: 5}}>
            <AcceptedTraitValueDisplay data={acceptedValue} />
            <Space h={15} />
            <AcceptedValueEndorsements data={acceptedValue} />
          </Grid.Col>
          <Grid.Col span={{base: 10, sm: 5}}>
            <AcceptedValueSource sourceId={acceptedValue.sourceId!} />
          </Grid.Col>
        </Grid>
        <ValueHistory data={everAcceptedValues} />
        <Space h={15} />
        <ValueChangeProposals plant={plant.data} proposals={proposedValues} proposalsQueryOptions={traitValuesQueryOptions} />
      </Container>}
    </QueryLoader>
  )
}

export function AcceptedTraitValueDisplay({ data }: { data: TraitValueReadData }) {
  return (
    <>
    <Paper withBorder style={{ backgroundColor: "#bef7ce" }} ta="center" p={15}>
      <Text fz="h5" fw={600} pb={10}>Versão aceita</Text>
      <TraitValueDisplay data={data}/>
    </Paper>
    </>
  )
}

function AcceptedValueSource({ sourceId }: { sourceId: number }) {
  return (
    <Paper withBorder p={15}>
      <Text fz="h5" ta="center" fw={600} pb={10}>Fonte</Text>
      <SourceDetails sourceId={sourceId} />
    </Paper>
  )
}

function AcceptedValueEndorsements({ data }: { data: TraitValueReadData }) {
  return (
    <Tooltip withArrow label="Se concorda com essa versão, deixe o seu jóinha." position="bottom">
      <Paper withBorder ta="center" p={15}>
        <Text fz="h5" fw={600} pb={10}>Aprovações</Text>
        <EndorsementCounter<TraitValueReadData>
          content={data}
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
        <SourceRef sourceId={item.sourceId!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserAvatar user={item.contentProposer!} size={40} />
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

function ValueChangeProposals({
  plant,
  proposals,
  proposalsQueryOptions
}: {
  plant: PlantReadData,
  proposals: TraitValueReadData[],
  proposalsQueryOptions: QueryOptions<TraitValueReadData[]>
}) {
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
      queryClient.invalidateQueries({ queryKey: proposalsQueryOptions.queryKey });
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

  const handleAddBarClick = () => {
    if (!user) {
      showError("É preciso estar logado para executar essa ação.", null);
      window.open('/login', '_blank');
      return;
    }

    navigate('edit');
  }

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
        <SourceRef sourceId={item.sourceId!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserAvatar user={item.contentProposer!} fz="sm" size={40} />
      </Table.Td>
      <Table.Td>{new Date(item.proposedAt!).toLocaleString(lang)}</Table.Td>
      <Table.Td>
        <Tooltip withArrow label="Se concorda com essa proposta, deixe o seu jóinha." position="bottom-start">
          <EndorsementCounter
            content={item}
            justify="left"
            textProps={{"fz": "xl"}}
            iconProps={{"size": 22}}
          />
        </Tooltip>
      </Table.Td>
      <Table.Td>
        { user?.id === item.contentProposer?.id &&
        <Button variant="outline" size="compact-xs" color="red" onClick={() => openProposalDeleteConfirmModal(item)}>
          <IconTrash size={15} />
        </Button>}
      </Table.Td>
    </Table.Tr>
  ));

  rows.push(
    <ClickableRow key={0} onClick={() => handleAddBarClick()}>
      <Table.Td colSpan={10} align="center">
        <IconCircleDashedPlus color="var(--mantine-color-gray-5)" size={35}/>
      </Table.Td>
    </ClickableRow>
  )

  return (
    <Paper withBorder p={15} mb={25}>
      <Text fz="h5" fw={600} pb={10}>Propostas de alteração</Text>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={220} />
    </Paper>
  )
}
