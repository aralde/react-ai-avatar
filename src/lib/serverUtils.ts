export function generateMockAudioChunk(durationMs: number, phase: number, sampleRate: number = 24000): { base64: string; nextPhase: number } {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = Buffer.alloc(numSamples * 2);
  let currentPhase = phase;
  const baseFreq = 150;
  
  for (let i = 0; i < numSamples; i++) {
    const amplitudeMod = 0.4 + 0.6 * Math.sin(currentPhase * 0.02);
    const val1 = Math.sin(currentPhase);
    const val2 = 0.5 * Math.sin(currentPhase * 2);
    const val3 = 0.25 * Math.sin(currentPhase * 3);
    const sample = (val1 + val2 + val3) / 1.75 * amplitudeMod * 16384;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
    
    const deltaPhase = (2 * Math.PI * baseFreq) / sampleRate;
    currentPhase += deltaPhase;
  }
  
  return {
    base64: buffer.toString("base64"),
    nextPhase: currentPhase
  };
}

export function getAudioEnergy(base64Data: string): number {
  const buffer = Buffer.from(base64Data, "base64");
  const numSamples = buffer.length / 2;
  if (numSamples === 0) return 0;
  
  let sumSquares = 0;
  for (let i = 0; i < numSamples; i++) {
    const sample = buffer.readInt16LE(i * 2);
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / numSamples);
}
