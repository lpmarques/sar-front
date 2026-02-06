import { useParams, useNavigate } from 'react-router';
import { Accordion, Alert, Button, Container, Grid, List, Paper, Space, Table, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAlertHexagon, IconCheckbox, IconEyeQuestion, IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  rejectTraitValue,
  getPlant,
  getPlantTraitValueList,
  getTraitList,
  PlantReadData,
  TraitReadData,
  TraitValueReadData,
  acceptTraitValue,
} from '../../apis/catalog';
import { QueryOptions, showMutationError } from '../../apis/common';
import { showError, showSuccess } from '../common/notifications';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { EndorsementCounter, UserAvatar } from '../user/';
import ClickableText from '../common/ClickableText';
import { SourceDetails, SourceRef, TraitValueDisplay } from '.';
import AddRow from '../common/AddRow';
import LoaderRow from '../common/LoaderRow';
import classes from '../common/AccordionPlusChevron.module.css';

export default function TraitDetails() {
  const { plantId, traitSlug } = useParams();
  const navigate = useNavigate();

  const plantQueryOptions = {
    queryKey: ['plant', plantId!, 'status=accepted,proposed'],
    queryFn: getPlant,
  };
  const traitsQueryOptions = {
    queryKey: ['traitList', `trait_slugs=${traitSlug}`],
    queryFn: getTraitList,
  };
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
  const traits = useQuery(traitsQueryOptions);
  const traitValues = useQuery(traitValuesQueryOptions);

  const trait = traits.data ? traits.data[0] : undefined;
  const acceptedValue = traitValues.data?.find(item => item.contentStatus === "accepted");
  const proposedValues = traitValues.data?.filter(item => item.contentStatus === "proposed") ?? [];
  const everAcceptedValues = traitValues.data?.filter(item => item.acceptedAt) ?? [];
  
  const callToActionMsg = proposedValues.length > 0 ?
    "Nos ajude adicionando sua proposta abaixo ou avaliando propostas de outros usuários." :
    "Nos ajude adicionando sua proposta abaixo.";

  return (
    <QueryLoader {...traitValuesQueryOptions}>
      {plant.data && trait &&
      <Container size={1000}>
        <TraitInfo trait={trait} />
        <Space h={20} />
        <ClickableText fs="italic" fz="h3" pb={15} onClick={() => navigate(`/plants/${plantId}`)}>
          {plant.data.acceptedTaxonName}
        </ClickableText>
        <Text fz="h3" pb={15}>
          [{trait.sectionName}] <Text span inherit fw={600}>{trait.name}</Text>
        </Text>
        {acceptedValue ? <>
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
        <AcceptedValueHistory data={everAcceptedValues} />
        <Space h={15} />
        <Alert variant="light" color="gray" icon={<IconEyeQuestion />}>
          <Text pb={10}>Não concorda com a informação apresentada?</Text>
          <Text pb={10}>{callToActionMsg}</Text>
        </Alert>
        </> : 
        <Alert variant="light" color="red" title="Informação pendente" icon={<IconAlertHexagon />}>
          <Text pb={10}>Ainda não temos uma versão aceita do traço "{trait.name}" para {plant.data.acceptedTaxonName}.</Text>
          <Text pb={10}>{callToActionMsg}</Text>
        </Alert>}
        <Space h={15} />
        <ProposedValues plant={plant.data} proposals={proposedValues} proposalsQueryOptions={traitValuesQueryOptions} />
      </Container>}
    </QueryLoader>
  )
}

export function TraitInfo({ trait }: { trait: TraitReadData }) {

  const traitDesc = trait?.description ? <Text fz="md" pb={10}>{trait.description}</Text> : <></>;
  const textOptionDescItems = trait?.textValueOptions.map(opt => (
    <List.Item fz="sm">
      <Text span fz={13} fw={600}>{opt.value.toUpperCase()}</Text>{opt.description ? `: ${opt.description}` : ""}
    </List.Item>
  )) ?? [];
  const textQuantityClause = trait.type === "string" ? "somente um" : "um ou mais";

  return (
    <Alert variant="light" color="blue" title={trait.name} icon={<IconInfoCircle />}>
      { textOptionDescItems.length === 0 ? traitDesc : 
      <Accordion
        variant="unstyled"
        classNames={{ chevron: classes.chevron }}
        chevron={<IconPlus size={16} />}
      >
        <Accordion.Item value="default">
          <Accordion.Control>{traitDesc}</Accordion.Control>
          <Accordion.Panel>
            <Text fz="md" pb={10}>Cada planta no Catálogo pode apresentar <Text span fw={600}>{textQuantityClause}</Text> dos seguintes valores para esse traço:</Text>
            <List>{textOptionDescItems}</List>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>}
    </Alert>
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
        <Text fz="h5" fw={600} pb={10}>Apoios</Text>
        <EndorsementCounter<TraitValueReadData>
          content={data}
        />
      </Paper>
    </Tooltip>
  )
}

