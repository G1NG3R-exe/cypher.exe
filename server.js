const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Room store ──────────────────────────────────────────────
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(hostSocket, username) {
  let code;
  do { code = genCode(); } while (rooms.has(code));

  const room = {
    code,
    players: {
      [hostSocket.id]: {
        id: hostSocket.id,
        username,
        hp: 100,
        position: { x: -5, y: 1.7, z: 0 },
        rotation: { yaw: 0, pitch: 0 },
        kills: 0,
        score: 0,
        ready: false,
        alive: true,
      }
    },
    gameStarted: false,
    startedAt: null,
  };

  rooms.set(code, room);
  hostSocket.join(code);
  hostSocket.data.roomCode = code;
  hostSocket.data.username = username;
  return room;
}

function getOpponent(room, socketId) {
  return Object.values(room.players).find(p => p.id !== socketId);
}

// ── Socket logic ────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('connect', socket.id);

  // CREATE ROOM
  socket.on('create_room', ({ username }, cb) => {
    if (!username || username.length < 2) return cb({ error: 'Invalid username' });
    const room = createRoom(socket, username);
    cb({ code: room.code });
    console.log(`Room created: ${room.code} by ${username}`);
  });

  // JOIN ROOM
  socket.on('join_room', ({ username, code }, cb) => {
    if (!username || username.length < 2) return cb({ error: 'Invalid username' });
    const room = rooms.get(code?.toUpperCase().trim());
    if (!room) return cb({ error: 'Room not found' });
    if (Object.keys(room.players).length >= 2) return cb({ error: 'Room is full' });
    if (room.gameStarted) return cb({ error: 'Game already in progress' });

    room.players[socket.id] = {
      id: socket.id,
      username,
      hp: 100,
      position: { x: 5, y: 1.7, z: 0 },
      rotation: { yaw: Math.PI, pitch: 0 },
      kills: 0,
      score: 0,
      ready: false,
      alive: true,
    };

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = username;

    // Notify both players
    const playerList = Object.values(room.players).map(p => ({ id: p.id, username: p.username }));
    io.to(code).emit('room_update', { players: playerList, code });
    cb({ code });

    // Auto-start when 2 players joined
    if (Object.keys(room.players).length === 2) {
      setTimeout(() => {
        room.gameStarted = true;
        room.startedAt = Date.now();
        io.to(code).emit('game_start', {
          players: Object.values(room.players).map(p => ({
            id: p.id, username: p.username,
            position: p.position, rotation: p.rotation,
          }))
        });
      }, 2000);
    }
    console.log(`${username} joined room ${code}`);
  });

  // PLAYER MOVEMENT / STATE UPDATE
  socket.on('player_update', (data) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room || !room.players[socket.id]) return;

    const p = room.players[socket.id];
    if (data.position) p.position = data.position;
    if (data.rotation) p.rotation = data.rotation;

    // Broadcast to opponent only
    socket.to(code).emit('opponent_update', {
      id: socket.id,
      position: p.position,
      rotation: p.rotation,
    });
  });

  // BLOCK PLACED
  socket.on('player_block_placed', (data) => {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.to(code).emit('opponent_block_placed', data);
  });

  // BLOCK REMOVED
  socket.on('player_block_removed', (data) => {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.to(code).emit('opponent_block_removed', data);
  });

  // SHOOT EVENT
  socket.on('player_shoot', (data) => {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.to(code).emit('opponent_shoot', {
      id: socket.id,
      position: data.position,
      direction: data.direction,
    });
  });

  // HIT EVENT (client-side hit detection, reported to server)
  socket.on('hit_opponent', ({ damage }) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room || !room.gameStarted) return;

    const opponent = getOpponent(room, socket.id);
    if (!opponent || !opponent.alive) return;

    opponent.hp = Math.max(0, opponent.hp - (damage || 20));

    // Tell victim they were hit
    io.to(opponent.id).emit('you_were_hit', { hp: opponent.hp, by: socket.id });
    // Tell shooter confirmation
    socket.emit('hit_confirmed', { opponentHp: opponent.hp });

    if (opponent.hp <= 0) {
      opponent.alive = false;
      const shooter = room.players[socket.id];
      if (shooter) shooter.kills++;

      io.to(code).emit('game_over', {
        winner: socket.id,
        winnerName: shooter?.username || '???',
        loser: opponent.id,
        loserName: opponent.username,
      });

      // Clean up room after 10s
      setTimeout(() => rooms.delete(code), 10000);
    }
  });

  // PLAYER DISCONNECTS
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    const leaving = room.players[socket.id];
    delete room.players[socket.id];

    if (room.gameStarted && Object.keys(room.players).length > 0) {
      // Notify survivor they won by forfeit
      io.to(code).emit('opponent_disconnected', {
        username: leaving?.username || 'Opponent',
      });
    }

    if (Object.keys(room.players).length === 0) {
      rooms.delete(code);
      console.log(`Room ${code} deleted (empty)`);
    }
    console.log(`disconnect ${socket.id} from room ${code}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`CYPHER.EXE server running on port ${PORT}`));