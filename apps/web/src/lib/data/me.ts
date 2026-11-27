import type { Session } from "./session";
import type { Member } from "./types";

/** Who "I" am in the family: the member linked to this account, else the owner (guest, demo, a field of one). */
export function meOf<M extends Pick<Member, "role" | "user_id">>(members: M[] | undefined, session: Session): M | undefined {
  if (!members) return undefined;
  return (session.kind === "account" ? members.find((m) => m.user_id === session.id) : undefined) ?? members.find((m) => m.role === "owner");
}

/**
 * Who may look after the family list: owners and editors. In a shared field
 * (someone is linked to an account), only the member linked to this account
 * counts as "me" — no falling back to the owner while it syncs.
 */
export function canManageFamily<M extends Pick<Member, "role" | "user_id">>(members: M[] | undefined, session: Session): boolean {
  if (!members) return false;
  const shared = session.kind === "account" && members.some((m) => m.user_id);
  const me = shared ? members.find((m) => m.user_id === session.id) : meOf(members, session);
  return me?.role === "owner" || me?.role === "editor";
}
