import { useState, useCallback, useEffect, useMemo } from 'preact/hooks';
import type {
  Annotation,
  AnnotationIntent,
  AnnotationSeverity,
  OutputLevel,
  RegionGeometry,
  RegionShape,
} from '@/types';
import { getSettings, updateSettings, isToggleDrawModeMessage } from '../messaging';
import { webext } from '@/shared/webext';
import { ElementHighlight } from './ElementHighlight';
import { AnnotationMarkers } from './AnnotationMarkers';
import { OnUIToolbar } from './OnUIToolbar';
import { OnUIDialog } from './OnUIDialog';
import { ErrorToast } from './ErrorToast';
import { FrozenOverlay } from './FrozenOverlay';
import { useElementHover } from '../hooks/useElementHover';
import { useAnnotations } from '../hooks/useAnnotations';
import { useTabRuntimeState } from '../hooks/useTabRuntimeState';
import { useFreezeSession } from '../hooks/useFreezeSession';
import { createAnnotationFromElement } from '../utils/create-annotation';
import { createAnnotationFromRegion } from '../utils/create-region-annotation';
import { ONUI_SHADOW_HOST_ID, stopEventPropagation } from '../utils/overlay-events';
import { OnUIRegionDialog } from './OnUIRegionDialog';
import { RegionDrawOverlay } from './RegionDrawOverlay';
import { RegionOutline } from './RegionOutline';
import { RegionTransformHandles } from './RegionTransformHandles';
import { getElementAtPoint } from '../utils/element-detection';

const MAX_MULTI_SELECTION = 25;

function isSameElement(a: Element, b: Element): boolean {
  return a.isSameNode(b);
}

function createBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type SelectionEvent = MouseEvent | PointerEvent;

interface SaveDialogData {
  comment: string;
  intent?: AnnotationIntent | undefined;
  severity?: AnnotationSeverity | undefined;
}

function toAnnotationUpdate(data: SaveDialogData) {
  return {
    comment: data.comment,
    ...(data.intent !== undefined ? { intent: data.intent } : {}),
    ...(data.severity !== undefined ? { severity: data.severity } : {}),
  };
}

