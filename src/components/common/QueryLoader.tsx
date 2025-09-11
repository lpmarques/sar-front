import axios from 'axios';
import { Navigate } from 'react-router';
import { Center, Loader } from '@mantine/core';
import { useQuery, QueryFunction } from '@tanstack/react-query';
import { HttpError } from './HttpError';
import { useAuth } from '../../hooks/useAuth';

type QueryLoaderProps = {
  queryKey: string[],
  queryFn: QueryFunction<unknown, string[]>,
  enabled?: boolean,
  children?: React.ReactNode,
}

export function QueryLoader({ children, ...queryOptions }: QueryLoaderProps) {
  const { unauth } = useAuth();
  const { isLoading, error } = useQuery(queryOptions);

  if (isLoading) {
    return (
      <Center>
        <Loader pt={80} />
      </Center>
    )
  }
    
  if (error && axios.isAxiosError(error)) {
    if (error.response) {
      if (error.response.status == 401) {
        unauth();
        return <Navigate to="/login" replace />;
      }
      
      return <HttpError status={error.response.status} statusText={error.response.statusText} queryKey={queryKey} />;
    }

    return <HttpError status={503} statusText="Service Unavailable" queryKey={queryKey} />
  }

  return children;
}
