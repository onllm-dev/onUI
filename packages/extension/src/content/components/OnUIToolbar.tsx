import { useState, useCallback } from 'preact/hooks';
import type { Annotation, OutputLevel, RegionShape } from '@/types';
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

const PenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

const RectangleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="6" width="16" height="12" rx="1" />
  </svg>
);

const EllipseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="12" cy="12" rx="8" ry="6" />
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
  isDrawMode: boolean;
  drawShape: RegionShape;
  multiSelectCount: number;
  onToggleAnnotateMode: () => void;
  onToggleDrawMode: () => void;
  onSelectDrawShape: (shape: RegionShape) => void;
  annotations: Annotation[];
  outputLevel: OutputLevel;
  onOutputLevelChange: (level: OutputLevel) => void;
  clearOnCopy: boolean;
  onClearOnCopyChange: (enabled: boolean) => void;
  onClearAnnotations: () => void | Promise<void>;
}

export function OnUIToolbar({
  isAnnotateMode,
  isDrawMode,
  drawShape,
  multiSelectCount,
  onToggleAnnotateMode,
  onToggleDrawMode,
  onSelectDrawShape,
  annotations,
  outputLevel,
  onOutputLevelChange,
  clearOnCopy,
  onClearOnCopyChange,
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

  const handleCopy = useCallback(async () => {
    if (annotations.length === 0) {
      console.log(`${LOG_PREFIX} no annotations to copy`);
      return;
    }

    const output = generateOutput(annotations, outputLevel);
    const success = await copyToClipboard(output);

    if (success) {
      if (clearOnCopy) {
        await Promise.resolve(onClearAnnotations());
        console.log(`${LOG_PREFIX} clear-on-copy enabled: annotations cleared`);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      console.log(`${LOG_PREFIX} annotations copied to clipboard`);
    } else {
      console.error(`${LOG_PREFIX} failed to copy annotations`);
    }
  }, [annotations, outputLevel, clearOnCopy, onClearAnnotations, LOG_PREFIX]);

  const handleClear = useCallback(() => {
    if (annotations.length === 0) return;
    onClearAnnotations();
    console.log(`${LOG_PREFIX} annotations cleared`);
  }, [annotations.length, onClearAnnotations, LOG_PREFIX]);

  const activeHintMode = isDrawMode ? 'draw' : isAnnotateMode ? 'annotate' : null;
  const activeHint =
    activeHintMode === 'annotate'
      ? multiSelectCount > 0
        ? `Shift multi-select: ${multiSelectCount} selected. Release Shift to annotate all.`
        : 'Tip: hold Shift and click to multi-select elements.'
      : activeHintMode === 'draw'
        ? `Drag to draw a ${drawShape} region.`
        : null;

  return (
    <div class="onui-toolbar">
      {effectiveExpanded && (
        <div class="onui-toolbar-panel">
          <div class="onui-toolbar-header">
            <div class="onui-toolbar-header-main">
              <span class="onui-toolbar-title">
                on<span class="onui-toolbar-title-accent">UI</span>
              </span>
            </div>
            <span class={`onui-toolbar-count ${annotations.length === 0 ? 'is-empty' : ''}`}>
              {annotations.length}
            </span>
          </div>

          <div class="onui-toolbar-section">
            <div class="onui-toolbar-mode-stack">
              <div class="onui-toolbar-mode-anchor">
                <button
                  class={`onui-toolbar-btn onui-toolbar-btn--mode ${isAnnotateMode ? 'is-active' : ''}`}
                  onClick={onToggleAnnotateMode}
                  aria-label="Toggle annotate mode"
                  title="Toggle annotate mode"
                >
                  <CrosshairIcon />
                </button>

                {activeHintMode === 'annotate' && activeHint && (
                  <div class="onui-toolbar-hint-popup" role="status" aria-live="polite">
                    <span class="onui-toolbar-hint-arrow" aria-hidden="true" />
                    {activeHint}
                  </div>
                )}
              </div>

              <div class="onui-toolbar-draw-block">
                <div class="onui-toolbar-mode-anchor">
                  <button
                    class={`onui-toolbar-btn onui-toolbar-btn--mode ${isDrawMode ? 'is-active' : ''}`}
                    onClick={onToggleDrawMode}
                    aria-label="Toggle draw mode"
                    title="Toggle draw mode"
                  >
                    <PenIcon />
                  </button>

                  {activeHintMode === 'draw' && activeHint && (
                    <div class="onui-toolbar-hint-popup" role="status" aria-live="polite">
                      <span class="onui-toolbar-hint-arrow" aria-hidden="true" />
                      {activeHint}
                    </div>
                  )}
                </div>

                {isDrawMode && (
                  <div class="onui-toolbar-shape-row" role="group" aria-label="Draw shape tools">
                    <button
                      class={`onui-toolbar-shape-btn ${drawShape === 'rectangle' ? 'is-active' : ''}`}
                      onClick={() => onSelectDrawShape('rectangle')}
                      aria-label="Draw rectangle"
                      title="Draw rectangle"
                    >
                      <RectangleIcon />
                    </button>
                    <button
                      class={`onui-toolbar-shape-btn ${drawShape === 'ellipse' ? 'is-active' : ''}`}
                      onClick={() => onSelectDrawShape('ellipse')}
                      aria-label="Draw ellipse"
                      title="Draw ellipse"
                    >
                      <EllipseIcon />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div class="onui-toolbar-section">
            <div class="onui-toolbar-action-stack">
              <button
                class={`onui-toolbar-btn ${copySuccess ? 'is-active' : ''}`}
                onClick={handleCopy}
                disabled={annotations.length === 0}
                aria-label="Copy annotations"
                title={copySuccess ? 'Copied' : 'Copy annotations'}
              >
                {copySuccess ? <CheckIcon /> : <CopyIcon />}
              </button>

              <button
                class="onui-toolbar-btn onui-toolbar-btn--subtle"
                onClick={handleClear}
                disabled={annotations.length === 0}
                aria-label="Clear annotations"
                title="Clear annotations"
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          <div class="onui-toolbar-section onui-toolbar-section--settings">
            <button
              class={`onui-toolbar-btn onui-toolbar-btn--settings ${showSettings ? 'is-active' : ''}`}
              onClick={() => setShowSettings((prev) => !prev)}
              aria-label="Toggle settings"
              title="Toggle settings"
            >
              <SettingsIcon />
            </button>

            {showSettings && (
              <div class="onui-toolbar-settings">
                <div class="onui-toolbar-setting-row">
                  <label class="onui-toolbar-setting-label">Output level</label>
                  <select
                    class="onui-toolbar-select"
                    value={outputLevel}
                    onChange={(e) =>
                      onOutputLevelChange((e.target as HTMLSelectElement).value as OutputLevel)
                    }
                  >
                    <option value="compact">Compact</option>
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                    <option value="forensic">Forensic</option>
                  </select>
                </div>

                <label class="onui-toolbar-setting-toggle">
                  <input
                    class="onui-toolbar-setting-checkbox"
                    type="checkbox"
                    checked={clearOnCopy}
                    onChange={(e) => onClearOnCopyChange((e.target as HTMLInputElement).checked)}
                  />
                  <span class="onui-toolbar-setting-label">Clear on copy</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        class={`onui-toggle ${effectiveExpanded ? 'active' : ''}`}
        onClick={handleTogglePanel}
        aria-label="Toggle onUI panel"
        title="Toggle onUI panel"
      >
        <OnUIIcon />
      </button>
    </div>
  );
}
