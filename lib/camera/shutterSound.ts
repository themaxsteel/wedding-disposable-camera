let audioContext: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Autoplay policy iOS/Android: AudioContext harus dibuat & di-resume
 * di dalam gesture pengguna, makanya ini dipanggil saat tombol "Buka Kamera" ditekan.
 */
export function unlockAudio() {
  if (audioContext) {
    void audioContext.resume();
    return;
  }
  const Ctor =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext ?? null;
  if (!Ctor) return;
  audioContext = new Ctor();
  void audioContext.resume();
}

/** Ka-chik: klik mekanis pendek, disintesis supaya tidak perlu file audio. */
export function playShutterSound() {
  if (!audioContext || audioContext.state !== "running") return;
  const ctx = audioContext;
  const now = ctx.currentTime;

  const click = (at: number, freq: number, gain: number, dur: number) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, at + dur);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  };

  click(now, 1800, 0.08, 0.035);
  click(now + 0.055, 900, 0.05, 0.05);
}

export function vibrateShutter() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(20);
  }
}
