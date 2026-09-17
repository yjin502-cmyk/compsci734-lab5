/**
 * A stand-in for the Kai Events server, for running the dashboard without
 * Firebase credentials.
 *
 * It serves the same REST routes as example_05 plus the `postEvent` and
 * `deleteEvent` mutations from example_06, held in memory, with no dependencies
 * beyond Node itself.
 *
 * Limitations: state resets when the process restarts, nothing is sent to FCM
 * (the broadcast is logged instead), and the GraphQL endpoint matches
 * operations by name rather than parsing the query, which is enough for the
 * four operations the dashboard uses and nothing more.
 *
 * Run it with:  npm run kai-server
 */
import { createServer } from "node:http";

const PORT = 3734;
const LATENCY_MS = 300; // so the loading skeleton is actually visible
const DECAY_MS = 15_000;

const SEED = [
  { id: "free-samosas",   name: "Free samosas",     location: "OGGB Level 2",     emoji: "\u{1F95F}", portionsLeft: 14, lat: -36.8523, lng: 174.7691, postedById: "u1" },
  { id: "sausage-sizzle", name: "Sausage sizzle",   location: "The Quad",         emoji: "\u{1F32D}", portionsLeft: 38, lat: -36.8519, lng: 174.7687, postedById: "u2" },
  { id: "club-bbq",       name: "Club barbecue",    location: "Symonds St Lawn",  emoji: "\u{1F356}", portionsLeft: 22, lat: -36.8531, lng: 174.7702, postedById: "u3" },
  { id: "leftover-pizza", name: "Leftover pizza",   location: "Engineering 401",  emoji: "\u{1F355}", portionsLeft: 6,  lat: -36.8528, lng: 174.7669, postedById: "u4" },
  { id: "bake-sale",      name: "Bake sale extras", location: "Kate Edger",       emoji: "\u{1F9C1}", portionsLeft: 11, lat: -36.8516, lng: 174.7683, postedById: "u1" },
  { id: "conference-tea", name: "Conference tea",   location: "Owen G Glenn 260", emoji: "\u{2615}",  portionsLeft: 30, lat: -36.8525, lng: 174.7694, postedById: "u2" },
];

// `dept`, not `department` -- that is what the GraphQL schema calls it.
const USERS = [
  { id: "u1", name: "Priya", dept: "Engineering" },
  { id: "u2", name: "Tama",  dept: "Computer Science" },
  { id: "u3", name: "Mei",   dept: "Science" },
  { id: "u4", name: "Josh",   dept: "Business School" },
];

let events = SEED.map((e) => ({ ...e }));

const withIsActive = (e) => ({ ...e, isActive: e.portionsLeft > 0 });
const publicEvents = () => events.map(withIsActive);
const findEvent = (id) => events.find((e) => e.id === id);

/** The food runs out: every active event loses 0-2 portions every 15 seconds. */
setInterval(() => {
  let changed = false;
  for (const event of events) {
    if (event.portionsLeft <= 0) continue;
    const eaten = Math.floor(Math.random() * 3);
    if (eaten === 0) continue;
    event.portionsLeft = Math.max(0, event.portionsLeft - eaten);
    changed = true;
  }
  if (changed) {
    console.log(
      "  decay:",
      events.map((e) => `${e.id}=${e.portionsLeft}`).join("  "),
    );
  }
}, DECAY_MS);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * Creates an event and logs the FCM broadcast the real server would send.
 *
 * `postedById` arrives from the client and is recorded as sent; there is no
 * sign-in to check it against.
 */
