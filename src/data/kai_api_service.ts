import type { EventRepository } from "./event_repository";
import {
  type KaiEvent,
  type NewKaiEvent,
  kaiEventFromJson,
  kaiEventsFromJson,
} from "./kai_event";

const DEFAULT_BASE_URL = "http://localhost:3734";

/**
 * `postEvent` takes flat arguments rather than an input object, and the
 * argument for the portion count is `portions` while the field returned is
 * `portionsLeft`. Check against the server's schema if either changes.
 */
export const POST_EVENT_MUTATION = `
  mutation PostEvent(
    $name: String!
    $location: String!
    $emoji: String!
    $portions: Int!
    $lat: Float!
    $lng: Float!
    $postedById: ID!
  ) {
    postEvent(
      name: $name
      location: $location
      emoji: $emoji
      portions: $portions
      lat: $lat
      lng: $lng
      postedById: $postedById
    ) {
      id
      name
      location
      emoji
      portionsLeft
      isActive
      lat
      lng
    }
  }
`;

/**
 * Talks to the Kai Events server. Reads use the REST routes; the single write
 * uses the GraphQL mutation, which is where `postEvent` lives.
 *
 * Base URL and fetch implementation are injectable so tests can supply their
 * own without a mocking library.
 */
export class KaiApiService implements EventRepository {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl?: string, fetchImpl: typeof fetch = globalThis.fetch) {
    const fromEnv =
      typeof import.meta !== "undefined"
        ? (import.meta.env?.VITE_KAI_SERVER as string | undefined)
        : undefined;
    this.baseUrl = (baseUrl ?? fromEnv ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  private async rest(path: string, init?: RequestInit): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      throw new Error(`Could not reach the Kai server (HTTP ${res.status})`);
    }
    return res.json();
  }

  private async graphql<T>(query: string, variables: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`Could not reach the Kai server (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    // GraphQL answers 200 even when the operation fails, so the errors array
    // has to be checked explicitly.
    if (body.errors?.length) throw new Error(body.errors[0].message);
    if (!body.data) throw new Error("The Kai server returned no data");
    return body.data;
  }

  async fetchEvents(signal?: AbortSignal): Promise<KaiEvent[]> {
    return kaiEventsFromJson(await this.rest("/events", { signal }));
  }

  async fetchEvent(id: string, signal?: AbortSignal): Promise<KaiEvent> {
    return kaiEventFromJson(await this.rest(`/events/${id}`, { signal }));
  }

  async eatPortion(id: string): Promise<KaiEvent> {
    return kaiEventFromJson(
      await this.rest(`/events/${id}/eat`, { method: "POST" }),
    );
  }

  async postEvent(input: NewKaiEvent): Promise<KaiEvent> {
    const data = await this.graphql<{ postEvent: Record<string, unknown> }>(
      POST_EVENT_MUTATION,
      {
        name: input.name,
        location: input.location,
        emoji: input.emoji,
        portions: input.portionsLeft,
        lat: input.lat,
        lng: input.lng,
        postedById: input.postedById,
      },
    );
    // The mutation response omits postedById, so carry across what was sent.
    return kaiEventFromJson({ ...data.postEvent, postedById: input.postedById });
  }
}
