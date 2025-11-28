/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_WXWORK_APPID: string;
  readonly VITE_QWEN_API_KEY: string;
  readonly VITE_OSS_BUCKET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
