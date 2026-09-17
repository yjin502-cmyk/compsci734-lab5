import type { KaiEvent, NewKaiEvent } from "./kai_event";

/**
 * Everything the UI is allowed to ask for. Implemented by KaiApiService against
 * the real server, and by FakeEventRepository in tests.
 */
export interface EventRepository {
  fetchEvents(signal?: AbortSignal): Promise<KaiEvent[]>;
  fetchEvent(id: string, signal?: AbortSignal): Promise<KaiEvent>;
  eatPortion(id: string): Promise<KaiEvent>;
  postEvent(input: NewKaiEvent): Promise<KaiEvent>;
}
