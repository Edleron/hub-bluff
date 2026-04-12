/// <reference types="vite/client" />
/** Injected by ViteJS define plugin */
declare const APP_VERSION: string;

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
