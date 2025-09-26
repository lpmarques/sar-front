import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Container, Group, Paper, SimpleGrid, Space, Table, Text } from '@mantine/core';
import { IconCircleDashedPlus, IconPencil, IconPencilOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlant,
  getPlantNaturalOccurrenceRegionList,
  getPlantPopularNameList,
  getPlantTaxonList,
  getPlantTraitValueList,
  getTaxonName,
  getTraitList,
  NaturalOccurrenceRegionReadData,
  PopularNameReadData,
  TaxonReadData,
  TraitReadData,
  TraitValueReadData,
} from "../../apis/catalog";
import classes from '../common/Clickable.module.css';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { sortNaturalOccurrenceRegions } from "./NaturalOccurrenceRegionsSection";
import { TraitValueDisplay } from '.';

export default function PlantDetails() {
  const { plantId } = useParams();
  const [editMode, setEditMode] = useState(false);
  
  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
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

  const sections = traits.data ? Object.fromEntries(traits.data.map(item => [item.sectionSlug!, item.sectionName!])): {};
  const traitSections = Object.entries(sections).map(([key, value]) => (
    <TraitSection
      key={key}
      sectionName={value}
      traits={traits.data!.filter(item => item.sectionSlug === key)}
      traitValues={traitValues.data ? traitValues.data.filter(item => item.sectionSlug === key) : []}
      editMode={editMode}
    />
  ));

  return (
    <QueryLoader {...plantQueryOptions}>
      <Container size={1000}>
        <Group justify="space-between" pb={15}>
          <Text fz="h2" fs="italic" fw={600}>{plant.data?.acceptedTaxonName}</Text>
          <EditButton editMode={editMode} setEditMode={setEditMode}/>
        </Group>
        <QueryLoader {...popularNamesQueryOptions}>
          <PopularNamesSection data={popularNames.data!}/>
        </QueryLoader>
        <QueryLoader {...taxaQueryOptions}>
          {taxa.data &&
          <TaxonomySection taxa={taxa.data}/>}
        </QueryLoader>
        <QueryLoader {...traitValuesQueryOptions}>
          {traitSections}
        </QueryLoader>
        <QueryLoader {...naturalOccurrenceRegionsQueryOptions}>
          {naturalOccurrenceRegions.data && naturalOccurrenceRegions.data.length > 0 &&
          <NaturalOccurrenceSection data={naturalOccurrenceRegions.data}/>}
        </QueryLoader>
      </Container>
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

  return (
    <Button variant="default" size="compact-md" color="dimmed" onClick={() => setEditMode(!editMode)} style={classes}>
      <Icon />
      <Text fw={600}>&nbsp;
        {editMode ? 
        <>Sair do modo edição</> :
        <>Adicionar informações</>}
      </Text>
    </Button>
  )
}

interface SectionProps extends React.ComponentProps<'section'> {
  title: string,
}

function Section({ title, children, ...sectionProps }: SectionProps) {
  return (
    <>
    <Paper withBorder p={10} component="section" {...sectionProps}>
      <Text fz="h5" fw={600} pb={10}>{title}</Text>
      { children }
    </Paper>
    <Space h={15}/>
    </>
  )
}

function PopularNamesSection({ data }: { data: PopularNameReadData[] }) {
  const navigate = useNavigate();
  const popularNames = data.map(item => item.name).join(", ");

  return (
    <Section title="Nome(s) popular(es)" style={{cursor: 'pointer'}} onClick={() => navigate('popular-names')}>
      <Text size="xl">{popularNames}</Text>
    </Section>
  )
}

function TaxonomySection({ taxa }: { taxa: TaxonReadData[] }) {
  const navigate = useNavigate();
  const accepted = taxa.find(item => item.taxonomicStatus === 'accepted');
  const synonyms = taxa.filter(item => item.taxonomicStatus === 'synonym');
  const synonymNames = synonyms ? synonyms.map(item => getTaxonName(item)).join(", ") : "";

  return (
    <>
    {accepted &&
    <Section title="Taxonomia" style={{cursor: 'pointer'}} onClick={() => navigate('taxonomy')}>
      <Text size="md">
        <Text span c="dimmed">Família:</Text> {accepted ? accepted.family : ""}
      </Text>
      <Text size="md">
        <Text span c="dimmed">Espécie:</Text> {accepted ? accepted.species : ""}
      </Text>
      {accepted?.subspecies &&
      <Text size="md">
        <Text span c="dimmed">Subespécie:</Text> {accepted.subspecies}
      </Text>}
      {accepted?.variety &&
      <Text size="md">
        <Text span c="dimmed">Variedade:</Text> {accepted.variety}
      </Text>}
      {synonymNames &&
      <Text size="md">
        <Text span c="dimmed">Sinônimo(s):</Text> {synonymNames}
      </Text>}
    </Section>}
    </>
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

  const subsections = traits.map(item => (
    <>
    {item.slug in traitValuesMap || editMode ?
    <Paper key={item.slug} withBorder ta="center" radius="md" style={{cursor: 'pointer'}} onClick={() => navigate(`trait/${item.slug}`)}>
      {item.slug in traitValuesMap ? <>
        <Text fz="h6" fw={550} p={5}>{item.name}</Text>
        <TraitValueDisplay data={traitValuesMap[item.slug]} style={item.type=="string[]" ? { cursor: 'pointer' } : undefined} />
        </> : <>
        <Text fz="h6" fw={550} p={5} c="var(--mantine-color-gray-6)">{item.name}</Text>
        <IconCircleDashedPlus color="var(--mantine-color-dark-3)" />
      </>}
    </Paper> :
    <></>}
    </>
  ));
  
  return (
    <Section title={sectionName}>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4}}>
        {subsections}
      </SimpleGrid>
    </Section>
  )
}

function NaturalOccurrenceSection({ data }: { data: NaturalOccurrenceRegionReadData[] }) {
  const navigate = useNavigate();

  const sortedRegions = data.sort((a, b) => sortNaturalOccurrenceRegions(a, b));

  const header = (
      <Table.Tr>
        <Table.Th fz="h5" fw={550}>País</Table.Th>
        <Table.Th fz="h5" fw={550}>Estado</Table.Th>
        <Table.Th fz="h5" fw={550}>Bioma</Table.Th>
        <Table.Th fz="h5" fw={550}>Tipo de Vegetação</Table.Th>
      </Table.Tr>
  );
  
  const rows = sortedRegions.map((region: NaturalOccurrenceRegionReadData) => (
    <Table.Tr key={`${region.contentId}`}>
      <Table.Td fz="sm">{region.country.name}</Table.Td>
      <Table.Td fz="sm">{region.state?.code ?? ""}</Table.Td>
      <Table.Td fz="sm">{region.biome?.name ?? ""}</Table.Td>
      <Table.Td fz="sm">{region.vegetationType?.name ?? ""}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Section title="Regiões de ocorrência natural (onde é nativa)" style={{cursor: 'pointer'}} onClick={() => navigate('natural-occurrence-regions')}>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={300} striped stripedColor="#f0f2f2" />
    </Section>
  )
}
