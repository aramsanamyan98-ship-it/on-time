// Undoes a normalize-phone-numbers.mts --apply run using the snapshot it
// saved to scripts/backups/: restores each row's old guest_phone (and, for
// merged client notes, the old notes), then re-inserts the client_notes rows
// the merge deleted.
//
// A row is only reverted if it still holds exactly what the normalize run
// wrote. If anything has changed since (row edited or deleted, a deleted
// note's id or phone taken again), the whole revert is refused and nothing is
// written — it never overwrites newer data.
//
// Defaults to a dry run. Pass --apply to actually write.
//
// Usage:
//   node scripts/revert-phone-normalization.mts scripts/backups/<file>.json            # dry run
//   node scripts/revert-phone-normalization.mts scripts/backups/<file>.json --apply    # commit
import "dotenv/config";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import type { PhoneSnapshot, SnapshotChange } from "./phone-snapshot.mts";

const APPLY = process.argv.includes("--apply");
const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

type CurrentRow = { id: string; guest_phone: string; notes?: string | null };

async function main() {
  if (!file) throw new Error("Usage: node scripts/revert-phone-normalization.mts <snapshot.json> [--apply]");

  const snapshot = JSON.parse(readFileSync(file, "utf8")) as PhoneSnapshot;
  if (snapshot.version !== 1) throw new Error(`Unsupported snapshot version: ${snapshot.version}`);

  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  try {
    const target = describeDatabase();
    console.log(`Snapshot ${file}\n  taken ${snapshot.createdAt} from ${snapshot.database}`);
    if (snapshot.database !== target) {
      throw new Error(`Snapshot was taken from ${snapshot.database} but DIRECT_URL points at ${target} — refusing to revert.`);
    }

    if (APPLY) await client.query("BEGIN");

    const toRevert = await checkChanges(client, snapshot.changes);
    const toReinsert = await checkDeletedRows(client, snapshot, toRevert);

    if (APPLY) {
      for (const change of toRevert) {
        if ("oldNotes" in change) {
          await client.query(`UPDATE ${change.table} SET guest_phone = $1, notes = $2 WHERE id = $3`, [
            change.oldPhone,
            change.oldNotes,
            change.id,
          ]);
        } else {
          await client.query(`UPDATE ${change.table} SET guest_phone = $1 WHERE id = $2`, [change.oldPhone, change.id]);
        }
      }
      for (const { row } of toReinsert) {
        await client.query(
          `INSERT INTO client_notes (id, specialist_id, guest_phone, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::timestamp, $6::timestamp)`,
          [row.id, row.specialist_id, row.guest_phone, row.notes, row.created_at, row.updated_at],
        );
      }
      await client.query("COMMIT");
      console.log(`\nDone — reverted ${toRevert.length} row(s), re-inserted ${toReinsert.length} deleted note(s).`);
    } else {
      console.log("\nDry run only — no changes written. Re-run with --apply to commit.");
    }
  } catch (err) {
    if (APPLY) await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

// Returns the changes that need reverting; throws if any row has drifted.
async function checkChanges(client: Client, changes: SnapshotChange[]): Promise<SnapshotChange[]> {
  const current = new Map<string, CurrentRow>();
  for (const table of ["appointments", "client_notes"] as const) {
    const ids = changes.filter((c) => c.table === table).map((c) => c.id);
    if (ids.length === 0) continue;
    const columns = table === "client_notes" ? "id, guest_phone, notes" : "id, guest_phone";
    const { rows } = await client.query<CurrentRow>(`SELECT ${columns} FROM ${table} WHERE id = ANY($1)`, [ids]);
    for (const row of rows) current.set(`${table}:${row.id}`, row);
  }

  const toRevert: SnapshotChange[] = [];
  const problems: string[] = [];
  let alreadyReverted = 0;

  for (const change of changes) {
    const row = current.get(`${change.table}:${change.id}`);
    const hasNotes = "oldNotes" in change;
    if (!row) {
      problems.push(`${change.table} ${change.id}: row no longer exists`);
    } else if (row.guest_phone === change.newPhone && (!hasNotes || row.notes === change.newNotes)) {
      toRevert.push(change);
    } else if (row.guest_phone === change.oldPhone && (!hasNotes || row.notes === change.oldNotes)) {
      alreadyReverted++;
    } else {
      problems.push(`${change.table} ${change.id}: changed since the snapshot (guest_phone is now "${row.guest_phone}")`);
    }
  }

  console.log(`\nrows to restore: ${toRevert.length} of ${changes.length} (${alreadyReverted} already at their old value)`);
  for (const c of toRevert) {
    console.log(`  ${c.table} ${c.id}: ${c.newPhone} -> ${c.oldPhone}${"oldNotes" in c ? " (+ notes restored)" : ""}`);
  }
  if (problems.length > 0) {
    for (const p of problems) console.error(`  CONFLICT: ${p}`);
    throw new Error(`${problems.length} row(s) changed since the snapshot — nothing was reverted.`);
  }
  return toRevert;
}

// Returns the deleted rows that need re-inserting; throws if one can't be.
async function checkDeletedRows(client: Client, snapshot: PhoneSnapshot, toRevert: SnapshotChange[]) {
  const deleted = snapshot.deletedRows;
  if (deleted.length === 0) {
    console.log("\ndeleted notes to re-insert: 0");
    return [];
  }

  const { rows: existing } = await client.query<{ id: string; specialist_id: string; guest_phone: string }>(
    `SELECT id, specialist_id, guest_phone FROM client_notes
      WHERE id = ANY($1) OR (specialist_id, guest_phone) IN (SELECT * FROM unnest($2::text[], $3::text[]))`,
    [deleted.map((d) => d.row.id), deleted.map((d) => d.row.specialist_id), deleted.map((d) => d.row.guest_phone)],
  );
  // Rows being reverted in this same run will free up their normalized phone,
  // and will take back their old one — account for both.
  const revertingIds = new Set(toRevert.filter((c) => c.table === "client_notes").map((c) => c.id));

  const toReinsert: typeof deleted = [];
  const problems: string[] = [];
  let alreadyPresent = 0;

  for (const d of deleted) {
    const sameId = existing.find((e) => e.id === d.row.id);
    const samePhone = existing.find(
      (e) => e.id !== d.row.id && e.specialist_id === d.row.specialist_id && e.guest_phone === d.row.guest_phone && !revertingIds.has(e.id),
    );
    if (sameId && sameId.guest_phone === d.row.guest_phone) alreadyPresent++;
    else if (sameId) problems.push(`client_notes ${d.row.id}: id exists again with a different guest_phone`);
    else if (samePhone) problems.push(`client_notes ${d.row.id}: another note (${samePhone.id}) now uses "${d.row.guest_phone}"`);
    else toReinsert.push(d);
  }

  console.log(`\ndeleted notes to re-insert: ${toReinsert.length} of ${deleted.length} (${alreadyPresent} already present)`);
  for (const d of toReinsert) console.log(`  client_notes ${d.row.id} (${d.row.guest_phone})`);
  if (problems.length > 0) {
    for (const p of problems) console.error(`  CONFLICT: ${p}`);
    throw new Error(`${problems.length} deleted note(s) can't be re-inserted — nothing was reverted.`);
  }
  return toReinsert;
}

// host:port/dbname only — never the credentials.
function describeDatabase(): string {
  const url = new URL(process.env.DIRECT_URL!);
  return `${url.host}${url.pathname}`;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
