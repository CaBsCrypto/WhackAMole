import { MultiplayerRoom, ChatMessage, CombatAttackType, MoleData, UserProfile } from '../types';

type MessageHandler = (type: string, data: any) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectTimer: number | null = null;
  private isConnecting = false;
  public isConnected = false;
  public activeRoom: MultiplayerRoom | null = null;
  public myPlayerId: string = '';

  public connect(): Promise<boolean> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(true);
    }

    this.isConnecting = true;
    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.isConnected = true;
          this.emitInternal('connection:status', { connected: true });
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'room:update') {
              this.activeRoom = msg.room;
            } else if (msg.type === 'room:left') {
              this.activeRoom = null;
            }
            this.emitInternal(msg.type, msg);
          } catch (e) {
            console.error('Failed to parse WS message', e);
          }
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.isConnected = false;
          this.emitInternal('connection:status', { connected: false });
          this.scheduleReconnect();
          resolve(false);
        };

        this.ws.onerror = () => {
          this.isConnecting = false;
          this.isConnected = false;
          resolve(false);
        };
      } catch (err) {
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected) {
        this.connect();
      }
    }, 3000);
  }

  public subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private emitInternal(type: string, data: any) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(type, data);
      } catch (err) {
        console.error('Error in WS subscriber', err);
      }
    });
  }

  private send(type: string, payload: any = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect().then((ok) => {
        if (ok && this.ws) {
          this.ws.send(JSON.stringify({ type, ...payload }));
        }
      });
      return;
    }
    this.ws.send(JSON.stringify({ type, ...payload }));
  }

  // Room actions
  public joinQuickMatch(profile: UserProfile) {
    this.myPlayerId = profile.id;
    this.send('match:quick', {
      player: {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        selectedHammer: profile.selectedHammerId,
      },
    });
  }

  public createCustomRoom(profile: UserProfile, roomName?: string) {
    this.myPlayerId = profile.id;
    this.send('room:create', {
      player: {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        selectedHammer: profile.selectedHammerId,
      },
      roomName: roomName || `${profile.name}'s Arena`,
    });
  }

  public joinRoomByCode(profile: UserProfile, code: string) {
    this.myPlayerId = profile.id;
    this.send('room:join', {
      code: code.trim().toUpperCase(),
      player: {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        selectedHammer: profile.selectedHammerId,
      },
    });
  }

  public setReady(ready: boolean) {
    this.send('player:ready', { ready });
  }

  public startGame() {
    this.send('game:start');
  }

  public hitMole(moleId: string, holeIndex: number, isCrit: boolean, hammerDamage: number) {
    this.send('game:hit_mole', { moleId, holeIndex, isCrit, hammerDamage });
  }

  public sendMiss() {
    this.send('game:miss');
  }

  public useAttack(targetPlayerId: string, attackType: CombatAttackType) {
    this.send('game:use_attack', { targetPlayerId, attackType });
  }

  public sendChat(text: string, emoji?: string) {
    this.send('room:chat', { text, emoji });
  }

  public sendEmote(emoji: string) {
    this.send('room:emote', { emoji });
  }

  public leaveRoom() {
    this.send('room:leave');
    this.activeRoom = null;
  }
}

export const multiplayerClient = new MultiplayerClient();
