import { fetchBootstrapState, type BootstrapPayload } from './server-api';

let cachedBootstrap: BootstrapPayload | null = null;
let pendingBootstrap: Promise<BootstrapPayload> | null = null;

export function clearBootstrapCache() {
  cachedBootstrap = null;
  pendingBootstrap = null;
}

export function peekBootstrapCache() {
  return cachedBootstrap;
}

export async function loadBootstrapCache(force = false) {
  if (cachedBootstrap && !force) {
    return cachedBootstrap;
  }

  if (pendingBootstrap && !force) {
    return pendingBootstrap;
  }

  pendingBootstrap = fetchBootstrapState()
    .then((payload) => {
      cachedBootstrap = payload;
      return payload;
    })
    .finally(() => {
      pendingBootstrap = null;
    });

  return pendingBootstrap;
}
