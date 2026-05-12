// Runtime configuration
// In development, the Vite proxy handles /api and /public routes.
// In production (deployed), requests go to the same origin.
// No runtime config endpoint is needed.

const config = {
  // API_BASE_URL is empty string so that fetch calls use relative paths
  // which are handled by the Vite proxy in dev and same-origin in production.
  API_BASE_URL: '',
};

export async function loadRuntimeConfig(): Promise<void> {
  // No-op: configuration is handled via Vite proxy in dev
  // and same-origin routing in production.
}

export function getConfig() {
  return config;
}

export function getAPIBaseURL(): string {
  return config.API_BASE_URL;
}

export { config };