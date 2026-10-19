// Synthesizes a pleasant railway chime using Web Audio API
export function playRailwayChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      { freq: 587.33, start: 0, duration: 0.35 },    // D5
      { freq: 440.00, start: 0.25, duration: 0.35 },  // A4
      { freq: 659.25, start: 0.5, duration: 0.55 },   // E5
      { freq: 880.00, start: 0.8, duration: 0.9 }     // A5
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);

      gain.gain.setValueAtTime(0, ctx.currentTime + note.start);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.start);
      osc.stop(ctx.currentTime + note.start + note.duration);
    });
  } catch (e) {
    console.error('Audio chime error:', e);
  }
}
