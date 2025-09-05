import axios from 'axios';
import { camelToSnakeCase, GenericResponse, QueryFnInput, snakeToCamelCase } from './common';

// MUTATIONS

export interface ContentWriteResponseData extends GenericResponse {
  contentId: number,
}

export interface UserWriteRequestData {
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  occupation: string,
  company?: string,
  country?: string,
  state?: string,
  municipality?: string,
};

export async function createUser(data: UserWriteRequestData): Promise<GenericResponse> {
  const requestBody = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    password: data.password,
    occupation: data.occupation,
    company: data.company,
    country: data.country,
    state: data.state,
    municipality: data.municipality,
  };

  return await axios.post("/core/user", requestBody);
}

export interface UserEditData {
  firstName?: string,
  lastName?: string,
  occupation?: string,
  company?: string,
  country?: string,
  state?: string,
  municipality?: string,
};

export async function editUser(data: UserEditData): Promise<GenericResponse> {
  const requestBody = {
    first_name: data.firstName,
    last_name: data.lastName,
    occupation: data.occupation,
    company: data.company,
    country: data.country,
    state: data.state,
    municipality: data.municipality,
  };

  return await axios.patch("/core/user", requestBody);
}

export async function deleteUser(): Promise<GenericResponse> {

  return await axios.delete("/core/user");
}

interface UserTokenRequestData {
  email: string,
  password: string,
}

export interface UserTokenResponseData {
  token: string,
  user: UserReadData,
  msg: string,
}

export async function createUserToken(data: UserTokenRequestData): Promise<UserTokenResponseData> {
  const requestBody = {
    email: data.email,
    password: data.password,
  };

  let res = await axios.post("/core/user/token", requestBody);

  return {
    token: res.data.token,
    user: snakeToCamelCase(res.data.user),
    msg: res.data.msg
  }
}

export async function deleteUserToken(): Promise<GenericResponse> {

  return await axios.delete("/core/user/token");
}

export interface EndorsementWriteRequestData {
  contentId: number,
}

export interface EndorsementWriteResponseData extends GenericResponse {
  endorsementId: number,
}

export async function createEndorsement(data: EndorsementWriteRequestData): Promise<EndorsementWriteResponseData> {  
  const body = { content_id: data.contentId };
  let res = await axios.post('/core/endorsement', body);

  return snakeToCamelCase(res.data);
}

export async function deleteEndorsement(endorsementId: number): Promise<GenericResponse> {
  let res = await axios.delete(`/core/endorsements/${endorsementId}`);

  return res.data;
}

export interface SourceWriteRequestData {
  type: string,
  year: number,
  title: string,
  authors?: string[],
  publisher?: string,
  url?: string,
  description?: string,
}

export interface SourceWriteResponseData extends GenericResponse {
  sourceId: number,
}

export async function createSource(data: SourceWriteRequestData): Promise<SourceWriteResponseData> {  
  const body = camelToSnakeCase(data);
  let res = await axios.post('/core/source', body);

  return snakeToCamelCase(res.data);
}


// QUERIES

export interface SourceReadData {
  id: number,
  type: string,
  year: number,
  title: string,
  authors: string[],
  publisher: string,
  url: string,
  description: string,
  contentAuthorId: number,
}

export const sourceTypeToText: { [key: string]: string } = {
  "api": "API",
  "book": "Livro",
  "chapter": "Capítulo de livro",
  "monography": "Monografia",
  "paper": "Artigo",
  "public database": "Banco de dados público",
  "website": "Website",
};

export async function getSourceList({ queryKey: [queryName] }: QueryFnInput): Promise<SourceReadData[]> {
  const res = await axios.get("/core/sources");

  return snakeToCamelCase(res.data);
}

export interface UserReadData {
  id: number,
  firstName: string,
  lastName: string,
  email: string,
  occupation?: string,
  company?: string,
  country?: string,
  state?: string,
  municipality?: string,
};

export async function getUser({ queryKey: [queryName, userId] }: QueryFnInput): Promise<UserReadData> {
  const endpoint = userId ? `/core/users/${userId}` : "/core/user";

  let res = await axios.get(endpoint);
  
  let data = {
    id: res.data.id,
    firstName: res.data.first_name,
    lastName: res.data.last_name,
    email: res.data.email,
    password: res.data.password,
    occupation: res.data.occupation,
    company: res.data.company,
    country: res.data.country,
    state: res.data.state,
    municipality: res.data.municipality,
  }

  return data;
}

export interface EndorsementReadData {
  id: number,
  endorser?: UserReadData,
  contentId: number,
  createdAt: string
}

export async function getEndorsements({ queryKey: [queryName, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
  const endpoint = `/core/endorsements?content_id=${contentId}`;

  let res = await axios.get(endpoint);
  
  let data = res.data.map((item: any) => (
    {
      id: item.id,
      endorser: snakeToCamelCase(item.endorser),
      contentId: item.content_id,
      createdAt: item.created_at,
    }
  ))

  return data;
}

export async function getUserEndorsements({ queryKey: [queryName, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
  const endpoint = `/core/user/endorsements?content_id=${contentId}`;

  let res = await axios.get(endpoint);
  
  let data = res.data.map((item: any) => (
    {
      id: item.id,
      contentId: item.content_id,
      createdAt: item.created_at,
    }
  ))

  return data;
}
