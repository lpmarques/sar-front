import { useNavigate, useParams } from 'react-router';
import { Container, UnstyledButton, Text, Space, Table, Paper, Alert, ContainerProps, TextInput } from '@mantine/core';
import { IconInfoCircle, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
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
import { ContentReadData, ContentWriteRequestData } from '../../apis/core';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { SectionConfig, getSectionConfig, SectionSlug } from './SectionConfigs';
import SectionContentsProposalForm from './SectionContentsProposalForm';

export default function SectionEdit() {
  const { plantId, sectionSlug } = useParams();
  
  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  
  const plant = useQuery(plantQueryOptions);
  
  const sectionConfig = getSectionConfig(sectionSlug as SectionSlug);
  
  return (
    <QueryLoader {...plantQueryOptions}>
      {plant.data && sectionConfig &&
      <>
        {sectionSlug === "taxonomy" ?
        <SectionEditBody<TaxonReadData, TaxonWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<TaxonReadData, TaxonWriteRequestData>}
          w={1000}
          /> : 
        sectionSlug === "popular-names" ? 
        <SectionEditBody<PopularNameReadData, PopularNameWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<PopularNameReadData, PopularNameWriteRequestData>}
          w={700}
          /> : 
        sectionSlug === "natural-occurrence-regions" ? 
        <SectionEditBody<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>}
          w={1000}
          /> : 
        <></>}
      </>}
    </QueryLoader>
  )
}

interface SectionEditBodyProps<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData> extends ContainerProps {
  plant: PlantReadData,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}

function SectionEditBody<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plant,
  sectionConfig,
  ...containerProps
}: SectionEditBodyProps<ReadT, WriteT>) {
  const navigate = useNavigate();
  const { sectionSlug } = useParams();

  return (
    <Container {...containerProps}>
      <UnstyledButton onClick={() => navigate(`/plants/${plant.id}`)}>
        <Text fs="italic" fz="h3" pb={15}>{plant.acceptedTaxonName}</Text>
      </UnstyledButton>
      <Text fz="h3" pb={15}>
        <UnstyledButton fz="h3" fw={600} onClick={() => navigate(`/plants/${plant.id}/${sectionSlug}`)}>
          {sectionConfig.sectionName}
        </UnstyledButton> - <Text span inherit fw={600}>Proposta de Inclusão</Text>
      </Text>
      <Alert variant="light" color="blue" icon={<IconInfoCircle />}>
        <Text fz="md" pb={10}>Itens propostos serão analisados e, se aprovados, serão incorporados ao conteúdo aceito.</Text>
      </Alert>
      <Space h={15} />
      <AcceptedContents<ReadT, WriteT>
        plantId={plant.id}
        sectionConfig={sectionConfig}
        />
      <Space h={15} />
      <SectionContentsProposalForm<ReadT, WriteT>
        plantId={plant.id}
        sectionConfig={sectionConfig}
        />
    </Container>
  )
}

export function AcceptedContents<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plantId,
  sectionConfig,
}: {
  plantId: number,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}) {
  const contentsQueryOptions = sectionConfig.buildQueryOptions(plantId);
  const { data } = useQuery(contentsQueryOptions);

  const acceptedContents = data ? data.filter(item => item.contentStatus === "accepted") : [];
  const sortedContents = acceptedContents.sort((a, b) =>
    sectionConfig.sortReadData && sectionConfig.sortReadData(a, b) || a.acceptedAt!.localeCompare(b.acceptedAt!)
  );

  const header = (
    <Table.Tr>
      <sectionConfig.Header />
      <Table.Th w={42}></Table.Th>
    </Table.Tr>
  );
  
  const rows = sortedContents.map((item) => (
    <Table.Tr key={item.contentId}>
      <sectionConfig.DisplayRow data={item} style={{backgroundColor: "#bef7ce"}} />
      <Table.Td style={{backgroundColor: "#bef7ce"}}></Table.Td>
    </Table.Tr>
  ));

  return (
    <QueryLoader {...contentsQueryOptions}>
      <Paper withBorder p={15}>
        <Text fz="h5" fw={600} pb={10} ta="center">Conteúdo aceito</Text>
        <StickyHeaderTable header={header} rows={rows} scrollWidth={500} scrollHeight={300} withRowBorders={false} />
      </Paper>
    </QueryLoader>
  )
}
