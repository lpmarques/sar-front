import axios from 'axios';
import { snakeToCamelCase } from './common';

interface PlantTraitRangeValue {
  type: string,
  minimum: number,
  maximum: number,
}

interface PlantTraitValue {
  id: number,
  traitKey: string,
  traitName: string,
  sectionKey: string,
  section: string,
  value: boolean | string | string[] | number | PlantTraitRangeValue,
  sourceId: number,
}

export interface PlantListItemData {
  id: number,
  acceptedScientificName: string,
  synonymScientificNames: string[],
  popularNames: string[],
  traitValues: PlantTraitValue[],
}

export async function getPlantList(): Promise<PlantListItemData[]> {
  let res = await axios.get('/catalog/plants?with_scientific_names=true&scientific_names_toxonomic_status=synonym&with_popular_names=true&with_trait_values=true&trait_values_trait_keys=family_name,life_cycle,life_forms');

  let data = res.data.map((item: any) => {
    return {
      id: item.id,
      acceptedScientificName: item.accepted_scientific_name,
      synonymScientificNames: snakeToCamelCase(item.scientific_names),
      popularNames: snakeToCamelCase(item.popular_names),
      traitValues: snakeToCamelCase(item.trait_values),
    }
  })

  return data;
}

export interface ScientificNameReadData {
  name: string,
  taxonomicStatus: string,
  plantId: number,
}

export async function getScientificNameList(): Promise<ScientificNameReadData[]> {
  let res = await axios.get('/catalog/scientific-names');

  let data = res.data.map((nameData: any) => {
    return {
      name: nameData.name,
      taxonomicStatus: nameData.taxonomic_status,
      plantId: nameData.plant_id,
    }
  })

  return data;
}
export interface PopularNameReadData {
  name: string,
  plantId: number,
}

export async function getPopularNameList(): Promise<PopularNameReadData[]> {
  let res = await axios.get('/catalog/popular-names');

  let data = res.data.map((nameData: any) => {
    return {
      name: nameData.name,
      plantId: nameData.plant_id,
    }
  })

  return data;
}
