import axios from "axios";
import { Routes, Route } from "react-router";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import "@mantine/core/styles.css";
import '@mantine/notifications/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultRequestRetry } from './apis/common';
import { Home, LoggedOnlyRoute, Shell, UnloggedOnlyRoute } from './components';
import { Plant, PlantList } from './components/catalog';
import { HttpError } from './components/common/HttpError';
import { Login, UserProfile, Signup } from './components/user';
import { useAuth } from './hooks/useAuth';
import { theme } from "./theme";

export default function App() {
  const auth = useAuth();
  axios.defaults.baseURL = 'http://127.0.0.1:8000';
  axios.defaults.headers.common['Authorization'] = auth.token == null ? "" : `Token ${auth.token}`;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: defaultRequestRetry
      },
      mutations: {
        retry: defaultRequestRetry
      }
    }
  })

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications />
            <Shell>
              <Routes>
                <Route index element={<Home />}/>
                <Route path="login" element={
                  <UnloggedOnlyRoute>
                    <Login />
                  </UnloggedOnlyRoute>
                }/>
                <Route path="signup" element={
                  <UnloggedOnlyRoute>
                    <Signup />
                  </UnloggedOnlyRoute>
                }/>
                <Route path="user" element={
                  <LoggedOnlyRoute>
                    <UserProfile />
                  </LoggedOnlyRoute>
                }/>
                <Route path="users/:userId" element={
                  <LoggedOnlyRoute>
                    <UserProfile />
                  </LoggedOnlyRoute>
                }/>
                <Route path="plants">
                  <Route index element={<PlantList />}/>
                  <Route path=":id" element={<Plant />}/>
                </Route>
                <Route path='*' element={<HttpError status={404} statusText="Página inexistente"/>} />
              </Routes>
            </Shell>
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </>
  )
}
