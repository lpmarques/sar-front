import { PlantReadData } from "../apis/catalog";

export const plantFullLabel = (plant: PlantReadData) => 
  `${plant.acceptedTaxonName} (${plant.mainPopularName})`;