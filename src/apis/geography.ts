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

import axios from 'axios';
import { defaultQueryFn, EmptyObject, MonthNumber, QueryFnInput, snakeToCamelCase } from './common';

export const geoDataToOptions = (data: CountryData[] | StateData[] | MunicipalityData[]) => {
  return data.map(
    item => ({
      value: item.id.toString(),
      label: item.name
    })
  ).sort((a, b) => a.label.localeCompare(b.label));
}

export interface CountryData {
  id: number,
  name: string
}

export async function getCountryList(): Promise<CountryData[]> {
  return (await axios.get('/geography/land/countries')).data;
}

export async function getCountry({ queryKey: [_, countryId] }: QueryFnInput): Promise<CountryData> {
  return (await axios.get(`/geography/land/countries/${countryId}`)).data;
}

export interface StateData {
  id: number,
  name: string,
  code: string,
  country_id: number,
}

export async function getStateList({ queryKey: [_, countryId, ...params] }: QueryFnInput): Promise<StateData[]> {
  const res = await axios.get(`/geography/land/countries/${countryId}/states` + (params && `?${params.join('&')}`));
  
  return snakeToCamelCase(res.data);
}

export async function getState({ queryKey: [_, stateId] }: QueryFnInput): Promise<StateData> {
  const res = await axios.get(`/geography/land/states/${stateId}`);
  
  return snakeToCamelCase(res.data);
}

export interface MunicipalityData {
  id: number,
  name: string,
  stateId: number,
  fiscalModuleSizeM2: number,
}

export async function getMunicipalityList({ queryKey: [_, stateId] }: QueryFnInput): Promise<MunicipalityData[]> {
  const res = await axios.get(`/geography/land/states/${stateId}/municipalities`);
  
  return snakeToCamelCase(res.data);
}

export async function getMunicipality({ queryKey: [_, municipalityId] }: QueryFnInput): Promise<MunicipalityData> {
  const res = await axios.get(`/geography/land/municipalities/${municipalityId}`);
  
  return snakeToCamelCase(res.data);
}

export interface BiomeData {
  id: number,
  name: string,
  country_id: number,
}

export async function getBiomeList({ queryKey: [_, countryId, ...params] }: QueryFnInput): Promise<BiomeData[]> {
  const res = await axios.get(`/geography/land/countries/${countryId}/biomes` + (params && `?${params.join('&')}`));
  
  return snakeToCamelCase(res.data);
}

export interface VegetationTypeData {
  id: number,
  name: string,
  country_id: number,
}

export async function getVegetationTypeList({ queryKey: [_, countryId, ...params] }: QueryFnInput): Promise<VegetationTypeData[]> {
  const res = await axios.get(`/geography/land/countries/${countryId}/vegetation-types` + (params && `?${params.join('&')}`));
  
  return snakeToCamelCase(res.data);
}

export interface LandSummaryData {
  country: CountryData | EmptyObject,
  state: StateData | EmptyObject,
  biome: BiomeData | EmptyObject,
  vegetationType: VegetationTypeData | EmptyObject,
}

export async function getLandSummary({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<LandSummaryData> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/land", params });
}

export interface DroughtData {
  year: number,
  month: number,
  droughtLevel: 0 | 1 | 2 | 3 | 4 | 5,
  droughtLevelCode: "si" | "s0" | "s1" | "s2" | "s3" | "s4",
  countryId: number,
}

export async function getDroughtList({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<DroughtData[]> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/climate/droughts", params });
}

export interface ClimateNormalData {
  countryId: number,
  stateId: number,
  stationCode: number,
  stationElevationM: number,
  periodFirstYear: number,
  periodLastYear: number,
  month: number,
  precipitationMm: number | null,
  temperatureCMinimum: number | null,
  temperatureCAverage: number | null,
  temperatureCMaximum: number | null,
}

export async function getClimateNormalList({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<ClimateNormalData[]> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/climate/normals", params });
}

export interface ElevationData {
  elevationM: number,
}

export async function getElevation({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<ElevationData> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/climate/elevation", params });
}

export interface DroughtsSummaryData {
  firstYear: number,
  firstMonth: MonthNumber,
  lastYear: number,
  lastMonth: MonthNumber,
  periodMonths: number,
  s0DroughtMonths: number,
  s1DroughtMonths: number,
  s2DroughtMonths: number,
  s3DroughtMonths: number,
  s4DroughtMonths: number,
}

export interface ClimateNormalsSummaryData {
  stationCode: number,
  stationElevationM: number,
  stationDistance: number,
  firstYear: number,
  lastYear: number,
  annualPrecipitationMm: number | null,
  coldestMonthTempCMin: number | null,
  coldestMonthTempCAvg: number | null,
  coldestMonthTempCMax: number | null,
  hottestMonthTempCMin: number | null,
  hottestMonthTempCAvg: number | null,
  hottestMonthTempCMax: number | null,
}

export interface ClimateSummaryData {
  elevation: ElevationData | EmptyObject,
  normals: ClimateNormalsSummaryData | EmptyObject,
  droughts: DroughtsSummaryData | EmptyObject,
}

export async function getClimateSummary({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<ClimateSummaryData> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/climate", params });
}

export interface SoilAcidityLevel {
  id: number,
  name: string,
  phMin: number,
  phMax: number,
}

export async function getSoilAcidityLevelList({ queryKey: [_, ...params] }: QueryFnInput): Promise<SoilAcidityLevel[]> {
  return defaultQueryFn({ endpoint: "/geography/soil/acidity-levels", params });
}

export interface SoilPhData {
  ph: number,
  acidityLevel: SoilAcidityLevel,
}

export async function getSoilPh({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<SoilPhData> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/soil/ph", params });
}

export interface SoilTextureTypeData {
  id: number,
  name: string,
}

export async function getSoilTextureTypeList({ queryKey: [_, ...params] }: QueryFnInput): Promise<SoilTextureTypeData[]> {
  return defaultQueryFn({ endpoint: "/geography/soil/texture-types", params });
}

export interface SoilSummaryData {
  acidity: SoilPhData | EmptyObject,
  texture: SoilTextureTypeData | EmptyObject,
}

export async function getSoilSummary({ queryKey: [_, latlong, ...params] }: QueryFnInput): Promise<SoilSummaryData> {
  params.push(latlong);

  return defaultQueryFn({ endpoint: "/geography/soil", params });
}
