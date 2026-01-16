import { defaultDeleteFn, defaultPostFn, defaultPutFn, defaultQueryFn, GenericResponse, JsonSchema, WriteFnInput, QueryFnInput } from './common';
import { UserReadData } from './core';
import { Point, Polygon } from 'geojson';
import { BiomeData, CountryData, MunicipalityData, StateData, VegetationTypeData } from './geography';

export type Range = [number, number];

export type SiteTraitValue = Range | number | boolean | string | string[];

// MUTATIONS

export interface SiteWriteRequestData {
  location?: Point,
  polygon?: Polygon,
  municipalityId?: number,
  traitValues: SiteTraitValueWriteRequestData[],
}

export interface FarmWriteRequestData extends SiteWriteRequestData {
  name: string,
}

export interface FarmWriteResponseData extends GenericResponse {
  farmId: number,
  siteId: number,
}

export async function createFarm({ data }: WriteFnInput<FarmWriteRequestData>): Promise<FarmWriteResponseData> {
  return defaultPostFn({ endpoint: "/agroforestry/farms", data: data });
}

export async function updateFarm({ id, data }: WriteFnInput<FarmWriteRequestData>): Promise<GenericResponse> {
  return defaultPutFn({ endpoint: `/agroforestry/farms/${id}`, data: data });
}

export async function deleteFarm(farmId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/agroforestry/farms/${farmId}` });
}

export interface FieldWriteRequestData extends SiteWriteRequestData {
  name: string,
  farmId: number,
}

export interface FieldWriteResponseData extends GenericResponse {
  fieldId: number,
  siteId: number,
}

export async function createField({ data }: WriteFnInput<FieldWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPostFn({ endpoint: "/agroforestry/fields", data: data });
}

export async function updateField({ id, data }: WriteFnInput<FieldWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPutFn({ endpoint: `/agroforestry/fields/${id}`, data: data });
}

export async function deleteField(fieldId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/agroforestry/fields/${fieldId}` });
}

export interface SiteTraitValueWriteRequestData {
  siteId?: number,
  traitId: number,
  value: SiteTraitValue,
}

export interface SiteTraitValueWriteResponseData extends GenericResponse {
  siteTraitValueId: number,
}

export async function createSiteTraitValue({ data }: WriteFnInput<SiteTraitValueWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPostFn({ endpoint: "/agroforestry/site-trait-value", data: data });
}

export async function updateSiteTraitValue({ id, data }: WriteFnInput<SiteTraitValueWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPutFn({ endpoint: `/agroforestry/site-trait-value/${id}`, data: data });
}

export async function deleteSiteTraitValue(siteTraitValueId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/agroforestry/site-trait-value/${siteTraitValueId}` });
}

// QUERIES

export interface SiteReadData {
  siteId: number,
  name: string,
  user: UserReadData,
  location: Point,
  polygon: Polygon | null,
  areaM2: number | null,
  country: CountryData,
  state: StateData | null,
  municipality: MunicipalityData | null,
  biome: BiomeData | null,
  vegetationType: VegetationTypeData | null,
  traitValues: SiteTraitValueReadData[],
  createdAt: string,
}

export interface FarmReadData extends SiteReadData {
  id: number,
}

export async function getFarm({ queryKey: [_, farmId, ...params] }: QueryFnInput ): Promise<FarmReadData> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms/${farmId}`, params });
}

export async function getFarmList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<FarmReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms`, params });
}

export interface FieldReadData extends SiteReadData {
  id: number,
  farmId: number,
}

export async function getField({ queryKey: [_, fieldId, ...params] }: QueryFnInput ): Promise<FieldReadData> {
  return defaultQueryFn({ endpoint: `/agroforestry/fields/${fieldId}`, params });
}

export async function getFieldList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<FieldReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/fields`, params });
}

interface SiteTraitTextValueOption {
  value: string,
  description: string,
}

export interface SiteTraitReadData {
  id: number,
  slug: string,
  name: string,
  sectionSlug: string,
  sectionName: string,
  description: string,
  schema: JsonSchema,
  position: number,
  isNullable: boolean,
  textValueOptions: SiteTraitTextValueOption[],
}

export async function getSiteTraitList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<SiteTraitReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/site-traits`, params });
}

export interface SiteTraitValueReadData {
  id: number,
  siteId: number,
  traitId: number,
  traitSlug: string,
  traitName: string,
  sectionSlug: string,
  sectionName: string,
  schema: JsonSchema,
  value: SiteTraitValue,
}

export async function getSiteTraitValue({ queryKey: [_, siteTraitValueId, ...params] }: QueryFnInput ): Promise<SiteTraitValueReadData> {
  return defaultQueryFn({ endpoint: `/agroforestry/site-trait-values/${siteTraitValueId}`, params });
}

export async function getFarmTraitValueList({ queryKey: [_, farmId, ...params] }: QueryFnInput ): Promise<SiteTraitValueReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms/${farmId}/site-trait-values`, params });
}

export async function getFieldTraitValueList({ queryKey: [_, fieldId, ...params] }: QueryFnInput ): Promise<SiteTraitValueReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/fields/${fieldId}/site-trait-values`, params });
}
