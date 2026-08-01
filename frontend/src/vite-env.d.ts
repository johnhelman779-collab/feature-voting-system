/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Django API root, e.g. http://127.0.0.1:8000/api */
  readonly VITE_API_BASE_URL?: string
  /** Set to `0` or `false` to disable dev-only `X-Dev-Mock-Auth` (session login only). */
  readonly VITE_USE_DEV_MOCK_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
