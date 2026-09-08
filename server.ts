import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent state
interface ServerPlayer {
  id: string;
  name: string;
  avatar: any;
  selectedHammer: string;
  ws?: WebSocket;
  isBot?: boolean;
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  ready: boolean;
  isHost: boolean;
  ping: number;
  activeAttacks: { type: string; expiresAt: number }[];
}

interface ServerRoom {
  id: string;
  code: string;
  name: string;
  mode: 'quick' | 'custom' | 'ranked';
  status: 'lobby' | 'countdown' | 'in_game' | 'finished';
  players: Record<string, ServerPlayer>;
  moles: any[];
  gameDuration: number;
  timeRemaining: number;
  startedAt?: number;
  winnerId?: string;
  chat: any[];
  gameInterval?: NodeJS.Timeout;
  spawnInterval?: NodeJS.Timeout;
  botInterval?: NodeJS.Timeout;
}

const activeRooms: Map<string, ServerRoom> = new Map();
const quickQueue: { player: ServerPlayer; ws: WebSocket; queuedAt: number }[] = [];
const globalLeaderboard: any[] = [
  { rank: 1, userId: 'u_apex', name: 'ThunderHammer', avatar: { skinTone: '#fbbf24', headwear: 'crown', glasses: 'laser', expression: 'smug', outfitColor: '#e11d48', badge: 'Grandmaster', title: 'Mole Deity' }, score: 18450, combo: 42, wins: 88, level: 32, date: 'Today' },
  { rank: 2, userId: 'u_neon', name: 'CyberStriker', avatar: { skinTone: '#38bdf8', headwear: 'cyber_helmet', glasses: 'vr_goggles', expression: 'fierce', outfitColor: '#06b6d4', badge: 'Champion', title: 'Lightning Reflexes' }, score: 16200, combo: 36, wins: 71, level: 28, date: 'Today' },
  { rank: 3, userId: 'u_viking', name: 'RagnarMole', avatar: { skinTone: '#fbcfe8', headwear: 'viking', glasses: 'monocle', expression: 'laugh', outfitColor: '#854d0e', badge: 'Diamond', title: 'Berserker' }, score: 14800, combo: 31, wins: 59, level: 24, date: 'Yesterday' },
  { rank: 4, userId: 'u_ninja', name: 'ShadowWhack', avatar: { skinTone: '#e2e8f0', headwear: 'ninja_band', glasses: 'aviators', expression: 'cool', outfitColor: '#1e293b', badge: 'Platinum', title: 'Ghost Whacker' }, score: 13500, combo: 28, wins: 45, level: 20, date: '2 days ago' },
  { rank: 5, userId: 'u_pixel', name: 'PixelQueen', avatar: { skinTone: '#f472b6', headwear: 'cat_ears', glasses: 'heart', expression: 'happy', outfitColor: '#ec4899', badge: 'Gold', title: 'Arcade Star' }, score: 11900, combo: 24, wins: 38, level: 18, date: '3 days ago' },
];

const cloudUsers: Map<string, any> = new Map();

// Helper to broadcast to a room
function broadcastToRoom(room: ServerRoom, type: string, payload: any) {
  const message = JSON.stringify({ type, ...payload });
  Object.values(room.players).forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(message);
    }
  });
}

