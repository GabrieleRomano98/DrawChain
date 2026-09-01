const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const words = require('./data');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true
  }));
}

app.use(express.json());

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../build')));
  // Render (and most PaaS providers) terminate TLS at a proxy in front of the app,
  // so Express needs to trust it for secure cookies to work correctly.
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key_change_in_production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

const games = new Map();

function generateGameCode() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function getGame(gameCode) {
  const game = games.get(gameCode);
  if (!game) {
    throw { status_: 404, message_: 'Game not found' };
  }
  return game;
}

function verifyHost(req, game) {
  if (game.host !== req.session.id) {
    throw { status_: 403, message_: 'Only the host can perform this action' };
  }
}

function getPlayer(sessionId, game) {
  const player = game.players.find(p => p.sessionId === sessionId);
  if (!player) {
    throw { status_: 403, message_: 'You are not a player in this game' };
  }
  return player;
}

function notify(gameCode, eventType = 'update', data = null) {
  if (!gameCode) return;

  const game = games.get(gameCode);
  if (!game || !game.connections || game.connections.size === 0) return;

  const payload = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data: data
  };

  game.connections.forEach((res, sessionId) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE notification:', error);
      game.connections.delete(sessionId);
    }
  });

  console.log(`Notification sent to ${game.connections.size} clients in game ${gameCode}:`, eventType);
}

const handleRequest = (req, res, callback) => {
  try {
    const result = callback(req);
    const resultField = typeof (result) === "string" ? "message" : "data";
    res.json({
      success: true,
      [resultField]: result
    });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(error.status_ || 500).json({
      success: false,
      message: error.message_ || 'Internal server error'
    });
  }
};

app.post('/api/game/create', (req, res) => handleRequest(req, res, (req) => {
  if (games.get(req.session.id)) {
    return 'You have already created a game';
  }
  const gameCode = generateGameCode();
  const player = {
    sessionId: req.session.id,
    name: req.body.name,
    score: 0,
    joinedAt: new Date()
  };
  const gameData = {
    code: gameCode,
    host: req.session.id,
    players: [player],
    started: false,
    connections: new Map(),
    createdAt: new Date()
  };

  console.log('CREATE GAME - Session ID:', req.session.id);
  console.log('CREATE GAME - Game Code:', gameCode);

  games.forEach((game, code) => {
    if (game.host !== req.session.id && game.createdAt < Date.now() - 24 * 60 * 60 * 1000) {
      games.delete(code);
    }
  });
  games.set(gameCode, gameData);
  req.session.gameCode = gameCode;
  req.session.isHost = true;

  return 'Game created successfully';
}));

app.post('/api/game/join/:code', (req, res) => handleRequest(req, res, (req) => {
  const gameCode = req.params.code.toUpperCase();
  const game = getGame(gameCode);

  if (game.players.length >= 8 || game.started) {
    throw { status_: 400, message_: 'Game is not available to join' };
  }

  if (game.players.some(p => p.name === req.body.name)) {
    throw { status_: 400, message_: 'Name already taken in this game' };
  }

  if (game.players.some(p => p.sessionId === req.session.id)) {
    return 'Joined game successfully';
  }

  const newPlayer = {
    sessionId: req.session.id,
    name: req.body.name,
    score: 0,
    joinedAt: new Date()
  };
  game.players.push(newPlayer);

  req.session.gameCode = gameCode;
  req.session.isHost = false;
  games.set(gameCode, game);

  notify(gameCode, 'player_joined', { playerName: newPlayer.name });

  return 'Joined game successfully';
}));

app.get('/api/game/start', (req, res) => handleRequest(req, res, (req) => {
  const game = getGame(req.session.gameCode);
  verifyHost(req, game);
  const n = game.players.length;
  game.started = true;
  game.round = 1;
  game.totalRounds = n;
  game.finished = false;
  game.submittedIds = new Set();
  // chains[i] is the sequence of entries (word -> drawing -> guess -> drawing -> ...)
  // originating from player i's initial word.
  game.chains = game.players.map(p => ([
    { type: 'word', value: randomWord(), by: null }
  ]));
  games.set(req.session.gameCode, game);

  notify(req.session.gameCode, 'game_started', { round: 1, action: 'draw' });

  return 'Game started successfully';
}));

function getPlayerIndex(game, player) {
  return game.players.findIndex(p => p.sessionId === player.sessionId);
}

function currentAction(round) {
  return round % 2 === 1 ? 'draw' : 'guess';
}

