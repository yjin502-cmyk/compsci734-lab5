import type { EventRepository } from "./event_repository";
import type { KaiEvent, NewKaiEvent } from "./kai_event";

/** A trimmed copy of the server's seed data. */
export const sampleEvents: KaiEvent[] = [
  { id: "free-samosas", name: "Free samosas", location: "OGGB Level 2", emoji: "\u{1F95F}", portionsLeft: 14, isActive: true, lat: -36.8523, lng: 174.7691, postedById: "u1" },
  { id: "sausage-sizzle", name: "Sausage sizzle", location: "The Quad", emoji: "\u{1F32D}", portionsLeft: 38, isActive: true, lat: -36.8519, lng: 174.7687, postedById: "u2" },
  { id: "club-bbq", name: "Club barbecue", location: "Symonds St Lawn", emoji: "\u{1F356}", portionsLeft: 22, isActive: true, lat: -36.8531, lng: 174.7702, postedById: "u3" },
  { id: "leftover-pizza", name: "Leftover pizza", location: "Engineering 401", emoji: "\u{1F355}", portionsLeft: 0, isActive: false, lat: -36.8528, lng: 174.7669, postedById: "u4" },
];

/**
 * An in-memory EventRepository for tests. Three knobs cover the states the UI
 * has to handle: data, a rejected promise, and a promise that never settles.
 */
export class FakeEventRepository implements EventRepository {
  events: KaiEvent[];
  shouldThrow = false;
  neverAnswers = false;
  readonly postedEvents: NewKaiEvent[] = [];

  constructor(events: KaiEvent[] = sampleEvents) {
    this.events = [...events];
  }

  private guard<T>(value: T): Promise<T> {
    if (this.neverAnswers) return new Promise<T>(() => {});
    if (this.shouldThrow) {
      return Promise.reject(new Error("Could not reach the Kai server"));
    }
    return Promise.resolve(value);
  }

  fetchEvents(): Promise<KaiEvent[]> {
    return this.guard([...this.events]);
  }

  fetchEvent(id: string): Promise<KaiEvent> {
    const found = this.events.find((e) => e.id === id);
    if (!found) return Promise.reject(new Error(`No event with id ${id}`));
    return this.guard(found);
  }

  eatPortion(id: string): Promise<KaiEvent> {
    const found = this.events.find((e) => e.id === id);
    if (!found) return Promise.reject(new Error(`No event with id ${id}`));
    const portionsLeft = Math.max(0, found.portionsLeft - 1);
    const updated = { ...found, portionsLeft, isActive: portionsLeft > 0 };
    this.events = this.events.map((e) => (e.id === id ? updated : e));
    return this.guard(updated);
  }

  postEvent(input: NewKaiEvent): Promise<KaiEvent> {
    this.postedEvents.push(input);
    const created: KaiEvent = {
      ...input,
      id: `posted-${this.postedEvents.length}`,
      isActive: input.portionsLeft > 0,
    };
    this.events = [...this.events, created];
    return this.guard(created);
  }
}
