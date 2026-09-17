import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_ORGANISER_ID, ORGANISERS, type KaiUser } from "../data/kai_user";

type OrganiserValue = {
  organiser: KaiUser;
  setOrganiserId: (id: string) => void;
  organisers: KaiUser[];
};

const OrganiserContext = createContext<OrganiserValue | null>(null);

/**
 * Tracks which organiser the dashboard is acting as. `postEvent` requires a
 * postedById, and there is no sign-in yet, so the value is chosen in the UI and
 * sent with the request. The server does not verify it.
 */
export function OrganiserProvider({
  initialOrganiserId = DEFAULT_ORGANISER_ID,
  children,
}: {
  initialOrganiserId?: string;
  children: ReactNode;
}) {
  const [organiserId, setOrganiserId] = useState(initialOrganiserId);

  const value = useMemo<OrganiserValue>(() => {
    const organiser =
      ORGANISERS.find((u) => u.id === organiserId) ?? ORGANISERS[0];
    return { organiser, setOrganiserId, organisers: ORGANISERS };
  }, [organiserId]);

  return <OrganiserContext.Provider value={value}>{children}</OrganiserContext.Provider>;
}

export function useOrganiser(): OrganiserValue {
  const value = useContext(OrganiserContext);
  if (!value) throw new Error("useOrganiser must be used inside an OrganiserProvider");
  return value;
}
