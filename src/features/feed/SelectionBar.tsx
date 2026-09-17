import type { KaiEvent } from "../../data/kai_event";
import { useSelection } from "../../state/SelectionContext";

/**
 * Appears once anything is ticked. The portion total is computed from the
 * selection during render rather than tracked alongside it.
 */
export function SelectionBar({ events }: { events: KaiEvent[] }) {
  const { selectedIds, selectedCount, clearSelection } = useSelection();

  if (selectedCount === 0) return null;

  const portions = events
    .filter((event) => selectedIds.has(event.id))
    .reduce((total, event) => total + event.portionsLeft, 0);

  return (
    <div className="selection-bar" role="status">
      <span>
        {`${selectedCount} selected \u00B7 ${portions} portions between them`}
      </span>
      <button type="button" onClick={clearSelection}>
        Clear
      </button>
    </div>
  );
}
