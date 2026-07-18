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

import { defaultDeleteFn, defaultPostFn, defaultPutFn, defaultQueryFn, GenericResponse, JsonSchema, WriteFnInput, QueryFnInput } from './common';
import { UserReadData } from './core';
import { Feature, Point, Polygon } from 'geojson';
import { BiomeData, CountryData, MunicipalityData, StateData, VegetationTypeData } from './geography';
import { PlantReadData } from './catalog';

export const fieldDataToGeoJSON = (data: FieldReadData): Feature<Polygon> => {
  const { location, polygon, ...properties } = data;
  return {
    type: 'Feature',
    geometry: polygon,
    properties: properties
  }
};

export type Range = [number, number];

export type SiteTraitValue = Range | number | boolean | string | string[];

// MUTATIONS

export interface SiteWriteRequestData {
  location?: Point,
  polygon?: Polygon,
  municipalityId?: number,
  traitValues?: SiteTraitValueWriteRequestData[],
}

export interface FarmWriteRequestData extends SiteWriteRequestData {
  name: string,
  traitValues: SiteTraitValueWriteRequestData[],
}

export interface FarmWriteResponseData extends GenericResponse {
  farmId: number,
  siteId: number,
}

export async function createFarm({ data }: WriteFnInput<FarmWriteRequestData>): Promise<FarmWriteResponseData> {
  return defaultPostFn({ endpoint: "/agroforestry/farms", data });
}

export async function updateFarm({ id, data }: WriteFnInput<FarmWriteRequestData>): Promise<GenericResponse> {
  return defaultPutFn({ endpoint: `/agroforestry/farms/${id}`, data });
}

export async function deleteFarm(farmId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/agroforestry/farms/${farmId}` });
}

export interface FieldWriteRequestData extends SiteWriteRequestData {
  name: string,
  farmId: number,
  polygon: Polygon,
  cropping?: Cropping | null,
}

export interface FieldWriteResponseData extends GenericResponse {
  fieldId: number,
  siteId: number,
}

export async function createField({ data }: WriteFnInput<FieldWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPostFn({ endpoint: "/agroforestry/fields", data });
}

export async function updateField({ id, data }: WriteFnInput<FieldWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPutFn({ endpoint: `/agroforestry/fields/${id}`, data });
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
  return defaultPostFn({ endpoint: "/agroforestry/site-trait-value", data });
}

export async function updateSiteTraitValue({ id, data }: WriteFnInput<SiteTraitValueWriteRequestData>): Promise<FieldWriteResponseData> {
  return defaultPutFn({ endpoint: `/agroforestry/site-trait-value/${id}`, data });
}

export async function deleteSiteTraitValue(siteTraitValueId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/agroforestry/site-trait-value/${siteTraitValueId}` });
}

// QUERIES

export interface SiteReadData {
  siteId: number,
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
  name: string,
  user: UserReadData,
}

export async function getFarm({ queryKey: [_, farmId, ...params] }: QueryFnInput ): Promise<FarmReadData> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms/${farmId}`, params });
}

export async function getFarmList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<FarmReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms`, params });
}

type EicatCategory = "Moderate" | "Major" | "Massive";

interface PlantFitness {
  isNative: boolean;
  isInvasive: boolean;
  eicatCategory: EicatCategory | null;
  fitnessScore: number;
  nativityScore: number;
}

interface CropUsageTraitValues {
  purposes: string[];
  isPlanted: boolean;
}

interface CropSummaryMetrics {
  individualsCount: number;
  occupiedAreaSqrm: number;
  densityPerHa: number;
}

export interface CropSummary {
  plant: PlantReadData;
  fitness?: PlantFitness;
  usage?: CropUsageTraitValues;
  metrics: CropSummaryMetrics;
}

export type CroppingSummaryCrops = {
  [key: string]: CropSummary
};

export interface CroppingSummary {
  individualsCount: number;
  densityPerHa: number;
  crops: CroppingSummaryCrops;
};

export interface Cropping {
  patternId: number;
  rowsAngleDeg: number;
  rowsOffsetM: number;
  cropsOffsetM: number;
  summary?: CroppingSummary;
}

export interface FieldReadData extends SiteReadData {
  id: number;
  farmId: number;
  name: string;
  user: UserReadData;
  polygon: Polygon;
  cropping: Cropping | null;
}

export async function getField({ queryKey: [_, fieldId, ...params] }: QueryFnInput ): Promise<FieldReadData> {
  return defaultQueryFn({ endpoint: `/agroforestry/fields/${fieldId}`, params });
}

export async function getFieldList({ queryKey: [_, farmId, ...params] }: QueryFnInput ): Promise<FieldReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms/${farmId}/fields`, params });
}

/** A single crop slot within a row: what plant it is and its position relative to other crops. */
export interface PatternCrop {
  plant: PlantReadData;
  position: number;
  distanceToNextCropM: number;
}

/**
 * One entry in the repeating row pattern.
 * The `crops` array is cycled along the full length of each row.
 */
export interface PatternRow {
  crops: PatternCrop[];
  position: number;
  purpose: string;
  cropsOffsetM: number;
  distanceToNextRowM: number;
}

export interface CroppingPatternReadData {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  sourcePatternId: number;
  author: UserReadData;
  rows: PatternRow[];
}

export async function getCroppingPattern({ queryKey: [_, patternId, ...params] }: QueryFnInput ): Promise<CroppingPatternReadData> {
  return defaultQueryFn({ endpoint: `/agroforestry/cropping-patterns/${patternId}`, params });
}

export async function getCroppingPatternList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<CroppingPatternReadData[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/cropping-patterns`, params });
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

export interface SitePlantFitness extends PlantFitness {
  plantId: number,
  acceptedTaxonName: string,
  colorHex: string,
}

export async function getFarmPlantFitnessList({ queryKey: [_, farmId, ...params] }: QueryFnInput ): Promise<SitePlantFitness[]> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms/${farmId}/site-plant-fitnesses`, params });
}

export async function getFarmPlantFitness({ queryKey: [_, farmId, plantId, ...params] }: QueryFnInput ): Promise<SitePlantFitness> {
  return defaultQueryFn({ endpoint: `/agroforestry/farms/${farmId}/site-plant-fitnesses/${plantId}`, params });
}
