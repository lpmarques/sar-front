import axios, { AxiosError } from 'axios';
import { showError } from '../components/common/notifications';

export interface GenericResponse {
  msg: string
}

export function defaultRequestRetry(failureCount: number, error: Error) {
  
  if (error instanceof AxiosError && error.code == 'ERR_BAD_REQUEST' || failureCount > 1)
    return false

  return true
}

export interface MutationFnInput {
  mutationKey: string[]
}

export async function defaultMutationFn({ mutationKey: [endpoint] }: MutationFnInput) {

  return await axios.post(endpoint.toLowerCase());
}

export interface QueryFnInput {
  queryKey: string[]
}

export async function defaultQueryFn({ queryKey: [endpoint] }: QueryFnInput) {

  return await axios.get(endpoint.toLowerCase());
}

export async function showMutationError(error: Error){
  if (axios.isAxiosError(error)) {
    if (error.response) {
      showError(JSON.stringify(error.response.data.msg));
    } else {
      showError(JSON.stringify("Serviço indisponível. Tente novamente em instantes."));
    }
  }
}

export function camelToSnakeCase<T>(obj: T): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj; // Return non-objects directly
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnakeCase(item)); // Recursively handle array elements
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/([a-z])([A-Z])/g, (_, prev, capital) => `${prev}_${capital.toLowerCase()}`).replace(/^([A-Z])/g, (_, capital) => capital.toLowerCase());
      newObj[snakeKey] = camelToSnakeCase(obj[key]); // Recursively handle nested objects
    }
  }
  return newObj;
}

export function snakeToCamelCase<T>(obj: T): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj; // Return non-objects directly
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamelCase(item)); // Recursively handle array elements
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = snakeToCamelCase(obj[key]); // Recursively handle nested objects
    }
  }
  return newObj;
}

export function isArrayOfType(value: any, type: string): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === type);
}
