import axios from 'axios';
import { camelToSnakeCase, GenericResponse, JsonSchema, QueryFnInput, snakeToCamelCase } from './common';

// MUTATIONS

export interface ContentWriteRequestData {
  sourceId: number,
  contentProposerComment?: string,
}

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
  const requestBody = camelToSnakeCase(data);

  const res = await axios.post("/core/user", requestBody);

  return res.data;
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

export interface UserTokenResponseData extends GenericResponse {
  token: string,
  user: UserReadData,
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

export type SourceValue = number | string | string[];

export interface SourceFieldValueWriteData {
  fieldId: number,
  value: SourceValue,
}

export interface SourceWriteRequestData {
  typeId: number,
  fieldValues: SourceFieldValueWriteData[],
  creatorNotes?: string,
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

export interface ContentReadData {
  contentId: number,
  contentStatus: string,
  contentProposer?: UserReadData,
  endorsementsCount?: number,
  isEndorsedByUser?: boolean,
  userEndorsementId?: number,
  sourceId?: number,
  proposedAt?: string,
  acceptedAt?: string,
  rejectedAt?: string,
}

interface SourceFieldValueReadData {
  field: string,
  value: SourceValue,
  schema: JsonSchema,
  position: number,
}

export interface SourceReadData {
  id: number,
  type: string,
  isStatic: boolean,
  fieldValues: SourceFieldValueReadData[]
  creatorId: number,
  createdAt: string,
  deletedAt: string,
}

export async function getSource({ queryKey: [_, sourceId] }: QueryFnInput): Promise<SourceReadData> {
  const res = await axios.get(`/core/sources/${sourceId}`);

  return snakeToCamelCase(res.data);
}

export async function getSourceList(_: QueryFnInput): Promise<SourceReadData[]> {
  const res = await axios.get("/core/sources");

  return snakeToCamelCase(res.data);
}

export interface SourceField {
  id: number,
  name: string,
  description: string,
  schema: JsonSchema,
  isNullable: boolean,
  position: number,
}

export interface SourceTypeReadData {
  id: number,
  name: string,
  level: "type" | "subtype",
  parentId: null | number,
  isStatic: boolean,
  fields: SourceField[],
}

export async function getSourceTypeList({ queryKey: [_] }: QueryFnInput): Promise<SourceTypeReadData[]> {
  const res = await axios.get("/core/source-types");

  return snakeToCamelCase(res.data);
}

export async function getSourceSubtypeList({ queryKey: [_, typeId] }: QueryFnInput): Promise<SourceTypeReadData[]> {
  const res = await axios.get(`/core/source-types/${typeId}/subtypes`);

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

export async function getUser({ queryKey: [_, ...params] }: QueryFnInput): Promise<UserReadData> {
  console.log(params)
  const endpoint = params.length > 0 ? "/core/users" + (params && `?${params.join('&')}`) : "/core/user";
  console.log(endpoint)

  let res = await axios.get(endpoint);

  return snakeToCamelCase(res.data);
}

export interface EndorsementReadData {
  id: number,
  endorser?: UserReadData,
  contentId: number,
  createdAt: string
}

export async function getEndorsements({ queryKey: [_, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
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

export async function getUserEndorsements({ queryKey: [_, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
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
