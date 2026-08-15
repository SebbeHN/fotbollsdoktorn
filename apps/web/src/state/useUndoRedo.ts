import { useCallback, useRef, useState } from "react";

interface UndoEntry {
  undo: () => void;
  redo: () => void;
}

/**
 * Generic undo/redo command stack for the tactics board.
 * Callers push a {undo, redo} pair *after* already applying the change
 * optimistically; calling undo()/redo() only re-runs those functions.
 */
export function useUndoRedo() {
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const [, forceRender] = useState(0);

  const record = useCallback((entry: UndoEntry) => {
    undoStack.current.push(entry);
    redoStack.current = [];
    forceRender((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    entry.undo();
    redoStack.current.push(entry);
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    entry.redo();
    undoStack.current.push(entry);
    forceRender((n) => n + 1);
  }, []);

  return {
    record,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
