import { useState } from "react";
import { useEvents } from "../../hooks/useEvents";
import { SelectionBar } from "./SelectionBar";
import { useOrganiser } from "../../state/OrganiserContext";
import { KaiEventList } from "./KaiEventList";

/**
 * The event feed, covering all four states a remote read can be in: loading,
 * error, empty and data.
 */
export function FeedScreen() {
  const { events, error, loading, reload } = useEvents();
  const { organiser } = useOrganiser();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("all");

  // Derived during render rather than held in state, so there is only ever one
  // source of truth for what is on screen.
  const visible = (events ?? [])
    .filter((event) => scope === "all" || event.postedById === organiser.id)
    .filter((event) =>
      `${event.name} ${event.location}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    );

  return (
    <section>
      <header className="screen__header">
        <h2>Events</h2>
      </header>

      <div className="scope" role="group" aria-label="Which events">
        <button
          type="button"
          aria-pressed={scope === "mine"}
          onClick={() => setScope("mine")}
        >
          My events
        </button>
        <button
          type="button"
          aria-pressed={scope === "all"}
          onClick={() => setScope("all")}
        >
          All events
        </button>
      </div>

      <label className="search">
        <span className="search__label">Search events</span>
        <input
          type="search"
          value={query}
          placeholder="samosas, quad, ..."
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {loading && (
        <div className="skeleton" role="status" aria-live="polite">
          <span className="visually-hidden">Loading events</span>
          <div className="skeleton__row" />
          <div className="skeleton__row" />
          <div className="skeleton__row" />
        </div>
      )}

      {!loading && error && (
        <div className="state state--error" role="alert">
          <p>Couldn&rsquo;t reach the Kai server.</p>
          <p className="state__hint">
            Check it is running on port 3734, then try again.
          </p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="state state--empty">
          {/* Three ways to be empty, and they mean different things. */}
          {query ? (
            <p>{`No events match \u201C${query}\u201D.`}</p>
          ) : scope === "mine" ? (
            <>
              <p>{`${organiser.name} hasn\u2019t posted anything yet.`}</p>
              <p className="state__hint">
                Post an event, or switch to All events to see the rest of campus.
              </p>
            </>
          ) : (
            <>
              <p>No free kai on campus right now.</p>
              <p className="state__hint">Post an event to let everyone know.</p>
            </>
          )}
        </div>
      )}

      <SelectionBar events={visible} />

      {!loading && !error && visible.length > 0 && <KaiEventList events={visible} />}
    </section>
  );
}
