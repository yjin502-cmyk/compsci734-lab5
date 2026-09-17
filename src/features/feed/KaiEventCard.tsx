import type { KaiEvent } from "../../data/kai_event";
import { RowCheckbox } from "./RowCheckbox";

/** One event: emoji, name, location, portions remaining, and a select box. */
export function KaiEventCard({ event }: { event: KaiEvent }) {
  return (
    <article className="card">
      <RowCheckbox eventId={event.id} eventName={event.name} />
      <span className="card__leading" aria-hidden="true">
        {event.emoji}
      </span>
      <div className="card__body">
        <h3 className="card__title">{event.name}</h3>
        <p className="card__subtitle">{event.location}</p>
        <p className="card__portions">
          {event.isActive ? `${event.portionsLeft} portions left` : "All gone"}
        </p>
      </div>
    </article>
  );
}
