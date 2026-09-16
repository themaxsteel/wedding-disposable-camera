"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  LinkSimpleIcon,
  UsersThreeIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/ssr";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { FieldError, Hint, Input, Label, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/States";
import type { EventMemberItem, MemberRole } from "@/lib/types";

const ROLE_LABEL: Record<MemberRole, { title: string; hint: string }> = {
  owner: { title: "Pengantin", hint: "Lihat foto, ubah pengaturan, undang orang." },
  editor: { title: "Pengelola (WO)", hint: "Lihat foto dan ubah pengaturan." },
  viewer: { title: "Lihat saja", hint: "Lihat dan unduh foto." },
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

  const [revokeTarget, setRevokeTarget] = useState<EventMemberItem | null>(null);
  const [revoking, setRevoking] = useState(false);

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
    setRevoking(true);
    try {
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
    } catch {
      setFormError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
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
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void invite(email.trim(), role);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Peran</Label>
            <Select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
            >
              {(Object.keys(ROLE_LABEL) as MemberRole[]).map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABEL[value].title}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Hint>{ROLE_LABEL[role].hint}</Hint>
        <FieldError>{formError}</FieldError>

        <Button
          type="submit"
          loading={busy}
          className="mt-4"
          icon={<LinkSimpleIcon className="size-4" weight="bold" aria-hidden />}
        >
          {busy ? "Membuat link" : "Buat link undangan"}
        </Button>
      </form>

      {result ? (
        <div className="space-y-4 rounded-xl border border-film/35 bg-film/[0.06] p-4">
          <p className="text-sm">
            {result.kind === "invite" ? "Undangan untuk " : "Link masuk untuk "}
            <span className="font-medium text-film">{result.email}</span>
          </p>
          <p className="rounded-lg border border-line bg-shell/70 p-3 font-mono text-xs break-all text-cream/75">
            {result.link}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={copyLink}
              icon={
                copied ? (
                  <CheckIcon className="size-4 text-ok" weight="bold" aria-hidden />
                ) : (
                  <CopyIcon className="size-4" aria-hidden />
                )
              }
            >
              {copied ? "Tersalin" : "Salin link"}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-xs font-semibold text-shell transition active:scale-[0.98]"
            >
              <WhatsappLogoIcon className="size-4" weight="fill" aria-hidden />
              Kirim lewat WhatsApp
            </a>
          </div>
          <p className="text-xs leading-relaxed text-cream/60">
            Penerima membuka link lalu menekan <b className="text-cream">Masuk ke galeri</b>.
            Link hanya bisa dipakai sekali, kedaluwarsa setelah beberapa waktu (bawaan
            Supabase: 1 jam), dan ikut hangus kalau kamu membuat link baru untuk email yang
            sama.
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-medium text-cream/70">Punya akses</h3>
        {loadError ? (
          <Notice tone="danger">{loadError}</Notice>
        ) : members === null ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-4 text-sm text-cream/60">
            <UsersThreeIcon className="size-5 shrink-0 text-film" weight="duotone" aria-hidden />
            Belum ada yang diundang. Undang pengantin supaya mereka bisa melihat fotonya.
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-shell/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.email ?? "Email tidak ditemukan"}
                    {member.isSelf ? (
                      <span className="font-normal text-cream/50"> (kamu)</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-cream/55">
                    {ROLE_LABEL[member.role].title}
                    {member.pending ? (
                      <span className="rounded-md border border-film/30 bg-film/[0.08] px-1.5 py-px text-film">
                        Belum membuka undangan
                      </span>
                    ) : null}
                  </p>
                </div>
                {!member.isSelf && member.email ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void invite(member.email!, member.role)}
                    >
                      Link baru
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRevokeTarget(member)}
                    >
                      Cabut
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={revokeTarget !== null}
        title="Cabut akses?"
        tone="danger"
        confirmLabel="Cabut akses"
        busy={revoking}
        onConfirm={() => revokeTarget && void revoke(revokeTarget)}
        onCancel={() => setRevokeTarget(null)}
      >
        {revokeTarget?.email ?? "Anggota ini"} tidak bisa lagi membuka galeri acara ini.
      </Dialog>
    </div>
  );
}
