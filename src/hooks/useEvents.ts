import { useCallback, useEffect, useState } from "react";
import type { KaiEvent } from "../data/kai_event";
import { useRepository } from "../state/RepositoryContext";

export type EventsState = {
  events: KaiEvent[] | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
};

/** Loads the event list and exposes the loading, error and data states. */
export function useEvents(): EventsState {
  const repository = useRepository();
  const [events, setEvents] = useState<KaiEvent[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  /** Bumping the nonce re-runs the effect, which refetches. */
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    repository
      .fetchEvents(controller.signal)
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Abandons an in-flight request, so a slower earlier response cannot
    // overwrite a newer one.
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repository, nonce]);

  return { events, error, loading, reload };
}
