import axios from "axios";
import { ReactNode } from 'react';
import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { UserReadData, UserTokenResponseData } from "../apis/core";

interface AuthContextType {
  user: UserReadData | null,
  token: string | null,
  auth: Function,
  unauth: Function
}

const initialContextValues = {
  user: null,
  token: null,
  auth: () => {},
  unauth: () => {}
}

const AuthContext = createContext<AuthContextType>(initialContextValues);

export const useAuth = () => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error("useAuth has to be used within <AuthProvider>");
  }
  
  return authContext;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useLocalStorage("user", null);
  const [token, setToken] = useLocalStorage("token", null);

  // call this function when you want to authenticate the user
  const auth = async (data: UserTokenResponseData) => {
    setUser(data.user);
    setToken(data.token);
    axios.defaults.headers.common['Authorization'] = `Token ${data.token}`;
  };

  // call this function to sign out logged in user
  const unauth = () => {
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = useMemo(
    () => ({
      user,
      token,
      auth,
      unauth,
    }),
    [user, token]
  );
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
