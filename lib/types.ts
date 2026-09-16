export type FilmPreset = "classic" | "warm" | "bw";
export type PhotoStatus = "pending" | "ready" | "hidden";
export type Facing = "user" | "environment";

export interface EventRow {
  id: string;
  slug: string;
  couple_names: string;
  event_date: string | null;
  welcome_text: string | null;
  film_limit: number;
  film_preset: FilmPreset;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GuestRow {
  id: string;
  event_id: string;
  display_name: string;
  name_key: string;
  table_label: string | null;
  device_id: string;
  shots_used: number;
  last_shot_at: string | null;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  event_id: string;
  guest_id: string;
  storage_path: string;
  filtered_path: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  facing: Facing | null;
  source: "camera" | "upload";
  client_photo_id: string;
  taken_at: string | null;
  status: PhotoStatus;
  created_at: string;
}

export interface GuestSummaryRow {
  name_key: string;
  display_name: string;
  guest_ids: string[];
  table_labels: string[];
  photo_count: number;
  last_photo_at: string | null;
}

/** Info sesi yang dipakai layar kamera. */
export interface GuestSessionInfo {
  guestId: string;
  displayName: string;
  tableLabel: string | null;
  shotsUsed: number;
  filmLimit: number;
  remaining: number;
  filmPreset: FilmPreset;
  eventSlug: string;
  coupleNames: string;
}

/** Kode error yang dipahami client. */
export type ApiErrorCode =
  | "FILM_HABIS"
  | "TERLALU_CEPAT"
  | "SESI_TIDAK_VALID"
  | "EVENT_TUTUP"
  | "INPUT_TIDAK_VALID"
  | "GAGAL";

/** Satu kartu foto di dashboard admin. */
export interface AdminPhotoItem {
  id: string;
  guestName: string;
  tableLabel: string | null;
  caption: string | null;
  takenAt: string | null;
  createdAt: string;
  status: PhotoStatus;
  url: string | null;
  hasFilm: boolean;
}
