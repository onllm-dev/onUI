import { useState, useEffect, useCallback } from 'preact/hooks';

interface UseTextSelectionOptions {
  enabled: boolean;
  onSelectionComplete?: (selection: Selection, element: Element) => void;
}

interface UseTextSelectionReturn {
  selection: Selection | null;
  selectedText: string;
  selectedElement: Element | null;
  selectionRect: DOMRect | null;
  clearSelection: () => void;
}

/**
 * Hook for detecting text selection
 */
export function useTextSelection(
  options: UseTextSelectionOptions
): UseTextSelectionReturn {
  const { enabled, onSelectionComplete } = options;

  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setSelectedText('');
    setSelectedElement(null);
    setSelectionRect(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearSelection();
      return;
    }

    const handleMouseUp = () => {
      const sel = window.getSelection();

      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        return;
      }

      const text = sel.toString().trim();
      if (!text) return;

      // Get the anchor node's parent element
      const anchorNode = sel.anchorNode;
      if (!anchorNode) return;

      const element =
        anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as Element)
          : anchorNode.parentElement;

      if (!element) return;

      // Get the bounding rect of the selection
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelection(sel);
      setSelectedText(text);
      setSelectedElement(element);
      setSelectionRect(rect);

      if (onSelectionComplete) {
        onSelectionComplete(sel, element);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onSelectionComplete, clearSelection]);

  return {
    selection,
    selectedText,
    selectedElement,
    selectionRect,
    clearSelection,
  };
}
