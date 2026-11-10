/// <reference types="vite/client" />
/// <reference types="@types/react" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace React {
  import { ReactNode } from "react";
  export { ReactNode };
}
