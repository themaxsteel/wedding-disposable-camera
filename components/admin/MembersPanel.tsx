"use client";
import { useCallback, useEffect, useState } from "react";
import type { EventMemberItem, MemberRole } from "@/lib/types";

const ROLE_LABEL: Record<MemberRole, { title: string; hint: string }> = {
  owner: { title: "Pengantin", hint: "lihat foto, ubah pengaturan, undang orang" },
  editor: { title: "Pengelola (WO)", hint: "lihat foto & ubah pengaturan" },
  viewer: { title: "Lihat saja", hint: "lihat & unduh foto" },
};

type MembersResult = { members: EventMemberItem[] } | { error: string };

async function fetchMembers(eventId: string): Promise<MembersResult> {
  try {
    const response = await fetch(`/api/admin/events/${eventId}/members`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { error: data?.message ?? "Gagal memuat anggota." };
    }
    return { members: data.members as EventMemberItem[] };
  } catch {
    return { error: "Koneksi bermasalah saat memuat anggota." };
  }
}

interface InviteResult {
  email: string;
  link: string;
  kind: "invite" | "magiclink";
}

interface Props {
  eventId: string;
  coupleNames: string;
}

export default function MembersPanel({ eventId, coupleNames }: Props) {
  const [members, setMembers] = useState<EventMemberItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("owner");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const applyResult = useCallback((result: MembersResult) => {
    if ("error" in result) {
      setLoadError(result.error);
    } else {
      setLoadError(null);
      setMembers(result.members);
    }
  }, []);

  const reload = useCallback(async () => {
    applyResult(await fetchMembers(eventId));
  }, [applyResult, eventId]);

  useEffect(() => {
    let cancelled = false;
    void fetchMembers(eventId).then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResult, eventId]);

  async function invite(targetEmail: string, targetRole: MemberRole) {
    setBusy(true);
    setFormError(null);
    setCopied(false);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: targetEmail, role: targetRole }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setFormError(data?.message ?? "Gagal membuat undangan.");
        return;
      }
      setResult({ email: data.email, link: data.link, kind: data.kind });
      setEmail("");
      await reload();
    } catch {
      setFormError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(member: EventMemberItem) {
    if (!window.confirm(`Cabut akses ${member.email ?? "anggota ini"} dari acara ini?`)) return;
    const response = await fetch(
      `/api/admin/events/${eventId}/members?userId=${encodeURIComponent(member.userId)}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setFormError(data?.message ?? "Gagal mencabut akses.");
      return;
    }
    await reload();
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const whatsappText = result
    ? `Halo! Ini link untuk masuk ke galeri kamera sekali pakai ${coupleNames}:\n\n${result.link}\n\nLink hanya bisa dipakai sekali. Setelah masuk, buat password supaya bisa login lagi kapan saja.`
    : "";

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void invite(email.trim(), role);
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@pengantin.com"
            className="w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-2.5 text-sm outline-none placeholder:text-cream/25 focus:border-film/60"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as MemberRole)}
            className="rounded-lg border border-cream/15 bg-shell-2 px-3 py-2.5 text-sm outline-none focus:border-film/60"
          >
            {(Object.keys(ROLE_LABEL) as MemberRole[]).map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value].title}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-cream/40">{ROLE_LABEL[role].hint}</p>

        {formError ? (
          <p role="alert" className="text-sm text-film">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-film px-4 py-2.5 text-sm font-semibold text-shell disabled:opacity-60"
        >
          {busy ? "Membuat link…" : "Buat link undangan"}
        </button>
      </form>

      {result ? (
        <div className="space-y-3 rounded-xl border border-film/40 bg-film/10 p-4">
          <p className="text-sm">
            {result.kind === "invite" ? "Undangan untuk " : "Link masuk untuk "}
            <span className="font-medium text-film">{result.email}</span>
          </p>
          <p className="break-all rounded-md bg-black/40 p-2 font-mono text-[11px] text-cream/70">
            {result.link}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg border border-cream/20 px-3 py-2 text-xs"
            >
              {copied ? "Tersalin ✓" : "Salin link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-shell"
            >
              Kirim lewat WhatsApp
            </a>
          </div>
          <p className="text-xs leading-relaxed text-cream/50">
            Link hanya bisa dipakai sekali dan kedaluwarsa setelah beberapa waktu
            (bawaan Supabase: 1 jam). Kalau sudah lewat, klik &ldquo;Link baru&rdquo; di
            daftar anggota.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-cream/10">
        {loadError ? (
          <p className="p-4 text-sm text-film">{loadError}</p>
        ) : members === null ? (
          <p className="p-4 font-mono text-xs text-cream/40">memuat…</p>
        ) : members.length === 0 ? (
          <p className="p-4 text-sm text-cream/50">
            Belum ada yang diundang. Undang pengantin supaya mereka bisa melihat fotonya.
          </p>
        ) : (
          <ul className="divide-y divide-cream/10">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {member.email ?? "(email tidak ditemukan)"}
                    {member.isSelf ? <span className="text-cream/40"> · kamu</span> : null}
                  </p>
                  <p className="text-xs text-cream/40">
                    {ROLE_LABEL[member.role].title}
                    {member.pending ? (
                      <span className="text-film"> · belum membuka undangan</span>
                    ) : null}
                  </p>
                </div>
                {!member.isSelf && member.email ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void invite(member.email!, member.role)}
                      className="rounded-lg border border-cream/15 px-3 py-1.5 text-xs text-cream/70 hover:border-film/50 disabled:opacity-40"
                    >
                      Link baru
                    </button>
                    <button
                      type="button"
                      onClick={() => void revoke(member)}
                      className="rounded-lg border border-cream/15 px-3 py-1.5 text-xs text-cream/50 hover:border-red-400/60 hover:text-red-300"
                    >
                      Cabut
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