function isRegionAnnotation(
  annotation: Annotation
): annotation is Annotation & { targetType: 'region'; region: { shape: RegionShape; geometry: RegionGeometry } } {
  return annotation.targetType === 'region' && annotation.region !== undefined;
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

  // Freeze session for stable element selection
  const freezeSession = useFreezeSession({ enabled: annotateMode });

  // Output level for onUI
  const [outputLevel, setOutputLevel] = useState<OutputLevel>('standard');
  const [clearOnCopy, setClearOnCopy] = useState(false);

  // Draw mode state (local v1)
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawShape, setDrawShape] = useState<RegionShape>('rectangle');
  const [drawCancelSignal, setDrawCancelSignal] = useState(0);
  const [isDrawingDraft, setIsDrawingDraft] = useState(false);

  // Region create/edit state
  const [pendingRegion, setPendingRegion] = useState<{ geometry: RegionGeometry; shape: RegionShape } | null>(null);
  const [editingRegionGeometry, setEditingRegionGeometry] = useState<RegionGeometry | null>(null);

  // Element being annotated (popup open)
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);

  // Multi-select targets before shift is released
  const [pendingMultiSelection, setPendingMultiSelection] = useState<Element[]>([]);

  // Multi-select targets shown in dialog
  const [multiDialogTargets, setMultiDialogTargets] = useState<Element[]>([]);

  // Annotation being edited
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [frozenHoveredElement, setFrozenHoveredElement] = useState<Element | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      const response = await getSettings();
      if (!mounted || !response.success || !response.data) {
        return;
      }

      setClearOnCopy(Boolean(response.data.clearOnCopy));
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  // Clear temporary state when annotate mode is disabled
  useEffect(() => {
    if (!annotateMode) {
      setSelectedElement(null);
      setPendingMultiSelection([]);
      setMultiDialogTargets([]);
      setEditingAnnotation(null);
    }
  }, [annotateMode]);

  useEffect(() => {
    if (!isDrawMode) {
      setIsDrawingDraft(false);
    }
  }, [isDrawMode]);

  useEffect(() => {
    if (!freezeSession.isActive) {
      setFrozenHoveredElement(null);
    }
  }, [freezeSession.isActive]);

  // Listen for keyboard shortcut to toggle draw mode
  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (isToggleDrawModeMessage(message)) {
        setIsDrawMode((previous) => {
          const next = !previous;
          if (next) {
            if (annotateMode) {
              void onToggleAnnotateMode();
            }
            setSelectedElement(null);
            setPendingMultiSelection([]);
            setMultiDialogTargets([]);
            setEditingAnnotation(null);
            setEditingRegionGeometry(null);
            setPendingRegion(null);
          } else {
            setPendingRegion(null);
            setIsDrawingDraft(false);
            setDrawCancelSignal((value) => value + 1);
          }
          return next;
        });
      }
    };

    webext.runtime.onMessage.addListener(handleMessage);
    return () => webext.runtime.onMessage.removeListener(handleMessage);
  }, [annotateMode, onToggleAnnotateMode]);

  // Handle element click in annotation mode
  const handleElementClick = useCallback((element: Element, event: SelectionEvent) => {
    setEditingAnnotation(null);
    setPendingRegion(null);

    if (freezeSession.isActive) {
      freezeSession.cacheElementRect(element);
    }

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
  }, [freezeSession]);

  useEffect(() => {
    const host = document.getElementById(ONUI_SHADOW_HOST_ID);
    if (!host) {
      return;
    }

    const stopOverlayPointerEvent = (event: Event) => {
      stopEventPropagation(event);
    };

    host.addEventListener('pointerdown', stopOverlayPointerEvent);
    host.addEventListener('mousedown', stopOverlayPointerEvent);
    host.addEventListener('click', stopOverlayPointerEvent);

    return () => {
      host.removeEventListener('pointerdown', stopOverlayPointerEvent);
      host.removeEventListener('mousedown', stopOverlayPointerEvent);
      host.removeEventListener('click', stopOverlayPointerEvent);
    };
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

  const { hoveredElement: liveHoveredElement } = useElementHover({
    enabled:
      annotateMode &&
      !freezeSession.isActive &&
      !isDrawMode &&
      !selectedElement &&
      !editingAnnotation &&
      multiDialogTargets.length === 0 &&
      pendingRegion === null,
    onElementClick: handleElementClick,
  });

  const hoveredElement = freezeSession.isActive ? frozenHoveredElement : liveHoveredElement;

  const handleFrozenPointerMove = useCallback((event: PointerEvent) => {
    if (!annotateMode || !freezeSession.isActive) {
      return;
    }

    const element = getElementAtPoint(event.clientX, event.clientY);
    setFrozenHoveredElement(element);
  }, [annotateMode, freezeSession.isActive]);

  const handleFrozenPointerDown = useCallback((event: PointerEvent) => {
    if (!annotateMode || !freezeSession.isActive) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const element = getElementAtPoint(event.clientX, event.clientY);
    if (!element) {
      return;
    }

    stopEventPropagation(event, true);
    handleElementClick(element, event);
  }, [annotateMode, freezeSession.isActive, handleElementClick]);

  // Handle save new annotation with optional intent/severity
  const handleSaveAnnotation = useCallback(
    async (data: SaveDialogData) => {
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

  const handleRegionDrawComplete = useCallback((geometry: RegionGeometry) => {
    setSelectedElement(null);
    setPendingMultiSelection([]);
    setMultiDialogTargets([]);
    setEditingAnnotation(null);
    setIsDrawingDraft(false);
    setIsDrawMode(false);
    setPendingRegion({ geometry, shape: drawShape });
  }, [drawShape]);

  const handleSaveRegionAnnotation = useCallback(
    async (data: SaveDialogData) => {
      if (!pendingRegion) {
        return;
      }

      const input = createAnnotationFromRegion({
        comment: data.comment,
        shape: pendingRegion.shape,
        geometry: pendingRegion.geometry,
        intent: data.intent,
        severity: data.severity,
      });

      const created = await addAnnotation(input);
      if (!created) {
        setToastMessage('Failed to add region annotation. Please try again.');
        return;
      }

      setPendingRegion(null);
      setIsDrawMode(false);
      setIsDrawingDraft(false);
      setToastMessage(null);
    },
    [addAnnotation, pendingRegion]
  );

  // Handle save multi annotation batch with shared intent/severity/comment
  const handleSaveMultiAnnotation = useCallback(
    async (data: SaveDialogData) => {
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

  const handleUpdateRegionAnnotation = useCallback(
    async (data: SaveDialogData) => {
      if (!editingAnnotation || !isRegionAnnotation(editingAnnotation)) {
        return;
      }

      const regionGeometry = editingRegionGeometry ?? editingAnnotation.region.geometry;
      await updateAnnotation(editingAnnotation.id, {
        ...toAnnotationUpdate(data),
        region: {
          shape: editingAnnotation.region.shape,
          geometry: regionGeometry,
        },
        targetType: 'region',
        boundingBox: {
          ...editingAnnotation.boundingBox,
          top: regionGeometry.y,
          left: regionGeometry.x,
          width: regionGeometry.width,
          height: regionGeometry.height,
          bottom: regionGeometry.y + regionGeometry.height,
          right: regionGeometry.x + regionGeometry.width,
          isFixed: false,
        },
      });

      setEditingAnnotation(null);
      setEditingRegionGeometry(null);
    },
    [editingAnnotation, editingRegionGeometry, updateAnnotation]
  );

  // Handle update existing annotation with optional intent/severity
  const handleUpdateAnnotation = useCallback(
    async (data: SaveDialogData) => {
      if (!editingAnnotation) return;

      await updateAnnotation(editingAnnotation.id, toAnnotationUpdate(data));
      setEditingAnnotation(null);
    },
    [editingAnnotation, updateAnnotation]
  );

  // Handle delete annotation
  const handleDeleteAnnotation = useCallback(async () => {
    if (!editingAnnotation) return;

    await deleteAnnotation(editingAnnotation.id);
    setEditingAnnotation(null);
    setEditingRegionGeometry(null);
  }, [editingAnnotation, deleteAnnotation]);

  // Handle cancel popup
  const handleCancelPopup = useCallback(() => {
    setSelectedElement(null);
    setPendingMultiSelection([]);
    setMultiDialogTargets([]);
    setEditingAnnotation(null);
    setPendingRegion(null);
    setEditingRegionGeometry(null);
    setIsDrawMode(false);
    setIsDrawingDraft(false);
    setDrawCancelSignal((value) => value + 1);
  }, []);

  // Handle marker click to edit
  const handleMarkerClick = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setSelectedElement(null);
    setPendingMultiSelection([]);
    setMultiDialogTargets([]);
    setPendingRegion(null);

    if (isRegionAnnotation(annotation)) {
      setEditingRegionGeometry(annotation.region.geometry);
    } else {
      setEditingRegionGeometry(null);
    }
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

  const handleToggleDrawMode = useCallback(() => {
    setIsDrawMode((previous) => {
      const next = !previous;

      if (next) {
        if (annotateMode) {
          void onToggleAnnotateMode();
        }
        setSelectedElement(null);
        setPendingMultiSelection([]);
        setMultiDialogTargets([]);
        setEditingAnnotation(null);
        setEditingRegionGeometry(null);
        setPendingRegion(null);
      } else {
        setPendingRegion(null);
        setIsDrawingDraft(false);
        setDrawCancelSignal((value) => value + 1);
      }

      return next;
    });
  }, [annotateMode, onToggleAnnotateMode]);

  const handleToggleAnnotateExclusive = useCallback(() => {
    if (!annotateMode && isDrawMode) {
      setIsDrawMode(false);
      setPendingRegion(null);
      setIsDrawingDraft(false);
      setDrawCancelSignal((value) => value + 1);
    }

    if (!annotateMode) {
      setPendingRegion(null);
      setEditingAnnotation(null);
      setEditingRegionGeometry(null);
    }

    void onToggleAnnotateMode();
  }, [annotateMode, isDrawMode, onToggleAnnotateMode]);

  const handleEscape = useCallback(() => {
    if (isDrawingDraft) {
      setDrawCancelSignal((value) => value + 1);
      setIsDrawingDraft(false);
      return;
    }

    if (pendingRegion || selectedElement || editingAnnotation || multiDialogTargets.length > 0) {
      handleCancelPopup();
      return;
    }

    if (isDrawMode) {
      setIsDrawMode(false);
      setDrawCancelSignal((value) => value + 1);
      return;
    }

    if (pendingMultiSelection.length > 0) {
      setPendingMultiSelection([]);
      return;
    }

    if (annotateMode) {
      void onToggleAnnotateMode();
    }
  }, [
    annotateMode,
    editingAnnotation,
    handleCancelPopup,
    isDrawMode,
    isDrawingDraft,
    multiDialogTargets.length,
    onToggleAnnotateMode,
    pendingMultiSelection.length,
    pendingRegion,
    selectedElement,
  ]);

  const shouldOwnEscape =
    annotateMode ||
    isDrawMode ||
    isDrawingDraft ||
    pendingRegion !== null ||
    selectedElement !== null ||
    editingAnnotation !== null ||
    multiDialogTargets.length > 0 ||
    pendingMultiSelection.length > 0;

  useEffect(() => {
    if (!shouldOwnEscape) {
      return;
    }

    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      stopEventPropagation(event, true);
      handleEscape();
    };

    window.addEventListener('keydown', handleEscapeKeyDown, true);
    return () => window.removeEventListener('keydown', handleEscapeKeyDown, true);
  }, [handleEscape, shouldOwnEscape]);

  // Handle clear all annotations
  const handleClearAnnotations = useCallback(async () => {
    await clearAnnotations();
  }, [clearAnnotations]);

  const handleClearOnCopyChange = useCallback(
    async (enabled: boolean) => {
      const previous = clearOnCopy;
      setClearOnCopy(enabled);

      try {
        const response = await updateSettings({ clearOnCopy: enabled });
        if (response.success) {
          return;
        }

        setClearOnCopy(previous);
        setToastMessage(response.error || 'Failed to save clear-on-copy setting.');
      } catch {
        setClearOnCopy(previous);
        setToastMessage('Failed to save clear-on-copy setting.');
      }
    },
    [clearOnCopy]
  );

  // Remove a target from an open multi-target dialog
  const handleRemoveMultiTarget = useCallback((target: Element) => {
    setMultiDialogTargets((prev) => prev.filter((candidate) => !isSameElement(candidate, target)));
  }, []);

  const editingElement = editingAnnotation ? getEditingElement() : null;
  const editingRegion = editingAnnotation && isRegionAnnotation(editingAnnotation) ? editingAnnotation : null;
  const regionDialogGeometry = pendingRegion?.geometry ?? editingRegionGeometry ?? editingRegion?.region.geometry ?? null;
  const regionDialogShape = pendingRegion?.shape ?? editingRegion?.region.shape ?? null;
  const shouldShowRegionDrawOverlay = isDrawMode && pendingRegion === null && editingAnnotation === null;

  const selectedFrozenRect = useMemo(
    () => (selectedElement && freezeSession.isActive ? freezeSession.getFrozenRect(selectedElement) ?? undefined : undefined),
    [selectedElement, freezeSession]
  );

  const editingFrozenRect = useMemo(
    () => (editingElement && freezeSession.isActive ? freezeSession.getFrozenRect(editingElement) ?? undefined : undefined),
    [editingElement, freezeSession]
  );

  // Hide toolbar when dialog is open to prevent z-index conflicts
  const isDialogOpen =
    selectedElement !== null ||
    editingAnnotation !== null ||
    multiDialogTargets.length > 0 ||
    pendingRegion !== null;

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
          isDrawMode={isDrawMode}
          drawShape={drawShape}
          multiSelectCount={pendingMultiSelection.length}
          onToggleAnnotateMode={handleToggleAnnotateExclusive}
          onToggleDrawMode={handleToggleDrawMode}
          onSelectDrawShape={setDrawShape}
          annotations={annotations}
          outputLevel={outputLevel}
          onOutputLevelChange={setOutputLevel}
          clearOnCopy={clearOnCopy}
          onClearOnCopyChange={(enabled) => {
            void handleClearOnCopyChange(enabled);
          }}
          onClearAnnotations={handleClearAnnotations}
        />
      )}

      {/* Frozen viewport overlay */}
      {annotateMode && freezeSession.isActive && freezeSession.screenshot && !isDrawMode && (
        <FrozenOverlay
          screenshot={freezeSession.screenshot}
          onPointerMove={handleFrozenPointerMove}
          onPointerDown={handleFrozenPointerDown}
        />
      )}

      {/* Draw overlay */}
      <RegionDrawOverlay
        enabled={shouldShowRegionDrawOverlay}
        shape={drawShape}
        cancelSignal={drawCancelSignal}
        onComplete={handleRegionDrawComplete}
        onDraftStateChange={setIsDrawingDraft}
      />

      {/* Persistent region outlines */}
      {annotations
        .filter((annotation) => isRegionAnnotation(annotation))
        .map((annotation) => (
          <RegionOutline
            key={`region-outline-${annotation.id}`}
            annotation={annotation}
            selected={editingAnnotation?.id === annotation.id}
          />
        ))}

      {/* Element highlight when hovering */}
      {annotateMode &&
        hoveredElement &&
        !selectedElement &&
        !editingAnnotation &&
        multiDialogTargets.length === 0 &&
        pendingRegion === null && (
          <ElementHighlight
            element={hoveredElement}
            frozenRect={
              freezeSession.isActive ? freezeSession.getFrozenRect(hoveredElement) ?? undefined : undefined
            }
          />
        )}

      {/* Highlight selected element */}
      {selectedElement && (
        <ElementHighlight element={selectedElement} selected frozenRect={selectedFrozenRect} />
      )}

      {/* Highlight pending multi-selected elements */}
      {pendingMultiSelection.map((element, index) => (
        <ElementHighlight
          key={`pending-${element.tagName.toLowerCase()}-${index}`}
          element={element}
          selected
          frozenRect={
            freezeSession.isActive ? freezeSession.getFrozenRect(element) ?? undefined : undefined
          }
        />
      ))}

      {/* Highlight multi-dialog targets */}
      {multiDialogTargets.map((element, index) => (
        <ElementHighlight
          key={`multi-${element.tagName.toLowerCase()}-${index}`}
          element={element}
          selected
          frozenRect={
            freezeSession.isActive ? freezeSession.getFrozenRect(element) ?? undefined : undefined
          }
        />
      ))}

      {/* Highlight element being edited */}
      {editingElement && (
        <ElementHighlight element={editingElement} selected frozenRect={editingFrozenRect} />
      )}

      {/* Region transform handles (edit mode) */}
      {editingRegion && editingRegionGeometry && (
        <RegionTransformHandles
          geometry={editingRegionGeometry}
          onChange={setEditingRegionGeometry}
        />
      )}

      {/* New annotation dialog */}
      {selectedElement && (
        <OnUIDialog
          element={selectedElement}
          frozenRect={selectedFrozenRect}
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
          frozenRect={
            freezeSession.isActive
              ? freezeSession.getFrozenRect(multiDialogTargets[0]!) ?? undefined
              : undefined
          }
          onSave={handleSaveMultiAnnotation}
          onCancel={handleCancelPopup}
        />
      )}

      {/* Edit annotation dialog */}
      {editingAnnotation && editingElement && !editingRegion && (
        <OnUIDialog
          element={editingElement}
          frozenRect={editingFrozenRect}
          initialComment={editingAnnotation.comment}
          initialIntent={editingAnnotation.intent}
          initialSeverity={editingAnnotation.severity}
          isEditing
          onSave={handleUpdateAnnotation}
          onCancel={handleCancelPopup}
          onDelete={handleDeleteAnnotation}
        />
      )}

      {/* Region annotation dialog (create/edit) */}
      {regionDialogGeometry &&
        regionDialogShape &&
        (editingRegion ? (
          <OnUIRegionDialog
            geometry={regionDialogGeometry}
            shape={regionDialogShape}
            initialComment={editingRegion.comment}
            {...(editingRegion.intent !== undefined ? { initialIntent: editingRegion.intent } : {})}
            {...(editingRegion.severity !== undefined ? { initialSeverity: editingRegion.severity } : {})}
            onSave={handleUpdateRegionAnnotation}
            onCancel={handleCancelPopup}
            onDelete={handleDeleteAnnotation}
          />
        ) : (
          <OnUIRegionDialog
            geometry={regionDialogGeometry}
            shape={regionDialogShape}
            onSave={handleSaveRegionAnnotation}
            onCancel={handleCancelPopup}
          />
        ))}

      {/* Annotation markers */}
      <AnnotationMarkers annotations={annotations} onMarkerClick={handleMarkerClick} />

      {toastMessage && (
        <ErrorToast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
