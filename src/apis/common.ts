import axios, { AxiosError } from 'axios';
import { showError } from '../components/common/notifications';
import { UseQueryOptions } from '@tanstack/react-query';

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type EmptyObject = Record<PropertyKey, never>;

export interface QueryOptions<DataType> extends UseQueryOptions<DataType, Error, DataType, string[]> {};

export interface QueryFnInput {
  queryKey: string[]
}

export interface WriteFnInput<WriteRequestData> {
  id?: number
  data: WriteRequestData
}

export interface GenericResponse {
  msg: string
}

export interface JsonSchemaBoolean {
  type: "boolean"
}

export interface JsonSchemaNumber {
  type: "integer" | "number"
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
}

export interface JsonSchemaString {
  type: "string"
  format?: "date" | "time" | "date-time" | "uri" | "email"
  minLength?: number
  maxLength?: number
  pattern?: string
}

export interface JsonSchemaArray {
  type: "array"
  items: JsonSchema
  uniqueItems?: boolean
}

export type JsonSchema = JsonSchemaBoolean | JsonSchemaNumber | JsonSchemaString | JsonSchemaArray;

export function defaultRequestRetry(failureCount: number, error: Error) {
  if (error instanceof AxiosError && error.status && error.status < 500 || failureCount > 1)
    return false;

  return true;
}

interface DefaultHTTPRequestFnInput {
  endpoint: string,
}

interface DefaultMutationFnInput extends DefaultHTTPRequestFnInput {
  data: Object,
}

export async function defaultPostFn({ endpoint, data }: DefaultMutationFnInput): Promise<any> {
  const body = camelToSnakeCase(data);
  const res = await axios.post(endpoint.toLowerCase(), body);
  
  return snakeToCamelCase(res.data);
}

export async function defaultPutFn({ endpoint, data }: DefaultMutationFnInput): Promise<any> {
  const body = camelToSnakeCase(data);
  const res = await axios.put(endpoint.toLowerCase(), body);
  
  return snakeToCamelCase(res.data);
}

export async function defaultDeleteFn({ endpoint }: DefaultHTTPRequestFnInput): Promise<any> {
  const res = await axios.delete(endpoint.toLowerCase());
  
  return snakeToCamelCase(res.data);
}

interface DefaultQueryFnInput extends DefaultHTTPRequestFnInput {
  params?: string[]
}

export async function defaultQueryFn({ endpoint, params = [] }: DefaultQueryFnInput): Promise<any> {
  let res = await axios.get(endpoint.toLowerCase() + (params && `?${params.join('&')}`));

  return snakeToCamelCase(res.data);
}

export async function showMutationError(error: Error){
  let errorMsg = "Algo de errado não está certo.";

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const keys = Object.keys(error.response.data);
      if (keys.length === 1 && keys[0] === "msg") {
        const msg = error.response.data.msg;
        errorMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
      }
      else {
        errorMsg = JSON.stringify(error.response.data);
      }
    } else {
      errorMsg = "Serviço indisponível. Tente novamente em instantes.";
    }

    showError(errorMsg, "Erro");
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