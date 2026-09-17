import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SelectionValue = {
  selectedIds: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectedCount: number;
};

const SelectionContext = createContext<SelectionValue | null>(null);

/**
 * Which rows the organiser has ticked. Held for the whole screen so the rows
 * and the summary bar read from one source of truth.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((previous) => {
      // A new Set, not a mutation: React compares by reference, so changing the
      // existing one in place would not trigger a re-render.
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const value = useMemo<SelectionValue>(
    () => ({
      selectedIds,
      isSelected: (id: string) => selectedIds.has(id),
      toggleSelection,
      clearSelection,
      selectedCount: selectedIds.size,
    }),
    [selectedIds, toggleSelection, clearSelection],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionValue {
  const value = useContext(SelectionContext);
  if (!value) throw new Error("useSelection must be used inside a SelectionProvider");
  return value;
}
