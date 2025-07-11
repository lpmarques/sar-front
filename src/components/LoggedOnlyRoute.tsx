import { ReactNode } from 'react';
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

type ProviderProps = {
  children: ReactNode
}

const LoggedOnlyRoute = ({ children }: ProviderProps) => {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" />
  }
  return children;
};

export default LoggedOnlyRoute;
