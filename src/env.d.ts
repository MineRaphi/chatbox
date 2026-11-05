/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
/// <reference types="svelte" />
/// <reference types="vite/client" />

// Injected by Forge's Vite plugin for each renderer (see forge.config.mts).
declare const PICKER_VITE_DEV_SERVER_URL: string | undefined;
declare const PICKER_VITE_NAME: string;
declare const OVERLAY_VITE_DEV_SERVER_URL: string | undefined;
declare const OVERLAY_VITE_NAME: string;
