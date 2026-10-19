/// <reference types="vite/client" />

interface CrystalAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
}

interface Window {
  crystal: CrystalAPI
}
