import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import type { AnnotationIntent, AnnotationSeverity } from '@/types';
import { getComputedStylesInfo, type ComputedStylesInfo } from '../utils/computed-styles';
import { getReactComponents } from '../utils/react-detection';
import { getCssSelector, getElementPath } from '../utils/element-path';
import { useViewportTick } from '../hooks/useViewportTick';

// Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ReactIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="12" r="2" />
    <ellipse cx="12" cy="12" rx="10" ry="4" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
  </svg>
);

const WrenchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const HelpCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

interface OnUIDialogProps {
  element: Element;
  onSave: (data: {
    comment: string;
    intent?: AnnotationIntent | undefined;
    severity?: AnnotationSeverity | undefined;
  }) => void;
  onCancel: () => void;
  initialComment?: string;
  initialIntent?: AnnotationIntent | undefined;
  initialSeverity?: AnnotationSeverity | undefined;
  isEditing?: boolean;
  onDelete?: () => void;
}

export function OnUIDialog({
  element,
  onSave,
  onCancel,
  initialComment = '',
  initialIntent,
  initialSeverity,
  isEditing = false,
  onDelete,
}: OnUIDialogProps) {
  const tick = useViewportTick();
  const [comment, setComment] = useState(initialComment);
  const [intent, setIntent] = useState<AnnotationIntent | undefined>(initialIntent);
  const [severity, setSeverity] = useState<AnnotationSeverity | undefined>(initialSeverity);
  const [stylesInfo, setStylesInfo] = useState<ComputedStylesInfo | null>(null);
  const [reactPath, setReactPath] = useState<string | null>(null);
  const [showStyles, setShowStyles] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Store current values in refs for stable keydown handler
  const commentRef = useRef(comment);
  const intentRef = useRef(intent);
  const severityRef = useRef(severity);

  // Keep refs up to date when state changes
  useEffect(() => {
    commentRef.current = comment;
  }, [comment]);

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    severityRef.current = severity;
  }, [severity]);

  // Extract element info on mount
  useEffect(() => {
    setStylesInfo(getComputedStylesInfo(element));
    setReactPath(getReactComponents(element));

    // Focus textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [element]);

  // Position dialog near element
  useEffect(() => {
    if (!dialogRef.current) return;

    const rect = element.getBoundingClientRect();
    const dialog = dialogRef.current;
    const dialogRect = dialog.getBoundingClientRect();

    // Position to the right of element, or left if not enough space
    let left = rect.left + rect.width + 16;
    let top = rect.top;

    // Check if dialog goes off right edge
    if (left + dialogRect.width > window.innerWidth - 20) {
      left = rect.left - dialogRect.width - 16;
    }

    // Check if dialog goes off left edge
    if (left < 20) {
      left = 20;
    }

    // Check if dialog goes off bottom
    if (top + dialogRect.height > window.innerHeight - 20) {
      top = window.innerHeight - dialogRect.height - 20;
    }

    // Check if dialog goes off top
    if (top < 20) {
      top = 20;
    }

    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  }, [element, tick]);

  // Handle keyboard shortcuts - stable listener registered once
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Use refs to get current values without recreating the listener
        onSave({
          comment: commentRef.current,
          intent: intentRef.current,
          severity: severityRef.current,
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onSave]); // Only stable callback deps

  const handleSave = useCallback(() => {
    onSave({ comment, intent, severity });
  }, [comment, intent, severity, onSave]);

  const elementPath = getElementPath(element);
  const selector = getCssSelector(element);

  const intentOptions: { value: AnnotationIntent; label: string; icon: () => preact.JSX.Element }[] = [
    { value: 'fix', label: 'Fix', icon: WrenchIcon },
    { value: 'change', label: 'Change', icon: PencilIcon },
    { value: 'question', label: 'Question', icon: HelpCircleIcon },
    { value: 'approve', label: 'Approve', icon: CheckCircleIcon },
  ];

  const severityOptions: { value: AnnotationSeverity; label: string; icon: () => preact.JSX.Element }[] = [
    { value: 'blocking', label: 'Blocking', icon: AlertCircleIcon },
    { value: 'important', label: 'Important', icon: AlertTriangleIcon },
    { value: 'suggestion', label: 'Suggestion', icon: InfoIcon },
  ];

  return (
    <>
      {/* Backdrop */}
      <div class="onui-dialog-backdrop" onClick={onCancel} />

      {/* Dialog */}
      <div class="onui-dialog" ref={dialogRef}>
        <div class="onui-dialog-header">
          <div>
            <div class="onui-dialog-title">
              {isEditing ? 'Edit Annotation' : 'Add Annotation'}
            </div>
            <div class="onui-dialog-subtitle" title={selector}>
              {elementPath}
            </div>
          </div>
          <button class="onui-dialog-close" onClick={onCancel}>
            <CloseIcon />
          </button>
        </div>

        {/* React Component Path */}
        {reactPath && (
          <div class="onui-component-path">
            <ReactIcon />
            <span>{reactPath}</span>
          </div>
        )}

        {/* Comment Input */}
        <div class="onui-textarea-wrap">
          <textarea
            ref={textareaRef}
            class="onui-textarea"
            placeholder="Describe the issue or feedback..."
            value={comment}
            onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        {/* Intent Selector */}
        <div class="onui-selector">
          <span class="onui-selector-label">Intent</span>
          {intentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              class={`onui-chip onui-chip--intent ${intent === option.value ? 'is-selected' : ''}`}
              aria-pressed={intent === option.value}
              aria-label={`Intent: ${option.label}${intent === option.value ? ' (selected)' : ''}`}
              onClick={() => setIntent(intent === option.value ? undefined : option.value)}
            >
              <option.icon />
              {option.label}
            </button>
          ))}
        </div>

        {/* Severity Selector */}
        <div class="onui-selector">
          <span class="onui-selector-label">Severity</span>
          {severityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              class={`onui-chip onui-chip--severity ${severity === option.value ? 'is-selected' : ''}`}
              aria-pressed={severity === option.value}
              aria-label={`Severity: ${option.label}${severity === option.value ? ' (selected)' : ''}`}
              onClick={() => setSeverity(severity === option.value ? undefined : option.value)}
            >
              <option.icon />
              {option.label}
            </button>
          ))}
        </div>

        {/* Computed Styles Toggle */}
        <button
          class="onui-btn"
          onClick={() => setShowStyles(!showStyles)}
          style={{ marginTop: '12px' }}
        >
          {showStyles ? 'Hide Styles' : 'Show Computed Styles'}
        </button>

        {/* Computed Styles Display */}
        {showStyles && stylesInfo && (
          <div class="onui-styles">
            <div class="onui-styles-title">Layout</div>
            {Object.entries(stylesInfo.layout).map(([key, value]) => (
              <div class="onui-style-row" key={key}>
                <span class="onui-style-key">{key}</span>
                <span class="onui-style-value">{value}</span>
              </div>
            ))}

            <div class="onui-styles-title" style={{ marginTop: '12px' }}>
              Typography
            </div>
            {Object.entries(stylesInfo.typography).map(([key, value]) => (
              <div class="onui-style-row" key={key}>
                <span class="onui-style-key">{key}</span>
                <span class="onui-style-value">{value}</span>
              </div>
            ))}

            <div class="onui-styles-title" style={{ marginTop: '12px' }}>
              Colors
            </div>
            {Object.entries(stylesInfo.colors).map(([key, value]) => (
              <div class="onui-style-row" key={key}>
                <span class="onui-style-key">{key}</span>
                <span class="onui-style-value">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div class="onui-dialog-footer">
          {isEditing && onDelete && (
            <button
              class="onui-btn-secondary"
              onClick={onDelete}
              style={{ marginRight: 'auto', color: 'var(--onui-error)' }}
            >
              Delete
            </button>
          )}
          <button class="onui-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            class="onui-btn-primary"
            onClick={handleSave}
            disabled={!comment.trim()}
          >
            {isEditing ? 'Update' : 'Add Annotation'}
          </button>
        </div>
      </div>
    </>
  );
}
