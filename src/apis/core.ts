import axios from 'axios';
import { GenericResponse, QueryFnInput, snakeToCamelCase } from './common';

// MUTATIONS

export interface UserWriteData {
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  occupation: string,
  company?: string,
  countryId?: number,
  stateId?: number,
  municipalityId?: number,
};

export async function createUser(data: UserWriteData) {
  const requestBody = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    password: data.password,
    occupation: data.occupation,
    company: data.company,
    country_id: data.countryId,
    state_id: data.stateId,
    municipality_id: data.municipalityId,
  };

  return await axios.post("/core/user", requestBody);
}

export interface UserEditData {
  firstName?: string,
  lastName?: string,
  occupation?: string,
  company?: string,
  countryId?: number,
  stateId?: number,
  municipalityId?: number,
};

export async function editUser(data: UserEditData) {
  const requestBody = {
    first_name: data.firstName,
    last_name: data.lastName,
    occupation: data.occupation,
    company: data.company,
    country_id: data.countryId,
    state_id: data.stateId,
    municipality_id: data.municipalityId,
  };

  return await axios.patch("/core/user", requestBody);
}

export async function deleteUser() {

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
  let res = await axios.post("/core/user/token", data);

  return {
    token: res.data.token,
    user: snakeToCamelCase(res.data.user),
    msg: res.data.msg
  }
}

export async function deleteUserToken() {

  return await axios.delete("/core/user/token");
}

export interface EndorsementWriteRequestData {
  contentType: string,
  contentId: number,
}

export interface EndorsementWriteResponseData extends GenericResponse {
  endorsementId: number,
}

const contentTypeToIdField: { [key: string]: string } = {
  "plant_value": "plant_value_id",
  "plant_popularName": "plant_popular_name_id",
  "plant_scientific_name": "plant_scientific_name_id",
};

const buildEndorsementWriteBody = (data: EndorsementWriteRequestData) => {
  let body: { [key: string]: any } = {
    content_type: data.contentType,
  };
  body[contentTypeToIdField[data.contentType]] = data.contentId;

  return body;
}

export async function createEndorsement(data: EndorsementWriteRequestData): Promise<EndorsementWriteResponseData> {  
  const body = buildEndorsementWriteBody(data);
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
  // const body = camelToSnakeCase(data);
  const body = {
    type: data.type,
    year: data.year,
    publication_title: data.title,
    publication_authors: data.authors,
    publisher: data.publisher,
    url: data.url,
    description: data.description,
  };
  let res = await axios.post('/core/source', body);

  return snakeToCamelCase(res.data);
}


// QUERIES

export interface SourceReadData {
  id: number,
  type: string,
  year: number,
  publicationTitle: string,
  publicationAuthors: string[],
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
  contentType: string,
  contentId: number,
  createdAt: string
}

export async function getEndorsements({ queryKey: [queryName, contentType, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
  const contentIdField = contentTypeToIdField[contentType];
  const endpoint = `/core/endorsements?content_type=${contentType}&${contentIdField}=${contentId}`;

  let res = await axios.get(endpoint);
  
  let data = res.data.map((item: any) => (
    {
      id: item.id,
      endorser: snakeToCamelCase(item.endorser),
      contentType: item.content_type,
      contentId: item[contentTypeToIdField[item.content_type]],
      createdAt: item.created_at,
    }
  ))

  return data;
}

export async function getUserEndorsements({ queryKey: [queryName, contentType, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
  const contentIdField = contentTypeToIdField[contentType];
  const endpoint = `/core/user/endorsements?content_type=${contentType}&${contentIdField}=${contentId}`;

  let res = await axios.get(endpoint);
  
  let data = res.data.map((item: any) => (
    {
      id: item.id,
      contentType: item.content_type,
      contentId: item[contentTypeToIdField[item.content_type]],
      createdAt: item.created_at,
    }
  ))

  return data;
}
