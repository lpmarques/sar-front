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
import { camelToSnakeCase, defaultQueryFn, GenericResponse, QueryFnInput, snakeToCamelCase } from './common';
import { ContentReadData, ContentWriteRequestData, ContentWriteResponseData } from './core';
import { BiomeData, CountryData, StateData, VegetationTypeData } from './geography';

export type Range = [number, number];

export type TraitType = "range" | "number" | "boolean" | "string[]" | "string";

export type TraitValue = Range | number | boolean | string[] | string;

export type CatalogContentData = PlantReadData | TraitValueReadData | PopularNameReadData | TaxonReadData | NaturalOccurrenceRegionReadData;

// MUTATIONS

export interface PlantWriteRequestData extends Omit<ContentWriteRequestData, 'sourceId'> {
  taxon: Omit<TaxonWriteRequestData, 'plantId'>,
  popularName: Omit<PopularNameWriteRequestData, 'plantId'>,
}

export interface PlantWriteResponseData extends ContentWriteResponseData {
  plantId: number,
}

export async function proposePlant(data: PlantWriteRequestData): Promise<PlantWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/plants", body);
  
  return snakeToCamelCase(res.data);
}

export async function acceptPlant(plantId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/plants/${plantId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectPlant(plantId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/plants/${plantId}`);
  
  return res.data;
}

export interface TraitValueWriteRequestData extends ContentWriteRequestData {
  plantId: number,
  traitId: number,
  value: TraitValue,
}

export async function proposeTraitValue(data: TraitValueWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/trait-values", body);
  
  return snakeToCamelCase(res.data);
}

export async function acceptTraitValue(traitValueId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/trait-values/${traitValueId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectTraitValue(traitValueId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/trait-values/${traitValueId}`);
  
  return res.data;
}

export interface TaxonWriteRequestData extends ContentWriteRequestData {
  family: string,
  species: string,
  subspecies?: string,
  variety?: string,
  taxonomicStatus: string,
  plantId: number,
}

export async function proposeTaxon(data: TaxonWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/taxa", body);
  
  return snakeToCamelCase(res.data);
}

export async function acceptTaxon(taxonId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/taxa/${taxonId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectTaxon(taxonId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/taxa/${taxonId}`);
  
  return res.data;
}

export interface PopularNameWriteRequestData extends ContentWriteRequestData {
  name: string,
  plantId: number,
}

export async function proposePopularName(data: PopularNameWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/popular-names", body);
  
  return snakeToCamelCase(res.data);
}

export async function acceptPopularName(popularNameId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/popular-names/${popularNameId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectPopularName(popularNameId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/popular-names/${popularNameId}`);
  
  return res.data;
}

export interface NaturalOccurrenceRegionWriteRequestData extends ContentWriteRequestData {
  countryId: number,
  stateId?: number,
  biomeId?: number,
  vegetationTypeId?: number,
  plantId: number,
}

export async function proposeNaturalOccurrenceRegion(data: NaturalOccurrenceRegionWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/natural-occurrence-regions", body);
  
  return snakeToCamelCase(res.data);
}

export async function acceptNaturalOccurrenceRegion(regionId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/natural-occurrence-regions/${regionId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectNaturalOccurrenceRegion(regionId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/natural-occurrence-regions/${regionId}`);
  
  return res.data;
}

// QUERIES

export interface PlantReadData extends ContentReadData {
  acceptedTaxonName: string,
  acceptedFamilyName: string,
  colorHex: string,
  taxa?: TaxonReadData[],
  popularNames?: string[],
  traitValues?: TraitValueReadData[],
  naturalOccurrenceRegions?: NaturalOccurrenceRegionReadData[],
}

export async function getPlant({ queryKey: [_, plantId, ...params] }: QueryFnInput ): Promise<PlantReadData> {
  return defaultQueryFn({ endpoint: `/catalog/plants/${plantId}`, params });
}

export async function getPlantList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<PlantReadData[]> {
  let res = await axios.get('/catalog/plants' + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

interface TraitTextValueOption {
  value: string,
  description: string,
}

export interface TraitReadData {
  id: number,
  slug: string,
  name: string,
  sectionSlug: string,
  sectionName: string,
  description: string,
  type: TraitType,
  isNullable: boolean,
  numericValueMin: number,
  numericValueMax: number,
  textValueOptions: TraitTextValueOption[],
}

export async function getTraitList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<TraitReadData[]> {
  let res = await axios.get(`/catalog/traits` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface TraitValueReadData extends ContentReadData {
  traitSlug: string,
  traitName: string,
  type: TraitType,
  value: TraitValue,
  boundaries?: boolean[] | string[] | Range,
  sectionSlug?: string,
  sectionName?: string,
  plantId?: number,
}

export async function getTraitValueList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<TraitValueReadData[]> {
  let res = await axios.get(`/catalog/trait-values` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getPlantTraitValueList({ queryKey: [_, plantId, ...params] }: QueryFnInput ): Promise<TraitValueReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/trait-values` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface TaxonReadData extends ContentReadData {
  family: string,
  genus: string,
  species: string,
  subspecies: string | null,
  variety: string | null,
  taxonomicStatus: string,
  plantId?: number,
}

export function getTaxonName({ species, subspecies, variety }: TaxonReadData): string {
  return `${species}` + (subspecies ? `subsp. ${subspecies}` : '') + (variety ? `var. ${variety}` : '');
}

export async function getTaxonList({ queryKey: [_, ...params] }: QueryFnInput): Promise<TaxonReadData[]> {
  let res = await axios.get('/catalog/taxa' + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getPlantTaxonList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<TaxonReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/taxa` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface PopularNameReadData extends ContentReadData {
  name: string,
  plantId: number,
}

export async function getPopularName({ queryKey: [_, popularNameId, ...params] }: QueryFnInput ): Promise<PopularNameReadData[]> {
  let res = await axios.get(`/catalog/popular-names/${popularNameId}` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getPopularNameList({ queryKey: [_, ...params] }: QueryFnInput): Promise<PopularNameReadData[]> {
  let res = await axios.get('/catalog/popular-names' + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getPlantPopularNameList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<PopularNameReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/popular-names` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface NaturalOccurrenceRegionReadData extends ContentReadData {
  country: CountryData,
  state: StateData | null,
  biome: BiomeData | null,
  vegetationType: VegetationTypeData | null,
  plantId: number,
}

export async function getNaturalOccurrenceRegion({ queryKey: [_, regionId, ...params] }: QueryFnInput ): Promise<NaturalOccurrenceRegionReadData> {
  let res = await axios.get(`/catalog/natural-occurrence-regions/${regionId}` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getNaturalOccurrenceRegionList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<NaturalOccurrenceRegionReadData[]> {
  let res = await axios.get(`/catalog/natural-occurrence-regions` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getPlantNaturalOccurrenceRegionList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<NaturalOccurrenceRegionReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/natural-occurrence-regions` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}
