import { useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, ContainerProps, Paper, Space, Table, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAlertHexagon, IconEyeQuestion, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlant,
  NaturalOccurrenceRegionReadData,
  NaturalOccurrenceRegionWriteRequestData,
  PlantReadData,
  PopularNameReadData,
  PopularNameWriteRequestData,
  TaxonReadData,
  TaxonWriteRequestData,
} from '../../apis/catalog';
import { showMutationError } from '../../apis/common';
import { ContentReadData, ContentWriteRequestData } from '../../apis/core';
import ClickableText from '../common/ClickableText';
import { showError, showSuccess } from '../common/notifications';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { UserAvatar } from '../user';
import { SectionConfig, getSectionConfig, SectionSlug } from './SectionConfigs';
import { EndorsementCounter, SourceRef } from '.';
import AddRow from '../common/AddRow';
import LoaderRow from '../common/LoaderRow';

export default function SectionDetails() {
  const { plantId, sectionSlug } = useParams();

  const plantQueryOptions = {
    queryKey: ['plant', plantId!, 'status=accepted,proposed'],
    queryFn: getPlant,
  };

  const plant = useQuery(plantQueryOptions);
  const sectionConfig = getSectionConfig(sectionSlug as SectionSlug);
  
  return (
    <QueryLoader {...plantQueryOptions}>
      {plant.data && sectionConfig &&
      <>
        {sectionSlug === "taxonomy" ?
        <SectionDetailsBody<TaxonReadData, TaxonWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<TaxonReadData, TaxonWriteRequestData>}
          size={1000}
          /> : 
        sectionSlug === "popular-names" ? 
        <SectionDetailsBody<PopularNameReadData, PopularNameWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<PopularNameReadData, PopularNameWriteRequestData>}
          size={600}
          /> : 
        sectionSlug === "natural-occurrence-regions" ? 
        <SectionDetailsBody<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>}
          size={1000}
          /> : 
        <></>}
      </>}
    </QueryLoader>
  )
}

interface SectionDetailsBodyProps<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData> extends ContainerProps {
  plant: PlantReadData,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}

function SectionDetailsBody<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plant,
  sectionConfig,
  ...containerProps
}: SectionDetailsBodyProps<ReadT, WriteT>) {
  const navigate = useNavigate();

  return (
    <Container {...containerProps}>
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
      <ClickableText fs="italic" fz="h3" pb={15} onClick={() => navigate(`/plants/${plant.id}`)}>
        {plant.acceptedTaxonName}
      </ClickableText>
      <Text fz="h3" pb={15}>
        <Text span inherit fw={600}>{sectionConfig.sectionName}</Text>
      </Text>
      <AcceptedItems<ReadT, WriteT>
        plant={plant}
        sectionConfig={sectionConfig}
        />
      <Space h={15} />
      <ProposedItems<ReadT, WriteT>
        plant={plant}
        sectionConfig={sectionConfig}
        />
    </Container>
  )
}

