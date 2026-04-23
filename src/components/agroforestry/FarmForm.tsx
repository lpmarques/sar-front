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
  Marker as MarkerLayer,
  Polygon as PolygonLayer,
} from "leaflet";
import 'leaflet-geometryutil';
import { useState } from "react";
import { Alert, Button, Container, Paper, Space, Text, TextInput, Title } from "@mantine/core";
import { useField, useForm } from "@mantine/form";
import { IconArrowBigLeft, IconEdit, IconInfoCircle, IconMapPinFilled, IconPentagonFilled, IconTrash } from "@tabler/icons-react";
import { UseMutationResult, useQuery } from "@tanstack/react-query";
import * as turf from "@turf/centroid";
import { FarmReadData, FarmWriteRequestData, FarmWriteResponseData, getFarmList, SiteTraitValueWriteRequestData } from "../../apis/agroforestry";
import { showError } from "../common/notifications";
import { FarmLandForm, FarmMap, SiteTraitValuesForm } from ".";
import { SiteTraitField } from "./SiteTraitValuesForm";
import { GenericResponse, WriteFnInput } from "../../apis/common";
import { positionToLatLng } from "../../utils/agroforestry";

interface FarmFormProps {
  farm?: FarmReadData,
  mutation: UseMutationResult<FarmWriteResponseData | GenericResponse, Error, WriteFnInput<FarmWriteRequestData>, unknown>,
}

export default function FarmForm({ farm, mutation }: FarmFormProps) {
  const [step, setStep] = useState<number>(0);

  const defaultFarmPolygon = farm?.polygon ? positionToLatLng(farm.polygon.coordinates) : undefined;
  const defaultFarmLocation = !defaultFarmPolygon && farm?.location ? positionToLatLng(farm.location.coordinates) : undefined;

  const originalFarmCenter = farm && positionToLatLng(farm.location.coordinates);
  const originalFarmArea = defaultFarmPolygon && GeometryUtil.geodesicArea(defaultFarmPolygon[0]);

  const [farmPolygon, setFarmPolygon] = useState<LatLng[][] | undefined>(defaultFarmPolygon);
  const [farmLocation, setFarmLocation] = useState<LatLng | undefined>(defaultFarmLocation);

  const rjCenter = new LatLng(-22.279276, -42.8643083);
  const [mapState, setMapState] = useState({
    center: farm ? positionToLatLng(farm.location.coordinates) : rjCenter,
    zoom: 7,
  });

  const setFarmLayer = (layer: Layer, map: Map) => {
    if (layer instanceof PolygonLayer) {
      const polygon = layer.toGeoJSON().geometry;
      const polygonCenter = turf.centroid(polygon);
      setFarmPolygon(layer.getLatLngs() as LatLng[][]);
      farmForm.setFieldValue('polygon', polygon as GeoJsonPolygon);
      setMapState({
        center: latLng(polygonCenter.geometry.coordinates[1], polygonCenter.geometry.coordinates[0]),
        zoom: map.getZoom(),
      });
    }
    if (layer instanceof MarkerLayer) {
      const point = layer.toGeoJSON().geometry;
      setFarmLocation(layer.getLatLng());
      farmForm.setFieldValue('location', point);
      setMapState({
        center: layer.getLatLng(),
        zoom: map.getZoom(),
      });
    }
  }

  const unsetFarmLayer = (layer: Layer) => {
    if (layer instanceof PolygonLayer) {
      setFarmPolygon(undefined);
      farmForm.setFieldValue('polygon', undefined);
    }
    if (layer instanceof MarkerLayer) {
      setFarmLocation(undefined);
      farmForm.setFieldValue('location', undefined);
    }
  }

  const onCreated = (e: DrawEvents.Created) => {
    setFarmLayer(e.layer, e.target);
  };

  const onEdited = (e: DrawEvents.Edited) => {
    setFarmLayer(e.layers.getLayers()[0], e.target);
  };

  const onDeleted = (e: DrawEvents.Deleted) => {
    unsetFarmLayer(e.layers.getLayers()[0]);
  };

  const farmsQueryOptions = {
    queryKey: [ 'farmList' ],
    queryFn: getFarmList,
  };
  const farms = useQuery(farmsQueryOptions);

  const farmCenter = farmPolygon ? latLngBounds(farmPolygon[0]).getCenter() : mapState.center;
  const farmArea = farmPolygon && GeometryUtil.geodesicArea(farmPolygon[0]);

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
    const errMsg = "A localização ou o polígono da propriedade precisam ser indicados no mapa.";
    if (!(formValues.location || formValues.polygon)) {
      const geomErrors = {
        location: errMsg,
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
        ...(farmLocation && {location: farmForm.getValues()['location']}),
        ...(farmPolygon && {polygon: farmForm.getValues()['polygon']}),
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
        center={mapState.center}
        zoom={mapState.zoom}
        farmLocation={farmLocation}
        farmPolygon={farmPolygon}
        showPolygonArea
        editControlProps={{
          onCreated: onCreated,
          onEdited: onEdited,
          onDeleted: onDeleted,
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
        <Text>Se quiser alterar a localização ou a área da propriedade no mapa, use o botão Editar (<IconEdit size={18} />), 
        mude a forma como quiser e, quando terminar, selecione "Guardar".</Text>
        <Space h={5}/>
        <Text>Mas, se você só indicou a localização com um marcador (<IconMapPinFilled size={14}/>) e quer informar a área da propriedade, primeiro use o botão Eliminar (<IconTrash size={18} />)
        , selecione "Limpar tudo" e, enfim, o botão de polígono (<IconPentagonFilled size={14} />) para desenhar a área.</Text>
        </> : <>
        <Text>Para trazer as melhores recomendações para o seu projeto, precisamos conhecer a propriedade onde você quer implantá-lo.</Text>
        <Space h={5}/>
        <Text>Para começar, <Text span fw={700}>indique a localização com um marcador (<IconMapPinFilled size={14}/>) 
          ou desenhe o polígono (<IconPentagonFilled size={14} />) da propriedade</Text>, no mapa abaixo.</Text>
        <Space h={5}/>
        <Text>Ao desenhar o polígono, você nos ajuda a calcular a área e o número de módulos fiscais para você.</Text>
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
