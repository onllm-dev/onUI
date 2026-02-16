import { useState, useCallback, useEffect } from 'preact/hooks';
import type { Annotation, AnnotationIntent, AnnotationSeverity, OutputLevel } from '@/types';
import { ElementHighlight } from './ElementHighlight';
import { AnnotationMarkers } from './AnnotationMarkers';
import { OnUIToolbar } from './OnUIToolbar';
import { OnUIDialog } from './OnUIDialog';
import { ErrorToast } from './ErrorToast';
import { useElementHover } from '../hooks/useElementHover';
import { useAnnotations } from '../hooks/useAnnotations';
import { useTabRuntimeState } from '../hooks/useTabRuntimeState';
import { createAnnotationFromElement } from '../utils/create-annotation';

const MAX_MULTI_SELECTION = 25;

function isSameElement(a: Element, b: Element): boolean {
  return a.isSameNode(b);
}

function createBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Main application component gated by per-tab enabled state
 */
export function App() {
  const {
    enabled,
    annotateMode,
    toggleAnnotateMode,
    isContextInvalid,
  } = useTabRuntimeState();

  return (
    <>
      {isContextInvalid && (
        <div class="onui-refresh-banner">
          <span>onUI extension has been updated.</span>
          <button onClick={() => window.location.reload()}>Refresh page</button>
        </div>
      )}

      {enabled && (
        <EnabledApp
          annotateMode={annotateMode}
          onToggleAnnotateMode={toggleAnnotateMode}
        />
      )}
    </>
  );
}

interface EnabledAppProps {
  annotateMode: boolean;
  onToggleAnnotateMode: () => Promise<void>;
}

