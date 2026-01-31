import { ReactElement, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Alert, Button, Center, Container, Group, Paper, SimpleGrid, Space, Table, Text } from '@mantine/core';
import { IconAlertHexagon, IconCheckbox, IconCircleDashedPlus, IconPencil, IconPencilOff, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  rejectPlant,
  getPlant,
  getPlantNaturalOccurrenceRegionList,
  getPlantPopularNameList,
  getPlantTaxonList,
  getPlantTraitValueList,
  getTaxonName,
  getTraitList,
  NaturalOccurrenceRegionReadData,
  PlantReadData,
  PopularNameReadData,
  TaxonReadData,
  TraitReadData,
  TraitValueReadData,
  acceptPlant,
} from "../../apis/catalog";
import classes from '../common/Clickable.module.css';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { useAuth, useStoredSearchParam } from "../../hooks";
import { sortNaturalOccurrenceRegions } from "./NaturalOccurrenceRegionsSection";
import { TraitValueDisplay } from '.';
import { showSuccess } from "../common/notifications";
import { QueryOptions, showMutationError } from "../../apis/common";
import { modals } from "@mantine/modals";

export default function PlantDetails() {
  const { plantId } = useParams();
  const [editMode, setEditMode] = useStoredSearchParam("edit", false);
  
  const plantQueryOptions = {
    queryKey: ['plant', plantId!, 'status=accepted,proposed'],
    queryFn: getPlant
  };
  const taxaQueryOptions = {
    queryKey: ['plantTaxonList', plantId!, 'status=accepted'],
    queryFn: getPlantTaxonList
  };
  const popularNamesQueryOptions = {
    queryKey: ['plantPopularNames', plantId!, 'status=accepted'],
    queryFn: getPlantPopularNameList 
  };
  const traitsQueryOptions = { 
    queryKey: ['traitList'],
    queryFn: getTraitList
  };
  const traitValuesQueryOptions = {
    queryKey: ['plantTraitValueList', plantId!, 'status=accepted'],
    queryFn: getPlantTraitValueList
  };
  const naturalOccurrenceRegionsQueryOptions = {
    queryKey: ['plantNaturalOccurrenceRegionList', plantId!, 'status=accepted'],
    queryFn: getPlantNaturalOccurrenceRegionList
  };
 
  const plant = useQuery(plantQueryOptions);
  const taxa = useQuery(taxaQueryOptions);
  const popularNames = useQuery(popularNamesQueryOptions);
  const traits = useQuery(traitsQueryOptions);
  const traitValues = useQuery(traitValuesQueryOptions);
  const naturalOccurrenceRegions = useQuery(naturalOccurrenceRegionsQueryOptions);

  useEffect(() => {
    if (plant.data?.contentStatus === "proposed" && !editMode)
      setEditMode(true);
  }, [plant.data?.contentStatus]);

  const sections = traits.data ? Object.fromEntries(traits.data.map(item => [item.sectionSlug!, item.sectionName!])): {};
  const traitSections = Object.entries(sections).reduce((acc: ReactElement[], [key, value]) => {
    let sectionTraitValues = traitValues.data ? traitValues.data.filter(item => item.sectionSlug === key) : [];
    if (sectionTraitValues.length > 0 || editMode) {
      acc.push(
        <TraitSection
          key={key}
          sectionName={value}
          traits={traits.data!.filter(item => item.sectionSlug === key)}
          traitValues={sectionTraitValues}
          editMode={editMode}
        />
      )
    }
    return acc;
  }, []);

  const { user } = useAuth();

  return (
    <QueryLoader {...plantQueryOptions}>
      {plant.data && 
      <Container size={1000}>
        <Group justify="space-between" pb={15}>
          <Text fz="h2" fs="italic" fw={600}>{plant.data.acceptedTaxonName}</Text>
          <Group>
            <EditButton editMode={editMode} setEditMode={setEditMode} />
            {plant.data.contentStatus === 'proposed' &&
            <>
              {(user?.isStaff || plant.data.contentProposer?.id === user?.id) && 
              <RejectButton plant={plant.data} queryOptions={plantQueryOptions} />}
              {user?.isStaff &&
              <AcceptButton plant={plant.data} queryOptions={plantQueryOptions} />}
            </>}
          </Group>
        </Group>
        {plant.data.contentStatus === 'proposed' && <>
        <Alert variant="light" color="red" title="Cadastro pendente" icon={<IconAlertHexagon />}>
          <Text pb={10}>Essa planta ainda consta com o status de <strong>proposta</strong> para o Catálogo.</Text>
          <Text pb={10}>Adicione mais informações sobre ela para aumentar suas chances de inclusão definitiva.</Text>
        </Alert>
        <Space h={15} />
        </>}
        <QueryLoader {...popularNamesQueryOptions}>
          {popularNames.data && (popularNames.data.length > 0 || editMode) &&
          <PopularNamesSection popularNames={popularNames.data!}/>}
        </QueryLoader>
        <QueryLoader {...taxaQueryOptions}>
          {taxa.data && (taxa.data.length > 0 || editMode) &&
          <TaxonomySection taxa={taxa.data}/>}
        </QueryLoader>
        <QueryLoader {...traitValuesQueryOptions}>
          {traitSections}
        </QueryLoader>
        <QueryLoader {...naturalOccurrenceRegionsQueryOptions}>
          {naturalOccurrenceRegions.data && (naturalOccurrenceRegions.data.length > 0 || editMode) &&
          <NaturalOccurrenceSection regions={naturalOccurrenceRegions.data}/>}
        </QueryLoader>
      </Container>}
    </QueryLoader>
  )
}

