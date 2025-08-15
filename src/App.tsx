import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import "@mantine/core/styles.css";
import '@mantine/notifications/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultRequestRetry } from './apis/common';
import { Home, LoggedOnlyRoute, Shell, UnloggedOnlyRoute } from './components';
import { Plant, PlantList, TraitDetails, TraitEdit } from './components/catalog';
import { HttpError } from './components/common/HttpError';
import { Login, UserProfile, Signup } from './components/user';
import { LanguageProvider } from './hooks/useLanguage';
import { useAuth } from './hooks/useAuth';
import { theme } from "./theme";

export default function App() {
  const auth = useAuth();
  axios.defaults.baseURL = 'http://127.0.0.1:8000';
  axios.defaults.headers.common['Authorization'] = auth.token == null ? "" : `Token ${auth.token}`;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: true,
        retry: defaultRequestRetry
      },
      mutations: {
        retry: defaultRequestRetry
      }
    }
  })

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
                  <Route path="login" element={<UnloggedOnlyRoute> <Login /> </UnloggedOnlyRoute>}/>
                  <Route path="signup" element={<UnloggedOnlyRoute> <Signup /> </UnloggedOnlyRoute>}/>
                  <Route path="user" element={<LoggedOnlyRoute> <UserProfile /> </LoggedOnlyRoute>}/>
                  <Route path="users/:userId" element={<LoggedOnlyRoute> <UserProfile /> </LoggedOnlyRoute>}/>
                  <Route path="plants" element={<PlantList />} />
                  <Route path="plants/:plantId" element={<Plant />} />
                  <Route path="plants/:plantId/trait/:traitKey" element={<TraitDetails />} />
                  <Route path="plants/:plantId/trait/:traitKey/edit" element={<TraitEdit />} />
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
