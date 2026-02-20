import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Badge, Container, Paper, Table } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getNaturalOccurrenceRegionList, getPlantList, getPopularNameList, getTaxonList, getTraitValueList } from "../../apis/catalog";
import { ContentPreviewReadData, getContentPreviewList, getUser } from "../../apis/core";
import ClickableRow from "../common/ClickableRow";
import { QueryLoader } from "../common/QueryLoader";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { useLanguage } from "../../hooks";
import { UserAvatar } from ".";
import LoaderRow from "../common/LoaderRow";

export default function UserContents() {
  const { userEmail } = useParams();

  let queryKey = ['user'];
  if (userEmail !== undefined)
    queryKey.push(`email=${userEmail}`);

  const userQueryOptions = {
    queryKey,
    queryFn: getUser
  };
  const { data } = useQuery(userQueryOptions);
  const profileOwner = data;

  const contentsQueryKey = ['contentPreviewList'];
  if (profileOwner && !profileOwner.isStaff)
    contentsQueryKey.push(`proposer_id=${profileOwner?.id}`);

  const contentsQueryOptions = {
    queryKey: contentsQueryKey,
    queryFn: getContentPreviewList,
    enabled: profileOwner !== undefined,
  };
  const contents = useQuery(contentsQueryOptions);
  const sortedContents = contents.data ? contents.data.sort((a, b) => 
    b.proposedAt!.localeCompare(a.proposedAt!)
  ) : [];

  const header = (
    <Table.Tr>
      <Table.Th>Tipo de conteúdo</Table.Th>
      <Table.Th>Status</Table.Th>
      <Table.Th>Apoios</Table.Th>
      <Table.Th>Proposto por</Table.Th>
      <Table.Th>Proposto em</Table.Th>
      <Table.Th>Aceito por</Table.Th>
      <Table.Th>Aceito em</Table.Th>
      <Table.Th>Rejeitado por</Table.Th>
      <Table.Th>Rejeitado em</Table.Th>
    </Table.Tr>
  );

  const rows = contents.isFetching ? [
    <LoaderRow colSpan={9}/>
  ] :  sortedContents.map((content) => <ContentRow content={content} />);

  return (
    <Container size={1200}>
      <Paper withBorder>
        <StickyHeaderTable
          header={header}
          rows={rows}
          scrollWidth={600}
          scrollHeight={550}
          />
      </Paper>
    </Container>
  )
}

function ContentRow({ content }: { content: ContentPreviewReadData }) {
  const { lang } = useLanguage();
  const [clicked, setClicked] = useState<boolean>(false);

  const getContentConfig = () => {
    switch (content.type) {
      case 'plant':
        return {
          label: 'Planta',
          PageOpening: PlantPageOpening,
        };
      case 'trait_value':
        return {
          label: 'Traço',
          PageOpening: TraitValuePageOpening,
        };
      case 'taxon':
        return {
          label: 'Taxonomia',
          PageOpening: TaxonPageOpening,
        };
      case 'popular_name':
        return {
          label: 'Nome Popular',
          PageOpening: PopularNamePageOpening,
        };
      case 'natural_occurrence_region':
        return {
          label: 'Regiões de Ocorrência Natural',
          PageOpening: NaturalOccurrenceRegionPageOpening,
        };
    }
  }

  const statusLabels: {[ key: string ]: React.ReactElement } = {
    'proposed': <Badge w={100} color="yellow.5">Proposto</Badge>,
    'accepted': <Badge w={100} color="green">Aceito</Badge>,
    'rejected': <Badge w={100} color="gray">Rejeitado</Badge>,
  }

  const config = getContentConfig();

  return (
    <ClickableRow 
      key={content.id} 
      onClick={() => setClicked(true)}
      style={{'--hover-color': '#bef7ce'}}
    >
      <Table.Td h={50}>{config?.label}</Table.Td>
      <Table.Td h={50}>{statusLabels[content.status]}</Table.Td>
      <Table.Td h={50}>{content.endorsementsCount}</Table.Td>
      <Table.Td h={50}>
        {content.proposer && 
        <UserAvatar user={content.proposer} size={40} />}
      </Table.Td>
      <Table.Td h={50}>{new Date(content.proposedAt).toLocaleString(lang)}</Table.Td>
      <Table.Td h={50}>
        {content.acceptor && 
        <UserAvatar user={content.acceptor} size={40} />}
      </Table.Td>
      <Table.Td h={50}>
        {content.acceptedAt && 
        new Date(content.acceptedAt).toLocaleString(lang)}
      </Table.Td>
      <Table.Td h={50}>
        {content.rejector && 
        <UserAvatar user={content.rejector} size={40} />}
      </Table.Td>
      <Table.Td h={50}>
        {content.rejectedAt && 
        new Date(content.rejectedAt).toLocaleString(lang)}
      </Table.Td>
      <Table.Td h={50}>
        {config &&
        <config.PageOpening content={content} clicked={clicked} onOpen={() => setClicked(false)} />}
      </Table.Td>
    </ClickableRow>
  )
}

