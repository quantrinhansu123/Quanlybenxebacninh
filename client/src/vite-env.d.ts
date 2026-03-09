/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_PHUHIEU_FIREBASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


