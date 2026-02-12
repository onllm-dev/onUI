import { useState, useCallback, useEffect } from 'preact/hooks';
import type { Annotation, OutputLevel } from '@/types';
import { generateOutput } from '../utils/output-generation';
import { copyToClipboard } from '../utils/clipboard';

// Icons
const OnUIIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const CrosshairIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

interface OnUIToolbarProps {
  isAnnotateMode: boolean;
  onToggleAnnotateMode: () => void;
  annotations: Annotation[];
  outputLevel: OutputLevel;
  onOutputLevelChange: (level: OutputLevel) => void;
  onClearAnnotations: () => void;
}

export function OnUIToolbar({
  isAnnotateMode,
  onToggleAnnotateMode,
  annotations,
  outputLevel,
  onOutputLevelChange,
  onClearAnnotations,
}: OnUIToolbarProps) {
  const LOG_PREFIX = '[onUI][toolbar]';
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Just use the user's explicit toggle state
  const effectiveExpanded = isExpanded;

  const handleTogglePanel = useCallback(() => {
    setIsExpanded((prev) => !prev);
    setShowSettings(false);
  }, []);

  // Escape key to exit annotation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAnnotateMode) {
        onToggleAnnotateMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAnnotateMode, onToggleAnnotateMode]);

  const handleCopy = useCallback(async () => {
    if (annotations.length === 0) {
      console.log(`${LOG_PREFIX} no annotations to copy`);
      return;
    }

    const output = generateOutput(annotations, outputLevel);
    const success = await copyToClipboard(output);

    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      console.log(`${LOG_PREFIX} annotations copied to clipboard`);
    } else {
      console.error(`${LOG_PREFIX} failed to copy annotations`);
    }
  }, [annotations, outputLevel, LOG_PREFIX]);

  const handleClear = useCallback(() => {
    if (annotations.length === 0) return;
    onClearAnnotations();
    console.log(`${LOG_PREFIX} annotations cleared`);
  }, [annotations.length, onClearAnnotations, LOG_PREFIX]);

  return (
    <div class="onui-toolbar">
      {/* Expandable Panel */}
      {effectiveExpanded && (
        <div class="onui-panel">
          <div class="onui-panel-header">
            <span class="onui-panel-title">
              on<span class="onui-panel-title-accent">UI</span>
            </span>
            {annotations.length > 0 && (
              <span class="onui-panel-badge">{annotations.length}</span>
            )}
          </div>

          {/* Annotate Mode Button */}
          <button
            class={`onui-btn ${isAnnotateMode ? 'active' : ''}`}
            onClick={onToggleAnnotateMode}
          >
            <CrosshairIcon />
            <span class="onui-btn-label">
              {isAnnotateMode ? 'Annotating...' : 'Annotate'}
            </span>
          </button>

          {/* Copy Button */}
          <button
            class={`onui-btn ${copySuccess ? 'active' : ''}`}
            onClick={handleCopy}
            disabled={annotations.length === 0}
          >
            {copySuccess ? <CheckIcon /> : <CopyIcon />}
            <span class="onui-btn-label">
              {copySuccess ? 'Copied!' : 'Copy'}
            </span>
          </button>

          {/* Clear Button */}
          <button
            class="onui-btn"
            onClick={handleClear}
            disabled={annotations.length === 0}
          >
            <TrashIcon />
            <span class="onui-btn-label">Clear</span>
          </button>

          <div class="onui-divider" />

          {/* Settings Toggle */}
          <button
            class={`onui-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings((prev) => !prev)}
          >
            <SettingsIcon />
            <span class="onui-btn-label">Settings</span>
          </button>

          {/* Settings Panel */}
          {showSettings && (
            <div class="onui-settings">
              <div class="onui-setting-row">
                <label class="onui-setting-label">Output Level</label>
                <select
                  class="onui-select"
                  value={outputLevel}
                  onChange={(e) =>
                    onOutputLevelChange(
                      (e.target as HTMLSelectElement).value as OutputLevel
                    )
                  }
                >
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                  <option value="forensic">Forensic</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        class={`onui-toggle ${effectiveExpanded ? 'active' : ''}`}
        onClick={handleTogglePanel}
        title="Toggle onUI panel"
      >
        <OnUIIcon />
      </button>
    </div>
  );
}
