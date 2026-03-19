/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_URL: string;
  readonly VITE_PRIVACY_POLICY_URL?: string;
  readonly VITE_TERMS_URL?: string;
  readonly VITE_ENABLE_DEBUG_MENU?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** package.json の version をビルド時に埋め込む定数 */
declare const __APP_VERSION__: string;
