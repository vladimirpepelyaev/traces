// Lazy audio helper to play a warm meditative chime / pluck sound using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playWarmChime(frequency: number = 440) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const t = ctx.currentTime;
    
    // Create oscillator and gain node
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator(); // Subharmonic
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, t);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 0.5, t); // Octave below for warmth

    // Envelope
    gainNode.gain.setValueAtTime(0, t);
    // Pluck attack
    gainNode.gain.linearRampToValueAtTime(0.12, t + 0.05);
    // Smooth release
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);

    osc1.stop(t + 2.0);
    osc2.stop(t + 2.0);
  } catch (err) {
    console.warn('Audio context failed to start, this is expected in some sandboxed iframes', err);
  }
}

export function playSuccessChime() {
  // Arpeggio chord (C major: C -> E -> G -> C)
  const notes = [261.63, 329.63, 392.00, 523.25];
  notes.forEach((freq, index) => {
    setTimeout(() => {
      playWarmChime(freq);
    }, index * 120);
  });
}