function EditButton({
  editMode,
  setEditMode,
}: {
  editMode: boolean,
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>,
}) {
  const Icon = editMode ? IconPencilOff : IconPencil;

  const handleEditButtonClick = () => {
    setEditMode(!editMode);
  };

  return (
    <Button variant="default" size="compact-md" color="dimmed" onClick={() => handleEditButtonClick()} style={classes}>
      <Icon />
      <Text fw={600}>&nbsp;
        {editMode ? 
        <>Sair do modo edição</> :
        <>Adicionar informações</>}
      </Text>
    </Button>
  )
}

function RejectButton({ plant, queryOptions }: { plant: PlantReadData, queryOptions: QueryOptions<PlantReadData> }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const proposalRejection = useMutation({
    mutationFn: rejectPlant,
    onSuccess: (data) => {
      queryClient.refetchQueries({ predicate: (query) => { return query.queryKey[0] === 'plantList' } });
      showSuccess(data.msg);
      navigate('/plants');
      queryClient.removeQueries({ queryKey: queryOptions.queryKey });
    },
    onError: showMutationError
  });

  const openProposalRejectConfirmModal = () => modals.openConfirmModal({
    title: 'Deseja mesmo excluir essa planta?',
    children: (
      <Text size="sm" mb={20}>
        Ao confirmar, você <strong>removerá</strong> a proposta de inclusão
        da planta <Text span fs="italic" fw={600}>{plant.acceptedTaxonName}</Text> no Catálogo, 
        junto com todos os seus dados.
      </Text>
    ),
    labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
    confirmProps: { color: 'red' },
    onConfirm: () => proposalRejection.mutate(plant.id),
  });

  return (
    <Button variant="outline" size="compact-md" color="red" onClick={() => openProposalRejectConfirmModal()}>
      <IconTrash size={20} />
      <Text fw={600}>&nbsp;
        Excluir planta
      </Text>
    </Button>
  )
}

function AcceptButton({ plant, queryOptions }: { plant: PlantReadData, queryOptions: QueryOptions<PlantReadData> }) {
  const queryClient = useQueryClient();
  
  const proposalAcceptance = useMutation({
    mutationFn: acceptPlant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'plantList' } });
      queryClient.refetchQueries({ queryKey: queryOptions.queryKey });
      showSuccess(data.msg);
    },
    onError: showMutationError
  });

  const openProposalAcceptConfirmModal = () => modals.openConfirmModal({
    title: 'Deseja mesmo aceitar essa proposta de planta?',
    children: (
      <Text size="sm" mb={20}>
        Ao confirmar, você <strong>aceitará</strong> a proposta de inclusão
        da planta <Text span fs="italic" fw={600}>{plant.acceptedTaxonName}</Text>, 
        tornando-a item oficial do Catálogo. Ela passará a aparecer também entre as 
        plantas recomendadas no Projeto Agroflorestal.
      </Text>
    ),
    labels: { confirm: 'Aceitar', cancel: 'Cancelar aceite' },
    confirmProps: { color: 'green' },
    onConfirm: () => proposalAcceptance.mutate(plant.id),
  });

  return (
    <Button variant="outline" size="compact-md" color="green" onClick={() => openProposalAcceptConfirmModal()}>
      <IconCheckbox />
      <Text fw={600}>&nbsp;
        Aceitar
      </Text>
    </Button>
  )
}

function ContentPlaceholder({ size }: { size: number }) {
  return (
    <Center py={10}>
      <IconCircleDashedPlus size={size} color="var(--mantine-color-dark-2)" />
    </Center>
  ) 
}

interface SectionProps extends React.ComponentProps<'section'> {
  title: string,
}

function Section({ title, children, ...sectionProps }: SectionProps) {
  return (
    <>
    <Paper withBorder shadow="xs" p={10} component="section" {...sectionProps}>
      <Text fz="h5" fw={600} pb={10}>{title}</Text>
      { children }
    </Paper>
    <Space h={15}/>
    </>
  )
}

