type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

/** Android Chrome mendukung torch; iOS Safari tidak punya API ini sama sekali. */
export function trackSupportsTorch(track: MediaStreamTrack | null): boolean {
  if (!track) return false;
  if (typeof track.getCapabilities !== "function") return false;
  try {
    const capabilities = track.getCapabilities() as TorchCapabilities;
    return capabilities.torch === true;
  } catch {
    return false;
  }
}

export async function setTorch(track: MediaStreamTrack | null, on: boolean): Promise<boolean> {
  if (!trackSupportsTorch(track)) return false;
  try {
    await track!.applyConstraints({
      advanced: [{ torch: on } as unknown as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}
