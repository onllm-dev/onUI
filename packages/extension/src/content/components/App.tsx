import { useState, useCallback } from 'preact/hooks';
import type { Annotation, AnnotationIntent, AnnotationSeverity, OutputLevel } from '@/types';
import { ElementHighlight } from './ElementHighlight';
import { AnnotationMarkers } from './AnnotationMarkers';
import { OnUIToolbar } from './OnUIToolbar';
import { OnUIDialog } from './OnUIDialog';
import { useElementHover } from '../hooks/useElementHover';
import { useAnnotations } from '../hooks/useAnnotations';
import { useTabRuntimeState } from '../hooks/useTabRuntimeState';
import { createAnnotationFromElement } from '../utils/create-annotation';

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
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    isContextInvalid,
  } = useAnnotations();

  // Output level for onUI
  const [outputLevel, setOutputLevel] = useState<OutputLevel>('standard');

  // Element being annotated (popup open)
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);

  // Annotation being edited
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  // Handle element click in annotation mode
  const handleElementClick = useCallback((element: Element) => {
    setSelectedElement(element);
    setEditingAnnotation(null);
  }, []);

  const { hoveredElement } = useElementHover({
    enabled: annotateMode && !selectedElement && !editingAnnotation,
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

      await addAnnotation(input);
      setSelectedElement(null);
    },
    [selectedElement, addAnnotation]
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
    setEditingAnnotation(null);
  }, []);

  // Handle marker click to edit
  const handleMarkerClick = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setSelectedElement(null);
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

  const editingElement = editingAnnotation ? getEditingElement() : null;

  // Hide toolbar when dialog is open to prevent z-index conflicts
  const isDialogOpen = selectedElement !== null || editingAnnotation !== null;

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
      {annotateMode && hoveredElement && !selectedElement && !editingAnnotation && (
        <ElementHighlight element={hoveredElement} />
      )}

      {/* Highlight selected element */}
      {selectedElement && (
        <ElementHighlight element={selectedElement} selected />
      )}

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
    </>
  );
}