app.get('/api/game/turn', (req, res) => handleRequest(req, res, (req) => {
  const game = getGame(req.session.gameCode);
  const player = getPlayer(req.session.id, game);
  if (!game.chains) {
    throw { status_: 400, message_: 'Game has not started yet' };
  }
  if (game.finished) {
    return { finished: true };
  }
  const n = game.players.length;
  const playerIndex = getPlayerIndex(game, player);
  const round = game.round;
  const chainIndex = (playerIndex + round) % n;
  const previousEntry = game.chains[chainIndex][round - 1];
  const action = currentAction(round);
  const waiting = game.submittedIds.has(req.session.id);

  return {
    finished: false,
    round,
    totalRounds: game.totalRounds,
    action,
    promptType: previousEntry.type === 'drawing' ? 'image' : 'word',
    prompt: previousEntry.value,
    waiting
  };
}));

app.post('/api/game/submit', (req, res) => handleRequest(req, res, (req) => {
  const game = getGame(req.session.gameCode);
  const player = getPlayer(req.session.id, game);
  if (!game.chains) {
    throw { status_: 400, message_: 'Game has not started yet' };
  }
  if (game.finished) {
    throw { status_: 400, message_: 'Game has already finished' };
  }
  if (game.submittedIds.has(req.session.id)) {
    return 'Already submitted';
  }

  const n = game.players.length;
  const playerIndex = getPlayerIndex(game, player);
  const round = game.round;
  const chainIndex = (playerIndex + round) % n;
  const action = currentAction(round);

  game.chains[chainIndex][round] = {
    type: action === 'draw' ? 'drawing' : 'guess',
    value: req.body.value,
    by: player.name
  };
  game.submittedIds.add(req.session.id);
  games.set(req.session.gameCode, game);

  if (game.submittedIds.size >= n) {
    if (game.round >= game.totalRounds) {
      game.finished = true;
      games.set(req.session.gameCode, game);
      notify(req.session.gameCode, 'game_finished', {});
    } else {
      game.round += 1;
      game.submittedIds = new Set();
      games.set(req.session.gameCode, game);
      notify(req.session.gameCode, 'round_started', {
        round: game.round,
        action: currentAction(game.round)
      });
    }
  }

  return 'Submitted successfully';
}));

app.get('/api/game/summary', (req, res) => handleRequest(req, res, (req) => {
  const game = getGame(req.session.gameCode);
  getPlayer(req.session.id, game);
  if (!game.finished) {
    throw { status_: 400, message_: 'Game has not finished yet' };
  }
  return game.players.map((p, i) => ({
    name: p.name,
    entries: game.chains[i]
  }));
}));

app.delete('/api/game/player/:index', (req, res) => handleRequest(req, res, (req) => {
  const game = getGame(req.session.gameCode);
  verifyHost(req, game);
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index <= 0 || index >= game.players.length) {
    throw { status_: 400, message_: 'Invalid player index' };
  }
  game.players.splice(index, 1);
  games.set(req.session.gameCode, game);
  return 'Player removed successfully';
}));

app.get('/api/roomInfo', (req, res) => handleRequest(req, res, (req) => {
  const game = getGame(req.session.gameCode);
  getPlayer(req.session.id, game);
  const scores = game.players.map(p => ({ name: p.name, score: p.score }));
  return {
    host: game.players.find(p => p.sessionId === game.host).name,
    isHost: game.host === req.session.id,
    players: game.players.filter(p => p.sessionId !== game.host).map((p, i) => ({ id: i, name: p.name })),
    code: game.code,
    scores: scores
  };
}));

app.get('/api/game/notifications', (req, res) => {
  const gameCode = req.session.gameCode;
  if (!gameCode) {
    return res.status(400).json({ success: false, message: 'No game session found' });
  }

  const game = games.get(gameCode);
  if (!game) {
    return res.status(404).json({ success: false, message: 'Game not found' });
  }

  const player = game.players.find(p => p.sessionId === req.session.id);
  if (!player) {
    return res.status(403).json({ success: false, message: 'You are not a player in this game' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (!game.connections) {
    game.connections = new Map();
  }

  game.connections.set(req.session.id, res);
  games.set(gameCode, game);

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to game notifications' })}\n\n`);

  req.on('close', () => {
    if (game.connections) {
      game.connections.delete(req.session.id);
      games.set(gameCode, game);
    }
    console.log(`SSE connection closed for session ${req.session.id} in game ${gameCode}`);
  });

  req.on('error', (error) => {
    console.error('SSE connection error:', error);
  });
});

if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Draw server listening on port ${PORT}`);
});
