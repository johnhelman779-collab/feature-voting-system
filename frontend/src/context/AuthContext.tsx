import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { apiClient, getApiErrorDetail } from '../api/client'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../api/authTokens'

export type AuthUser = {
  id: number
  username: string
  email: string
}

type TokenPair = {
  access: string
  refresh: string
}

type RegisterResponse = {
  user: AuthUser
  access: string
  refresh: string
}

export type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isInitializing: boolean
  isAuthenticating: boolean
  bootstrapError: string | null
  retryBootstrap: () => void
  login: (credentials: { username: string; password: string }) => Promise<void>
  logout: () => void
  register: (input: {
    email: string
    username: string
    password: string
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  )
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() =>
    getRefreshToken(),
  )
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  const hydrateUser = useCallback(async () => {
    const access = getAccessToken()
    if (!access) {
      setUser(null)
      setAccessTokenState(null)
      setRefreshTokenState(null)
      return
    }
    setAccessTokenState(access)
    setRefreshTokenState(getRefreshToken())
    const { data } = await apiClient.get<AuthUser>('accounts/me/')
    setUser(data)
  }, [])

  const runBootstrap = useCallback(async () => {
    setBootstrapError(null)
    try {
      await hydrateUser()
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.status === 401) {
        clearTokens()
        setUser(null)
        setAccessTokenState(null)
        setRefreshTokenState(null)
      } else {
        setBootstrapError(getApiErrorDetail(e))
      }
    } finally {
      setIsInitializing(false)
    }
  }, [hydrateUser])

  useEffect(() => {
    void runBootstrap()
  }, [runBootstrap])

  const login = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      setIsAuthenticating(true)
      try {
        const { data } = await apiClient.post<TokenPair>('accounts/token/', {
          username,
          password,
        })
        setTokens(data.access, data.refresh)
        setAccessTokenState(data.access)
        setRefreshTokenState(data.refresh)
        const { data: me } = await apiClient.get<AuthUser>('accounts/me/')
        setUser(me)
        void queryClient.invalidateQueries({ queryKey: ['features'] })
      } finally {
        setIsAuthenticating(false)
      }
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    setAccessTokenState(null)
    setRefreshTokenState(null)
    void queryClient.invalidateQueries({ queryKey: ['features'] })
  }, [queryClient])

  const register = useCallback(
    async (input: { email: string; username: string; password: string }) => {
      setIsAuthenticating(true)
      try {
        const { data } = await apiClient.post<RegisterResponse>(
          'accounts/register/',
          input,
        )
        setTokens(data.access, data.refresh)
        setAccessTokenState(data.access)
        setRefreshTokenState(data.refresh)
        setUser(data.user)
        void queryClient.invalidateQueries({ queryKey: ['features'] })
      } finally {
        setIsAuthenticating(false)
      }
    },
    [queryClient],
  )

  const retryBootstrap = useCallback(() => {
    setIsInitializing(true)
    void runBootstrap()
  }, [runBootstrap])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isInitializing,
      isAuthenticating,
      bootstrapError,
      retryBootstrap,
      login,
      logout,
      register,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isInitializing,
      isAuthenticating,
      bootstrapError,
      retryBootstrap,
      login,
      logout,
      register,
    ],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx == null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
