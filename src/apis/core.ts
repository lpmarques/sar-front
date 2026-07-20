/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import axios from 'axios';
import {
  camelToSnakeCase,
  defaultDeleteFn,
  defaultPostFn,
  defaultQueryFn,
  GenericResponse,
  JsonSchema,
  QueryFnInput
} from './common';

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
}

export async function createUser(data: UserWriteRequestData): Promise<GenericResponse> {
  return defaultPostFn({ endpoint: "/core/user", data });
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
  const requestBody = camelToSnakeCase(data);

  return await axios.patch("/core/user", requestBody);
}

export async function deleteUser(): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: "/core/user" });
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
  return defaultPostFn({ endpoint: "/core/user/token", data });
}

export async function deleteUserToken(): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: "/core/user/token" });
}

export interface EndorsementWriteRequestData {
  contentId: number,
}

export interface EndorsementWriteResponseData extends GenericResponse {
  endorsementId: number,
}

export async function createEndorsement(data: EndorsementWriteRequestData): Promise<EndorsementWriteResponseData> {  
  return defaultPostFn({ endpoint: '/core/endorsements', data });
}

export async function deleteEndorsement(endorsementId: number): Promise<GenericResponse> {
  return defaultDeleteFn({ endpoint: `/core/endorsements/${endorsementId}`});
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
  return defaultPostFn({ endpoint: '/core/sources', data });
}


// QUERIES

export interface ContentReadData {
  id: number,
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

export interface ContentPreviewReadData {
  id: number,
  type: string,
  status: string,
  endorsementsCount: number,
  proposer: UserReadData,
  proposerComment: string,
  acceptor: UserReadData,
  rejector: UserReadData,
  proposedAt: string,
  acceptedAt: string | null,
  rejectedAt: string | null,
}

export async function getContentPreview({ queryKey: [_, contentId] }: QueryFnInput): Promise<ContentPreviewReadData> {
  return defaultQueryFn({ endpoint: `/core/contents/${contentId}` });
}

export async function getContentPreviewList({ queryKey: [_, ...params] }: QueryFnInput): Promise<ContentPreviewReadData[]> {
  return defaultQueryFn({ endpoint: `/core/contents`, params });
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
  return defaultQueryFn({ endpoint: `/core/sources/${sourceId}` });
}

export async function getSourceList(_: QueryFnInput): Promise<SourceReadData[]> {
  return defaultQueryFn({ endpoint: "/core/sources" });
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
  return defaultQueryFn({ endpoint: "/core/source-types" });
}

export async function getSourceSubtypeList({ queryKey: [_, typeId] }: QueryFnInput): Promise<SourceTypeReadData[]> {
  return defaultQueryFn({ endpoint: `/core/source-types/${typeId}/subtypes` });
}

export interface UserReadData {
  id: number,
  firstName: string,
  lastName: string,
  email: string,
  isStaff: boolean,
  occupation?: string,
  company?: string,
  country?: string,
  state?: string,
  municipality?: string,
};

export async function getOwnUser({ queryKey: [_, ...params] }: QueryFnInput): Promise<UserReadData> {
  return defaultQueryFn({ endpoint: "/core/user", params });
}

export async function getUser({ queryKey: [_, ...params] }: QueryFnInput): Promise<UserReadData> {
  return defaultQueryFn({ endpoint: "/core/users", params });
}

export interface EndorsementReadData {
  id: number,
  endorser?: UserReadData,
  contentId: number,
  createdAt: string
}

export async function getEndorsements({ queryKey: [_, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
  return defaultQueryFn({ endpoint: `/core/endorsements?content_id=${contentId}` });
}

export async function getUserEndorsements({ queryKey: [_, contentId] }: QueryFnInput): Promise<EndorsementReadData[]> {
  return defaultQueryFn({ endpoint: `/core/user/endorsements?content_id=${contentId}` });
}
