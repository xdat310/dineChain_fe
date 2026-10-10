// A short two-note chime made with Web Audio (no sound file). Browsers only let a page make sound after the person
// has touched it once, so the audio context is unlocked on the first tap or key press anywhere.
let ctx: AudioContext | null = null

function context() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

export function unlockSound() {
  const unlock = () => {
    context()?.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export function soundReady() {
  return ctx?.state === 'running'
}

export function chime(times = 1) {
  const c = context()
  if (!c || c.state !== 'running') return
  for (let r = 0; r < times; r++) {
    ;[[880, 0], [1320, 0.16]].forEach(([freq, at]) => {
      const start = c.currentTime + r * 0.6 + at
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
      osc.connect(gain).connect(c.destination)
      osc.start(start)
      osc.stop(start + 0.5)
    })
  }
}
