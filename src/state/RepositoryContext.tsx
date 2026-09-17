import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { EventRepository } from "../data/event_repository";
import { KaiApiService } from "../data/kai_api_service";

const RepositoryContext = createContext<EventRepository | null>(null);

/**
 * Supplies the repository to the tree. Passing one in replaces the real
 * service, which is how the tests run without a server.
 */
export function RepositoryProvider({
  repository,
  children,
}: {
  repository?: EventRepository;
  children: ReactNode;
}) {
  // Memoised so the default service keeps a stable identity across renders;
  // otherwise every effect depending on it would re-run each time.
  const value = useMemo(() => repository ?? new KaiApiService(), [repository]);
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): EventRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error("useRepository must be used inside a RepositoryProvider");
  }
  return repository;
}
