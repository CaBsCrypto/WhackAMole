/**
 * Mock MediaStream, MediaStreamTrack, and navigator.mediaDevices
 * with built-in hardware leak auditing for E2E testing.
 */

export class MockMediaStreamTrack {
  public id: string;
  public kind: 'video' | 'audio';
  public enabled: boolean = true;
  public readyState: 'live' | 'ended' = 'live';
  public onended: (() => void) | null = null;
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor(kind: 'video' | 'audio' = 'video') {
    this.id = 'mock-track-' + Math.random().toString(36).substring(2, 9);
    this.kind = kind;
    StreamLeakAuditor.registerTrack(this);
  }

  public stop(): void {
    if (this.readyState === 'live') {
      this.readyState = 'ended';
      if (this.onended) this.onended();
      const endListeners = this.listeners.get('ended');
      if (endListeners) {
        endListeners.forEach(cb => cb());
      }
    }
  }

  public addEventListener(event: string, callback: () => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public removeEventListener(event: string, callback: () => void): void {
    const list = this.listeners.get(event);
    if (list) {
      list.delete(callback);
    }
  }
}

export class MockMediaStream {
  public id: string;
  private tracks: MockMediaStreamTrack[] = [];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = 'mock-stream-' + Math.random().toString(36).substring(2, 9);
    this.tracks = [...tracks];
    StreamLeakAuditor.registerStream(this);
  }

  public get active(): boolean {
    return this.tracks.some(t => t.readyState === 'live');
  }

  public getTracks(): MockMediaStreamTrack[] {
    return [...this.tracks];
  }

  public getVideoTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter(t => t.kind === 'video');
  }

  public addTrack(track: MockMediaStreamTrack): void {
    if (!this.tracks.includes(track)) {
      this.tracks.push(track);
    }
  }

  public removeTrack(track: MockMediaStreamTrack): void {
    this.tracks = this.tracks.filter(t => t !== track);
  }
}

export class StreamLeakAuditor {
  private static streams: Set<MockMediaStream> = new Set();
  private static tracks: Set<MockMediaStreamTrack> = new Set();

  public static registerStream(stream: MockMediaStream): void {
    this.streams.add(stream);
  }

  public static registerTrack(track: MockMediaStreamTrack): void {
    this.tracks.add(track);
  }

  public static getActiveStreamCount(): number {
    let active = 0;
    for (const stream of this.streams) {
      if (stream.active) active++;
    }
    return active;
  }

  public static getActiveTrackCount(): number {
    let active = 0;
    for (const track of this.tracks) {
      if (track.readyState === 'live') active++;
    }
    return active;
  }

  public static verifyClean(): { clean: boolean; activeStreams: number; activeTracks: number } {
    const activeStreams = this.getActiveStreamCount();
    const activeTracks = this.getActiveTrackCount();
    return {
      clean: activeStreams === 0 && activeTracks === 0,
      activeStreams,
      activeTracks,
    };
  }

  public static reset(): void {
    this.streams.clear();
    this.tracks.clear();
  }
}

export class MockMediaDevices {
  public permissionGranted: boolean = true;
  public hasCameraDevice: boolean = true;
  public cameraBusy: boolean = false;
  public getUserMediaCalls: number = 0;

  public async getUserMedia(constraints?: MediaStreamConstraints): Promise<MockMediaStream> {
    this.getUserMediaCalls++;

    if (!this.permissionGranted) {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      throw err;
    }

    if (!this.hasCameraDevice) {
      const err = new Error('Requested device not found');
      err.name = 'NotFoundError';
      throw err;
    }

    if (this.cameraBusy) {
      const err = new Error('Could not start video source');
      err.name = 'NotReadableError';
      throw err;
    }

    const videoTrack = new MockMediaStreamTrack('video');
    return new MockMediaStream([videoTrack]);
  }
}
