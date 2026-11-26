import type { ClimateType, GrowClimate, SeasonTable } from "@uchibatake/content";

/*
 * Rows in the on-device database. Every synced row carries the same
 * bookkeeping so last-write-wins sync can be added later without a migration:
 *   updated_at  edit time (ms), always moving forward on this device
 *   deleted_at  soft delete (ms) or null
 *   dirty       1 = changed here and not yet pushed (IndexedDB can't index booleans)
 */
export interface Row {
  id: string;
  household_id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  dirty: 0 | 1;
}

/** Fields the repo fills in; callers never pass them. */
export type Bookkeeping = keyof Row;
export type New<T extends Row> = Omit<T, Bookkeeping> & { id?: string };

export type Role = "owner" | "editor" | "helper";
export type KidMark = "leaf" | "bean" | "sprout";
export type MemberMark = { kind: "initial"; letter: string } | { kind: KidMark };

export interface Household extends Row {
  name: string;
  /** Neighbourhood or town shown in the header ("De Pijp"). */
  place: string;
  /** Street address the family typed (shown on Spaces). Stays on the device. */
  address: string | null;
  /** Rough area for weather, rounded to about 1 km. */
  area: { lat: number; lon: number } | null;
  climate: ClimateType | null;
  /** Shipped season table id ("amsterdam"), or null to compute from normals. */
  season_table: string | null;
  /** Seasons computed from this place's normals, when there's no shipped table. */
  seasons?: SeasonTable | null;
  /** Typical frost dates and monthly temperatures: crops' dates are worked out from them. */
  grow?: GrowClimate | null;
  /** ISO 3166 alpha-2 country ("NL"): which crops are popular here. */
  country?: string | null;
  /** "YYYY-MM-DD" the family started. */
  since: string;
  /** From onboarding (A 05, A 06). */
  people_count: number | null;
  likes: string[];
  diet: string[];
  experience: "never" | "some" | "veg" | "green-thumb" | null;
  /** When onboarding finished (ms); null while it's still going. */
  onboarded_at: number | null;
}

export interface Member extends Row {
  name: string;
  role: Role;
  kind: "adult" | "child";
  mark: MemberMark;
  age: number | null;
  /** Their part in the field ("Seed keeper", "snail patrol"). */
  note: string | null;
  /** The signed-in account this member is, once accounts exist. */
  user_id: string | null;
  sort: number;
}

export type SpaceType = "balcony" | "windowsill" | "rack" | "backyard" | "greenhouse";
export type Facing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type Sun = "full" | "part" | "shade";
export type Container = "pots" | "troughs" | "grow-bags" | "rail-planters";

export interface Space extends Row {
  name: string;
  type: SpaceType;
  facing: Facing | null;
  /** The three-times sun check (10, 13, 16 o'clock): true = sun. */
  sun_checks: { h10: boolean | null; h13: boolean | null; h16: boolean | null } | null;
  sun: Sun | null;
  size: "s" | "m" | "l" | null;
  /** "About 3 m by 1.2 m". */
  size_note: string | null;
  containers: Container[];
  /** "Open ground · clay soil". */
  ground: string | null;
  /** Pot positions on the ink-line plan, 0–1 across and down. */
  plan: { planting_id: string; x: number; y: number }[];
  rack: {
    shelves: number;
    medium: "water" | "soil";
    light: "yes" | "no" | "not-yet";
    light_on: string | null;
    light_off: string | null;
    /** What the family last saw, 0–1 (water-grown racks). No sensors: only what they record. */
    tank?: number | null;
    /** "YYYY-MM-DD" last fed, and how many days between feeds (from their feed's label). */
    fed_on?: string | null;
    feed_every?: number | null;
    /** The last pH they measured, if they do. */
    ph?: number | null;
  } | null;
  greenhouse: { heated: "no" | "frost" | "warm"; vents: ("roof" | "side")[] } | null;
  sort: number;
}

export type StartMethod = "seed" | "plant" | "scraps" | "existing";

export interface Planting extends Row {
  /** Catalogue crop, or null for the family's own plant (M08). */
  crop_id: string | null;
  own_name: string | null;
  /** "Kale by the door". */
  nickname: string | null;
  space_id: string;
  start_method: StartMethod;
  started_on: string;
  /** "planned": chosen for a later day; it becomes "growing" when its start job is ticked. */
  status: "planned" | "growing" | "ended" | "lost";
  ended_on: string | null;
  lost_cause: "cold" | "dry" | "pests" | "unsure" | null;
  /** "four young plants from the market". */
  quantity_note: string | null;
}

export interface Task extends Row {
  title: string;
  /** The short line under the title on Home. */
  detail: string | null;
  how: string | null;
  /** "Why today": every generated task explains itself. */
  why: string | null;
  space_id: string | null;
  planting_ids: string[];
  due_on: string;
  /** "19:00" when the time matters. */
  due_time: string | null;
  slot: "morning" | "evening" | null;
  assignee_id: string | null;
  done_at: number | null;
  done_by: string | null;
  snoozed_until: string | null;
  skipped_at: number | null;
  source: "rule" | "weather" | "user";
  /** Stable key for rule-made tasks, so a rule never adds the same job twice. */
  rule_key: string | null;
}

export interface Harvest extends Row {
  planting_id: string | null;
  crop_id: string | null;
  amount: number;
  unit: "count" | "g";
  /** Everyday measure ("a big colander"). */
  measure: string | null;
  picked_by: string[];
  picked_on: string;
  note: string | null;
  photo_ids: string[];
}

export type SealKind = "済" | "収" | "種" | "芽";

export interface JournalEntry extends Row {
  writer_id: string;
  written_on: string;
  title: string | null;
  text: string;
  seal: SealKind | null;
  planting_ids: string[];
  space_ids: string[];
  photo_ids: string[];
  kind: "note" | "learned";
}

export interface Seed extends Row {
  crop_id: string | null;
  name: string;
  variety: string | null;
  source: "bought" | "saved";
  saved_by: string | null;
  /** "From the windowsill", "The fattest pods". */
  from_note: string | null;
  year: number;
  good_until: number | null;
}

export interface Reminder extends Row {
  title: string;
  on: string;
  time: string | null;
  repeat: "none" | "daily";
  task_id: string | null;
  planting_id: string | null;
  done_at: number | null;
}

export interface Notice extends Row {
  kind: "frost" | "heat" | "rain";
  for_date: string;
  low: number | null;
  high: number | null;
  checklist: { id: string; text: string; done_at: number | null; done_by: string | null }[];
  remind_at: string | null;
}

export interface Photo extends Row {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  owner_table: "harvests" | "journal_entries" | "plantings" | "spaces";
  owner_id: string;
}

/** Device settings (not synced). */
export interface Settings {
  units: "C" | "F";
  /** Which line leads on Home: the local season or Japan's microseason. */
  seasonLead: "local" | "japan";
  quietHours: { from: string; to: string };
  dailyRound: string | null;
  frostWarnings: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  units: "C",
  seasonLead: "local",
  quietHours: { from: "21:00", to: "07:00" },
  dailyRound: "08:00",
  frostWarnings: true,
};