function AcceptedValueHistory({ data }: { data: TraitValueReadData[] }) {
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

function ProposedValues({
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

  const proposalsQuery = useQuery(proposalsQueryOptions);

  const sortedValues = proposals.sort((a, b) =>
    b.proposedAt!.localeCompare(a.proposedAt!)
  );

  const proposalRejection = useMutation({
    mutationFn: rejectTraitValue,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: proposalsQueryOptions.queryKey });
    },
    onError: showMutationError
  });

  const proposalAcceptance = useMutation({
    mutationFn: acceptTraitValue,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: proposalsQueryOptions.queryKey });
    },
    onError: showMutationError
  });

  const openProposalRejectConfirmModal = (proposal: TraitValueReadData) => modals.openConfirmModal({
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
    onConfirm: () => proposalRejection.mutate(proposal.id),
  });

  const openProposalAcceptConfirmModal = (proposal: TraitValueReadData) => modals.openConfirmModal({
    title: 'Deseja mesmo aceitar essa proposta?',
    children: (
      <>
      <Text size="sm" mb={20}>
          Ao confirmar, você <strong>aceitará</strong> a seguinte proposta para 
          o traço <Text span fw={600}>{proposal.traitName}</Text>
          &nbsp;da planta <Text span fs="italic" fw={600}>{plant.acceptedTaxonName}:</Text>
      </Text>
      <Container ta="center" px={0} mb={40}>
        <TraitValueDisplay data={proposal}/>
      </Container>
      </>
    ),
    labels: { confirm: 'Aceitar', cancel: 'Cancelar aceite' },
    confirmProps: { color: 'green' },
    onConfirm: () => proposalAcceptance.mutate(proposal.id),
  });

  const handleAddRowClick = () => {
    if (!user) {
      showError("É preciso estar logado para executar essa ação.", null);
      return navigate('/login');
    }

    navigate('edit');
  };

  const header = (
    <Table.Tr>
      <Table.Th fz="h6" fw={550} w={200}>Proposta</Table.Th>
      <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
      <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
      <Table.Th fz="h6" fw={550}>Proposta em</Table.Th>
      <Table.Th fz="h6" fw={550} w={170}>Apoios</Table.Th>
      <Table.Th w={80}></Table.Th>
    </Table.Tr>
  );
  
  const rows = proposalsQuery.isFetching || proposalRejection.isPending ? [
    <LoaderRow colSpan={6}/>
  ] : sortedValues.map((item: TraitValueReadData) => (
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
        { (user?.isStaff || user?.id === item.contentProposer?.id) &&
        <Button title="Rejeitar proposta" variant="outline" size="compact-xs" color="red" onClick={() => openProposalRejectConfirmModal(item)}>
          <IconTrash size={15} />
        </Button>}
      </Table.Td>
      <Table.Td>
        { user?.isStaff &&
        <Button title="Aceitar proposta" variant="outline" size="compact-xs" color="green" onClick={() => openProposalAcceptConfirmModal(item)}>
          <IconCheckbox size={15} />
        </Button>}
      </Table.Td>
    </Table.Tr>
  ));

  rows.push(
    <Tooltip key={0} withArrow label="Clique para adicionar uma nova proposta." position="bottom" >
      <AddRow colSpan={6} onClick={() => handleAddRowClick()} />
    </Tooltip>
  );

  return (
    <Paper withBorder p={15} mb={25}>
      <Text fz="h5" fw={600} pb={10}>Outras propostas</Text>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={220} />
    </Paper>
  )
}
