/**
 * Realistic Mock Web Audio API implementation for headless Node test environments.
 * Simulates AudioContext, OscillatorNode, GainNode, BiquadFilterNode, and AudioBufferSourceNode.
 */

export class MockAudioParam {
  public value: number = 1;
  public events: Array<{ type: string; value?: number; target?: number; time: number; timeConstant?: number }> = [];

  constructor(initialValue: number = 1) {
    this.value = initialValue;
  }

  public setValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ type: 'setValueAtTime', value, time });
    return this;
  }

  public linearRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ type: 'linearRampToValueAtTime', value, time });
    return this;
  }

  public exponentialRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time });
    return this;
  }

  public setTargetAtTime(target: number, time: number, timeConstant: number): this {
    this.value = target;
    this.events.push({ type: 'setTargetAtTime', target, time, timeConstant });
    return this;
  }

  public cancelScheduledValues(time: number): this {
    this.events.push({ type: 'cancelScheduledValues', time });
    return this;
  }
}

export class MockAudioNode {
  public context: MockAudioContext;
  public connections: MockAudioNode[] = [];

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  public connect(destination: MockAudioNode): MockAudioNode {
    this.connections.push(destination);
    return destination;
  }

  public disconnect(): void {
    this.connections = [];
  }
}

export class MockGainNode extends MockAudioNode {
  public gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.gain = new MockAudioParam(1);
  }
}

export class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency: MockAudioParam;
  public started: boolean = false;
  public stopped: boolean = false;
  public startTime: number = 0;
  public stopTime: number = 0;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440);
  }

  public start(time: number = 0): void {
    this.started = true;
    this.startTime = time;
  }

  public stop(time: number = 0): void {
    this.stopped = true;
    this.stopTime = time;
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency: MockAudioParam;
  public Q: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
  }
}

export class MockAudioBuffer {
  public numberOfChannels: number;
  public length: number;
  public sampleRate: number;
  private channelData: Float32Array;

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channelData = new Float32Array(length);
  }

  public getChannelData(channel: number): Float32Array {
    return this.channelData;
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: MockAudioBuffer | null = null;
  public started: boolean = false;
  public stopped: boolean = false;
  public startTime: number = 0;
  public stopTime: number = 0;

  public start(time: number = 0): void {
    this.started = true;
    this.startTime = time;
  }

  public stop(time: number = 0): void {
    this.stopped = true;
    this.stopTime = time;
  }
}

export class MockAudioContext {
  public state: AudioContextState = 'suspended';
  public currentTime: number = 0.05;
  public sampleRate: number = 44100;
  public destination: MockAudioNode;

  public oscillators: MockOscillatorNode[] = [];
  public gains: MockGainNode[] = [];
  public filters: MockBiquadFilterNode[] = [];
  public bufferSources: MockAudioBufferSourceNode[] = [];

  constructor() {
    this.destination = new MockAudioNode(this);
  }

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  public createGain(): MockGainNode {
    const node = new MockGainNode(this);
    this.gains.push(node);
    return node;
  }

  public createOscillator(): MockOscillatorNode {
    const node = new MockOscillatorNode(this);
    this.oscillators.push(node);
    return node;
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    const node = new MockBiquadFilterNode(this);
    this.filters.push(node);
    return node;
  }

  public createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  public createBufferSource(): MockAudioBufferSourceNode {
    const node = new MockAudioBufferSourceNode(this);
    this.bufferSources.push(node);
    return node;
  }

  public resetTracking(): void {
    this.oscillators = [];
    this.gains = [];
    this.filters = [];
    this.bufferSources = [];
  }
}