function createEvent(input) {
  const slug =
    String(input.name ?? "event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "event";
  const id = events.some((e) => e.id === slug) ? `${slug}-${Date.now()}` : slug;

  const created = {
    id,
    name: String(input.name ?? "Untitled"),
    location: String(input.location ?? "Somewhere on campus"),
    emoji: String(input.emoji ?? "\u{1F37D}"),
    // The mutation argument is `portions`; the field is `portionsLeft`.
    portionsLeft: Number(input.portions ?? input.portionsLeft ?? 0),
    lat: Number(input.lat ?? -36.8523),
    lng: Number(input.lng ?? 174.7691),
    postedById: String(input.postedById ?? "u1"),
  };
  events = [...events, created];

  const poster = USERS.find((u) => u.id === created.postedById);
  console.log(`\n  postEvent: ${created.name} @ ${created.location}`);
  console.log(`  posted by: ${poster ? `${poster.name} (${poster.dept})` : created.postedById} (unverified)`);
  console.log(`  would broadcast to FCM topic "kai-events"\n`);
  return withIsActive(created);
}

async function handleGraphql(req, res) {
  const { query = "", variables = {} } = await readBody(req);

  // Operation matched by name, not parsed. See the note at the top of the file.
  if (query.includes("postEvent")) {
    // The mutation takes flat arguments, so the variables are the input.
    // `variables.input` is also accepted, for a schema that wraps them.
    const input = variables.input ?? variables;
    return send(res, 200, { data: { postEvent: createEvent(input) } });
  }
  if (query.includes("eatPortion")) {
    const event = findEvent(variables.id);
    if (!event) {
      return send(res, 200, { errors: [{ message: "not found" }] });
    }
    event.portionsLeft = Math.max(0, event.portionsLeft - 1);
    return send(res, 200, { data: { eatPortion: withIsActive(event) } });
  }
  if (query.includes("deleteEvent")) {
    const index = events.findIndex((e) => e.id === variables.id);
    if (index === -1) return send(res, 200, { data: { deleteEvent: null } });
    const [removed] = events.splice(index, 1);
    console.log(`  delete: ${removed.name}`);
    return send(res, 200, { data: { deleteEvent: removed.id } });
  }
  if (/\bevent\s*\(/.test(query)) {
    const event = findEvent(variables.id);
    return event
      ? send(res, 200, { data: { event: withIsActive(event) } })
      : send(res, 200, { errors: [{ message: "not found" }] });
  }
  if (query.includes("events")) {
    let list = publicEvents();
    if (variables.activeOnly === true) list = list.filter((e) => e.isActive);
    // The `postedBy` child resolver: attached always, ignored if not selected.
    list = list.map((e) => ({
      ...e,
      postedBy: USERS.find((u) => u.id === e.postedById) ?? null,
    }));
    return send(res, 200, { data: { events: list } });
  }
  send(res, 200, { errors: [{ message: "Unsupported operation in the dev server" }] });
}

const server = createServer(async (req, res) => {
  // CORS wide open, as the real server is.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "POST" && path === "/graphql") return handleGraphql(req, res);

  if (method === "GET" && path === "/health") return send(res, 200, { ok: true });

  if (method === "GET" && path === "/events") {
    await sleep(LATENCY_MS);
    return send(res, 200, publicEvents());
  }

  if (method === "GET" && path === "/events-with-users") {
    await sleep(LATENCY_MS);
    return send(
      res,
      200,
      publicEvents().map((e) => ({
        ...e,
        postedBy: USERS.find((u) => u.id === e.postedById) ?? null,
      })),
    );
  }

  let match = path.match(/^\/events\/([^/]+)$/);
  if (method === "GET" && match) {
    const event = findEvent(match[1]);
    return event
      ? send(res, 200, withIsActive(event))
      : send(res, 404, { error: "not found" });
  }

  match = path.match(/^\/events\/([^/]+)\/eat$/);
  if (method === "POST" && match) {
    const event = findEvent(match[1]);
    if (!event) return send(res, 404, { error: "not found" });
    event.portionsLeft = Math.max(0, event.portionsLeft - 1);
    return send(res, 200, withIsActive(event));
  }

  match = path.match(/^\/events\/([^/]+)$/);
  if (method === "DELETE" && match) {
    const index = events.findIndex((e) => e.id === match[1]);
    if (index === -1) return send(res, 404, { error: "not found" });
    const [removed] = events.splice(index, 1);
    console.log(`  delete: ${removed.name}`);
    return send(res, 200, { ok: true, id: removed.id });
  }

  if (method === "GET" && path === "/users") return send(res, 200, USERS);

  match = path.match(/^\/users\/([^/]+)$/);
  if (method === "GET" && match) {
    const user = USERS.find((u) => u.id === match[1]);
    return user ? send(res, 200, user) : send(res, 404, { error: "not found" });
  }

  // POST /events, for teams who prefer a REST write path to the mutation.
  if (method === "POST" && path === "/events") {
    return send(res, 201, createEvent(await readBody(req)));
  }

  if (method === "POST" && path === "/reset") {
    events = SEED.map((e) => ({ ...e }));
    console.log("  reset: back to the six seed events");
    return send(res, 200, { ok: true });
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`
  Kai Events dev server (no Firebase, in memory)
  http://localhost:${PORT}

    GET  /events              the feed, with ${LATENCY_MS}ms of latency
    GET  /events/:id          one event
    POST /events/:id/eat      take a portion
    DELETE /events/:id        take a listing down
    POST /events              create (REST)
    POST /graphql             events, event, eatPortion, postEvent, deleteEvent
    POST /reset               back to the seed data
    GET  /users               the four organisers
    GET  /health

  Portions decay every ${DECAY_MS / 1000}s. Ctrl-C to stop.
`);
});
