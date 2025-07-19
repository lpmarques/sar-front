import { ReactNode } from 'react';
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

type RouteProps = {
  children: ReactNode
}

const UnloggedOnlyRoute = ({ children }: RouteProps) => {
  const { user } = useAuth()
  if (user) {
    return <Navigate to="/user" />;
  }
  return children;
};

export default UnloggedOnlyRoute;
