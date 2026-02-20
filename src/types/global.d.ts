import type { DiffCheckerApi } from '../shared/compare';

declare global {
  interface Window {
    diffCheckerApi: DiffCheckerApi;
  }
}

export {};
