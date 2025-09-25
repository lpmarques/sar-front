import axios from 'axios';
import { Navigate } from 'react-router';
import { Center, Loader } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { HttpError } from './HttpError';
import { QueryOptions } from '../../apis/common';
import { useAuth } from '../../hooks/useAuth';
import React from 'react';

interface QueryLoaderProps<Type=unknown> extends QueryOptions<Type> {
  children?: React.ReactNode,
  Placeholder?: React.ComponentType,
}

function DefaultPlaceholder() {
  return (
    <Center>
      <Loader />
    </Center>
  )
}

export function QueryLoader<Type>({ children, Placeholder = DefaultPlaceholder, ...queryOptions }: QueryLoaderProps<Type>) {
  const { unauth } = useAuth();
  const { isLoading, error } = useQuery(queryOptions);

  if (isLoading) {
    return <Placeholder />;
  }
  
  if (error && axios.isAxiosError(error)) {
    if (error.response) {
      if (error.response.status == 401) {
        unauth();
        return <Navigate to="/login" replace />;
      }
      
      return <HttpError status={error.response.status} statusText={error.response.statusText} queryKey={queryOptions.queryKey} />;
    }

    return <HttpError status={503} statusText="Service Unavailable" queryKey={queryOptions.queryKey} />
  }

  return children;
}
