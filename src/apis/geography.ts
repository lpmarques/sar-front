import axios from 'axios';
import { QueryFnInput, snakeToCamelCase } from './common';

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
  state_id: number,
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
