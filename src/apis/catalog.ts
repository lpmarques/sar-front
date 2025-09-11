import axios from 'axios';
import { camelToSnakeCase, GenericResponse, QueryFnInput, snakeToCamelCase } from './common';
import { ContentWriteResponseData, SourceReadData, UserReadData } from './core';

export type Range = [number, number];

export type TraitType = "string" | "number" | "boolean" | "string[]" | "range";

export type TraitValue = boolean | string | string[] | number | Range;

// MUTATIONS

export interface TraitValueWriteRequestData {
  plantId: number,
  traitId: number,
  value: TraitValue,
  sourceId: number,
  contentProposerComment?: string,
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

// QUERIES

export interface TraitValueReadData {
  contentId: number,
  traitSlug: string,
  traitName: string,
  type: TraitType,
  value: TraitValue,
  boundaries?: boolean[] | string[] | Range,
  sectionSlug?: string,
  sectionName?: string,
  contentStatus?: string,
  contentProposer?: UserReadData,
  source?: SourceReadData,
  endorsements?: number,
  proposedAt?: string,
  acceptedAt?: string,
  rejectedAt?: string,
}

export async function getPlantTraitValueList({ queryKey: [queryName, plantId, ...params] }: QueryFnInput ): Promise<TraitValueReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/trait-values` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface TraitReadData {
  id: number,
  slug: string,
  name: string,
  sectionSlug: string,
  sectionName: string,
  type: TraitType,
  isNullable: boolean,
  numericValueMin: number,
  numericValueMax: number,
  textValueOptions: string[],
}

export async function getTraitList({ queryKey: [queryName, ...params] }: QueryFnInput ): Promise<TraitReadData[]> {
  let res = await axios.get(`/catalog/traits` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface PlantReadData {
  id: number,
  contentId: number,
  contentStatus: string,
  acceptedTaxonName: string,
  acceptedFamilyName: string,
  taxa?: TaxonReadData[],
  popularNames?: string[],
  traitValues?: TraitValueReadData[],
  naturalOccurrenceRegions?: NaturalOccurrenceRegionReadData[],
}

export async function getPlant({ queryKey: [queryName, plantId, ...params] }: QueryFnInput ): Promise<PlantReadData> {
  let res = await axios.get(`/catalog/plants/${plantId}` + (params && `?${params.join('&')}`));

  let data = {
    id: res.data.id,
    contentId: res.data.content_id,
    contentStatus: res.data.content_status,
    acceptedTaxonName: res.data.accepted_taxon_name,
    acceptedFamilyName: res.data.accepted_family_name,
    ...(res.data.taxa && { taxa: snakeToCamelCase(res.data.taxa) }),
    ...(res.data.popular_names && { popularNames: snakeToCamelCase(res.data.popular_names) }),
    ...(res.data.trait_values && { traitValues: snakeToCamelCase(res.data.trait_values) }),
  }

  return data;
}

export async function getPlantList({ queryKey: [queryName, ...params] }: QueryFnInput ): Promise<PlantReadData[]> {
  let res = await axios.get('/catalog/plants' + (params && `?${params.join('&')}`));

  let data = res.data.map((item: any) => {
    return {
      id: item.id,
      contentId: item.content_id,
      acceptedTaxonName: item.accepted_taxon_name,
      acceptedFamilyName: item.accepted_family_name,
      ...(item.taxa && { taxa: snakeToCamelCase(item.taxa) }),
      ...(item.popular_names && { popularNames: snakeToCamelCase(item.popular_names) }),
      ...(item.trait_values && { traitValues: snakeToCamelCase(item.trait_values) }),
    }
  })

  return data;
}

export interface TaxonReadData {
  contentId: number,
  family: string,
  genus: string,
  species: string,
  subspecies: string | null,
  variety: string | null,
  contentStatus: string,
  taxonomicStatus: string,
  plantId?: number,
  contentProposer?: UserReadData,
  endorsements?: number,
  source?: SourceReadData,
  proposedAt?: string,
  AcceptedAt?: string,
  rejectedAt?: string,  
}

export function getTaxonName({ genus, species, subspecies, variety }: TaxonReadData): string {
  return `${genus} ${species}` + subspecies ? `subsp. ${subspecies}` : '' + variety ? `var. ${variety}` : '';
}

export async function getTaxonList(): Promise<TaxonReadData[]> {
  let res = await axios.get('/catalog/scientific-names');

  let data = res.data.map((item: any) => {
    return {
      contentId: item.content_id,
      family: item.family,
      genus: item.genus,
      species: item.species,
      subspecies: item.subspecies,
      variety: item.variety,
      contentStatus: item.content_status,
      taxonomicStatus: item.taxonomic_status,
      plantId: item.plant_id,
    }
  })

  return data;
}

export async function getPlantTaxonList({ queryKey: [queryName, plantId, ...params] }: QueryFnInput): Promise<TaxonReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/scientific-names` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface PopularNameReadData {
  contentId: number,
  name: string,
  contentStatus: string,
  plantIds?: number[],
  contentProposer?: UserReadData,
  endorsements?: number,
  source?: SourceReadData,
  createdAt?: string,
  acceptedAt?: string,
  rejectedAt?: string,
}

export async function getPopularNameList(): Promise<PopularNameReadData[]> {
  let res = await axios.get('/catalog/popular-names');

  let data = res.data.map((nameData: any) => {
    return {
      name: nameData.name,
      contentStatus: nameData.content_status,
      plantIds: nameData.plant_ids,
    }
  })

  return data;
}

export async function getPlantPopularNameList({ queryKey: [queryName, plantId, ...params] }: QueryFnInput): Promise<PopularNameReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/popular-names` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface NaturalOccurrenceRegionReadData {
  contentId: number,
  country: string,
  state: string,
  biome: string,
  vegetationType: string,
  plantIds?: number[],
  contentStatus?: string,
  contentProposer?: UserReadData,
  source?: SourceReadData,
  createdAt?: string,
}

export async function getNaturalOccurrenceRegionList(): Promise<NaturalOccurrenceRegionReadData[]> {
  let res = await axios.get('/catalog/natural-occurrence-regions');

  let data = res.data.map((region: any) => {
    return {
      country: region.country,
      state: region.state,
      biome: region.biome,
      vegetationType: region.vegetation_type,
      plantIds: region.plant_ids,
    }
  })

  return data;
}

export async function getPlantNaturalOccurrenceRegionList({ queryKey: [queryName, plantId, ...params] }: QueryFnInput): Promise<NaturalOccurrenceRegionReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/natural-occurrence-regions` + (params && `?${params.join('&')}`));

  let data = res.data.map((region: any) => {
    return {
      contentId: region.content_id,
      country: region.country,
      state: region.state,
      biome: region.biome,
      vegetationType: region.vegetation_type,
      contentStatus: region.content_status,
      contentProposer: region.content_proposer,
      source: region.source,
      createdAt: region.created_at,
    }
  })

  return data;
}
