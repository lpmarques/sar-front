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

import { useSearchParams } from "react-router";
import { useLocalStorage } from "./useLocalStorage";
import { convertStringToPrimitiveType, Primitive } from "../utils/common";
import { useEffect } from "react";

export function useStoredSearchParam<T extends Primitive>(key: string, defaultValue: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get(key);
  
  const setSearchParam = (value: T) => {
    setSearchParams((currParams) => {
      const newParams = new URLSearchParams(currParams);
      newParams.set(key, String(value));
      return newParams;
    }, { replace: true });
  }

  const [storedParam, setStoredParam] = useLocalStorage(key, defaultValue);

  useEffect(() => {
    if (searchParam === null) {
      setSearchParam(storedParam);
    } else if (searchParam !== String(storedParam)) {
      setStoredParam(convertStringToPrimitiveType(searchParam, defaultValue));
    }
  }, [searchParam, storedParam]);
  
  return [storedParam, setSearchParam];
}