function PopularNamesSection({ popularNames }: { popularNames: PopularNameReadData[] }) {
  const navigate = useNavigate();
  const nameList = popularNames.map(item => item.name).join(", ");

  return (
    <Section title="Nomes populares" style={{cursor: 'pointer'}} onClick={() => navigate('popular-names')}>
      {popularNames.length > 0 ?
      <Text size="lg">{nameList}</Text> :
      <ContentPlaceholder size={50} />}
    </Section>
  )
}

function TaxonomySection({ taxa }: { taxa: TaxonReadData[] }) {
  const navigate = useNavigate();
  const accepted = taxa.find(item => item.taxonomicStatus === 'accepted');
  const synonyms = taxa.filter(item => item.taxonomicStatus === 'synonym');
  const synonymNames = synonyms ? synonyms.map(item => getTaxonName(item)).join(", ") : "";

  return (
    <Section title="Taxonomia" style={{cursor: 'pointer'}} onClick={() => navigate('taxonomy')}>
      {taxa.length > 0 ? <>
        {accepted && <>
        <Text size="md">
          <Text span c="dimmed">Família:</Text> {accepted.family}
        </Text>
        <Text size="md">
          <Text span c="dimmed">Espécie:</Text> {accepted.species}
        </Text>
        {accepted.subspecies &&
        <Text size="md">
          <Text span c="dimmed">Subespécie:</Text> {accepted.subspecies}
        </Text>}
        {accepted.variety &&
        <Text size="md">
          <Text span c="dimmed">Variedade:</Text> {accepted.variety}
        </Text>}
        </>}
        {synonymNames &&
        <Text size="md">
        <Text span c="dimmed">Sinônimo(s):</Text> {synonymNames}
        </Text>}
      </> :
      <ContentPlaceholder size={50} />}
    </Section>
  )
}

function TraitSection({
  sectionName,
  traits,
  traitValues,
  editMode,
}: {
  sectionName: string,
  traits: TraitReadData[],
  traitValues: TraitValueReadData[],
  editMode: boolean,
}) {
  const navigate = useNavigate();
  const traitValuesMap = Object.fromEntries(traitValues.map(item => [item.traitSlug, item]));

  const subsections = traits.reduce((acc: ReactElement[], item) => {
    if (item.slug in traitValuesMap || editMode) {
      acc.push(
        <Paper key={item.slug} withBorder ta="center" radius="md" style={{cursor: 'pointer'}} onClick={() => navigate(`trait/${item.slug}`)}>
          {item.slug in traitValuesMap ? <>
            <Text fz="h6" fw={550} p={5}>{item.name}</Text>
            <TraitValueDisplay data={traitValuesMap[item.slug]} style={item.type=="string[]" ? { cursor: 'pointer' } : undefined} />
          </> : <>
            <Text fz="h6" fw={550} p={5} c="var(--mantine-color-gray-6)">{item.name}</Text>
            <ContentPlaceholder size={40} />
          </>}
        </Paper>    
      )
    }
    return acc;
  }, []);
  
  return (
    <Section title={sectionName}>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4}}>
        {subsections}
      </SimpleGrid>
    </Section>
  )
}

function NaturalOccurrenceSection({ regions }: { regions: NaturalOccurrenceRegionReadData[] }) {
  const navigate = useNavigate();

  const sortedRegions = regions.sort((a, b) => sortNaturalOccurrenceRegions(a, b));

  const header = (
      <Table.Tr>
        <Table.Th fz="h5" fw={550}>País</Table.Th>
        <Table.Th fz="h5" fw={550}>Bioma</Table.Th>
        <Table.Th fz="h5" fw={550}>Estado</Table.Th>
        <Table.Th fz="h5" fw={550}>Tipo de Vegetação</Table.Th>
      </Table.Tr>
  );
  
  const rows = sortedRegions.map((region: NaturalOccurrenceRegionReadData) => (
    <Table.Tr key={`${region.id}`}>
      <Table.Td fz="sm">{region.country.name}</Table.Td>
      <Table.Td fz="sm">{region.biome?.name ?? ""}</Table.Td>
      <Table.Td fz="sm">{region.state?.code ?? ""}</Table.Td>
      <Table.Td fz="sm">{region.vegetationType?.name ?? ""}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Section title="Regiões de ocorrência natural (onde é nativa)" style={{cursor: 'pointer'}} onClick={() => navigate('natural-occurrence-regions')}>
      {regions.length > 0 ?
      <StickyHeaderTable
        header={header}
        rows={rows}
        scrollWidth={600}
        scrollHeight={300}
        striped
        stripedColor="#f0f2f2"
      /> :
      <ContentPlaceholder size={50} />}
    </Section>
  )
}
