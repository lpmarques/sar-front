import { ReactNode } from 'react';
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { showError } from './common/notifications';

type RouteProps = {
  children: ReactNode
}

const LoggedOnlyRoute = ({ children }: RouteProps) => {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default LoggedOnlyRoute;
