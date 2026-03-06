type ExtensionApi = typeof chrome;

type GlobalWithWebExtensionApi = typeof globalThis & {
  browser?: ExtensionApi;
  chrome?: ExtensionApi;
};

function resolveWebExtensionApi(): ExtensionApi {
  const scope = globalThis as GlobalWithWebExtensionApi;
  const browserApi = scope.browser;
  if (browserApi) {
    return browserApi;
  }

  const chromeApi = scope.chrome;
  if (chromeApi) {
    return chromeApi;
  }

  throw new Error('WebExtension runtime API is unavailable in this context.');
}

export const webext: ExtensionApi = new Proxy({} as ExtensionApi, {
  get(_target, property) {
    const api = resolveWebExtensionApi() as unknown as Record<PropertyKey, unknown>;
    return api[property];
  },
}) as ExtensionApi;
