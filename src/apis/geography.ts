import axios, { AxiosResponse } from 'axios';
import { queryFnInput } from './common';

export interface CountryData {
  id: number,
  name: string
}

export async function getCountryList(): Promise<AxiosResponse<CountryData[]>> {
  return await axios.get('/geography/countries');
}

export async function getCountry({ queryKey: [countryId] }: queryFnInput): Promise<AxiosResponse<CountryData>> {
  return await axios.get(`/geography/countries/${countryId}`);
}

export interface StateData {
  id: number,
  name: string,
  code: string,
  country: CountryData
}

export async function getStateList({ queryKey: [countryId] }: queryFnInput): Promise<AxiosResponse<StateData[]>> {
  return await axios.get(`/geography/countries/${countryId}/states`);
}

export async function getState({ queryKey: [stateId] }: queryFnInput): Promise<AxiosResponse<StateData>> {
  return await axios.get(`/geography/states/${stateId}`);
}

export interface MunicipalityData {
  id: number,
  name: string,
  state: StateData
}

export async function getMunicipalityList({ queryKey: [stateId] }: queryFnInput): Promise<AxiosResponse<MunicipalityData[]>> {
  return await axios.get(`/geography/states/${stateId}/municipalities`);
}

export async function getMunicipality({ queryKey: [municipalityId] }: queryFnInput): Promise<AxiosResponse<MunicipalityData>> {
  return await axios.get(`/geography/municipalities/${municipalityId}`);
}
