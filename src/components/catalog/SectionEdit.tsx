/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { useNavigate, useParams } from 'react-router';
import { Container, Text, Space, Table, Paper, Alert, ContainerProps } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
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
import ClickableText from '../common/ClickableText';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { SectionConfig, getSectionConfig, SectionSlug } from './SectionConfigs';
import SectionItemsProposalForm from './SectionItemsProposalForm';

export default function SectionEdit() {
  const { plantId, sectionSlug } = useParams();
  
  const plantQueryOptions = {
    queryKey: ['plant', plantId!, 'status=accepted,proposed'],
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
          size={1000}
          /> : 
        sectionSlug === "popular-names" ? 
        <SectionEditBody<PopularNameReadData, PopularNameWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<PopularNameReadData, PopularNameWriteRequestData>}
          size={600}
          /> : 
        sectionSlug === "natural-occurrence-regions" ? 
        <SectionEditBody<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>
          plant={plant.data}
          sectionConfig={sectionConfig as SectionConfig<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>}
          size={1000}
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
      <ClickableText fs="italic" fz="h3" pb={15} onClick={() => navigate(`/plants/${plant.id}`)}>
        {plant.acceptedTaxonName}
      </ClickableText>
      <Text fz="h3" pb={15}>
        <ClickableText span inherit fw={600} onClick={() => navigate(`/plants/${plant.id}/${sectionSlug}`)}>
          {sectionConfig.sectionName}
        </ClickableText> - <Text span inherit fw={600}>Proposta de Inclusão</Text>
      </Text>
      <Alert variant="light" color="blue" icon={<IconInfoCircle />}>
        <Text fz="md" pb={10}>Itens propostos serão analisados e, se aprovados, serão incorporados aos itens aceitos.</Text>
      </Alert>
      <Space h={15} />
      <AcceptedItems<ReadT, WriteT>
        plantId={plant.id}
        sectionConfig={sectionConfig}
      />
      <SectionItemsProposalForm<ReadT, WriteT>
        plantId={plant.id}
        sectionConfig={sectionConfig}
      />
    </Container>
  )
}

export function AcceptedItems<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plantId,
  sectionConfig,
}: {
  plantId: number,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}) {
  const itemsQueryOptions = sectionConfig.buildQueryOptions(plantId);
  const { data } = useQuery(itemsQueryOptions);

  const acceptedItems = data ? data.filter(item => item.contentStatus === "accepted") : [];
  const sortedItems = acceptedItems.sort((a, b) =>
    sectionConfig.sortReadData && sectionConfig.sortReadData(a, b) || a.acceptedAt!.localeCompare(b.acceptedAt!)
  );

  const header = (
    <Table.Tr>
      <sectionConfig.Header />
      <Table.Th w={42}></Table.Th>
    </Table.Tr>
  );
  
  const rows = sortedItems.map((item) => (
    <Table.Tr key={item.contentId}>
      <sectionConfig.DisplayRow data={item} style={{backgroundColor: "#bef7ce"}} />
      <Table.Td style={{backgroundColor: "#bef7ce"}}></Table.Td>
    </Table.Tr>
  ));

  return (
    <QueryLoader {...itemsQueryOptions}>
      {acceptedItems.length > 0 && <>
      <Paper withBorder p={15}>
        <Text fz="h5" fw={600} pb={10} ta="center">Itens aceitos</Text>
        <StickyHeaderTable
          header={header}
          rows={rows}
          scrollWidth={sectionConfig.formKeys.length*125}
          scrollHeight={300}
          withRowBorders={false}
        />
      </Paper>
      <Space h={15} />
      </>}
    </QueryLoader>
  )
}
