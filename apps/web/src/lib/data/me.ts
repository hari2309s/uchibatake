import type { Session } from "./session";
import type { Member } from "./types";

/** Who "I" am in the family: the member linked to this account, else the owner (guest, demo, a field of one). */
export function meOf<M extends Pick<Member, "role" | "user_id">>(members: M[] | undefined, session: Session): M | undefined {
  if (!members) return undefined;
  return (session.kind === "account" ? members.find((m) => m.user_id === session.id) : undefined) ?? members.find((m) => m.role === "owner");
}
