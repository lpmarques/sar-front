import { useParams, useNavigate } from "react-router";
import { Container, Paper, SimpleGrid, Space, Table, Text } from '@mantine/core';
import { useQuery } from "@tanstack/react-query";
import {
  getPlant,
  getPlantNaturalOccurrenceRegionList,
  getPlantPopularNameList,
  getPlantTaxonList,
  getPlantTraitValueList,
  getTaxonName,
  NaturalOccurrenceRegionReadData,
  PopularNameReadData,
  TaxonReadData,
  TraitValueReadData,
} from "../../apis/catalog";
import { sortValueFirst } from '../../utils/common';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { TraitValueDisplay } from '.';

export default function Plant() {
  const { plantId } = useParams();
  
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
  const traitValuesQueryOptions = { 
    queryKey: ['plantTraitValueList', plantId!, 'status=accepted'],
    queryFn: getPlantTraitValueList
  };
  const naturalOccurrenceRegionsQueryOptions = {
    queryKey: ['plantNaturalOccurrenceRegions', plantId!, 'status=accepted'],
    queryFn: getPlantNaturalOccurrenceRegionList
  }
 
  const plant = useQuery(plantQueryOptions);
  const taxa = useQuery(taxaQueryOptions);
  const popularNames = useQuery(popularNamesQueryOptions);
  const traitValues = useQuery(traitValuesQueryOptions);
  const naturalOccurrenceRegions = useQuery(naturalOccurrenceRegionsQueryOptions);

  const sections = traitValues.data ? Object.fromEntries(traitValues.data.map(item => [item.sectionSlug!, item.sectionName!])): {};
  const traitSections = Object.entries(sections).map(([key, value]) => (
    <TraitSection key={key} sectionName={value} traitValues={traitValues.data!.filter(item => item.sectionName === value)}/>
  ));

  return (
    <QueryLoader {...plantQueryOptions}>
      <Container size={1000}>
        <Text fz="h2" fs="italic" fw={600} pb={15}>{plant.data?.acceptedTaxonName}</Text>
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

function Section({ title, children, style }: { title: string, children: React.ReactNode, style?: React.CSSProperties }) {
  return (
    <>
    <Paper withBorder p={10} component="section" style={style}>
      <Text fz="h5" fw={600} pb={10}>{title}</Text>
      { children }
    </Paper>
    <Space h={15}/>
    </>
  )
}

function PopularNamesSection({ data }: { data: PopularNameReadData[] }) {
  let popularNames = data.map(item => item.name).join(", ");

  return (
    <Section title="Nome(s) popular(es)" style={{cursor: 'pointer'}}>
      <Text size="md">{popularNames}</Text>
    </Section>
  )
}

function TaxonomySection({ taxa }: { taxa: TaxonReadData[] }) {
  const accepted = taxa.find(item => item.taxonomicStatus === 'accepted');
  const synonyms = taxa.filter(item => item.taxonomicStatus === 'synonym');
  const synonymNames = synonyms ? synonyms.map(item => getTaxonName(item)).join(", ") : "";

  return (
    <>
    {accepted &&
    <Section title="Taxonomia" style={{cursor: 'pointer'}}>
      <Text size="md">Família: {accepted ? accepted.family : ""}</Text>
      <Text size="md">Espécie: {accepted ? accepted.species : ""}</Text>
      {accepted?.subspecies &&
      <Text size="md">Subespécie: {accepted.subspecies}</Text>}
      {accepted?.variety &&
      <Text size="md">Variedade: {accepted.variety}</Text>}
      {synonymNames &&
      <Text size="md">Sinônimo(s): {synonymNames}</Text>}
    </Section>}
    </>
  )
}

function TraitSection({ sectionName, traitValues }: { sectionName: string, traitValues: TraitValueReadData[] }) {
  const navigate = useNavigate();

  const traits = traitValues.map(item => (
    <Paper key={item.traitSlug} withBorder ta="center" radius="md" style={{cursor: 'pointer'}} onClick={() => navigate(`trait/${item.traitSlug}`)}>
      <Text fz="h6" fw={550} p={5}>{item.traitName}</Text>
      <TraitValueDisplay data={item} style={item.type=="string[]" ? {cursor: 'pointer'} : undefined} />
    </Paper>
  ));
  
  return (
    <Section title={sectionName}>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4}}>
        {traits}
      </SimpleGrid>
    </Section>
  )
}

function NaturalOccurrenceSection({ data }: { data: NaturalOccurrenceRegionReadData[] }) {
  const sortedRegions = data.sort((a, b) => 
    sortValueFirst(a.country, b.country, "Brasil") ||
    sortValueFirst(a.country, b.country, "Brazil") ||
    sortValueFirst(a.biome, b.biome, "Mata Atlântica") ||
    a.country.localeCompare(b.country) ||
    a.biome.localeCompare(b.biome) ||
    a.state.localeCompare(b.state) ||
    a.vegetationType.localeCompare(b.vegetationType)
  );

  const header = (
      <Table.Tr>
        <Table.Th fz="h5" fw={550}>País</Table.Th>
        <Table.Th fz="h5" fw={550}>Estado</Table.Th>
        <Table.Th fz="h5" fw={550}>Bioma</Table.Th>
        <Table.Th fz="h5" fw={550}>Tipo de vegetação</Table.Th>
      </Table.Tr>
  );
  
  const rows = sortedRegions.map((region: NaturalOccurrenceRegionReadData) => (
    <Table.Tr key={`${region.contentId}`}>
      <Table.Td fz="sm">{region.country}</Table.Td>
      <Table.Td fz="sm">{region.state}</Table.Td>
      <Table.Td fz="sm">{region.biome}</Table.Td>
      <Table.Td fz="sm">{region.vegetationType}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Section title="Regiões de ocorrência natural (onde é nativa)" style={{cursor: 'pointer'}}>
      <StickyHeaderTable header={header} rows={rows} scrollWidth={600} scrollHeight={300} striped stripedColor="#f0f2f2" />
    </Section>
  )
}
