import axios, { isAxiosError } from 'axios'

import { getAccessToken } from './authTokens'

function getApiBaseURL(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000/api'
}

export const apiClient = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

/** DEBUG-only on the server; see backend `DevelopmentMockUserAuthentication`. */
const devMockDisabled =
  import.meta.env.VITE_USE_DEV_MOCK_AUTH === '0' ||
  import.meta.env.VITE_USE_DEV_MOCK_AUTH === 'false'
if (import.meta.env.DEV && !devMockDisabled) {
  apiClient.defaults.headers.common['X-Dev-Mock-Auth'] = '1'
}

// Bearer token: read from localStorage on each request (AuthContext login/logout
// keeps storage and React state in sync).
apiClient.interceptors.request.use((config) => {
  const access = getAccessToken()
  if (access) {
    config.headers.set('Authorization', `Bearer ${access}`)
  } else {
    config.headers.delete('Authorization')
  }
  const method = config.method?.toLowerCase()
  if (method && !['get', 'head', 'options', 'trace'].includes(method)) {
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
    if (match) {
      const token = decodeURIComponent(match[1])
      config.headers.set('X-CSRFToken', token)
    }
  }
  return config
})

export function getApiErrorDetail(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Something went wrong'
  }
  const data = error.response?.data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.join(' ')
    const parts: string[] = []
    for (const [key, val] of Object.entries(data)) {
      if (key === 'detail') continue
      if (typeof val === 'string') parts.push(`${key}: ${val}`)
      else if (Array.isArray(val)) parts.push(`${key}: ${val.join(' ')}`)
    }
    if (parts.length) return parts.join(' ')
  }
  return error.message ?? 'Request failed'
}
