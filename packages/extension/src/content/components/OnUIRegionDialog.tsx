import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  AnnotationIntent,
  AnnotationSeverity,
  RegionGeometry,
  RegionShape,
} from '@/types';
import { useViewportTick } from '../hooks/useViewportTick';
import { OnUIAnnotationFormDialog } from './OnUIAnnotationForm';

interface OnUIRegionDialogProps {
  geometry: RegionGeometry;
  shape: RegionShape;
  initialComment?: string;
  initialIntent?: AnnotationIntent;
  initialSeverity?: AnnotationSeverity;
  onSave: (payload: {
    comment: string;
    intent?: AnnotationIntent;
    severity?: AnnotationSeverity;
  }) => void;
  onCancel: () => void;
  onDelete?: (() => void) | undefined;
}

function getDialogPosition(geometry: RegionGeometry) {
  const viewportPadding = 12;
  const width = 280;
  const desiredLeft = geometry.x + geometry.width + 12;
  const maxLeft = window.scrollX + window.innerWidth - width - viewportPadding;
  const minLeft = window.scrollX + viewportPadding;

  const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
  const desiredTop = geometry.y - 6;
  const maxTop = window.scrollY + window.innerHeight - 360 - viewportPadding;
  const minTop = window.scrollY + viewportPadding;
  const top = Math.min(Math.max(desiredTop, minTop), maxTop);

  return { top, left };
}

export function OnUIRegionDialog({
  geometry,
  shape,
  initialComment = '',
  initialIntent,
  initialSeverity,
  onSave,
  onCancel,
  onDelete,
}: OnUIRegionDialogProps) {
  const [comment, setComment] = useState(initialComment);
  const [intent, setIntent] = useState<AnnotationIntent | undefined>(initialIntent);
  const [severity, setSeverity] = useState<AnnotationSeverity | undefined>(initialSeverity);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setComment(initialComment);
  }, [initialComment]);

  useEffect(() => {
    setIntent(initialIntent);
  }, [initialIntent]);

  useEffect(() => {
    setSeverity(initialSeverity);
  }, [initialSeverity]);

  useViewportTick();

  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  const isSaveDisabled = useMemo(() => comment.trim().length === 0, [comment]);

  const handleSave = useCallback(() => {
    if (isSaveDisabled) {
      return;
    }

    onSave({
      comment: comment.trim(),
      ...(intent !== undefined && { intent }),
      ...(severity !== undefined && { severity }),
    });
  }, [comment, intent, isSaveDisabled, onSave, severity]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }

      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onCancel]);

  const position = getDialogPosition(geometry);

  return (
    <OnUIAnnotationFormDialog
      title={`${shape === 'ellipse' ? 'Ellipse' : 'Rectangle'} annotation`}
      onCancel={onCancel}
      className="onui-region-dialog"
      position={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 2147483646,
      }}
      width="280px"
      comment={comment}
      intent={intent}
      severity={severity}
      onCommentChange={setComment}
      onIntentChange={setIntent}
      onSeverityChange={setSeverity}
      onSave={handleSave}
      {...(onDelete ? { onDelete } : {})}
      commentPlaceholder="What should change here?"
      saveLabel="Save"
      saveDisabled={isSaveDisabled}
      textareaRef={textareaRef}
    />
  );
}
