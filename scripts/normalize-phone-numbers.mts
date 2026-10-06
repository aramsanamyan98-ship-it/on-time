// One-time data migration: canonicalize every stored guest phone number to
// E.164 (+374XXXXXXXX) using the same normalizePhone() the app now applies
// at write-time (src/lib/phone.ts), so this script and the app can never
// drift apart on what "normalized" means.
//
// Defaults to a dry run that only prints what it would do. Pass --apply to
// actually write. Safe to run more than once (normalizing an already-
// canonical number is a no-op).
//
// Before --apply writes anything, it saves a snapshot of every row it's
// about to touch to scripts/backups/ (git-ignored — it contains guest phone
// numbers). scripts/revert-phone-normalization.mts restores from it.
//
// Usage:
//   node scripts/normalize-phone-numbers.mts            # dry run
//   node scripts/normalize-phone-numbers.mts --apply    # commit changes
//
// Note: running this directly with `node` (rather than through Next's
// bundler) prints a harmless Node warning about src/lib/phone.ts's module
// type — it still executes correctly.
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { normalizePhone } from "../src/lib/phone.ts";
import type { PhoneSnapshot, SnapshotChange, SnapshotDeletedRow } from "./phone-snapshot.mts";

const APPLY = process.argv.includes("--apply");
const BACKUP_DIR = new URL("./backups/", import.meta.url);

type AppointmentRow = { id: string; guest_phone: string };
// created_at/updated_at are also read as text so a deleted row can be
// re-inserted byte-for-byte; a JS Date round-trip through these
// `timestamp without time zone` columns would shift by the local UTC offset.
type ClientNoteRow = {
  id: string;
  specialist_id: string;
  guest_phone: string;
  notes: string | null;
  created_at_text: string;
  updated_at: Date;
  updated_at_text: string;
};

