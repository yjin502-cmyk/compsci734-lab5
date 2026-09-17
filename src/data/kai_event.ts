/**
 * An event as the Kai Events server sends it:
 *   { id, name, location, emoji, portionsLeft, isActive, lat, lng, postedById }
 */
export type KaiEvent = {
  id: string;
  name: string;
  location: string;
  emoji: string;
  portionsLeft: number;
  isActive: boolean;
  lat: number;
  lng: number;
  postedById: string | null;
};

/** What the organiser form collects. The server assigns `id` and `isActive`. */
export type NewKaiEvent = {
  name: string;
  location: string;
  emoji: string;
  portionsLeft: number;
  lat: number;
  lng: number;
  postedById: string;
};

/** Parses one event, so nothing past this module has to deal with `unknown`. */
export function kaiEventFromJson(json: unknown): KaiEvent {
  if (typeof json !== "object" || json === null) {
    throw new Error("Expected an event object");
  }
  const j = json as Record<string, unknown>;
  const portionsLeft = Number(j.portionsLeft ?? 0);
  return {
    id: String(j.id),
    name: String(j.name),
    location: String(j.location),
    emoji: String(j.emoji ?? "\u{1F37D}"),
    portionsLeft,
    // The server computes isActive; fall back to deriving it if absent.
    isActive: typeof j.isActive === "boolean" ? j.isActive : portionsLeft > 0,
    lat: Number(j.lat ?? 0),
    lng: Number(j.lng ?? 0),
    postedById: j.postedById == null ? null : String(j.postedById),
  };
}

export function kaiEventsFromJson(json: unknown): KaiEvent[] {
  if (!Array.isArray(json)) throw new Error("Expected an array of events");
  return json.map(kaiEventFromJson);
}
