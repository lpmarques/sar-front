import * as L from "leaflet";
import { useNavigate, useParams } from "react-router";
import { Button, Container, Fieldset, Group, Paper, Space, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFarm, FarmReadData, getFarm, getSiteTraitList, SiteReadData } from "../../apis/agroforestry";
import { QueryOptions, showMutationError } from "../../apis/common";
import { QueryLoader } from "../common/QueryLoader";
import FieldView from "../common/FieldView";
import { showSuccess } from "../common/notifications";
import { latLongToString, positionToLatLng } from "../../utils/common";
import { FarmMap } from ".";

export default function FarmDetails() {
  const { farmId } = useParams();

  const farmQueryOptions = {
    queryKey: ['farm', farmId!],
    queryFn: getFarm
  };
  const farm = useQuery(farmQueryOptions);

  const polygon = farm.data?.polygon ? positionToLatLng(farm.data.polygon.coordinates) : undefined;
  const location = !polygon && farm.data?.location ? positionToLatLng(farm.data.location.coordinates) : undefined;

  return (
    <QueryLoader {...farmQueryOptions}>
      { farm.data && 
      <Container size={550} mb={20}>
        <Paper withBorder shadow="sm" p={20}>
          <Group mb={10} justify="space-between">
            <Text fz="h2" fw={600}>{farm.data.name}</Text>
            <Group>
              <EditButton />
              <DeleteButton farm={farm.data} queryOptions={farmQueryOptions}/>
            </Group>
          </Group>
          <Container px={10}>
            <FarmMap
              farmLocation={location}
              farmPolygon={polygon}
              style={{ height: '400px', width: '100%' }}
              dragging={false}
              zoomControl={false}
              scrollWheelZoom={false}
            />
          </Container>
          <Space h={15}/>
          <FarmLandDetails farm={farm.data} />
          <SiteTraitsDetails site={farm.data} />
        </Paper>
      </Container>}
      <Space h={25}/>
    </QueryLoader>
  )
}

const absentInfo = <Text span c="red">Não informado</Text>;

function FarmLandDetails({ farm }: { farm: FarmReadData }) {
  const farmCoords = latLongToString(farm.location.coordinates[1], farm.location.coordinates[0]);
  const farmArea = farm.areaM2 ? `${farm.areaM2} m² (${Math.round(farm.areaM2/100)/100} ha)` : absentInfo;

  const landTraitValues = farm.traitValues.filter(trait => trait.sectionSlug === "land").map((trait) => (
    <Text pb={10}>
      <Text span c="dimmed">{trait.traitName}</Text> {trait.value}
    </Text>
  ));

  return (
    <Fieldset mb={10} legend="Território">
      <FieldView label="País">{farm.country.name}</FieldView>
      <FieldView label="Estado">{farm.state ? farm.state.code : absentInfo}</FieldView>
      <FieldView label="Município">{farm.municipality ? farm.municipality.name : absentInfo}</FieldView>
      <FieldView label="Bioma">{farm.biome ? farm.biome.name : absentInfo}</FieldView>
      <FieldView label="Vegetação Natural">{farm.vegetationType ? farm.vegetationType.name : absentInfo}</FieldView>
      <FieldView label="Coordenadas">{farmCoords}</FieldView>
      <FieldView label="Área">{farmArea}</FieldView>
      {landTraitValues}
    </Fieldset>
  )
}

function SiteTraitsDetails({ site }: { site: SiteReadData }) {
  
  const siteTraitsQueryOptions = {
    queryKey: [ 'siteTraitList' ],
    queryFn: getSiteTraitList
  };
  const siteTraits = useQuery(siteTraitsQueryOptions);

  const traitValues = Object.fromEntries(site.traitValues.map(traitValue => [traitValue.traitSlug, traitValue]));
  
  const sections = siteTraits.data ? Object.fromEntries(
    siteTraits.data.map(trait => [trait.sectionSlug, trait.sectionName])
  ) : {};

  const otherSectionSlugs = Object.keys(sections).filter(sectionSlug => !["land", "climate", "soil"].includes(sectionSlug));

  const orderedTraits = siteTraits.data ? siteTraits.data.sort((a, b) => a.position-b.position) : [];
  // TODO: consider moving this logic into apis/agroforestry.ts (possible repetition in FarmNew)
  const sectionedTraits = Object.fromEntries(
    Object.keys(sections).map(sectionSlug => [
      sectionSlug, // section slug key
      orderedTraits.filter(trait => trait.sectionSlug === sectionSlug)
    ])
  );
  
  const climateFields = sectionedTraits["climate"] && sectionedTraits["climate"].map(trait => (
    <FieldView key={trait.slug} label={trait.name}>
      {traitValues[trait.slug] ? traitValues[trait.slug].value : absentInfo}
    </FieldView>
  ));
  
  const soilFields = sectionedTraits["soil"] && sectionedTraits["soil"].map(trait => (
    <FieldView key={trait.slug} label={trait.name}>
      {traitValues[trait.slug] ? traitValues[trait.slug].value : absentInfo}
    </FieldView>
  ));

  const otherFieldsets = otherSectionSlugs.map(sectionSlug => (
    <Fieldset mb={10} key={sectionSlug} legend={sections[sectionSlug]}>
      { sectionedTraits[sectionSlug].map(trait => (
        <FieldView key={trait.slug} label={trait.name}>
          {traitValues[trait.slug] ? traitValues[trait.slug].value : absentInfo}
        </FieldView>
      )) }
    </Fieldset>
  ));

  return (
    <QueryLoader {...siteTraitsQueryOptions}>
      <Fieldset mb={10} legend={sections["climate"]}>
        {climateFields}
      </Fieldset>
      <Fieldset mb={10} legend={sections["soil"]}>
        {soilFields}
      </Fieldset>
      {otherFieldsets}
    </QueryLoader>
  )
}

function EditButton() {
  const navigate = useNavigate();

  const handleEditButtonClick = () => {
    navigate('edit');
  };

  return (
    <Button variant="default" size="compact-md" color="dimmed" onClick={() => handleEditButtonClick()}>
      <IconPencil />
      <Text fw={600}>&nbsp;
        Editar
      </Text>
    </Button>
  )
}

function DeleteButton({ farm, queryOptions }: { farm: FarmReadData, queryOptions: QueryOptions<FarmReadData> }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const farmDeletion = useMutation({
    mutationFn: deleteFarm,
    onSuccess: (data) => {
      queryClient.refetchQueries({ predicate: (query) => { return query.queryKey[0] === 'farmList' } });
      showSuccess(data.msg);
      navigate('/farms');
      queryClient.removeQueries({ queryKey: queryOptions.queryKey });
    },
    onError: showMutationError
  });

  const openProposalDeleteConfirmModal = () => modals.openConfirmModal({
    title: 'Deseja mesmo excluir essa propriedade?',
    children: (
      <Text size="sm" mb={20}>
        Ao confirmar, você <strong>removerá</strong> o cadastro da 
        propriedade <Text span fw={700}>{farm.name}</Text>, 
        junto com todos os dados do projeto agroflorestal vinculado a ela.
      </Text>
    ),
    labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
    confirmProps: { color: 'red' },
    onConfirm: () => farmDeletion.mutate(farm.id),
  });

  return (
    <Button variant="outline" size="compact-md" color="red" onClick={() => openProposalDeleteConfirmModal()}>
      <IconTrash size={20} />
      {/* <Text fw={600}>&nbsp;
        Excluir
      </Text> */}
    </Button>
  )
}