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
import { defaultDeleteFn, defaultPostFn, defaultQueryFn, GenericResponse, QueryFnInput, snakeToCamelCase } from './common';
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
  return defaultPostFn({ endpoint: "/catalog/plants", data });
}

export async function acceptPlant(plantId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/plants/${plantId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectPlant(plantId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/catalog/plants/${plantId}` });
}

export interface TraitValueWriteRequestData extends ContentWriteRequestData {
  plantId: number,
  traitId: number,
  value: TraitValue,
}

export async function proposeTraitValue(data: TraitValueWriteRequestData): Promise<ContentWriteResponseData> {
  return defaultPostFn({ endpoint: "/catalog/trait-values", data });
}

export async function acceptTraitValue(traitValueId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/trait-values/${traitValueId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectTraitValue(traitValueId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/catalog/trait-values/${traitValueId}` });
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
  return defaultPostFn({ endpoint: "/catalog/taxa", data });
}

export async function acceptTaxon(taxonId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/taxa/${taxonId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectTaxon(taxonId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/catalog/taxa/${taxonId}` });
}

export interface PopularNameWriteRequestData extends ContentWriteRequestData {
  name: string,
  plantId: number,
}

export async function proposePopularName(data: PopularNameWriteRequestData): Promise<ContentWriteResponseData> {
  return defaultPostFn({ endpoint: "/catalog/popular-names", data });
}

export async function acceptPopularName(popularNameId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/popular-names/${popularNameId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectPopularName(popularNameId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/catalog/popular-names/${popularNameId}` });
}

export interface NaturalOccurrenceRegionWriteRequestData extends ContentWriteRequestData {
  countryId: number,
  stateId?: number,
  biomeId?: number,
  vegetationTypeId?: number,
  plantId: number,
}

export async function proposeNaturalOccurrenceRegion(data: NaturalOccurrenceRegionWriteRequestData): Promise<ContentWriteResponseData> {
  return defaultPostFn({ endpoint: "/catalog/natural-occurrence-regions", data });
}

export async function acceptNaturalOccurrenceRegion(regionId: number): Promise<GenericResponse> {
  const res = await axios.patch(`/catalog/natural-occurrence-regions/${regionId}`);
  
  return snakeToCamelCase(res.data);
}

export async function rejectNaturalOccurrenceRegion(regionId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/catalog/natural-occurrence-regions/${regionId}` });
}

// QUERIES

export interface PlantReadData extends ContentReadData {
  acceptedTaxonName: string,
  acceptedFamilyName: string,
  mainPopularName: string,
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
  return defaultQueryFn({ endpoint: '/catalog/plants', params });
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
  return defaultQueryFn({ endpoint: `/catalog/traits`, params });
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
  return defaultQueryFn({ endpoint: `/catalog/trait-values`, params });
}

export async function getPlantTraitValueList({ queryKey: [_, plantId, ...params] }: QueryFnInput ): Promise<TraitValueReadData[]> {
  return defaultQueryFn({ endpoint: `/catalog/plants/${plantId}/trait-values`, params });
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
  return defaultQueryFn({ endpoint: '/catalog/taxa', params });
}

export async function getPlantTaxonList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<TaxonReadData[]> {
  return defaultQueryFn({ endpoint: `/catalog/plants/${plantId}/taxa`, params });
}

export interface PopularNameReadData extends ContentReadData {
  name: string,
  plantId: number,
}

export async function getPopularName({ queryKey: [_, popularNameId, ...params] }: QueryFnInput ): Promise<PopularNameReadData[]> {
  return defaultQueryFn({ endpoint: `/catalog/popular-names/${popularNameId}`, params });
}

export async function getPopularNameList({ queryKey: [_, ...params] }: QueryFnInput): Promise<PopularNameReadData[]> {
  return defaultQueryFn({ endpoint: '/catalog/popular-names', params });
}

export async function getPlantPopularNameList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<PopularNameReadData[]> {
  return defaultQueryFn({ endpoint: `/catalog/plants/${plantId}/popular-names`, params });
}

export interface NaturalOccurrenceRegionReadData extends ContentReadData {
  country: CountryData,
  state: StateData | null,
  biome: BiomeData | null,
  vegetationType: VegetationTypeData | null,
  plantId: number,
}

export async function getNaturalOccurrenceRegion({ queryKey: [_, regionId, ...params] }: QueryFnInput ): Promise<NaturalOccurrenceRegionReadData> {
  return defaultQueryFn({ endpoint: `/catalog/natural-occurrence-regions/${regionId}`, params });
}

export async function getNaturalOccurrenceRegionList({ queryKey: [_, ...params] }: QueryFnInput ): Promise<NaturalOccurrenceRegionReadData[]> {
  return defaultQueryFn({ endpoint: `/catalog/natural-occurrence-regions`, params });
}

export async function getPlantNaturalOccurrenceRegionList({ queryKey: [_, plantId, ...params] }: QueryFnInput): Promise<NaturalOccurrenceRegionReadData[]> {
  return defaultQueryFn({ endpoint: `/catalog/plants/${plantId}/natural-occurrence-regions`, params });
}
