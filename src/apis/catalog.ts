import axios from 'axios';
import { QueryFnInput, snakeToCamelCase } from './common';
import { UserReadData } from './core';

export interface RangeValue {
  minimum: number,
  maximum: number,
}

export interface Source {
  id: number,
  type: string,
  year: number,
  publicationTitle: string,
  publicationAuthors: string[],
  publisher: string,
  url: string,
  description: string,
}

export const sourceTypeToText: { [key: string]: string } = {
  "api": "API", 
  "book": "Livro", 
  "chapter": "Capítulo de livro", 
  "monography": "Monografia", 
  "paper": "Artigo", 
  "public database": "Banco de dados público",
  "website": "Website",
};

export interface TraitValueReadData {
  id: number,
  traitKey: string,
  traitName: string,
  type: string,
  value: boolean | string | string[] | number | RangeValue,
  boundaries?: boolean[] | string[] | RangeValue,
  sectionKey?: string,
  sectionName?: string,
  contentStatus?: string,
  contentAuthor?: UserReadData,
  source?: Source,
  endorsements?: number,
  createdAt?: string,
  acceptedAt?: string,
  rejectedAt?: string,
}

export async function getPlantTraitValueList({ queryKey: [queryName, plantId, ...params] }: QueryFnInput ): Promise<TraitValueReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/trait-values` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface TraitReadData {
  key: string,
  name: string,
  sectionKey: string,
  sectionName: string,
  type: string,
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
  contentStatus: string,
  acceptedScientificName: string,
  scientificNames?: string[],
  popularNames?: string[],
  traitValues?: TraitValueReadData[],
  naturalOccurrenceRegions?: NaturalOccurrenceRegionReadData[],
}

export async function getPlant({ queryKey: [queryName, plantId, ...params] }: QueryFnInput ): Promise<PlantReadData> {
  let res = await axios.get(`/catalog/plants/${plantId}` + (params && `?${params.join('&')}`));

  let data = {
    id: res.data.id,
    contentStatus: res.data.content_status,
    acceptedScientificName: res.data.accepted_scientific_name,
    ...(res.data.scientific_names && { scientificNames: snakeToCamelCase(res.data.scientific_names) }),
    ...(res.data.popular_names && { popularNames: snakeToCamelCase(res.data.popular_names) }),
    ...(res.data.trait_values && { traitValues: snakeToCamelCase(res.data.trait_values) }),
  }

  return data;
}

export async function getPlantList({ queryKey: [...params] }: QueryFnInput ): Promise<PlantReadData[]> {
  let res = await axios.get('/catalog/plants' + (params && `?${params.join('&')}`));

  let data = res.data.map((item: any) => {
    return {
      id: item.id,
      acceptedScientificName: item.accepted_scientific_name,
      ...(item.scientific_names && { scientificNames: snakeToCamelCase(item.scientific_names) }),
      ...(item.popular_names && { popularNames: snakeToCamelCase(item.popular_names) }),
      ...(item.trait_values && { traitValues: snakeToCamelCase(item.trait_values) }),
    }
  })

  return data;
}

export interface ScientificNameReadData {
  name: string,
  contentStatus: string,
  taxonomicStatus: string,
  plantId?: number,
  contentAuthor?: UserReadData,
  endorsements?: number,
  source?: Source,
  CreatedAt?: string,
  AcceptedAt?: string,
}

export async function getScientificNameList(): Promise<ScientificNameReadData[]> {
  let res = await axios.get('/catalog/scientific-names');

  let data = res.data.map((nameData: any) => {
    return {
      name: nameData.name,
      contentStatus: nameData.content_status,
      taxonomicStatus: nameData.taxonomic_status,
      plantId: nameData.plant_id,
    }
  })

  return data;
}

export async function getPlantScientificNameList({ queryKey: [queryName, plantId, ...params] }: QueryFnInput): Promise<ScientificNameReadData[]> {
  let res = await axios.get(`/catalog/plants/${plantId}/scientific-names` + (params && `?${params.join('&')}`));

  let data = snakeToCamelCase(res.data);

  return data;
}

export interface PopularNameReadData {
  name: string,
  contentStatus: string,
  plantIds?: number[],
  contentAuthor?: UserReadData,
  endorsements?: number,
  source?: Source,
  CreatedAt?: string,
  AcceptedAt?: string,
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
  country: string,
  state: string,
  biome: string,
  vegetationType: string,
  plantIds?: number[],
  contentStatus?: string,
  contentAuthor?: UserReadData,
  source?: Source,
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
      country: region.country,
      state: region.state,
      biome: region.biome,
      vegetationType: region.vegetation_type,
      contentStatus: region.content_status,
      contentAuthor: region.content_author,
      source: region.source,
      createdAt: region.created_at,
    }
  })

  return data;
}
