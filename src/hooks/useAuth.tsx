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
