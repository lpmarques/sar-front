import axios from 'axios';
import { QueryFnInput, snakeToCamelCase } from './common';

// MUTATIONS

export interface UserCreateData {
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

export async function createUser(data: UserCreateData) {
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

// QUERIES

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
