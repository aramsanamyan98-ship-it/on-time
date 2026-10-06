// Shape of the backup file normalize-phone-numbers.mts writes before
// --apply, and that revert-phone-normalization.mts restores from.

export type SnapshotChange = {
  table: "appointments" | "client_notes";
  id: string;
  oldPhone: string;
  newPhone: string;
  // Only on client_notes rows that absorbed colliding notes in a merge.
  oldNotes?: string | null;
  newNotes?: string | null;
};

// client_notes rows deleted as merge losers, stored whole so they can be
// re-inserted. Timestamps are Postgres text, not ISO, for an exact round-trip.
export type SnapshotDeletedRow = {
  table: "client_notes";
  row: {
    id: string;
    specialist_id: string;
    guest_phone: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type PhoneSnapshot = {
  version: 1;
  createdAt: string;
  database: string;
  changes: SnapshotChange[];
  deletedRows: SnapshotDeletedRow[];
};