type AppointmentsPlan = { toUpdate: { id: string; oldPhone: string; phone: string }[] };
type ClientNotesPlan = {
  toUpdate: { id: string; oldPhone: string; phone: string }[];
  losers: ClientNoteRow[];
  merges: { winner: ClientNoteRow; loserIds: string[]; mergedNotes: string | null }[];
};

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  try {
    if (APPLY) await client.query("BEGIN");

    const appointments = await planAppointments(client);
    const clientNotes = await planClientNotes(client);

    if (APPLY) {
      // Written before the first UPDATE/DELETE; if it can't be written, the
      // throw rolls back and nothing changes.
      const backupPath = writeSnapshot(appointments, clientNotes);
      console.log(`\nSnapshot saved to ${backupPath}`);

      await applyAppointments(client, appointments);
      await applyClientNotes(client, clientNotes);
      await client.query("COMMIT");
      console.log("\nDone — changes committed.");
      console.log(`To undo: node scripts/revert-phone-normalization.mts "${backupPath}"`);
    } else {
      console.log("\nDry run only — no changes written. Re-run with --apply to commit.");
    }
  } catch (err) {
    if (APPLY) await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

async function planAppointments(client: Client): Promise<AppointmentsPlan> {
  const { rows } = await client.query<AppointmentRow>(`SELECT id, guest_phone FROM appointments`);

  let unchanged = 0;
  const toUpdate: AppointmentsPlan["toUpdate"] = [];
  const invalid: AppointmentRow[] = [];

  for (const row of rows) {
    const result = normalizePhone(row.guest_phone);
    if ("error" in result) {
      invalid.push(row);
    } else if (result.phone === row.guest_phone) {
      unchanged++;
    } else {
      toUpdate.push({ id: row.id, oldPhone: row.guest_phone, phone: result.phone });
    }
  }

  console.log(`\nappointments.guest_phone: ${rows.length} total, ${unchanged} already canonical, ${toUpdate.length} to normalize, ${invalid.length} invalid`);
  for (const row of toUpdate) console.log(`  ${row.id}: -> ${row.phone}`);
  for (const row of invalid) console.warn(`  WARNING: ${row.id} has unparseable guest_phone "${row.guest_phone}" — left untouched, needs manual review`);

  return { toUpdate };
}

async function applyAppointments(client: Client, plan: AppointmentsPlan) {
  for (const row of plan.toUpdate) {
    await client.query(`UPDATE appointments SET guest_phone = $1 WHERE id = $2`, [row.phone, row.id]);
  }
}

async function planClientNotes(client: Client): Promise<ClientNotesPlan> {
  const { rows } = await client.query<ClientNoteRow>(
    `SELECT id, specialist_id, guest_phone, notes,
            created_at::text AS created_at_text, updated_at, updated_at::text AS updated_at_text
       FROM client_notes`,
  );

  const invalid: ClientNoteRow[] = [];
  // Group by (specialist_id, normalized phone) to find collisions: two
  // different raw guest_phone strings that canonicalize to the same client.
  const groups = new Map<string, ClientNoteRow[]>();

  for (const row of rows) {
    const result = normalizePhone(row.guest_phone);
    if ("error" in result) {
      invalid.push(row);
      continue;
    }
    const key = `${row.specialist_id}::${result.phone}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const toUpdate: ClientNotesPlan["toUpdate"] = [];
  const losers: ClientNoteRow[] = [];
  const merges: ClientNotesPlan["merges"] = [];
  let unchanged = 0;

  for (const [key, group] of groups) {
    const normalizedPhone = key.split("::")[1];
    if (group.length === 1) {
      const [row] = group;
      if (row.guest_phone === normalizedPhone) unchanged++;
      else toUpdate.push({ id: row.id, oldPhone: row.guest_phone, phone: normalizedPhone });
      continue;
    }

    // Collision: keep the most recently updated note, fold the rest in.
    const sorted = [...group].sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    const [winner, ...groupLosers] = sorted;
    const loserNotes = groupLosers.map((r) => r.notes).filter((n): n is string => !!n && n.trim().length > 0);
    const mergedNotes =
      loserNotes.length === 0
        ? winner.notes
        : [winner.notes, ...loserNotes].filter(Boolean).join("\n---\n") || null;

    toUpdate.push({ id: winner.id, oldPhone: winner.guest_phone, phone: normalizedPhone });
    losers.push(...groupLosers);
    merges.push({ winner, loserIds: groupLosers.map((r) => r.id), mergedNotes });
  }

  console.log(
    `\nclient_notes.guest_phone: ${rows.length} total, ${unchanged} already canonical, ${toUpdate.length - merges.length} to normalize, ${merges.length} collision(s) to merge, ${invalid.length} invalid`,
  );
  for (const merge of merges) {
    console.log(`  MERGE: ${merge.winner.id} absorbs [${merge.loserIds.join(", ")}] (notes concatenated)`);
  }
  for (const row of invalid) {
    console.warn(`  WARNING: ${row.id} has unparseable guest_phone "${row.guest_phone}" — left untouched, needs manual review`);
  }

  return { toUpdate, losers, merges };
}

async function applyClientNotes(client: Client, plan: ClientNotesPlan) {
  for (const merge of plan.merges) {
    await client.query(`UPDATE client_notes SET notes = $1 WHERE id = $2`, [merge.mergedNotes, merge.winner.id]);
  }
  if (plan.losers.length > 0) {
    await client.query(`DELETE FROM client_notes WHERE id = ANY($1)`, [plan.losers.map((r) => r.id)]);
  }
  for (const row of plan.toUpdate) {
    await client.query(`UPDATE client_notes SET guest_phone = $1 WHERE id = $2`, [row.phone, row.id]);
  }
}

function writeSnapshot(appointments: AppointmentsPlan, clientNotes: ClientNotesPlan): string {
  const mergesByWinner = new Map(clientNotes.merges.map((m) => [m.winner.id, m]));

  const changes: SnapshotChange[] = [
    ...appointments.toUpdate.map((r) => ({ table: "appointments" as const, id: r.id, oldPhone: r.oldPhone, newPhone: r.phone })),
    ...clientNotes.toUpdate.map((r): SnapshotChange => {
      const merge = mergesByWinner.get(r.id);
      const base = { table: "client_notes" as const, id: r.id, oldPhone: r.oldPhone, newPhone: r.phone };
      return merge ? { ...base, oldNotes: merge.winner.notes, newNotes: merge.mergedNotes } : base;
    }),
  ];
  const deletedRows: SnapshotDeletedRow[] = clientNotes.losers.map((r) => ({
    table: "client_notes",
    row: {
      id: r.id,
      specialist_id: r.specialist_id,
      guest_phone: r.guest_phone,
      notes: r.notes,
      created_at: r.created_at_text,
      updated_at: r.updated_at_text,
    },
  }));

  const createdAt = new Date().toISOString();
  const snapshot: PhoneSnapshot = { version: 1, createdAt, database: describeDatabase(), changes, deletedRows };

  mkdirSync(BACKUP_DIR, { recursive: true });
  const file = new URL(`normalize-phones-${createdAt.replace(/[:.]/g, "-")}.json`, BACKUP_DIR);
  // "wx": never overwrite an existing snapshot.
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
  return fileURLToPath(file);
}

// host:port/dbname only — never the credentials.
function describeDatabase(): string {
  const url = new URL(process.env.DIRECT_URL!);
  return `${url.host}${url.pathname}`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