interface PageOpeningProps {
  content: ContentPreviewReadData,
  clicked: boolean,
  onOpen: () => void
}

function PlantPageOpening({ content, clicked, onOpen }: PageOpeningProps) {
  const query = useQuery({
    queryKey: ['plantList', `content_id=${content.id}`],
    queryFn: getPlantList,
    enabled: clicked,
  });

  const plant = query.data && query.data.length > 0 ? query.data[0] : undefined;
  useEffect(
    () => {
      if (clicked && plant) {
        window.open(`/plants/${plant.id}`);
        onOpen();
      }
    },
    [clicked, plant]
  );

  return null;
}

function TraitValuePageOpening({ content, clicked, onOpen }: PageOpeningProps) {
  const query = useQuery({
    queryKey: ['traitValueList', `content_id=${content.id}`],
    queryFn: getTraitValueList,
    enabled: clicked,
  });

  const traitValue = query.data && query.data.length > 0 ? query.data[0] : undefined;
  useEffect(
    () => {
      if (clicked && traitValue) {
        window.open(`/plants/${traitValue.plantId}/trait/${traitValue.traitSlug}`);
        onOpen();
      }
    },
    [clicked, traitValue]
  );

  return null;
}

function TaxonPageOpening({ content, clicked, onOpen }: PageOpeningProps) {
  const query = useQuery({
    queryKey: ['taxonList', `content_id=${content.id}`],
    queryFn: getTaxonList,
    enabled: clicked,
  });

  const taxon = query.data && query.data.length > 0 ? query.data[0] : undefined;
  useEffect(
    () => {
      if (clicked && taxon) {
        window.open(`/plants/${taxon.plantId}/taxonomy`);
        onOpen();
      }
    },
    [clicked, taxon]
  );

  return null;
}

function PopularNamePageOpening({ content, clicked, onOpen }: PageOpeningProps) {
  const query = useQuery({
    queryKey: ['popularNameList', `content_id=${content.id}`],
    queryFn: getPopularNameList,
    enabled: clicked,
  });

  const popularName = query.data && query.data.length > 0 ? query.data[0] : undefined;
  useEffect(
    () => {
      if (clicked && popularName) {
        window.open(`/plants/${popularName.plantId}/popular-names`);
        onOpen();
      }
    },
    [clicked, popularName]
  );

  return null;
}

function NaturalOccurrenceRegionPageOpening({ content, clicked, onOpen }: PageOpeningProps) {
  const query = useQuery({
    queryKey: ['naturalOccurrenceRegionList', `content_id=${content.id}`],
    queryFn: getNaturalOccurrenceRegionList,
    enabled: clicked,
  });

  const occurrenceRegion = query.data && query.data.length > 0 ? query.data[0] : undefined;
  useEffect(
    () => {
      if (clicked && occurrenceRegion) {
        window.open(`/plants/${occurrenceRegion.plantId}/natural-occurrence-regions`);
        onOpen();
      }
    },
    [clicked, occurrenceRegion]
  );

  return null;
}