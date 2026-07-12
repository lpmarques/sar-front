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

import { Polygon as GeoJsonPolygon } from "geojson";
import {
  DrawEvents,
  GeometryUtil,
  latLng,
  LatLng,
  latLngBounds,
  Layer,
  Map,
  polygon,
  Polygon as PolygonLayer,
} from "leaflet";
import 'leaflet-geometryutil';
import { useState } from "react";
import { Alert, Button, Container, Paper, Space, Text, TextInput, Title } from "@mantine/core";
import { useField, useForm } from "@mantine/form";
import { IconArrowBigLeft, IconEdit, IconInfoCircle, IconMapPinFilled, IconPentagonFilled, IconTrash } from "@tabler/icons-react";
import { UseMutationResult, useQuery } from "@tanstack/react-query";
import area from "@turf/area";
import * as turf from "@turf/helpers";
import { FarmReadData, FarmWriteRequestData, FarmWriteResponseData, getFarmList, SiteTraitValueWriteRequestData } from "../../apis/agroforestry";
import { showError } from "../common/notifications";
import { FarmLandForm, FarmMap, SiteTraitValuesForm } from ".";
import { SiteTraitField } from "./SiteTraitValuesForm";
import { GenericResponse, WriteFnInput } from "../../apis/common";
import { latLngToPosition, positionToLatLng } from "../../utils/agroforestry";

interface FarmFormProps {
  farm?: FarmReadData,
  mutation: UseMutationResult<FarmWriteResponseData | GenericResponse, Error, WriteFnInput<FarmWriteRequestData>, unknown>,
}

const RJ_CENTER = new LatLng(-22.279276, -42.8643083);

