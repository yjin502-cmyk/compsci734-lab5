import { describe, expect, it } from "vitest";
import { kaiEventFromJson, kaiEventsFromJson } from "./kai_event";

describe("kaiEventFromJson", () => {
  it("parses an event as the Kai server sends it", () => {
    const event = kaiEventFromJson({
      id: "free-samosas",
      name: "Free samosas",
      location: "OGGB Level 2",
      emoji: "\u{1F95F}",
      portionsLeft: 14,
      isActive: true,
      lat: -36.8523,
      lng: 174.7691,
      postedById: "u1",
    });
    expect(event.name).toBe("Free samosas");
    expect(event.portionsLeft).toBe(14);
    expect(event.postedById).toBe("u1");
  });

  it("trusts the server's isActive rather than recomputing it", () => {
    const event = kaiEventFromJson({
      id: "x", name: "n", location: "l", portionsLeft: 5, isActive: false,
    });
    expect(event.isActive).toBe(false);
  });

  it("derives isActive when the server omits it", () => {
    expect(kaiEventFromJson({ id: "x", name: "n", location: "l", portionsLeft: 0 }).isActive).toBe(false);
    expect(kaiEventFromJson({ id: "x", name: "n", location: "l", portionsLeft: 3 }).isActive).toBe(true);
  });

  it("throws on a payload that is not an object", () => {
    expect(() => kaiEventFromJson("not an event")).toThrow();
  });

  it("throws when the events payload is not an array", () => {
    expect(() => kaiEventsFromJson({ events: [] })).toThrow();
  });
});
