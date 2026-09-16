import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/types";

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

/** Terjemahkan pesan exception dari RPC claim_shot ke kode API. */
export function mapRpcError(message: string): {
  code: ApiErrorCode;
  status: number;
  text: string;
} {
  if (message.includes("FILM_HABIS")) {
    return {
      code: "FILM_HABIS",
      status: 409,
      text: "Rol film kamu sudah habis.",
    };
  }
  if (message.includes("TERLALU_CEPAT")) {
    return {
      code: "TERLALU_CEPAT",
      status: 429,
      text: "Sabar sebentar, beri jeda antar jepretan.",
    };
  }
  if (message.includes("TAMU_TIDAK_DITEMUKAN")) {
    return {
      code: "SESI_TIDAK_VALID",
      status: 401,
      text: "Sesi tidak ditemukan, silakan masukkan nama lagi.",
    };
  }
  return { code: "GAGAL", status: 500, text: "Terjadi kesalahan di server." };
}
