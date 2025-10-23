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
