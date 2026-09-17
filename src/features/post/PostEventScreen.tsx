import { useState } from "react";
import { useRepository } from "../../state/RepositoryContext";
import { useOrganiser } from "../../state/OrganiserContext";
import type { NewKaiEvent } from "../../data/kai_event";

/** Defaults roughly to the middle of the City Campus. */
const EMPTY: Omit<NewKaiEvent, "postedById"> = {
  name: "",
  location: "",
  emoji: "\u{1F35B}",
  portionsLeft: 10,
  lat: -36.8523,
  lng: 174.7691,
};

/**
 * The organiser form. Submitting calls the server's postEvent mutation, which
 * writes to Firestore and broadcasts a notification; the browser never writes
 * to the database directly.
 */
export function PostEventScreen() {
  const repository = useRepository();
  const { organiser } = useOrganiser();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string | null>(null);

  // Client-side checks for fast feedback. The server checks again.
  const nameInvalid = form.name.trim().length === 0;
  const portionsInvalid = form.portionsLeft < 1;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit() {
    if (nameInvalid || portionsInvalid) return;
    setSubmitting(true);
    setError(null);
    setPosted(null);
    try {
      const created = await repository.postEvent({
        ...form,
        name: form.name.trim(),
        location: form.location.trim(),
        postedById: organiser.id,
      });
      setPosted(created.name);
      setForm(EMPTY);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't post that event: ${err.message}`
          : "Couldn't post that event.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <header className="screen__header">
        <h2>Post an event</h2>
      </header>

      <p className="posting-as">
        Posting as <strong>{organiser.name}</strong>, {organiser.dept}. Change it
        in the app bar.
      </p>

      <div className="field">
        <label htmlFor="event-name">Event name</label>
        <input
          id="event-name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          aria-invalid={nameInvalid}
        />
      </div>

      <div className="field">
        <label htmlFor="event-location">Location</label>
        <input
          id="event-location"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="event-emoji">Emoji</label>
        <input
          id="event-emoji"
          value={form.emoji}
          onChange={(e) => update("emoji", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="event-portions">Portions</label>
        <input
          id="event-portions"
          type="number"
          min={1}
          value={form.portionsLeft}
          onChange={(e) => update("portionsLeft", Number(e.target.value))}
          aria-invalid={portionsInvalid}
        />
      </div>

      <button
        type="button"
        className="primary"
        onClick={handleSubmit}
        disabled={submitting || nameInvalid || portionsInvalid}
      >
        {submitting ? "Posting\u2026" : "Post event"}
      </button>

      {error && (
        <p className="state state--error" role="alert">
          {error}
        </p>
      )}
      {posted && (
        <p className="state state--success" role="status">
          Posted {posted} as {organiser.name}. Every phone subscribed to the
          kai-events topic just got a notification.
        </p>
      )}
    </section>
  );
}
