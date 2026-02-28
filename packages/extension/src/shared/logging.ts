const DEBUG_LOG_STORAGE_KEY = 'onui_debug_logs';
const PATCH_FLAG = '__onui_debug_log_filter_installed__';

type ConsoleWithPatchFlag = Console & {
  [PATCH_FLAG]?: boolean;
};

function isDebugLoggingEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const value = localStorage.getItem(DEBUG_LOG_STORAGE_KEY);
    return value === '1' || value === 'true';
  } catch {
    return false;
  }
}

export function suppressOnUiDebugLogs(): void {
  if (isDebugLoggingEnabled()) {
    return;
  }

  const consoleWithPatchFlag = console as ConsoleWithPatchFlag;
  if (consoleWithPatchFlag[PATCH_FLAG]) {
    return;
  }

  const originalLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === 'string' && first.startsWith('[onUI')) {
      return;
    }

    originalLog(...args);
  };

  consoleWithPatchFlag[PATCH_FLAG] = true;
}
