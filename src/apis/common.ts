import axios, { AxiosError } from 'axios';

export function defaultRequestRetry(failureCount: number, error: Error) {
  
  if (error instanceof AxiosError && error.code == 'ERR_BAD_REQUEST' || failureCount > 1)
    return false

  return true
}

export interface mutationFnInput {
  mutationKey: string[]
}

export async function defaultMutationFn({ mutationKey: [endpoint] }: mutationFnInput) {

  return await axios.post(endpoint.toLowerCase());
}

export interface queryFnInput {
  queryKey: string[]
}

export async function defaultQueryFn({ queryKey: [endpoint] }: queryFnInput) {

  return await axios.get(endpoint.toLowerCase());
}
