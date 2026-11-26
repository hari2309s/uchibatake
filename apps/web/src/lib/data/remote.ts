import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "./types";
import { RemoteError, type Remote, type RemoteRow } from "./sync";

/*
 * The Supabase side of sharing: the rows table and the functions in
 * supabase/migrations/20261126000000_uchi_sharing.sql.
 */

interface PgError {
  code?: string;
  message: string;
}

const OFFLINE = "You're offline.";

function classify(error: PgError): RemoteError {
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883") return new RemoteError(error.message, "schema");
  if (code === "PGRST301" || code === "PGRST303") return new RemoteError(error.message, "auth");
  // Row level security said no: this account isn't (or is no longer) in the field.
  if (code === "42501") return new RemoteError(error.message, "gone");
  if (!code && /fetch|network|load failed/i.test(error.message)) return new RemoteError(OFFLINE, "offline");
  return new RemoteError(error.message, "other");
}

const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export function supabaseRemote(sb: SupabaseClient): Remote {
  return {
    async push(household, rows) {
      if (offline()) throw new RemoteError(OFFLINE, "offline");
      const { error } = await sb.from("uchi_rows").upsert(
        rows.map((r) => ({ household_id: household, ...r })),
        { onConflict: "household_id,tbl,id" }
      );
      if (error) throw classify(error);
    },
    async pull(household, after, limit) {
      if (offline()) throw new RemoteError(OFFLINE, "offline");
      let q = sb.from("uchi_rows").select("tbl,id,data,updated_at,deleted,server_updated_at").eq("household_id", household).order("server_updated_at", { ascending: true }).order("id", { ascending: true }).limit(limit);
      if (after) q = after.id ? q.or(`server_updated_at.gt."${after.ts}",and(server_updated_at.eq."${after.ts}",id.gt."${after.id}")`) : q.gt("server_updated_at", after.ts);
      const { data, error } = await q;
      if (error) throw classify(error);
      return (data ?? []) as RemoteRow[];
    },
  };
}

async function rpc<T>(sb: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  if (offline()) throw new RemoteError(OFFLINE, "offline");
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw classify(error);
  return data as T;
}

export interface Membership {
  household: string;
  role: Role;
}

const one = (rows: { household_id: string; role: Role }[] | null): Membership | null => (rows?.[0] ? { household: rows[0].household_id, role: rows[0].role } : null);

/** Turns sharing on for this field, or returns the field this account already shares. */
export async function share(sb: SupabaseClient, householdId: string): Promise<Membership> {
  const m = one(await rpc(sb, "uchi_share", { p_id: householdId }));
  if (!m) throw new RemoteError("no membership", "other");
  return m;
}

export async function myField(sb: SupabaseClient): Promise<Membership | null> {
  return one(await rpc(sb, "uchi_my_field"));
}

export async function createInvite(sb: SupabaseClient, role: "editor" | "helper", memberId: string | null, name: string | null): Promise<string> {
  return rpc<string>(sb, "uchi_invite", { p_role: role, p_member_id: memberId ?? "", p_name: name ?? "" });
}

export interface InvitePreview {
  inviter: string | null;
  role: "editor" | "helper";
  member_id: string | null;
  place: string | null;
  members: { name: string; mark: unknown }[];
  spaces: { name: string; type: string; facing: string | null; crops: string[] }[];
  /** Already in this field / in another one. */
  already: boolean;
  elsewhere: boolean;
}

export async function previewInvite(sb: SupabaseClient, code: string): Promise<InvitePreview | null> {
  return rpc<InvitePreview | null>(sb, "uchi_invite_preview", { p_code: code });
}

export async function joinWith(sb: SupabaseClient, code: string): Promise<Membership & { memberId: string | null }> {
  const rows = await rpc<{ household_id: string; role: Role; member_id: string | null }[]>(sb, "uchi_join", { p_code: code });
  if (!rows?.[0]) throw new RemoteError("no membership", "other");
  return { household: rows[0].household_id, role: rows[0].role, memberId: rows[0].member_id };
}

export async function leaveField(sb: SupabaseClient): Promise<void> {
  await rpc(sb, "uchi_leave");
}

export async function deleteAccount(sb: SupabaseClient): Promise<void> {
  await rpc(sb, "uchi_delete_me");
}
