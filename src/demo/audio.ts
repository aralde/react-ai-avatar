export class AudioStreamer {
  public audioContext: AudioContext;
  public nextStartTime: number = 0;
  public analyser: AnalyserNode;
  private scheduledSources: AudioBufferSourceNode[] = [];

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
  }

  playBase64Audio(base64: string) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = bytes.buffer;
    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);
    
    this.scheduledSources.push(source);
    source.onended = () => {
      this.scheduledSources = this.scheduledSources.filter(s => s !== source);
    };

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  stop() {
    this.scheduledSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped or not started
      }
    });
    this.scheduledSources = [];
    this.nextStartTime = 0;
  }

  isPlaying() {
    return this.audioContext && this.audioContext.currentTime < this.nextStartTime;
  }

  close() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}

export class MicRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  public analyser: AnalyserNode | null = null;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    } catch (e) {
      console.error("Failed to create AudioContext directly in constructor:", e);
    }
  }

  async start(onData: (base64: string) => void) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    console.log("MicRecorder: AudioContext resumed and running. State:", this.audioContext.state);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.source.connect(this.analyser);
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
      }
      
      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = "";
      const chunkSize = 65535;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const subArray = uint8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, subArray as any as number[]);
      }
      const base64 = btoa(binary);
      onData(base64);
    };
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    this.analyser = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
