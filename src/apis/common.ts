import axios, { AxiosError } from 'axios';
import { showError } from '../components/common/notifications';

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
    }
    showError(JSON.stringify("Serviço indisponível. Tente novamente em instantes."));
  }
}
