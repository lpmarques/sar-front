import axios, { AxiosError } from 'axios';
import { showError } from '../components/common/notifications';
import {createCheckers} from "ts-interface-checker";

export interface GenericResponse {
  msg: string
}

export function defaultRequestRetry(failureCount: number, error: Error) {
  console.log(error)
  if (error instanceof AxiosError && error.status && error.status < 500 || failureCount > 1)
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
  let errorMsg = "Algo de errado não está certo.";

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const keys = Object.keys(error.response.data)
      if (keys.length === 1 && keys[0] === "msg")
        errorMsg = error.response.data.msg;
      else
        errorMsg = JSON.stringify(error.response.data);
    } else {
      errorMsg = "Serviço indisponível. Tente novamente em instantes.";
    }

    showError(errorMsg, "Erro")
  }
}

export function camelToSnakeCase<T>(obj: T): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnakeCase(item));
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/([a-z])([A-Z])/g, (_, prev, capital) => `${prev}_${capital.toLowerCase()}`).replace(/^([A-Z])/g, (_, capital) => capital.toLowerCase());
      newObj[snakeKey] = camelToSnakeCase(obj[key]);
    }
  }
  return newObj;
}

export function snakeToCamelCase<T>(obj: T): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamelCase(item));
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = snakeToCamelCase(obj[key]);
    }
  }
  return newObj;
}

export function isArrayOfType(value: any, type: string): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === type);
}

export function isValidHttpUrl(url: string): boolean {
  let givenURL;
  try {
    givenURL = new URL(url);
  } catch (error) {
    return false;
  }
  return givenURL.protocol === "http:" || givenURL.protocol === "https:";
}