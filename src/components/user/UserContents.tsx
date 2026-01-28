import { useNavigate, useParams } from "react-router";
import { ContentPreviewReadData, getContentPreviewList, getUser, UserReadData } from "../../apis/core";
import { useQuery } from "@tanstack/react-query";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { Badge, Container, Paper, Table } from "@mantine/core";
import UserAvatar from "./UserAvatar";
import { useLanguage } from "../../hooks";
import { QueryLoader } from "../common/QueryLoader";
import ClickableRow from "../common/ClickableRow";
import { useEffect, useState } from "react";
import { getPlant, getPlantList, getTraitValue } from "../../apis/catalog";

export default function UserContents() {
  const { userEmail } = useParams();
  const { lang } = useLanguage();
  const [clickedContent, setClickedContent] = useState<ContentPreviewReadData | undefined>(undefined);

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

  const contentTypeLabels: {[ key: string ]: string } = {
    'plant': 'Planta',
    'trait_value': 'Traço',
    'taxon': 'Taxonomia',
    'popular_name': 'Nome Popular',
    'natural_occurrence_region': 'Região de Ocorrência Natural',
  }

  const statusLabels: {[ key: string ]: React.ReactElement } = {
    'proposed': <Badge color="gray">Proposto</Badge>,
    'accepted': <Badge color="green">Aceito</Badge>,
    'rejected': <Badge color="orange">Descartado</Badge>,
  }

  const header = (
    <Table.Tr>
      <Table.Th>Tipo de conteúdo</Table.Th>
      <Table.Th>Status</Table.Th>
      <Table.Th>Proposto em</Table.Th>
      <Table.Th>Autor do aceite</Table.Th>
      <Table.Th>Aceito em</Table.Th>
      <Table.Th>Autor do descarte</Table.Th>
      <Table.Th>Descartado em</Table.Th>
    </Table.Tr>
  );

  const rows = sortedContents.map((item) => (
    <ClickableRow 
      key={item.id} 
      onClick={() => setClickedContent(item)} 
      style={{'--hover-color': '#bef7ce'}}
    >
      <Table.Td h={50}>{contentTypeLabels[item.type]}</Table.Td>
      <Table.Td h={50}>{statusLabels[item.status]}</Table.Td>
      <Table.Td h={50}>{new Date(item.proposedAt).toLocaleString(lang)}</Table.Td>
      <Table.Td h={50}>
        {item.acceptor && 
        <UserAvatar user={item.acceptor} size={40} />}
      </Table.Td>
      <Table.Td h={50}>
        {item.acceptedAt && 
        new Date(item.acceptedAt).toLocaleString(lang)}
      </Table.Td>
      <Table.Td h={50}>
        {item.rejector && 
        <UserAvatar user={item.rejector} size={40} />}
      </Table.Td>
      <Table.Td h={50}>
        {item.rejectedAt && 
        new Date(item.rejectedAt).toLocaleString(lang)}
      </Table.Td>
    </ClickableRow>
  ));

  return (
    // <FuturePageInfo pageName="Contribuições do usuário"/>
    <QueryLoader {...contentsQueryOptions}>
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
      <ContentClickNavigation content={clickedContent} />
    </QueryLoader>
  )
}

function ContentClickNavigation({ content }: { content: ContentPreviewReadData | undefined }) {
  if (!content || content.rejectedAt)
    return null;

  if (content.type == 'plant') {
    return <PlantNavigation content={content} />;
  }
  // if (content.type == 'trait_value') {
  //   return <TraitValueNavigation content={content} />;
  // }

  return null
}

function PlantNavigation({ content }: { content: ContentPreviewReadData }) {
  const plant = useQuery({
    queryKey: ['plantList', `content_id=${content.id}`],
    queryFn: getPlantList
  });

  useEffect(
    () => {
      if (plant.data) {
        window.open(`/plants/${plant.data[0].id}`);
      }
    },
    [plant.data]
  );

  return null;
}

// function TraitValueNavigation({ content }: { content: ContentPreviewReadData }) {
//   const instance = useQuery({
//     queryKey: ['traitValue', `${content.id}`],
//     queryFn: getTraitValue
//   });

//   useEffect(
//     () => {
//       if (instance.data) {
//         window.open(`/plants/${instance.data.plantId}/trait/${instance.data.traitSlug}`);
//       }
//     },
//     [instance.data]
//   );

//   return null;
// }