function cleanRoomData(room: ServerRoom) {
  const { gameInterval, spawnInterval, botInterval, ...rest } = room;
  const safePlayers: Record<string, any> = {};
  Object.entries(room.players).forEach(([id, p]) => {
    const { ws, ...pData } = p;
    safePlayers[id] = pData;
  });
  return { ...rest, players: safePlayers };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MOLE-${code}`;
}

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), activeRoomsCount: activeRooms.size });
});

app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type || 'global';
  res.json(globalLeaderboard);
});

app.post('/api/leaderboard/submit', (req, res) => {
  const { userId, name, avatar, score, combo } = req.body;
  if (!score) return res.status(400).json({ error: 'Missing score' });

  const existingIdx = globalLeaderboard.findIndex((e) => e.userId === userId);
  if (existingIdx !== -1) {
    if (score > globalLeaderboard[existingIdx].score) {
      globalLeaderboard[existingIdx].score = score;
      globalLeaderboard[existingIdx].combo = Math.max(combo || 0, globalLeaderboard[existingIdx].combo);
    }
  } else {
    globalLeaderboard.push({
      rank: 0,
      userId: userId || 'anon_' + Math.random().toString(36).substring(2, 7),
      name: name || 'Whacker Hero',
      avatar: avatar || { skinTone: '#fbbf24', headwear: 'cap', glasses: 'none', expression: 'happy', outfitColor: '#3b82f6', badge: 'Rookie', title: 'Mole Buster' },
      score,
      combo: combo || 0,
      wins: 1,
      level: Math.floor(score / 500) + 1,
      date: 'Just now',
    });
  }

  // Sort & re-rank
  globalLeaderboard.sort((a, b) => b.score - a.score);
  globalLeaderboard.slice(0, 50).forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  res.json({ success: true, top: globalLeaderboard.slice(0, 20) });
});

app.post('/api/user/sync', (req, res) => {
  const profile = req.body;
  if (profile && profile.id) {
    cloudUsers.set(profile.id, { ...profile, lastSynced: Date.now() });
    return res.json({ success: true, syncedAt: Date.now() });
  }
  res.status(400).json({ error: 'Invalid profile' });
});

app.get('/api/user/sync/:id', (req, res) => {
  const user = cloudUsers.get(req.params.id);
  if (user) {
    return res.json(user);
  }
  res.status(404).json({ error: 'User not found in cloud' });
});

app.get('/api/rooms', (req, res) => {
  const publicRooms = Array.from(activeRooms.values())
    .filter((r) => r.status === 'lobby')
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      playerCount: Object.keys(r.players).length,
      mode: r.mode,
    }));
  res.json(publicRooms);
});

// Create HTTP server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Mole types generator with weights and unique behaviors
const moleTypePool: Array<{ type: string; weight: number; health: number; points: number; coins: number; pattern?: string }> = [
  { type: 'standard', weight: 32, health: 1, points: 100, coins: 5, pattern: 'normal' },
  { type: 'fast', weight: 16, health: 1, points: 220, coins: 15, pattern: 'lightning_fast' },
  { type: 'tough', weight: 12, health: 3, points: 400, coins: 30, pattern: 'heavy_armored' },
  { type: 'golden', weight: 12, health: 1, points: 300, coins: 25, pattern: 'spiral_golden' },
  { type: 'helmet', weight: 12, health: 2, points: 250, coins: 15, pattern: 'heavy_armored' },
  { type: 'frost', weight: 8, health: 1, points: 150, coins: 10, pattern: 'frost_freeze' },
  { type: 'phantom', weight: 6, health: 1, points: 350, coins: 25, pattern: 'phase_glitch' },
  { type: 'rainbow', weight: 4, health: 1, points: 500, coins: 50, pattern: 'prismatic_levitate' },
  { type: 'boss', weight: 4, health: 5, points: 1000, coins: 100, pattern: 'boss_slam' },
  { type: 'bomb', weight: 12, health: 1, points: -200, coins: 0, pattern: 'fuse_burn' },
];

function getRandomMoleType(): { type: string; health: number; points: number; coins: number; pattern?: string } {
  const totalWeight = moleTypePool.reduce((acc, m) => acc + m.weight, 0);
  let random = Math.random() * totalWeight;
  for (const m of moleTypePool) {
    if (random < m.weight) return m;
    random -= m.weight;
  }
  return moleTypePool[0];
}

// Bot creation helper
function createBotPlayer(): ServerPlayer {
  const botNames = ['Bot_HammerTron', 'Bot_MoleReaper', 'Bot_ArcadePro', 'Bot_WhackoMax', 'Bot_BlitzMole'];
  const name = botNames[Math.floor(Math.random() * botNames.length)];
  const botId = 'bot_' + Math.random().toString(36).substring(2, 8);
  return {
    id: botId,
    name,
    avatar: {
      skinTone: '#38bdf8',
      headwear: 'robot',
      glasses: 'laser',
      expression: 'smug',
      outfitColor: '#10b981',
      badge: 'AI Challenger',
      title: 'Neural Whacker',
    },
    selectedHammer: 'cyber_crusher',
    isBot: true,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    ready: true,
    isHost: false,
    ping: 15,
    activeAttacks: [],
  };
}

// Start in-game loop for a room
function startRoomGame(room: ServerRoom) {
  room.status = 'in_game';
  room.timeRemaining = 60;
  room.startedAt = Date.now();
  room.moles = [];

  // Reset player scores
  Object.values(room.players).forEach((p) => {
    p.score = 0;
    p.combo = 0;
    p.maxCombo = 0;
    p.hits = 0;
    p.misses = 0;
    p.activeAttacks = [];
  });

  broadcastToRoom(room, 'game:started', {
    room: cleanRoomData(room),
    duration: room.gameDuration,
  });

  // Spawn cycle
  room.spawnInterval = setInterval(() => {
    if (room.status !== 'in_game') return;

    // Pick 1 to 3 random distinct holes out of 9
    const holeCount = Math.random() > 0.6 ? 2 : 1;
    const availableHoles = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);

    for (let i = 0; i < holeCount; i++) {
      const holeIndex = availableHoles[i];
      const moleInfo = getRandomMoleType();
      const moleId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const duration = Math.max(900, 1900 - (60 - room.timeRemaining) * 15); // gets faster

      const moleData = {
        id: moleId,
        holeIndex,
        type: moleInfo.type,
        health: moleInfo.health,
        maxHealth: moleInfo.health,
        spawnTime: Date.now(),
        duration,
        points: moleInfo.points,
        coins: moleInfo.coins,
      };

      room.moles.push(moleData);
      broadcastToRoom(room, 'game:mole_spawned', { mole: moleData });

      // Clean up mole after duration
      setTimeout(() => {
        const idx = room.moles.findIndex((m) => m.id === moleId);
        if (idx !== -1) {
          room.moles.splice(idx, 1);
          broadcastToRoom(room, 'game:mole_despawned', { moleId, holeIndex });
        }
      }, duration + 100);
    }
  }, 1000);

  // Bot AI logic if bot is in room
  const botPlayer = Object.values(room.players).find((p) => p.isBot);
  if (botPlayer) {
    room.botInterval = setInterval(() => {
      if (room.status !== 'in_game') return;
      if (room.moles.length > 0) {
        // Find safe mole (not bomb) or 80% chance to hit
        const targetMole = room.moles.find((m) => m.type !== 'bomb') || room.moles[0];
        if (targetMole && Math.random() < 0.75) {
          // Bot hits mole
          if (targetMole.type === 'bomb') {
            botPlayer.score = Math.max(0, botPlayer.score - 150);
            botPlayer.combo = 0;
          } else {
            const isCrit = Math.random() < 0.2;
            const points = targetMole.points * (isCrit ? 1.5 : 1.0) * (1 + botPlayer.combo * 0.1);
            botPlayer.score += Math.round(points);
            botPlayer.combo += 1;
            botPlayer.maxCombo = Math.max(botPlayer.maxCombo, botPlayer.combo);
            botPlayer.hits += 1;
          }

          broadcastToRoom(room, 'player:score_update', {
            playerId: botPlayer.id,
            score: botPlayer.score,
            combo: botPlayer.combo,
            moleId: targetMole.id,
            holeIndex: targetMole.holeIndex,
          });

          // Chance to throw attack at human opponent!
          if (botPlayer.combo > 0 && botPlayer.combo % 6 === 0) {
            const attackTypes = ['frost_slow', 'ink_splat', 'bomb_barrage'];
            const chosenAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
            const humanPlayer = Object.values(room.players).find((p) => !p.isBot);
            if (humanPlayer) {
              humanPlayer.activeAttacks.push({ type: chosenAttack, expiresAt: Date.now() + 4000 });
              broadcastToRoom(room, 'game:attack_received', {
                targetPlayerId: humanPlayer.id,
                attackerName: botPlayer.name,
                attackType: chosenAttack,
              });
            }
          }
        }
      }
    }, 1200);
  }

  // Round Clock ticker
  room.gameInterval = setInterval(() => {
    room.timeRemaining -= 1;
    broadcastToRoom(room, 'game:tick', { timeRemaining: room.timeRemaining });

    if (room.timeRemaining <= 0) {
      endRoomGame(room);
    }
  }, 1000);
}

function endRoomGame(room: ServerRoom) {
  if (room.gameInterval) clearInterval(room.gameInterval);
  if (room.spawnInterval) clearInterval(room.spawnInterval);
  if (room.botInterval) clearInterval(room.botInterval);

  room.status = 'finished';

  // Determine winner
  const playerList = Object.values(room.players);
  playerList.sort((a, b) => b.score - a.score);
  const winner = playerList[0];
  room.winnerId = winner ? winner.id : undefined;

  broadcastToRoom(room, 'game:over', {
    winnerId: room.winnerId,
    winnerName: winner ? winner.name : 'Tie',
    players: cleanRoomData(room).players,
  });
}

// WebSocket Connection handling
wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type } = data;

      switch (type) {
        case 'match:quick': {
          const pData = data.player;
          currentPlayerId = pData.id;

          const player: ServerPlayer = {
            id: pData.id,
            name: pData.name,
            avatar: pData.avatar,
            selectedHammer: pData.selectedHammer || 'wooden_mallet',
            ws,
            score: 0,
            combo: 0,
            maxCombo: 0,
            hits: 0,
            misses: 0,
            ready: true,
            isHost: true,
            ping: 25,
            activeAttacks: [],
          };

          // Check if someone is in queue
          if (quickQueue.length > 0) {
            const opponent = quickQueue.shift()!;
            if (opponent.ws.readyState === WebSocket.OPEN && opponent.player.id !== player.id) {
              // Create matched room
              const roomId = 'room_' + Date.now();
              const roomCode = generateRoomCode();
              opponent.player.isHost = true;
              player.isHost = false;

              const room: ServerRoom = {
                id: roomId,
                code: roomCode,
                name: '1v1 Quick Duel',
                mode: 'quick',
                status: 'countdown',
                players: {
                  [opponent.player.id]: opponent.player,
                  [player.id]: player,
                },
                moles: [],
                gameDuration: 60,
                timeRemaining: 60,
                chat: [],
              };

              activeRooms.set(roomId, room);
              currentRoomId = roomId;

              broadcastToRoom(room, 'room:update', { room: cleanRoomData(room) });
              broadcastToRoom(room, 'match:found', { room: cleanRoomData(room) });

              // Start countdown
              setTimeout(() => {
                startRoomGame(room);
              }, 3000);
              return;
            }
          }

          // No opponent yet -> put in queue and set 3.5s bot fallback
          quickQueue.push({ player, ws, queuedAt: Date.now() });

          setTimeout(() => {
            const queueIdx = quickQueue.findIndex((q) => q.player.id === player.id);
            if (queueIdx !== -1 && ws.readyState === WebSocket.OPEN) {
              quickQueue.splice(queueIdx, 1);
              // Pair with intelligent bot
              const bot = createBotPlayer();
              const roomId = 'room_' + Date.now();
              const roomCode = generateRoomCode();

              const room: ServerRoom = {
                id: roomId,
                code: roomCode,
                name: '1v1 Quick Duel',
                mode: 'quick',
                status: 'countdown',
                players: {
                  [player.id]: player,
                  [bot.id]: bot,
                },
                moles: [],
                gameDuration: 60,
                timeRemaining: 60,
                chat: [
                  {
                    id: 'c_sys',
                    senderId: 'system',
                    senderName: 'Arena Announcer',
                    text: `Opponent found! Match starting in 3 seconds...`,
                    timestamp: Date.now(),
                    isSystem: true,
                  },
                ],
              };

              activeRooms.set(roomId, room);
              currentRoomId = roomId;

              broadcastToRoom(room, 'room:update', { room: cleanRoomData(room) });
              broadcastToRoom(room, 'match:found', { room: cleanRoomData(room) });

              setTimeout(() => {
                startRoomGame(room);
              }, 3000);
            }
          }, 3500);
          break;
        }

        case 'room:create': {
          const pData = data.player;
          currentPlayerId = pData.id;
          const roomId = 'room_' + Date.now();
          const roomCode = generateRoomCode();

          const player: ServerPlayer = {
            id: pData.id,
            name: pData.name,
            avatar: pData.avatar,
            selectedHammer: pData.selectedHammer || 'wooden_mallet',
            ws,
            score: 0,
            combo: 0,
            maxCombo: 0,
            hits: 0,
            misses: 0,
            ready: true,
            isHost: true,
            ping: 20,
            activeAttacks: [],
          };

          const room: ServerRoom = {
            id: roomId,
            code: roomCode,
            name: data.roomName || `${pData.name}'s Arena`,
            mode: 'custom',
            status: 'lobby',
            players: { [player.id]: player },
            moles: [],
            gameDuration: 60,
            timeRemaining: 60,
            chat: [
              {
                id: 'm_sys_1',
                senderId: 'system',
                senderName: 'System',
                text: `Room created! Share code ${roomCode} with your friends.`,
                timestamp: Date.now(),
                isSystem: true,
              },
            ],
          };

          activeRooms.set(roomId, room);
          currentRoomId = roomId;
          ws.send(JSON.stringify({ type: 'room:update', room: cleanRoomData(room) }));
          break;
        }

        case 'room:join': {
          const { code, player: pData } = data;
          currentPlayerId = pData.id;

          const targetRoom = Array.from(activeRooms.values()).find((r) => r.code === code);
          if (!targetRoom) {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Room not found. Please check the code.' }));
            return;
          }

          if (Object.keys(targetRoom.players).length >= 4) {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Room is full (max 4 players).' }));
            return;
          }

          const newPlayer: ServerPlayer = {
            id: pData.id,
            name: pData.name,
            avatar: pData.avatar,
            selectedHammer: pData.selectedHammer || 'wooden_mallet',
            ws,
            score: 0,
            combo: 0,
            maxCombo: 0,
            hits: 0,
            misses: 0,
            ready: false,
            isHost: false,
            ping: 30,
            activeAttacks: [],
          };

          targetRoom.players[newPlayer.id] = newPlayer;
          currentRoomId = targetRoom.id;

          targetRoom.chat.push({
            id: 'c_' + Date.now(),
            senderId: 'system',
            senderName: 'System',
            text: `${newPlayer.name} joined the room!`,
            timestamp: Date.now(),
            isSystem: true,
          });

          broadcastToRoom(targetRoom, 'room:update', { room: cleanRoomData(targetRoom) });
          break;
        }

        case 'player:ready': {
          if (!currentRoomId) return;
          const room = activeRooms.get(currentRoomId);
          if (room && currentPlayerId && room.players[currentPlayerId]) {
            room.players[currentPlayerId].ready = data.ready;
            broadcastToRoom(room, 'room:update', { room: cleanRoomData(room) });
          }
          break;
        }

        case 'game:start': {
          if (!currentRoomId) return;
          const room = activeRooms.get(currentRoomId);
          if (room && currentPlayerId && room.players[currentPlayerId]?.isHost) {
            startRoomGame(room);
          }
          break;
        }

        case 'game:hit_mole': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = activeRooms.get(currentRoomId);
          if (!room || room.status !== 'in_game') return;

          const player = room.players[currentPlayerId];
          if (!player) return;

          const { moleId, holeIndex, isCrit, hammerDamage } = data;
          const moleIdx = room.moles.findIndex((m) => m.id === moleId);
          const mole = moleIdx !== -1 ? room.moles[moleIdx] : null;

          if (mole) {
            mole.health -= hammerDamage || 1;
            if (mole.health <= 0) {
              room.moles.splice(moleIdx, 1);
            }

            if (mole.type === 'bomb') {
              player.score = Math.max(0, player.score - 200);
              player.combo = 0;
            } else {
              const basePoints = mole.points || 100;
              const critMult = isCrit ? 1.75 : 1.0;
              const comboBonus = 1 + player.combo * 0.15;
              const earned = Math.round(basePoints * critMult * comboBonus);

              player.score += earned;
              player.combo += 1;
              player.maxCombo = Math.max(player.maxCombo, player.combo);
              player.hits += 1;
            }

            broadcastToRoom(room, 'player:score_update', {
              playerId: player.id,
              score: player.score,
              combo: player.combo,
              moleId,
              holeIndex,
              isCrit,
              moleHealth: mole.health,
            });
          }
          break;
        }

        case 'game:miss': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = activeRooms.get(currentRoomId);
          if (room && room.players[currentPlayerId]) {
            const p = room.players[currentPlayerId];
            p.combo = 0;
            p.misses += 1;
            broadcastToRoom(room, 'player:score_update', {
              playerId: p.id,
              score: p.score,
              combo: 0,
            });
          }
          break;
        }

        case 'game:use_attack': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = activeRooms.get(currentRoomId);
          if (!room) return;

          const { targetPlayerId, attackType } = data;
          const target = room.players[targetPlayerId];
          const sender = room.players[currentPlayerId];

          if (target && sender) {
            target.activeAttacks.push({
              type: attackType,
              expiresAt: Date.now() + 4500,
            });

            broadcastToRoom(room, 'game:attack_received', {
              targetPlayerId,
              attackerName: sender.name,
              attackType,
            });
          }
          break;
        }

        case 'room:chat': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = activeRooms.get(currentRoomId);
          if (!room) return;

          const sender = room.players[currentPlayerId];
          if (!sender) return;

          const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            senderId: sender.id,
            senderName: sender.name,
            senderAvatar: sender.avatar,
            text: data.text || '',
            emoji: data.emoji,
            timestamp: Date.now(),
          };

          room.chat.push(newMsg);
          if (room.chat.length > 50) room.chat.shift();

          broadcastToRoom(room, 'room:chat_message', { message: newMsg });
          break;
        }

        case 'room:emote': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = activeRooms.get(currentRoomId);
          if (!room) return;

          const sender = room.players[currentPlayerId];
          if (sender) {
            broadcastToRoom(room, 'player:emote', {
              playerId: sender.id,
              emoji: data.emoji,
            });
          }
          break;
        }

        case 'room:leave': {
          if (currentRoomId && currentPlayerId) {
            const room = activeRooms.get(currentRoomId);
            if (room) {
              delete room.players[currentPlayerId];
              if (Object.keys(room.players).length === 0) {
                if (room.gameInterval) clearInterval(room.gameInterval);
                if (room.spawnInterval) clearInterval(room.spawnInterval);
                if (room.botInterval) clearInterval(room.botInterval);
                activeRooms.delete(currentRoomId);
              } else {
                broadcastToRoom(room, 'room:update', { room: cleanRoomData(room) });
              }
            }
          }
          currentRoomId = null;
          ws.send(JSON.stringify({ type: 'room:left' }));
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
  });

  ws.on('close', () => {
    // Remove from queue
    const qIdx = quickQueue.findIndex((q) => q.ws === ws);
    if (qIdx !== -1) quickQueue.splice(qIdx, 1);

    // Remove from active room
    if (currentRoomId && currentPlayerId) {
      const room = activeRooms.get(currentRoomId);
      if (room) {
        delete room.players[currentPlayerId];
        if (Object.keys(room.players).length === 0) {
          if (room.gameInterval) clearInterval(room.gameInterval);
          if (room.spawnInterval) clearInterval(room.spawnInterval);
          if (room.botInterval) clearInterval(room.botInterval);
          activeRooms.delete(currentRoomId);
        } else {
          broadcastToRoom(room, 'room:update', { room: cleanRoomData(room) });
        }
      }
    }
  });
});

// Vite Middleware for Dev and Production static serve
async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Whack A Mole 3D Server running on http://0.0.0.0:${PORT}`);
  });
}

startApp();
