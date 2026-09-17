import { useSelection } from "../../state/SelectionContext";

/** Ticks one event, so several can be looked at or acted on together. */
export function RowCheckbox({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const { isSelected, toggleSelection } = useSelection();

  return (
    <input
      type="checkbox"
      className="row-checkbox"
      aria-label={`Select ${eventName}`}
      checked={isSelected(eventId)}
      onChange={() => toggleSelection(eventId)}
    />
  );
}
