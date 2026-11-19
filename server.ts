import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MapId = 'warehouse' | 'docks' | 'outpost';

interface PlayerNetState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponIdx: number;
  hp: number;
  maxHp: number;
  kills: number;
  color: string;
  lastSeen: number;
}

interface RoomState {
  code: string;
  name: string;
  password: string;
  mapId: MapId;
  mode: 'coop' | 'pvp';
  hostId: string;
  createdAt: number;
  players: Map<string, PlayerNetState>;
  clients: Map<string, WebSocket>;
}

const PLAYER_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#c084fc', '#f43f5e', '#00f0ff'];

function normalizeRoomPassword(raw: unknown): string {
  if (typeof raw !== 'string') return '1111';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let out = '';
  for (const ch of raw.trim()) {
    const pIdx = persianDigits.indexOf(ch);
    const aIdx = arabicDigits.indexOf(ch);
    if (pIdx !== -1) out += String(pIdx);
    else if (aIdx !== -1) out += String(aIdx);
    else if (ch !== ' ') out += ch.toLowerCase();
  }
  return out || '1111';
}

function normalizeServerRoomCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let cleaned = '';
  for (const ch of raw.trim()) {
    const pIdx = persianDigits.indexOf(ch);
    const aIdx = arabicDigits.indexOf(ch);
    if (pIdx !== -1) cleaned += String(pIdx);
    else if (aIdx !== -1) cleaned += String(aIdx);
    else if (/[a-zA-Z0-9-]/.test(ch)) cleaned += ch.toUpperCase();
  }
  if (!cleaned) return '';
  if (cleaned.startsWith('BC-')) return cleaned;
  if (cleaned.startsWith('BC') && cleaned.length > 2) return `BC-${cleaned.slice(2)}`;
  return `BC-${cleaned}`;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BC-${suffix}`;
}

function normalizeServerOperatorName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function isApprovedServerOwnerName(raw: unknown): boolean {
  const norm = normalizeServerOperatorName(raw);
  return norm === 'پارسا' || norm === 'parsa';
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const rooms = new Map<string, RoomState>();
  let strictNameRegistry = false;
  const bannedPlayerNames = new Map<string, { name: string; reasonFa: string; timestamp: string }>();

  function serializeRoomSummary(room: RoomState) {
    return {
      code: room.code,
      name: room.name,
      hasPassword: Boolean(room.password),
      mapId: room.mapId,
      mode: room.mode,
      hostId: room.hostId,
      playerCount: room.players.size,
      players: Array.from(room.players.values()),
    };
  }

  function broadcastToRoom(room: RoomState, payload: unknown, excludeId?: string) {
    const msg = JSON.stringify(payload);
    for (const [pid, client] of room.clients.entries()) {
      if (excludeId && pid === excludeId) continue;
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  function broadcastPublicRoomList() {
    const list = Array.from(rooms.values()).map(serializeRoomSummary);
    const msg = JSON.stringify({ type: 'rooms:list', rooms: list });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  // Clean up stale HTTP-only players after 25s of inactivity
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [code, room] of rooms.entries()) {
      for (const [pid, p] of room.players.entries()) {
        const ws = room.clients.get(pid);
        const wsOpen = ws && ws.readyState === WebSocket.OPEN;
        if (!wsOpen && now - p.lastSeen > 25000) {
          room.players.delete(pid);
          room.clients.delete(pid);
          changed = true;
        }
      }
      if (room.players.size === 0) {
        rooms.delete(code);
        changed = true;
      }
    }
    if (changed) broadcastPublicRoomList();
  }, 5000);

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map(serializeRoomSummary);
    res.json({ rooms: list });
  });

  app.get('/api/online/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map(serializeRoomSummary);
    res.json({ rooms: list, strictNameRegistry, bannedPlayers: Array.from(bannedPlayerNames.values()) });
  });

  app.post('/api/online/admin', (req, res) => {
    const body = req.body || {};
    if (typeof body.strictNameRegistry === 'boolean') {
      strictNameRegistry = body.strictNameRegistry;
    }
    if (body.action === 'ban' && body.name) {
      const norm = normalizeServerOperatorName(body.name);
      bannedPlayerNames.set(norm, {
        name: String(body.name),
        reasonFa: String(body.reasonFa || 'مسدود شده توسط آنتی‌چیت یا پنل ادمین پارسا'),
        timestamp: new Date().toLocaleTimeString('fa-IR'),
      });
    } else if (body.action === 'unban' && body.name) {
      const norm = normalizeServerOperatorName(body.name);
      bannedPlayerNames.delete(norm);
    } else if (body.action === 'clearBans') {
      bannedPlayerNames.clear();
    }
    res.json({
      ok: true,
      strictNameRegistry,
      bannedPlayers: Array.from(bannedPlayerNames.values()),
    });
  });

  // HTTP REST endpoint for creating or joining a password-protected room
  app.post('/api/online/join', (req, res) => {
    const body = req.body || {};
    const action = body.action === 'create' || body.create === true ? 'create' : 'join';
    const pid = String(body.playerId || `op-${Math.random().toString(36).slice(2, 8)}`);
    const rawName = String(body.playerName || 'پارسا').slice(0, 18);
    const normName = normalizeServerOperatorName(rawName);

    if (bannedPlayerNames.has(normName)) {
      const banRec = bannedPlayerNames.get(normName);
      res.status(403).json({
        ok: false,
        error: `دسترسی مسدود است (BAN): ${banRec?.reasonFa || 'تشخیص تقلب توسط آنتی‌چیت'}`,
      });
      return;
    }

    if (strictNameRegistry && !isApprovedServerOwnerName(rawName)) {
      res.status(403).json({
        ok: false,
        error: 'ثبت نشد: در اسم‌خونه اختصاصی فقط نام «پارسا» تایید شده است و نام دیگران ثبت نمی‌شود.',
      });
      return;
    }

    const pName = isApprovedServerOwnerName(rawName) ? 'پارسا' : rawName;
    const pass = normalizeRoomPassword(body.password ?? '1111');
    const mapId: MapId =
      body.mapId === 'docks' || body.mapId === 'outpost' ? body.mapId : 'warehouse';
    const mode: 'coop' | 'pvp' = body.mode === 'pvp' ? 'pvp' : 'coop';

    let code = normalizeServerRoomCode(body.roomCode);
    if (action === 'create' && !code) {
      code = generateRoomCode();
      while (rooms.has(code)) {
        code = generateRoomCode();
      }
    }
    if (!code) {
      for (const existingRoom of rooms.values()) {
        if (!existingRoom.password || existingRoom.password === pass) {
          code = existingRoom.code;
          break;
        }
      }
      if (!code) {
        code = normalizeServerRoomCode(pass.slice(0, 6)) || 'BC-1111';
      }
    }

    let room = rooms.get(code);
    if (!room) {
      room = {
        code,
        name: String(body.roomName || `اتاق ${pName}`).slice(0, 26),
        password: pass,
        mapId,
        mode,
        hostId: pid,
        createdAt: Date.now(),
        players: new Map(),
        clients: new Map(),
      };
      rooms.set(code, room);
    } else if (room.password && room.password !== pass && room.hostId !== pid) {
      res.status(403).json({
        ok: false,
        error: 'رمز اتاق نادرست است. رمز صحیح را وارد کنید.',
      });
      return;
    }

    const colorIdx = room.players.size % PLAYER_COLORS.length;
    const existing = room.players.get(pid);
    const playerState: PlayerNetState = existing ?? {
      id: pid,
      name: pName,
      x: (Math.random() - 0.5) * 8,
      y: 0,
      z: 22,
      yaw: 0,
      pitch: 0,
      weaponIdx: 0,
      hp: 100,
      maxHp: 100,
      kills: 0,
      color: PLAYER_COLORS[colorIdx],
      lastSeen: Date.now(),
    };
    playerState.name = pName;
    playerState.lastSeen = Date.now();
    room.players.set(pid, playerState);

    broadcastToRoom(
      room,
      {
        type: 'room:state',
        room: serializeRoomSummary(room),
        joinedPlayerId: pid,
      },
      pid
    );
    broadcastPublicRoomList();

    res.json({
      ok: true,
      playerId: pid,
      room: serializeRoomSummary(room),
    });
  });

  // HTTP REST real-time state sync fallback (guarantees online works even if WebSocket is blocked)
  app.post('/api/online/sync', (req, res) => {
    const body = req.body || {};
    const code = normalizeServerRoomCode(body.roomCode);
    const pid = String(body.playerId || '');
    const room = rooms.get(code);
    if (!room || !pid) {
      res.json({ ok: false });
      return;
    }
    const p = room.players.get(pid);
    if (p) {
      if (typeof body.x === 'number') p.x = body.x;
      if (typeof body.y === 'number') p.y = body.y;
      if (typeof body.z === 'number') p.z = body.z;
      if (typeof body.yaw === 'number') p.yaw = body.yaw;
      if (typeof body.pitch === 'number') p.pitch = body.pitch;
      if (typeof body.weaponIdx === 'number') p.weaponIdx = body.weaponIdx;
      if (typeof body.hp === 'number') p.hp = Math.max(0, Math.min(100, body.hp));
      p.lastSeen = Date.now();
    }
    res.json({
      ok: true,
      room: serializeRoomSummary(room),
    });
  });

  wss.on('connection', (ws) => {
    let clientPlayerId = '';
    let currentRoomCode = '';

    function leaveCurrentRoom() {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.players.delete(clientPlayerId);
        room.clients.delete(clientPlayerId);
        if (room.players.size === 0) {
          rooms.delete(currentRoomCode);
        } else {
          if (room.hostId === clientPlayerId) {
            const firstRemaining = room.players.keys().next().value;
            if (firstRemaining) room.hostId = firstRemaining;
          }
          broadcastToRoom(room, {
            type: 'room:state',
            room: serializeRoomSummary(room),
            leftPlayerId: clientPlayerId,
          });
        }
        broadcastPublicRoomList();
      }
      currentRoomCode = '';
    }

    // Send initial room list on connect
    ws.send(
      JSON.stringify({
        type: 'rooms:list',
        rooms: Array.from(rooms.values()).map(serializeRoomSummary),
      })
    );

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw));
        if (!data || typeof data.type !== 'string') return;

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: data.ts }));
          return;
        }

        if (data.type === 'rooms:get') {
          ws.send(
            JSON.stringify({
              type: 'rooms:list',
              rooms: Array.from(rooms.values()).map(serializeRoomSummary),
            })
          );
          return;
        }

        if (data.type === 'room:create' || data.type === 'room:join') {
          const pid = String(data.playerId || `op-${Math.random().toString(36).slice(2, 8)}`);
          const pName = String(data.playerName || 'اپراتور').slice(0, 18);
          const pass = normalizeRoomPassword(data.password ?? '1111');
          const mapId: MapId =
            data.mapId === 'docks' || data.mapId === 'outpost' ? data.mapId : 'warehouse';
          const mode: 'coop' | 'pvp' = data.mode === 'pvp' ? 'pvp' : 'coop';

          let code = normalizeServerRoomCode(data.roomCode);
          if (data.type === 'room:create' && !code) {
            code = generateRoomCode();
            while (rooms.has(code)) {
              code = generateRoomCode();
            }
          }
          if (!code) {
            for (const existingRoom of rooms.values()) {
              if (!existingRoom.password || existingRoom.password === pass) {
                code = existingRoom.code;
                break;
              }
            }
            if (!code) {
              code = normalizeServerRoomCode(pass.slice(0, 6)) || 'BC-1111';
            }
          }

          let room = rooms.get(code);
          if (room && data.type === 'room:join' && room.password && room.password !== pass && room.hostId !== pid) {
            ws.send(
              JSON.stringify({
                type: 'room:error',
                message: 'رمز اتاق نادرست است. رمز صحیح را وارد کنید.',
              })
            );
            return;
          }

          if (currentRoomCode && currentRoomCode !== code) {
            leaveCurrentRoom();
          }
          clientPlayerId = pid;

          if (!room) {
            room = {
              code,
              name: String(data.roomName || `اتاق ${pName}`).slice(0, 26),
              password: pass,
              mapId,
              mode,
              hostId: pid,
              createdAt: Date.now(),
              players: new Map(),
              clients: new Map(),
            };
            rooms.set(code, room);
          } else if (data.type === 'room:create' && room.hostId === pid) {
            room.password = pass;
          }

          currentRoomCode = code;
          const colorIdx = room.players.size % PLAYER_COLORS.length;
          const existing = room.players.get(pid);
          const playerState: PlayerNetState = existing ?? {
            id: pid,
            name: pName,
            x: (Math.random() - 0.5) * 8,
            y: 0,
            z: 22,
            yaw: 0,
            pitch: 0,
            weaponIdx: 0,
            hp: 100,
            maxHp: 100,
            kills: 0,
            color: PLAYER_COLORS[colorIdx],
            lastSeen: Date.now(),
          };
          playerState.name = pName;
          playerState.lastSeen = Date.now();

          room.players.set(pid, playerState);
          room.clients.set(pid, ws);

          ws.send(
            JSON.stringify({
              type: 'room:joined',
              playerId: pid,
              room: serializeRoomSummary(room),
            })
          );

          broadcastToRoom(
            room,
            {
              type: 'room:state',
              room: serializeRoomSummary(room),
              joinedPlayerId: pid,
            },
            pid
          );
          broadcastPublicRoomList();
          return;
        }

        if (data.type === 'room:leave') {
          leaveCurrentRoom();
          ws.send(JSON.stringify({ type: 'room:left' }));
          return;
        }

        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        if (data.type === 'room:map') {
          const nextMap: MapId =
            data.mapId === 'docks' || data.mapId === 'outpost' ? data.mapId : 'warehouse';
          room.mapId = nextMap;
          broadcastToRoom(room, {
            type: 'room:state',
            room: serializeRoomSummary(room),
          });
          broadcastPublicRoomList();
          return;
        }

        if (data.type === 'player:update') {
          const p = room.players.get(clientPlayerId);
          if (!p) return;
          if (typeof data.x === 'number') p.x = data.x;
          if (typeof data.y === 'number') p.y = data.y;
          if (typeof data.z === 'number') p.z = data.z;
          if (typeof data.yaw === 'number') p.yaw = data.yaw;
          if (typeof data.pitch === 'number') p.pitch = data.pitch;
          if (typeof data.weaponIdx === 'number') p.weaponIdx = data.weaponIdx;
          if (typeof data.hp === 'number') p.hp = Math.max(0, Math.min(100, data.hp));
          p.lastSeen = Date.now();

          broadcastToRoom(
            room,
            {
              type: 'player:moved',
              player: p,
            },
            clientPlayerId
          );
          return;
        }

        if (data.type === 'player:shoot') {
          broadcastToRoom(
            room,
            {
              type: 'player:shot',
              playerId: clientPlayerId,
              weaponIdx: data.weaponIdx ?? 0,
              from: data.from,
              to: data.to,
            },
            clientPlayerId
          );
          return;
        }

        if (data.type === 'player:hit') {
          const targetId = String(data.targetId || '');
          const target = room.players.get(targetId);
          const attacker = room.players.get(clientPlayerId);
          if (!target || !attacker) return;
          const dmg = Math.max(1, Math.min(120, Number(data.damage) || 20));
          target.hp = Math.max(0, target.hp - dmg);
          let killed = false;
          if (target.hp <= 0) {
            killed = true;
            attacker.kills += 1;
            target.hp = 100;
          }
          broadcastToRoom(room, {
            type: 'player:damaged',
            targetId,
            attackerId: clientPlayerId,
            attackerName: attacker.name,
            targetName: target.name,
            damage: dmg,
            targetHp: target.hp,
            killed,
            attackerKills: attacker.kills,
          });
          return;
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bodycam Vanguard Server + WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
