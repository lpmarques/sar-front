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

import dayjs from "dayjs";
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/pt-br';
import moment from "moment";
import 'moment/dist/locale/es';
import 'moment/dist/locale/pt-br';
import { createContext, useContext, useMemo, ReactNode, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

const initialContextValues = {
  lang: "pt-BR",
  setLang: () => {}
}

const LanguageContext = createContext(initialContextValues);

export const useLanguage = () => {
  const authContext = useContext(LanguageContext);
  if (!authContext) {
    throw new Error("useLanguage has to be used within <LanguageProvider>");
  }
  
  return authContext;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useLocalStorage("language", initialContextValues.lang);

  useEffect(
    () => {
      dayjs.locale(lang);
      moment.locale(lang);
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
};