function EnabledApp({ annotateMode, onToggleAnnotateMode }: EnabledAppProps) {
  const {
    annotations,
    addAnnotation,
    addAnnotationsBulk,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    isContextInvalid,
  } = useAnnotations();

  // Output level for onUI
  const [outputLevel, setOutputLevel] = useState<OutputLevel>('standard');

  // Element being annotated (popup open)
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);

  // Multi-select targets before shift is released
  const [pendingMultiSelection, setPendingMultiSelection] = useState<Element[]>([]);

  // Multi-select targets shown in dialog
  const [multiDialogTargets, setMultiDialogTargets] = useState<Element[]>([]);

  // Annotation being edited
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Clear temporary state when annotate mode is disabled
  useEffect(() => {
    if (!annotateMode) {
      setSelectedElement(null);
      setPendingMultiSelection([]);
      setMultiDialogTargets([]);
      setEditingAnnotation(null);
    }
  }, [annotateMode]);

  // Handle element click in annotation mode
  const handleElementClick = useCallback((element: Element, event: MouseEvent) => {
    setEditingAnnotation(null);

    if (event.shiftKey) {
      setSelectedElement(null);
      setMultiDialogTargets([]);

      setPendingMultiSelection((prev) => {
        const alreadySelected = prev.some((candidate) => isSameElement(candidate, element));
        if (alreadySelected) {
          return prev.filter((candidate) => !isSameElement(candidate, element));
        }

        if (prev.length >= MAX_MULTI_SELECTION) {
          setToastMessage(`You can select up to ${MAX_MULTI_SELECTION} elements per batch.`);
          return prev;
        }

        return [...prev, element];
      });
      return;
    }

    setPendingMultiSelection([]);
    setMultiDialogTargets([]);
    setSelectedElement(element);
  }, []);

  // Open multi-target dialog when shift is released
  useEffect(() => {
    const handleShiftRelease = (event: KeyboardEvent) => {
      if (event.key !== 'Shift') return;
      if (!annotateMode) return;
      if (selectedElement || editingAnnotation || multiDialogTargets.length > 0) return;
      if (pendingMultiSelection.length === 0) return;

      const connectedTargets = pendingMultiSelection.filter((element) => element.isConnected);
      setPendingMultiSelection([]);

      if (connectedTargets.length === 0) {
        setToastMessage('Selected elements are no longer available.');
        return;
      }

      setMultiDialogTargets(connectedTargets);
    };

    document.addEventListener('keyup', handleShiftRelease);
    return () => document.removeEventListener('keyup', handleShiftRelease);
  }, [
    annotateMode,
    selectedElement,
    editingAnnotation,
    pendingMultiSelection,
    multiDialogTargets.length,
  ]);

  // Esc while selecting clears pending multi targets before toolbar exits annotate mode
  useEffect(() => {
    const handleEscapeClearSelection = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!annotateMode) return;
      if (pendingMultiSelection.length === 0) return;
      if (selectedElement || editingAnnotation || multiDialogTargets.length > 0) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setPendingMultiSelection([]);
    };

    document.addEventListener('keydown', handleEscapeClearSelection, true);
    return () => document.removeEventListener('keydown', handleEscapeClearSelection, true);
  }, [
    annotateMode,
    pendingMultiSelection.length,
    selectedElement,
    editingAnnotation,
    multiDialogTargets.length,
  ]);

  const { hoveredElement } = useElementHover({
    enabled: annotateMode && !selectedElement && !editingAnnotation && multiDialogTargets.length === 0,
    onElementClick: handleElementClick,
  });

  // Handle save new annotation with optional intent/severity
  const handleSaveAnnotation = useCallback(
    async (data: { comment: string; intent?: AnnotationIntent | undefined; severity?: AnnotationSeverity | undefined }) => {
      if (!selectedElement) return;

      const input = createAnnotationFromElement({
        element: selectedElement,
        comment: data.comment,
        intent: data.intent,
        severity: data.severity,
      });

      const created = await addAnnotation(input);
      if (!created) {
        setToastMessage('Failed to add annotation. Please try again.');
        return;
      }

      setSelectedElement(null);
      setToastMessage(null);
    },
    [selectedElement, addAnnotation]
  );

  // Handle save multi annotation batch with shared intent/severity/comment
  const handleSaveMultiAnnotation = useCallback(
    async (data: { comment: string; intent?: AnnotationIntent | undefined; severity?: AnnotationSeverity | undefined }) => {
      if (multiDialogTargets.length === 0) return;

      const connectedTargets = multiDialogTargets.filter((target) => target.isConnected);
      if (connectedTargets.length !== multiDialogTargets.length) {
        setMultiDialogTargets(connectedTargets);
      }

      if (connectedTargets.length === 0) {
        setMultiDialogTargets([]);
        setToastMessage('Selected elements are no longer available.');
        return;
      }

      const batchId = createBatchId();
      const inputs = connectedTargets.map((element) =>
        createAnnotationFromElement({
          element,
          comment: data.comment,
          batchId,
          intent: data.intent,
          severity: data.severity,
        })
      );

      const created = await addAnnotationsBulk(inputs);
      if (created.length === 0) {
        setToastMessage('Failed to add annotations. Please try again.');
        return;
      }

      setMultiDialogTargets([]);
      setToastMessage(null);
    },
    [multiDialogTargets, addAnnotationsBulk]
  );

  // Handle update existing annotation with optional intent/severity
  const handleUpdateAnnotation = useCallback(
    async (data: { comment: string; intent?: AnnotationIntent | undefined; severity?: AnnotationSeverity | undefined }) => {
      if (!editingAnnotation) return;

      await updateAnnotation(editingAnnotation.id, data);
      setEditingAnnotation(null);
    },
    [editingAnnotation, updateAnnotation]
  );

  // Handle delete annotation
  const handleDeleteAnnotation = useCallback(async () => {
    if (!editingAnnotation) return;

    await deleteAnnotation(editingAnnotation.id);
    setEditingAnnotation(null);
  }, [editingAnnotation, deleteAnnotation]);

  // Handle cancel popup
  const handleCancelPopup = useCallback(() => {
    setSelectedElement(null);
    setPendingMultiSelection([]);
    setMultiDialogTargets([]);
    setEditingAnnotation(null);
  }, []);

  // Handle marker click to edit
  const handleMarkerClick = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setSelectedElement(null);
    setPendingMultiSelection([]);
    setMultiDialogTargets([]);
  }, []);

  // Get element for editing annotation (find by selector)
  const getEditingElement = useCallback((): Element | null => {
    if (!editingAnnotation) return null;

    try {
      return document.querySelector(editingAnnotation.selector);
    } catch {
      return null;
    }
  }, [editingAnnotation]);

  // Handle clear all annotations
  const handleClearAnnotations = useCallback(async () => {
    await clearAnnotations();
  }, [clearAnnotations]);

  // Remove a target from an open multi-target dialog
  const handleRemoveMultiTarget = useCallback((target: Element) => {
    setMultiDialogTargets((prev) => prev.filter((candidate) => !isSameElement(candidate, target)));
  }, []);

  const editingElement = editingAnnotation ? getEditingElement() : null;

  // Hide toolbar when dialog is open to prevent z-index conflicts
  const isDialogOpen = selectedElement !== null || editingAnnotation !== null || multiDialogTargets.length > 0;

  return (
    <>
      {/* Refresh banner when extension context is invalidated */}
      {isContextInvalid && (
        <div class="onui-refresh-banner">
          <span>onUI extension has been updated.</span>
          <button onClick={() => window.location.reload()}>Refresh page</button>
        </div>
      )}

      {/* OnUI Toolbar - hidden when dialog is open */}
      {!isDialogOpen && (
        <OnUIToolbar
          isAnnotateMode={annotateMode}
          onToggleAnnotateMode={() => {
            void onToggleAnnotateMode();
          }}
          annotations={annotations}
          outputLevel={outputLevel}
          onOutputLevelChange={setOutputLevel}
          onClearAnnotations={handleClearAnnotations}
        />
      )}

      {/* Element highlight when hovering */}
      {annotateMode && hoveredElement && !selectedElement && !editingAnnotation && multiDialogTargets.length === 0 && (
        <ElementHighlight element={hoveredElement} />
      )}

      {/* Highlight selected element */}
      {selectedElement && (
        <ElementHighlight element={selectedElement} selected />
      )}

      {/* Highlight pending multi-selected elements */}
      {pendingMultiSelection.map((element, index) => (
        <ElementHighlight
          key={`pending-${element.tagName.toLowerCase()}-${index}`}
          element={element}
          selected
        />
      ))}

      {/* Highlight multi-dialog targets */}
      {multiDialogTargets.map((element, index) => (
        <ElementHighlight
          key={`multi-${element.tagName.toLowerCase()}-${index}`}
          element={element}
          selected
        />
      ))}

      {/* Highlight element being edited */}
      {editingElement && (
        <ElementHighlight element={editingElement} selected />
      )}

      {/* New annotation dialog */}
      {selectedElement && (
        <OnUIDialog
          element={selectedElement}
          onSave={handleSaveAnnotation}
          onCancel={handleCancelPopup}
        />
      )}

      {/* Multi annotation dialog */}
      {multiDialogTargets.length > 0 && (
        <OnUIDialog
          element={multiDialogTargets[0]!}
          multiTargets={multiDialogTargets}
          onRemoveTarget={handleRemoveMultiTarget}
          onSave={handleSaveMultiAnnotation}
          onCancel={handleCancelPopup}
        />
      )}

      {/* Edit annotation dialog */}
      {editingAnnotation && editingElement && (
        <OnUIDialog
          element={editingElement}
          initialComment={editingAnnotation.comment}
          initialIntent={editingAnnotation.intent}
          initialSeverity={editingAnnotation.severity}
          isEditing
          onSave={handleUpdateAnnotation}
          onCancel={handleCancelPopup}
          onDelete={handleDeleteAnnotation}
        />
      )}

      {/* Annotation markers */}
      <AnnotationMarkers
        annotations={annotations}
        onMarkerClick={handleMarkerClick}
      />

      {toastMessage && (
        <ErrorToast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
