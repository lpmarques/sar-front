import axios from "axios";
import { ReactNode } from 'react';
import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { data } from "react-router-dom";

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

  return (
    <LanguageContext.Provider value={{lang, setLang}}>
      {children}
    </LanguageContext.Provider>
  )
};
