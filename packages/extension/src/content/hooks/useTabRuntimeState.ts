import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  getTabRuntimeState,
  isContextInvalidatedError,
  isTabRuntimeStateChangedMessage,
  setAnnotateMode,
  setTabEnabled,
} from '../messaging';

const LOG_PREFIX = '[onUI][useTabRuntimeState]';

interface UseTabRuntimeStateReturn {
  enabled: boolean;
  annotateMode: boolean;
  isContextInvalid: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setAnnotateMode: (annotateMode: boolean) => Promise<void>;
  toggleEnabled: () => Promise<void>;
  toggleAnnotateMode: () => Promise<void>;
}

export function useTabRuntimeState(): UseTabRuntimeStateReturn {
  const [enabled, setEnabledState] = useState(false);
  const [annotateMode, setAnnotateModeState] = useState(false);
  const [isContextInvalid, setIsContextInvalid] = useState(false);

  const enabledRef = useRef(enabled);
  const annotateModeRef = useRef(annotateMode);
  const isContextInvalidRef = useRef(isContextInvalid);
  enabledRef.current = enabled;
  annotateModeRef.current = annotateMode;
  isContextInvalidRef.current = isContextInvalid;

  useEffect(() => {
    const syncState = async () => {
      try {
        const response = await getTabRuntimeState();
        if (response.success && response.data) {
          setEnabledState(response.data.enabled);
          setAnnotateModeState(response.data.annotateMode);
        } else if (response.error) {
          console.error(`${LOG_PREFIX} initial sync unsuccessful`, response.error);
        }
      } catch (error) {
        if (isContextInvalidatedError(error)) {
          setIsContextInvalid(true);
        }
        console.error(`${LOG_PREFIX} initial sync failed`, error);
      }
    };

    void syncState();
  }, []);

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (!isTabRuntimeStateChangedMessage(message)) {
        return;
      }

      const nextState = message.payload.state;
      setEnabledState(nextState.enabled);
      setAnnotateModeState(nextState.annotateMode);
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const updateEnabled = useCallback(async (nextEnabled: boolean) => {
    if (isContextInvalidRef.current) return;

    const previousEnabled = enabledRef.current;
    const previousAnnotateMode = annotateModeRef.current;

    setEnabledState(nextEnabled);
    if (!nextEnabled) {
      setAnnotateModeState(false);
    }

    try {
      const response = await setTabEnabled(nextEnabled);
      if (response.success && response.data) {
        setEnabledState(response.data.enabled);
        setAnnotateModeState(response.data.annotateMode);
      } else {
        setEnabledState(previousEnabled);
        setAnnotateModeState(previousAnnotateMode);
      }
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        setIsContextInvalid(true);
      }
      setEnabledState(previousEnabled);
      setAnnotateModeState(previousAnnotateMode);
    }
  }, []);

  const updateAnnotateMode = useCallback(async (nextAnnotateMode: boolean) => {
    if (isContextInvalidRef.current || !enabledRef.current) {
      return;
    }

    const previousAnnotateMode = annotateModeRef.current;
    setAnnotateModeState(nextAnnotateMode);

    try {
      const response = await setAnnotateMode(nextAnnotateMode);
      if (response.success && response.data) {
        setEnabledState(response.data.enabled);
        setAnnotateModeState(response.data.annotateMode);
      } else {
        setAnnotateModeState(previousAnnotateMode);
      }
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        setIsContextInvalid(true);
      }
      setAnnotateModeState(previousAnnotateMode);
    }
  }, []);

  const toggleEnabled = useCallback(async () => {
    await updateEnabled(!enabledRef.current);
  }, [updateEnabled]);

  const toggleAnnotateMode = useCallback(async () => {
    await updateAnnotateMode(!annotateModeRef.current);
  }, [updateAnnotateMode]);

  return {
    enabled,
    annotateMode,
    isContextInvalid,
    setEnabled: updateEnabled,
    setAnnotateMode: updateAnnotateMode,
    toggleEnabled,
    toggleAnnotateMode,
  };
}
