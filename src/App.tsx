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
import { FarmDetails, FarmEdit, FarmList, FarmNew } from "./components/agroforestry";
import { PlantDetails, PlantList, PlantNew, SectionDetails, SectionEdit, TraitDetails, TraitEdit } from './components/catalog';
import { HttpError } from './components/common/HttpError';
import { Login, UserProfile, Signup } from './components/user';
import { LanguageProvider } from './hooks/useLanguage';
import { useAuth } from './hooks/useAuth';
import { theme } from "./theme";

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
  })

  dayjs.extend(customParseFormat);
  dayjs.extend(LocalizedFormat);

  maptilersdk.config.apiKey = "ySNElyovuaMoY8g0Bgmc";
  drawLocales('pt');

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <LanguageProvider>
            <ModalsProvider>
              <Notifications />
              <Shell>
                <Routes>
                  <Route index element={<Home />}/>
                  <Route path="login" element={<UnloggedOnlyRoute><Login /></UnloggedOnlyRoute>}/>
                  <Route path="signup" element={<UnloggedOnlyRoute><Signup /></UnloggedOnlyRoute>}/>
                  <Route path="user" element={<LoggedOnlyRoute><UserProfile /></LoggedOnlyRoute>}/>
                  <Route path="users/:userEmail" element={<LoggedOnlyRoute><UserProfile /></LoggedOnlyRoute>}/>
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
