import axios from 'axios';
import { QueryFnInput } from './common';

export interface CountryData {
  id: number,
  name: string
}

export async function getCountryList(): Promise<CountryData[]> {
  return (await axios.get('/geography/countries')).data;
}

export async function getCountry({ queryKey: [countryId] }: QueryFnInput): Promise<CountryData> {
  return (await axios.get(`/geography/countries/${countryId}`)).data;
}

export interface StateData {
  id: number,
  name: string,
  code: string,
  country: CountryData
}

export async function getStateList({ queryKey: [countryId] }: QueryFnInput): Promise<StateData[]> {
  return (await axios.get(`/geography/countries/${countryId}/states`)).data;
}

export async function getState({ queryKey: [stateId] }: QueryFnInput): Promise<StateData> {
  return (await axios.get(`/geography/states/${stateId}`)).data;
}

export interface MunicipalityData {
  id: number,
  name: string,
  state: StateData
}

export async function getMunicipalityList({ queryKey: [stateId] }: QueryFnInput): Promise<MunicipalityData[]> {
  return (await axios.get(`/geography/states/${stateId}/municipalities`)).data;
}

export async function getMunicipality({ queryKey: [municipalityId] }: QueryFnInput): Promise<MunicipalityData> {
  return (await axios.get(`/geography/municipalities/${municipalityId}`)).data;
}
