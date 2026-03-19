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

import { Fieldset, Text } from "@mantine/core";
import { latLongToString } from "../../utils/common";
import FieldView from "../common/FieldView";
import { FarmReadData } from "../../apis/agroforestry";

const absentInfo = <Text span c="red">Não informado</Text>;

export default function FarmLandDetails({ farm }: { farm: FarmReadData }) {
  const farmCoords = latLongToString(farm.location.coordinates[1], farm.location.coordinates[0]);
  const farmArea = farm.areaM2 ? `${farm.areaM2} m² (${Math.round(farm.areaM2/100)/100} ha)` : absentInfo;

  const landTraitValues = farm.traitValues.filter(trait => trait.sectionSlug === "land").map((trait) => (
    <Text pb={10}>
      <Text span c="dimmed">{trait.traitName}</Text> {trait.value}
    </Text>
  ));

  return (
    <Fieldset mb={10} legend="Território">
      <FieldView pb={10} label="País">{farm.country.name}</FieldView>
      <FieldView pb={10} label="Estado">{farm.state ? farm.state.code : absentInfo}</FieldView>
      <FieldView pb={10} label="Município">{farm.municipality ? farm.municipality.name : absentInfo}</FieldView>
      <FieldView pb={10} label="Bioma">{farm.biome ? farm.biome.name : absentInfo}</FieldView>
      <FieldView pb={10} label="Vegetação Natural">{farm.vegetationType ? farm.vegetationType.name : absentInfo}</FieldView>
      <FieldView pb={10} label="Coordenadas">{farmCoords}</FieldView>
      <FieldView pb={10} label="Área">{farmArea}</FieldView>
      {landTraitValues}
    </Fieldset>
  )
}
