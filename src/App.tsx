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
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
// import { initializeApp } from 'firebase/app';
// import { getAnalytics } from 'firebase/analytics';
import { BrowserRouter, Routes, Route } from "react-router";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import drawLocales from 'leaflet-draw-locales';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import "@mantine/core/styles.css";
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import * as maptilersdk from '@maptiler/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultRequestRetry } from './apis/common';
import { Home, LoggedOnlyRoute, Shell, UnloggedOnlyRoute } from './components';
import { FarmDetails, FarmEdit, FarmList, FarmNew, ProjectDetails } from "./components/agroforestry";
import { PlantDetails, PlantList, PlantNew, SectionDetails, SectionEdit, TraitDetails, TraitEdit } from './components/catalog';
import { HttpError } from './components/common/HttpError';
import ScrollToTop from "./components/common/ScrollToTop";
import { Login, UserContents, UserProfile, Signup } from './components/user';
import { LanguageProvider } from './hooks/useLanguage';
import { useAuth } from './hooks/useAuth';
import { theme } from "./theme";
import About from "./components/About";

export default function App() {
  const auth = useAuth();
  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_API_URL;
  axios.defaults.headers.common['Authorization'] = auth.token == null ? "" : `Token ${auth.token}`;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: defaultRequestRetry
      },
      mutations: {
        retry: defaultRequestRetry
      }
    }
  });

  dayjs.extend(customParseFormat);
  dayjs.extend(LocalizedFormat);

  maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
  drawLocales('pt');

  return (
    <BrowserRouter>
      <ScrollToTop />
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <LanguageProvider>
            <ModalsProvider>
              <Notifications />
              <Shell>
                <Routes>
                  <Route index element={<Home />}/>
                  <Route path="about" element={<About />}/>
                  <Route path="login" element={<UnloggedOnlyRoute><Login /></UnloggedOnlyRoute>}/>
                  <Route path="signup" element={<UnloggedOnlyRoute><Signup /></UnloggedOnlyRoute>}/>
                  <Route path="user" element={<LoggedOnlyRoute><UserProfile /></LoggedOnlyRoute>}/>
                  <Route path="user/contents" element={<LoggedOnlyRoute><UserContents /></LoggedOnlyRoute>}/>
                  <Route path="users/:userEmail" element={<LoggedOnlyRoute><UserProfile /></LoggedOnlyRoute>}/>
                  <Route path="users/:userEmail/contents" element={<LoggedOnlyRoute><UserContents /></LoggedOnlyRoute>}/>
                  <Route path="plants" element={<PlantList />} />
                  <Route path="plants/new" element={<LoggedOnlyRoute><PlantNew /></LoggedOnlyRoute>} />
                  <Route path="plants/:plantId" element={<PlantDetails />} />
                  <Route path="plants/:plantId/:sectionSlug" element={<SectionDetails />} />
                  <Route path="plants/:plantId/:sectionSlug/edit" element={<LoggedOnlyRoute><SectionEdit /></LoggedOnlyRoute>} />
                  <Route path="plants/:plantId/trait/:traitSlug" element={<TraitDetails />} />
                  <Route path="plants/:plantId/trait/:traitSlug/edit" element={<LoggedOnlyRoute><TraitEdit /></LoggedOnlyRoute>} />
                  <Route path="farms" element={<FarmList />} />
                  <Route path="farms/new" element={<LoggedOnlyRoute><FarmNew /></LoggedOnlyRoute>} />
                  <Route path="farms/:farmId" element={<LoggedOnlyRoute><FarmDetails /></LoggedOnlyRoute>} />
                  <Route path="farms/:farmId/edit" element={<LoggedOnlyRoute><FarmEdit /></LoggedOnlyRoute>} />
                  <Route path="farms/:farmId/project" element={<LoggedOnlyRoute><ProjectDetails /></LoggedOnlyRoute>} />
                  <Route path='*' element={<HttpError status={404} statusText="Página inexistente"/>} />
                </Routes>
              </Shell>
            </ModalsProvider>
          </LanguageProvider>
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}
