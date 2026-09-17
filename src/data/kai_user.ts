/**
 * The organisers who post events. Mirrors the server's seed users.
 * The field is `dept`, matching the GraphQL schema.
 */
export type KaiUser = {
  id: string;
  name: string;
  dept: string;
};

export const ORGANISERS: KaiUser[] = [
  { id: "u1", name: "Priya", dept: "Engineering" },
  { id: "u2", name: "Tama", dept: "Computer Science" },
  { id: "u3", name: "Mei", dept: "Science" },
  { id: "u4", name: "Josh", dept: "Business School" },
];

export const DEFAULT_ORGANISER_ID = "u1";
