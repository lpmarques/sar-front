import axios from 'axios';
import { camelToSnakeCase, defaultQueryFn, GenericResponse, QueryFnInput, snakeToCamelCase } from './common';
import { ContentReadData, ContentWriteRequestData, ContentWriteResponseData } from './core';
import { BiomeData, CountryData, StateData, VegetationTypeData } from './geography';

export type Range = [number, number];

export type TraitType = "range" | "number" | "boolean" | "string[]" | "string";

export type TraitValue = Range | number | boolean | string[] | string;

// MUTATIONS

export interface PlantWriteRequestData extends Omit<ContentWriteRequestData, 'sourceId'> {
  taxon: Omit<TaxonWriteRequestData, 'plantId'>,
  popularName: Omit<PopularNameWriteRequestData, 'plantId'>,
}

export interface PlantWriteResponseData extends ContentWriteResponseData {
  plantId: number,
}

export async function createPlant(data: PlantWriteRequestData): Promise<PlantWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/plant", body);
  
  return snakeToCamelCase(res.data);
}

export async function deletePlant(contentId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/plant/${contentId}`);
  
  return res.data;
}

export interface TraitValueWriteRequestData extends ContentWriteRequestData {
  plantId: number,
  traitId: number,
  value: TraitValue,
}

export async function createTraitValue(data: TraitValueWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/trait-value", body);
  
  return snakeToCamelCase(res.data);
}

export async function deleteTraitValue(contentId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/trait-value/${contentId}`);
  
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

export async function createTaxon(data: TaxonWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/taxon", body);
  
  return snakeToCamelCase(res.data);
}

export async function deleteTaxon(contentId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/taxon/${contentId}`);
  
  return res.data;
}

export interface PopularNameWriteRequestData extends ContentWriteRequestData {
  name: string,
  plantId: number,
}

export async function createPopularName(data: PopularNameWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/popular-name", body);
  
  return snakeToCamelCase(res.data);
}

export async function deletePopularName(contentId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/popular-name/${contentId}`);
  
  return res.data;
}

export interface NaturalOccurrenceRegionWriteRequestData extends ContentWriteRequestData {
  countryId: number,
  stateId?: number,
  biomeId?: number,
  vegetationTypeId?: number,
  plantId: number,
}

export async function createNaturalOccurrenceRegion(data: NaturalOccurrenceRegionWriteRequestData): Promise<ContentWriteResponseData> {
  const body = camelToSnakeCase(data);
  const res = await axios.post("/catalog/natural-occurrence-region", body);
  
  return snakeToCamelCase(res.data);
}

export async function deleteNaturalOccurrenceRegion(contentId: number): Promise<GenericResponse> {
  const res = await axios.delete(`/catalog/natural-occurrence-region/${contentId}`);
  
  return res.data;
}

// QUERIES

export interface PlantReadData extends ContentReadData {
  id: number,
  acceptedTaxonName: string,
  acceptedFamilyName: string,
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

export async function getTaxonList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<TaxonReadData[]> {
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

export async function getPopularNameList(): Promise<PopularNameReadData[]> {
  let res = await axios.get('/catalog/popular-names');

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

export async function getNaturalOccurrenceRegionList(): Promise<NaturalOccurrenceRegionReadData[]> {
  let res = await axios.get('/catalog/natural-occurrence-regions');

  let data = snakeToCamelCase(res.data);

  return data;
}

export async function getPlantNaturalOccurrenceRegionList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<NaturalOccurrenceRegionReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/natural-occurrence-regions` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}