export function AcceptedItems<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plant,
  sectionConfig,
}: {
  plant: PlantReadData,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}) {
  const itemsQueryOptions = sectionConfig.buildQueryOptions(plant.id);

  const { lang } = useLanguage();
  const { data } = useQuery(itemsQueryOptions);

  const acceptedItems = data ? data.filter(item => item.contentStatus === "accepted") : [];
  const proposedItems = data ? data.filter(item => item.contentStatus === "proposed") : [];

  const sortedItems = acceptedItems.sort((a, b) => 
    sectionConfig.sortReadData && sectionConfig.sortReadData(a, b) || a.acceptedAt!.localeCompare(b.acceptedAt!)
  );
  
  const header = (
    <Table.Tr>
      <sectionConfig.Header />
      <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
      <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
      <Table.Th fz="h6" fw={550}>Aceita em</Table.Th>
      <Table.Th fz="h6" fw={550} w={170}>Aprovações</Table.Th>
    </Table.Tr>
  );
  
  const rows = sortedItems.map((item) => (
    <Table.Tr key={item.contentId}>
      <sectionConfig.DisplayRow data={item} style={{backgroundColor: "#bef7ce"}} />
      <Table.Td>
        <SourceRef sourceId={item.sourceId!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserAvatar user={item.contentProposer!} size={40}/>
      </Table.Td>
      <Table.Td>{new Date(item.acceptedAt!).toLocaleString(lang)}</Table.Td>
      <Table.Td>
        <Tooltip withArrow label="Se concorda com esse item, deixe o seu jóinha." position="bottom-start">
          <EndorsementCounter<ReadT>
            content={item}
            justify="left"
            textProps={{fz: "xl"}}
            iconProps={{size: 22}}
            />
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));
  
  const callToActionMsg = proposedItems.length > 0 ?
    "Nos ajude adicionando sua proposta abaixo ou avaliando propostas de outros usuários." :
    "Nos ajude adicionando sua proposta abaixo.";

  return (
    <QueryLoader {...itemsQueryOptions}>
      {acceptedItems.length > 0 ?
      <>
      <Paper withBorder p={15}>
        <Text fz="h5" fw={600} pb={10}>Itens aceitos</Text>
        <StickyHeaderTable
          header={header}
          rows={rows}
          scrollWidth={(sectionConfig.formKeys.length+2)*125}
          scrollHeight={250}
          withRowBorders={false}
        />
      </Paper>
      <Space h={15} />
      <Alert variant="light" color="gray" icon={<IconEyeQuestion />}>
        <Text pb={10}>Não concorda com a informação apresentada?</Text>
        <Text pb={10}>{callToActionMsg}</Text>
      </Alert>
      </> :
      <Alert variant="light" color="red" title="Informação pendente" icon={<IconAlertHexagon />}>
        <Text pb={10}>Ainda não temos itens aceitos de "{sectionConfig.sectionName}" para {plant.acceptedTaxonName}.</Text>
        <Text pb={10}>{callToActionMsg}</Text>
      </Alert>}
    </QueryLoader>
  )
}

function ProposedItems<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plant,
  sectionConfig,
}: {
  plant: PlantReadData,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const itemsQueryOptions = sectionConfig.buildQueryOptions(plant.id);
  const itemsQuery = useQuery(itemsQueryOptions);

  const proposals = itemsQuery.data ? itemsQuery.data.filter(item => item.contentStatus === "proposed") : [];

  const sortedValues = proposals.sort((a, b) =>
    b.proposedAt!.localeCompare(a.proposedAt!)
  );

  const proposalDeletion = useMutation({
    mutationFn: sectionConfig.deleteMutationFunction,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: itemsQueryOptions.queryKey });
    },
    onError: showMutationError
  });

  const openProposalDeleteConfirmModal = (proposal: ReadT) => modals.openConfirmModal({
    title: 'Deseja mesmo excluir essa proposta?',
    children: (
      <>
      <Text size="sm" mb={20}>
          Ao confirmar, você <strong>removerá</strong> a seguinte 
          proposta para a seção <Text span fw={600}>{sectionConfig.sectionName}</Text>
          &nbsp;da planta <Text span fs="italic" fw={600}>{plant.acceptedTaxonName}:</Text>
      </Text>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <sectionConfig.Header />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <sectionConfig.DisplayRow data={proposal}/>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      </>
    ),
    labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
    confirmProps: { color: 'red' },
    onConfirm: () => proposalDeletion.mutate(proposal.contentId),
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
      <sectionConfig.Header />
      <Table.Th fz="h6" fw={550}>Fonte</Table.Th>
      <Table.Th fz="h6" fw={550}>Proponente</Table.Th>
      <Table.Th fz="h6" fw={550}>Proposta em</Table.Th>
      <Table.Th fz="h6" fw={550} w={120}>Aprovações</Table.Th>
      <Table.Th w={50}></Table.Th>
    </Table.Tr>
  );
  
  const rows = itemsQuery.isFetching || proposalDeletion.isPending ? [
      <LoaderRow colSpan={sectionConfig.formKeys.length+5}/>
    ] : sortedValues.map((item) => (
    <Table.Tr key={item.contentId}>
      <sectionConfig.DisplayRow data={item} />
      <Table.Td>
        <SourceRef sourceId={item.sourceId!} fz="sm" />
      </Table.Td>
      <Table.Td>
        <UserAvatar user={item.contentProposer!} size={40}/>
      </Table.Td>
      <Table.Td>{new Date(item.proposedAt!).toLocaleString(lang)}</Table.Td>
      <Table.Td>
        <Tooltip withArrow label="Se concorda com essa proposta, deixe o seu jóinha." position="bottom-start">
          <EndorsementCounter<ReadT>
            content={item}
            justify="left"
            textProps={{fz: "xl"}}
            iconProps={{size: 22}}
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
    <Tooltip key={0} withArrow label="Clique para adicionar uma nova proposta." position="bottom" >
      <AddRow colSpan={sectionConfig.formKeys.length+5} onClick={() => handleAddRowClick()} />
    </Tooltip>
  );

  return (
    <QueryLoader {...itemsQueryOptions}>
      <Paper withBorder p={15} mb={25}>
        <Text fz="h5" fw={600} pb={10}>Itens propostos</Text>
        <StickyHeaderTable
          header={header}
          rows={rows}
          scrollWidth={(sectionConfig.formKeys.length+2)*125}
          scrollHeight={250}
        />
      </Paper>
    </QueryLoader>
  )
}
