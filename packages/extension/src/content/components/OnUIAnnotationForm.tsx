import type { ComponentChildren, JSX, Ref } from 'preact';
import type { AnnotationIntent, AnnotationSeverity } from '@/types';

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

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface Option<T extends string> {
  value: T;
  label: string;
  icon: () => JSX.Element;
}

const INTENT_OPTIONS: Option<AnnotationIntent>[] = [
  { value: 'fix', label: 'Fix', icon: WrenchIcon },
  { value: 'change', label: 'Change', icon: PencilIcon },
  { value: 'question', label: 'Question', icon: HelpCircleIcon },
  { value: 'approve', label: 'Approve', icon: CheckCircleIcon },
];

const SEVERITY_OPTIONS: Option<AnnotationSeverity>[] = [
  { value: 'blocking', label: 'Blocking', icon: AlertCircleIcon },
  { value: 'important', label: 'Important', icon: AlertTriangleIcon },
  { value: 'suggestion', label: 'Suggestion', icon: InfoIcon },
];

interface OnUIAnnotationDialogProps {
  title: string;
  subtitle?: string;
  subtitleTitle?: string;
  onCancel: () => void;
  position?: JSX.CSSProperties;
  className?: string;
  width?: string;
  showBackdrop?: boolean;
  dialogRef?: Ref<HTMLDivElement>;
  children: ComponentChildren;
}

type OnUIAnnotationDialogShellProps = OnUIAnnotationDialogProps;

interface OnUIAnnotationFormProps {
  comment: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  onCommentChange: (value: string) => void;
  onIntentChange: (value: AnnotationIntent | undefined) => void;
  onSeverityChange: (value: AnnotationSeverity | undefined) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  commentLabel?: string;
  commentPlaceholder?: string;
  intentLabel?: string;
  severityLabel?: string;
  cancelLabel?: string;
  saveLabel?: string;
  deleteLabel?: string;
  saveDisabled?: boolean;
  isSaving?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  children?: ComponentChildren;
}

interface OnUIAnnotationFormDialogProps extends OnUIAnnotationDialogProps {
  comment: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  onCommentChange: (value: string) => void;
  onIntentChange: (value: AnnotationIntent | undefined) => void;
  onSeverityChange: (value: AnnotationSeverity | undefined) => void;
  onSave: () => void;
  onDelete?: () => void;
  commentPlaceholder?: string;
  saveLabel: string;
  saveDisabled?: boolean;
  isSaving?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  children?: ComponentChildren;
}

function CloseIconButton({
  onClick,
  label = 'Close',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button class="onui-dialog-close" type="button" onClick={onClick} aria-label={label}>
      <CloseIcon />
    </button>
  );
}

export function OnUIAnnotationDialogShell({
  title,
  subtitle,
  subtitleTitle,
  onCancel,
  position,
  className,
  width,
  showBackdrop = false,
  dialogRef,
  children,
}: OnUIAnnotationDialogShellProps) {
  const dialogClassName = ['onui-dialog', className].filter(Boolean).join(' ');
  const dialogStyle = {
    ...(position ?? {}),
    ...(width ? { width } : {}),
  };

  return (
    <>
      {showBackdrop && <div class="onui-dialog-backdrop" onClick={onCancel} />}
      <div class={dialogClassName} style={dialogStyle} ref={dialogRef}>
        <div class="onui-dialog-header">
          <div>
            <div class="onui-dialog-title">{title}</div>
            {subtitle && (
              <div class="onui-dialog-subtitle" title={subtitleTitle ?? subtitle}>
                {subtitle}
              </div>
            )}
          </div>
          <CloseIconButton onClick={onCancel} />
        </div>
        {children}
      </div>
    </>
  );
}

export function OnUIAnnotationFormDialog({
  comment,
  intent,
  severity,
  onCommentChange,
  onIntentChange,
  onSeverityChange,
  onSave,
  onCancel,
  onDelete,
  commentPlaceholder,
  saveLabel,
  saveDisabled,
  isSaving,
  textareaRef,
  children,
  ...shellProps
}: OnUIAnnotationFormDialogProps) {
  return (
    <OnUIAnnotationDialogShell {...shellProps} onCancel={onCancel}>
      <OnUIAnnotationForm
        comment={comment}
        intent={intent}
        severity={severity}
        onCommentChange={onCommentChange}
        onIntentChange={onIntentChange}
        onSeverityChange={onSeverityChange}
        onSave={onSave}
        onCancel={onCancel}
        {...(onDelete ? { onDelete } : {})}
        {...(commentPlaceholder ? { commentPlaceholder } : {})}
        saveLabel={saveLabel}
        saveDisabled={saveDisabled}
        isSaving={isSaving}
        textareaRef={textareaRef}
      >
        {children}
      </OnUIAnnotationForm>
    </OnUIAnnotationDialogShell>
  );
}

export function OnUIAnnotationForm({
  comment,
  intent,
  severity,
  onCommentChange,
  onIntentChange,
  onSeverityChange,
  onSave,
  onCancel,
  onDelete,
  commentLabel = 'Comment',
  commentPlaceholder = 'Describe the issue or feedback...',
  intentLabel = 'Intent',
  severityLabel = 'Severity',
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  deleteLabel = 'Delete',
  saveDisabled = false,
  isSaving = false,
  textareaRef,
  children,
}: OnUIAnnotationFormProps) {
  return (
    <>
      <span class="onui-textarea-label">{commentLabel}</span>
      <div class="onui-textarea-wrap">
        <textarea
          ref={textareaRef}
          class="onui-textarea"
          placeholder={commentPlaceholder}
          value={comment}
          onInput={(event) => onCommentChange((event.target as HTMLTextAreaElement).value)}
        />
      </div>

      <div class="onui-selector">
        <span class="onui-selector-label">{intentLabel}</span>
        {INTENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            class={`onui-chip onui-chip--intent ${intent === option.value ? 'is-selected' : ''}`}
            aria-pressed={intent === option.value}
            aria-label={`Intent: ${option.label}${intent === option.value ? ' (selected)' : ''}`}
            onClick={() => onIntentChange(intent === option.value ? undefined : option.value)}
          >
            <option.icon />
            {option.label}
          </button>
        ))}
      </div>

      <div class="onui-selector">
        <span class="onui-selector-label">{severityLabel}</span>
        {SEVERITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            class={`onui-chip onui-chip--severity ${severity === option.value ? 'is-selected' : ''}`}
            aria-pressed={severity === option.value}
            aria-label={`Severity: ${option.label}${severity === option.value ? ' (selected)' : ''}`}
            onClick={() => onSeverityChange(severity === option.value ? undefined : option.value)}
          >
            <option.icon />
            {option.label}
          </button>
        ))}
      </div>

      {children}

      <div class="onui-dialog-footer">
        {onDelete && (
          <button
            class="onui-btn-secondary"
            onClick={onDelete}
            style={{ marginRight: 'auto', color: 'var(--onui-error)' }}
          >
            {deleteLabel}
          </button>
        )}
        <button class="onui-btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          class="onui-btn-primary"
          onClick={onSave}
          disabled={saveDisabled || isSaving}
          aria-busy={isSaving ? 'true' : undefined}
        >
          {saveLabel}
        </button>
      </div>
    </>
  );
}