export default function FarmForm({ farm, mutation }: FarmFormProps) {
  const [step, setStep] = useState<number>(0);

  const defaultPolygonCoords = farm?.polygon ? positionToLatLng(farm.polygon.coordinates) : undefined;

  const originalFarmCenter = farm && positionToLatLng(farm.location.coordinates);
  const originalFarmArea = defaultPolygonCoords && GeometryUtil.geodesicArea(defaultPolygonCoords[0]);

  const [polygonCoords, setPolygonCoords] = useState<LatLng[][] | undefined>(defaultPolygonCoords);
  
  const mapViewProps = {
    center: farm ? positionToLatLng(farm.location.coordinates) : RJ_CENTER,
    zoom: 7,
  };

  const setCoords = (layer: Layer) => {
    if (layer instanceof PolygonLayer) {
      const polygon = layer.toGeoJSON().geometry as GeoJsonPolygon;
      setPolygonCoords(positionToLatLng(polygon.coordinates));
    }
  }

  const unsetCoords = (layer: Layer) => {
    if (layer instanceof PolygonLayer) {
      setPolygonCoords(undefined);
    }
  }

  const onPolygonCreated = (e: DrawEvents.Created) => {
    setCoords(e.layer);
  };

  const onPolygonEdited = (e: DrawEvents.Edited) => {
    setCoords(e.layers.getLayers()[0]);
  };

  const onPolygonDeleted = (e: DrawEvents.Deleted) => {
    unsetCoords(e.layers.getLayers()[0]);
  };

  const farmsQueryOptions = {
    queryKey: [ 'farmList' ],
    queryFn: getFarmList,
  };
  const farms = useQuery(farmsQueryOptions);

  const farmCenter = polygonCoords ? latLngBounds(polygonCoords[0]).getCenter() : mapViewProps.center;
  const farmArea = polygonCoords && area(turf.polygon(latLngToPosition(polygonCoords)));

  const centerChanged = originalFarmCenter ? farmCenter.distanceTo(originalFarmCenter) > 100 : true;
  const areaChanged = originalFarmArea ? farmArea !== originalFarmArea : true;

  const nameField = useField<string>({ // paliativo até entender por que o farmForm.getInputProps('name').error não está atualizando corretamente
    initialValue: farm?.name ?? '',
    validate: (value) => {
      if (!value.trim().length) return 'Campo obrigatório';
    },
  });

  const farmForm = useForm<FarmWriteRequestData>({
    mode: 'controlled',
    initialValues: {
      name: farm?.name ?? '',
      location: !farm?.polygon ? farm?.location : undefined,
      polygon: farm?.polygon ?? undefined,
      municipalityId: farm?.municipality?.id,
      traitValues: farm?.traitValues ? farm.traitValues : [],
    },
    validate: {
      name: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
      },
    },
  });

  const validateFarmNameUniqueness = (farms: FarmReadData[]) => {
    const formValues = farmForm.getValues();
    const errMsg = "Igual a nome já cadastrado para outra propriedade";
    for (const item of farms) {
      if (farm?.id !== item.id && formValues.name === item.name) {
        const matchErrors = { name: errMsg };
        farmForm.setErrors(matchErrors);
        nameField.setError(matchErrors['name']); // paliativo até entender por que o farmForm.getInputProps('name').error não está atualizando corretamente

        return matchErrors;
      }
    }
  };

  const validateFarmGeometry = () => {
    const formValues = farmForm.getValues();
    const errMsg = "O perímetro da propriedade precisa ser desenhado no mapa.";
    if (!formValues.polygon) {
      const geomErrors = {
        polygon: errMsg,
      };

      farmForm.setErrors(geomErrors);
      return geomErrors;
    }
  };

  const handleMapFormSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    farmForm.setFieldValue('name', nameField.getValue()); // paliativo até entender por que o farmForm.getInputProps('name').error não está atualizando corretamente
    const nameFieldError = await nameField.validate();

    if (polygonCoords) {
      const polygonLayer = polygon(polygonCoords);
      farmForm.setFieldValue('polygon', polygonLayer.toGeoJSON().geometry as GeoJsonPolygon);
    }
    
    const farmValidation = farmForm.validate();
    const farmUniquenessErrors = validateFarmNameUniqueness(farms.data!);
    const farmGeometryErrors = validateFarmGeometry();
    const farmErrors = {
      ...(farmValidation.hasErrors && farmValidation.errors),
      ...farmUniquenessErrors,
      ...farmGeometryErrors,
    };

    if (Object.keys(farmErrors).length > 0 || nameFieldError) { // paliativo até entender por que o farmForm.getInputProps('name').error não está atualizando corretamente
      return showError("Há campos inválidos no formulário.", "Erro");
    }

    setStep(step+1);
  }

  const handleLandFormSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    
    const farmValidation = farmForm.validate();

    if (farmValidation.hasErrors) {
      return showError("Há campos inválidos no formulário.", "Erro");
    }

    setStep(step+1);
  }

  const handleTraitsFormSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, traitFields: SiteTraitField[]) => {
    e.preventDefault();

    const valueErrors: React.ReactNode[] = [];
    for (const trait of traitFields) {
      const error = await trait.field.validate();
      if (error) valueErrors.push(error);
    }
    
    if (valueErrors.length > 0)
      throw showError("Há campos inválidos no formulário.", "Erro");
    
    // SiteTraitField[] to SiteTraitValueWriteRequestData[]
    const traitValues = traitFields.reduce(
      (traitValues: SiteTraitValueWriteRequestData[], item) => {
        let value = item.field.getValue();
        if (value !== undefined && value !== null) {
          traitValues.push({
            traitId: item.id,
            value: value,
          });
        }
        return traitValues;
      }, []
    );

    mutation.mutate({
      id: farm?.id,
      data: {
        name: farmForm.getTransformedValues()['name'],
        municipalityId: Number(farmForm.getValues()['municipalityId']),
        ...(polygonCoords && {polygon: farmForm.getValues()['polygon']}),
        traitValues: traitValues,
      },
    });
  }

  const handleGoBack = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    setStep(step-1);
  }

  const goBackButton = (
    <Button
      variant="default"
      size="compact-md"
      color="dimmed"
      onClick={handleGoBack}
      mb={10}
    >
      <IconArrowBigLeft stroke={1.5} />
      <Text fw={500}>&nbsp;
        Voltar
      </Text>
    </Button>
  );

  const contextName = farm ? "atualização" : "cadastro";

  const farmMapForm = (
    <>
      <TextInput
        key={nameField.key}
        label="Nome da propriedade"
        mb={15}
        size="lg"
        {...nameField.getInputProps()} // paliativo até entender por que o farmForm.getInputProps('name').error não está atualizando corretamente
      />
      <Text fz="lg" mb={5}>Mapa da propriedade</Text>
      <FarmMap
        center={mapViewProps.center}
        zoom={mapViewProps.zoom}
        polygonCoords={polygonCoords}
        showPolygonArea
        editControlProps={{
          onCreated: onPolygonCreated,
          onEdited: onPolygonEdited,
          onDeleted: onPolygonDeleted,
        }}
      />
      <Text size="md" c="red">{farmForm.getInputProps('location').error}</Text>
      <Button
        fullWidth
        mt="xl"
        radius="md"
        color="teal"
        type="submit"
        onClick={handleMapFormSubmit}
      >
        Continuar {contextName}
      </Button>
    </>
  );

  const farmCreationSteps = [
    <>
      <Alert variant="light" color="blue" mb={15} icon={<IconInfoCircle />}>
        {farm ? <>
        <Text>Se quiser alterar o perímetro da propriedade, use o botão Editar (<IconEdit size={18} />), 
        mude a forma como quiser e, quando terminar, selecione "Guardar".</Text>
        <Space h={5}/>
        <Text>Se deseja começar do zero, tente o botão Eliminar (<IconTrash size={18} />)
        , selecione "Limpar tudo" e, enfim, o botão de polígono (<IconPentagonFilled size={14} />) para desenhar novamente.</Text>
        </> : <>
        <Text>Para trazer as melhores recomendações para o seu projeto, precisamos conhecer a propriedade onde você quer implantá-lo.</Text>
        <Space h={5}/>
        <Text>Para começar, <Text span fw={700}> desenhe o perímetro da propriedade (<IconPentagonFilled size={14} /></Text>) no mapa abaixo.
        Ele nos ajuda a calcular a área e o número de módulos fiscais da propriedade para você.</Text>
        <Space h={5}/>
        </>}
      </Alert>
      {farmMapForm}
    </>,
    <>
      {goBackButton}
      <Alert variant="light" color="blue" mb={15} icon={<IconInfoCircle />}>
        {farm ? <>
        <Text>Se você alterou a localização da propriedade, pode ser que alguma informação da região tenha sido atualizada.</Text>
        <Space h={5}/>
        <Text>Por favor, <Text span fw={700}>revise e complete as informações abaixo</Text>.</Text>
        </> : <>
        <Text>Pela localização da propriedade, agora sabemos mais sobre a região.</Text>
        <Text>Por favor, <Text span fw={700}>revise e complete as informações abaixo</Text>.</Text>
        <Space h={5}/>
        <Text>Se algo parece errado, volte ao mapa pelo botão acima (<IconArrowBigLeft size={16} stroke={1.5} />) e redefina o local
        pelos botões Editar (<IconEdit size={18} />) ou Eliminar (<IconTrash size={18} />).</Text>
        </>}
      </Alert>
      <FarmLandForm
        farmCenter={farmCenter}
        farmForm={farmForm}
        onSubmit={handleLandFormSubmit}
        buttonContent={`Continuar ${contextName}`}
      />
    </>,
    <>
      {goBackButton}
      <Alert variant="light" color="blue" mb={15} icon={<IconInfoCircle />}>
        {farm ? <>
        <Text>Se você alterou a localização ou o tamanho da propriedade, pode ser que mais alguma informação tenha sido atualizada,
        mas a palavra final ainda é sua!</Text>
        <Space h={5}/>
        <Text>Por favor, <Text span fw={700}>revise e complete o que souber abaixo</Text>.</Text>
        </> : <>
        <Text>Quase lá! Só precisamos de mais algumas informações...</Text>
        <Text>Já preenchemos parte delas com base no que você nos passou, mas a palavra final é sua!</Text>
        <Space h={5}/>
        <Text><Text span fw={700}>Revise e complete o que souber abaixo</Text> (quanto mais precisão nos dados, melhores serão nossas recomendações).</Text>
        </>}
      </Alert>
      <SiteTraitValuesForm
        siteCenter={farmCenter}
        siteArea={farmArea}
        siteMunicipalityId={farmForm.getValues()['municipalityId']}
        initialTraitValues={farm?.traitValues}
        estimateTraitValues={centerChanged || areaChanged}
        onSubmit={handleTraitsFormSubmit}
        buttonProps={{
          loading: mutation.isPending
        }}
        buttonContent={`Concluir ${contextName}`}
      />
    </>
  ]

  return (
    <Container size={650} mt={20} mb={60}>
      <Title fw={500} ta="center" mb={30}>
        {farm ?
        <>Atualização da Propriedade</> :
        <>Nova Propriedade</>}
      </Title>
      <Paper withBorder shadow="sm" p={20}>
        {farmCreationSteps[step]}
      </Paper>
    </Container>
  )
}
