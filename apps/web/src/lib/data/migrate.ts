import { forgetFieldDB, SYNCED_TABLES, type FieldDB } from "./db";
import { live, nextStamp } from "./repo";
import type { Row } from "./types";

/**
 * "Your plants come with you" (M03): moves a guest's field into their new
 * account's field on this device.
 * - If the account has no field here yet, everything moves as it is.
 * - If it already has one, the guest's spaces, plants, jobs, harvests, pages
 *   and seeds join it; the guest's "you" becomes the account's owner.
 * Every moved row is stamped and marked dirty, ready for sync later.
 * The guest database is deleted only after the copy has committed.
 */
export async function moveGuestIntoAccount(guest: FieldDB, account: FieldDB, guestId: string): Promise<{ moved: number }> {
  const guestHousehold = (await live(guest.households))[0];
  if (!guestHousehold) {
    await forgetFieldDB(guestId);
    return { moved: 0 };
  }
  const target = (await live(account.households))[0];

  // Member ids to rewrite when joining an existing field: guest owner → account owner.
  const idMap = new Map<string, string>();
  if (target) {
    const guestOwner = (await live(guest.members)).find((m) => m.role === "owner");
    const accountOwner = (await live(account.members)).find((m) => m.role === "owner");
    if (guestOwner && accountOwner) idMap.set(guestOwner.id, accountOwner.id);
  }
  const mapId = (id: string | null) => (id ? (idMap.get(id) ?? id) : id);

  // Joining an existing field: a guest space of a kind the account already has merges into it,
  // and a rule job the account already has isn't added twice.
  const spaceMap = new Map<string, string>();
  const accountRuleKeys = new Set<string>();
  if (target) {
    const accountSpaces = await live(account.spaces);
    for (const g of await live(guest.spaces)) {
      const same = accountSpaces.find((a) => a.type === g.type);
      if (same) spaceMap.set(g.id, same.id);
    }
    for (const t of await account.tasks.toArray()) if (t.rule_key) accountRuleKeys.add(t.rule_key);
  }
  const mapSpace = (id: string | null) => (id ? (spaceMap.get(id) ?? id) : id);

  // Read everything from the guest first: a transaction on the account database
  // commits as soon as it waits on anything else.
  const rowsByTable = new Map<string, Row[]>();
  for (const name of SYNCED_TABLES) rowsByTable.set(name, (await guest[name].toArray()) as Row[]);
  const settings = target ? undefined : await guest.meta.get("settings");
  // Half-way through onboarding: the answers come along (unless the account's field is already set up).
  const draft = target?.onboarded_at ? undefined : await guest.meta.get("onboarding");

  let moved = 0;
  await account.transaction("rw", [...SYNCED_TABLES.map((t) => account[t]), account.meta], async () => {
    for (const name of SYNCED_TABLES) {
      const out: Row[] = [];
      for (const r of rowsByTable.get(name) ?? []) {
        if (target && name === "households") continue;
        if (target && name === "members" && idMap.has(r.id)) continue;
        if (name === "spaces" && spaceMap.has(r.id)) continue;
        if (name === "tasks" && (r as unknown as { rule_key: string | null }).rule_key && accountRuleKeys.has((r as unknown as { rule_key: string }).rule_key)) continue;
        const row: Record<string, unknown> = { ...r, household_id: target ? target.id : r.household_id, updated_at: nextStamp(r.updated_at), dirty: 1 };
        // People references follow the owner mapping.
        if ("picked_by" in row) row.picked_by = (row.picked_by as string[]).map((x) => mapId(x));
        for (const k of ["writer_id", "assignee_id", "done_by", "saved_by"]) if (k in row) row[k] = mapId(row[k] as string | null);
        if ("space_id" in row) row.space_id = mapSpace(row.space_id as string | null);
        if ("space_ids" in row) row.space_ids = (row.space_ids as string[]).map((x) => mapSpace(x));
        out.push(row as unknown as Row);
      }
      // Rows keep their ids (UUIDs), so a repeated move is harmless.
      await (account[name] as unknown as { bulkPut(rows: Row[]): Promise<unknown> }).bulkPut(out);
      moved += out.length;
    }
    if (settings) await account.meta.put(settings);
    if (draft) await account.meta.put(draft);
  });
  await forgetFieldDB(guestId);
  return { moved };
}
