import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'

import { apiClient } from './api/client'
import { AuthProvider } from './context/AuthContext'
import { FeatureList } from './components/FeatureList'
import { MainLayout } from './layouts/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

const queryClient = new QueryClient()

function CsrfBootstrap() {
  useQuery({
    queryKey: ['csrf'],
    queryFn: () => apiClient.get('csrf/'),
    staleTime: Infinity,
    retry: false,
  })
  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CsrfBootstrap />
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<FeatureList />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
