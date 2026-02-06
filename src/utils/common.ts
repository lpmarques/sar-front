import { Position } from "geojson";
import { latLng, LatLng } from "leaflet";

export function sortValueFirst(a: string, b: string, value: string): number;
export function sortValueFirst(a: number, b: number, value: number): number;
export function sortValueFirst(a: string | number, b: string | number, value: string | number): number {
  if (a === b)
    return 0;
  if (a === value)
    return -1;
  if (b === value)
    return 1;
  
  return 0;
}

export function emptyIfUndefined(value: any | undefined) {
  return value ?? "";
}

export function undefinedIfEmpty(value: string | null | undefined): string | undefined;
export function undefinedIfEmpty(value: string[] | null | undefined): string[] | undefined;
export function undefinedIfEmpty(value: string | string[] | null | undefined) {
  if (value === undefined || value !== null && value.length > 0)
    return value;

  return undefined;
}

export function capitalize(value: string) {
  if (value.length === 0)
    return value;

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function getArraySubset(arr: any[], indices: number[]) {
  return arr.filter((_, index) => indices.includes(index));
}

export type Primitive = number | string | boolean | symbol | bigint | undefined;

export function convertStringToPrimitiveType(str: string, primitive: Primitive) {
  switch (typeof primitive) {
    case "string":
      return str;
    case "number":
      return Number(str);
    case "boolean":
      return str === "true";
    case "symbol":
      return Symbol(str);
    case "bigint":
      return BigInt(str);
    case "undefined":
      return undefined;
  }
}

export function unaccent(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function positionToLatLng(coords: Position): LatLng;
export function positionToLatLng(coords: Position[]): LatLng[];
export function positionToLatLng(coords: Position[][]): LatLng[][];
export function positionToLatLng(coords: Position | Position[] | Position[][]): LatLng | LatLng[] | LatLng[][] {
  if (typeof coords[0] === 'number')
    return latLng(coords[1] as number, coords[0]);
  if (typeof coords[0][0] === 'number')
    return coords.map(coords => positionToLatLng(coords as Position));

  return coords.map(coords => positionToLatLng(coords as Position[]));
}

// TODO: replace with component linking coordinates to google maps (https://maps.google.com/?q={lat},{long})
export function latLongToString(latitude: number, longitude: number, decimalPlaces: number = 4) {
  const rndFctr = Math.pow(10, decimalPlaces);

  return `${Math.round(latitude*rndFctr)/rndFctr},${Math.round(longitude*rndFctr)/rndFctr}`
}
