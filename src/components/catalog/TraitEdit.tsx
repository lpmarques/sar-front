import { useNavigate, useParams } from 'react-router';
import { Container, UnstyledButton, Text, Space } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  getPlant,
  getPlantTraitValueList,
  getTraitList,
} from '../../apis/catalog';
import { QueryLoader } from '../common/QueryLoader';
import { TraitValueProposalForm } from '.';
import { AcceptedTraitValueDisplay } from './TraitDetails';

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
    queryKey: ['plantTraitValueList', plantId!, `trait_slugs=${traitSlug}`],
    queryFn: getPlantTraitValueList
  };
  
  const plant = useQuery(plantQueryOptions);
  const traits = useQuery(traitsQueryOptions);
  const values = useQuery(traitValuesQueryOptions);

  const trait = traits.data && traits.data.find(item => item.slug === traitSlug!);
  const acceptedValue = values.data && values.data.find(item => item.contentStatus === "accepted");
  const proposedValues = values.data && values.data.filter(item => item.contentStatus === "proposed");
  
  return (
    <QueryLoader {...traitValuesQueryOptions}>
      {plant.data && trait && acceptedValue && proposedValues &&
      <Container size={1000}>
        <UnstyledButton onClick={() => navigate(`/plants/${plantId}`)}>
          <Text fs="italic" fz="h3" pb={15}>{plant.data.acceptedTaxonName}</Text>
        </UnstyledButton>
        <Text fz="h3" pb={15}>
          [{acceptedValue.sectionName}]&nbsp;
          <UnstyledButton fz="h3" fw={600} onClick={() => navigate(`/plants/${plantId}/trait/${traitSlug}`)}>
            {acceptedValue.traitName}
          </UnstyledButton> - <Text span inherit fw={600}>Proposta de Alteração</Text>
        </Text>
        <AcceptedTraitValueDisplay data={acceptedValue} />
        <Space h={15} />
        <TraitValueProposalForm plant={plant.data} trait={trait} acceptedValue={acceptedValue} proposedValues={proposedValues} proposedValuesQueryKey={traitValuesQueryOptions.queryKey} />
      </Container>}
    </QueryLoader>
  )
}
