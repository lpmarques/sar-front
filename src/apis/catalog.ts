import axios from 'axios';

interface PlantReadData {
  id: number,
  acceptedScientificName: string,
}

export interface ScientificNameReadData {
  name: string,
  taxonomicStatus: string,
  plant: PlantReadData,
  popularNames: string[],
}

export async function getScientificNameList(): Promise<ScientificNameReadData[]> {
  let res = await axios.get('/catalog/scientific-names');

  let data = res.data.map((nameData: any) => {
    return {
      name: nameData.name,
      taxonomicStatus: nameData.taxonomic_status,
      plant: {
        id: nameData.plant.id,
        acceptedScientificName: nameData.plant.accepted_scientific_name,
      },
      popularNames: nameData.popular_names,
    }
  })

  return data;
}
