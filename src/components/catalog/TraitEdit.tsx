import { useNavigate, useParams } from 'react-router';
import { Container, Text, Space, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  getPlant,
  getPlantTraitValueList,
  getTraitList,
} from '../../apis/catalog';
import ClickableText from '../common/ClickableText';
import { QueryLoader } from '../common/QueryLoader';
import { AcceptedTraitValueDisplay } from './TraitDetails';
import { TraitValueProposalForm } from '.';

export default function TraitEdit() {
  const { plantId, traitSlug } = useParams();
  const navigate = useNavigate();
  
  const plantQueryOptions = {
    queryKey: ['plant', plantId!],
    queryFn: getPlant
  };
  const traitsQueryOptions = {
    queryKey: ['traitList'],
    queryFn: getTraitList
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
  const values = useQuery(traitValuesQueryOptions);

  const trait = traits.data && traits.data.find(item => item.slug === traitSlug!);
  const acceptedValue = values.data && values.data.find(item => item.contentStatus === "accepted");
  
  return (
    <QueryLoader {...traitValuesQueryOptions}>
      {plant.data && trait && acceptedValue &&
      <Container size={1000}>
        <ClickableText fs="italic" fz="h3" pb={15} onClick={() => navigate(`/plants/${plantId}`)}>
          {plant.data.acceptedTaxonName}
        </ClickableText>
        <Text fz="h3" pb={15}>
          [{trait.sectionName}]&nbsp;
          <ClickableText span inherit fw={600} onClick={() => navigate(`/plants/${plantId}/trait/${traitSlug}`)}>
            {trait.name}
          </ClickableText> - <Text span inherit fw={600}>Proposta de Alteração</Text>
        </Text>
        <Alert variant="light" color="blue" icon={<IconInfoCircle />}>
          <Text fz="md" pb={10}>A versão proposta será analisada e, se aprovada, substituirá a versão aceita.</Text>
        </Alert>
        <Space h={15} />
        <AcceptedTraitValueDisplay data={acceptedValue} />
        <Space h={15} />
        <TraitValueProposalForm plant={plant.data} trait={trait} traitValuesQueryOptions={traitValuesQueryOptions} />
      </Container>}
    </QueryLoader>
  )
}
