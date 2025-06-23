const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Armazenamento em memória (em produção, use um banco de dados)
const users = new Map();
const rooms = new Map();
const messages = new Map();
const relationships = new Map();

// Inicializar salas
rooms.set('praca', { name: '🏛️ Praça dos Pets', users: new Set(), messages: [] });
rooms.set('gatos', { name: '🐱 Clube dos Gatos', users: new Set(), messages: [] });
rooms.set('cachorros', { name: '🐕 Parque dos Cachorros', users: new Set(), messages: [] });

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    users: users.size, 
    rooms: Array.from(rooms.keys()),
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/register', (req, res) => {
  const { username, petType } = req.body;
  
  if (!username || !petType) {
    return res.status(400).json({ error: 'Username e pet são obrigatórios' });
  }
  
  // Verificar se username já existe
  const existingUser = Array.from(users.values()).find(u => u.username === username);
  if (existingUser) {
    return res.status(409).json({ error: 'Username já existe' });
  }
  
  const userId = uuidv4();
  const user = {
    id: userId,
    username,
    petType,
    petEmoji: getPetEmoji(petType),
    mood: 'happy',
    online: false,
    lastSeen: new Date(),
    relationships: []
  };
  
  users.set(userId, user);
  
  res.json({ 
    success: true, 
    user: { id: userId, username, petType, petEmoji: user.petEmoji },
    message: 'Usuário registrado com sucesso!'
  });
});

app.get('/api/users', (req, res) => {
  const onlineUsers = Array.from(users.values())
    .filter(user => user.online)
    .map(user => ({
      id: user.id,
      username: user.username,
      petType: user.petType,
      petEmoji: user.petEmoji,
      mood: user.mood
    }));
  
  res.json(onlineUsers);
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Sala não encontrada' });
  }
  
  res.json(room.messages.slice(-50)); // Últimas 50 mensagens
});

app.post('/api/relationships', (req, res) => {
  const { userId, targetUserId, type } = req.body;
  
  if (!userId || !targetUserId || !type) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  
  const user = users.get(userId);
  const targetUser = users.get(targetUserId);
  
  if (!user || !targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  
  // Adicionar relacionamento
  const relationship = {
    id: uuidv4(),
    userId,
    targetUserId,
    type, // 'friend', 'crush', 'dating'
    createdAt: new Date()
  };
  
  if (!relationships.has(userId)) {
    relationships.set(userId, []);
  }
  relationships.get(userId).push(relationship);
  
  res.json({ success: true, relationship });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);
  
  // Autenticação
  socket.on('authenticate', (data) => {
    const { userId, username, petType } = data;
    
    if (users.has(userId)) {
      const user = users.get(userId);
      user.online = true;
      user.lastSeen = new Date();
      socket.userId = userId;
      socket.username = username;
      socket.petType = petType;
      
      socket.emit('authenticated', { success: true });
      io.emit('user_online', { userId, username, petType, petEmoji: user.petEmoji });
      
      console.log(`${username} autenticado`);
    } else {
      socket.emit('authenticated', { success: false, error: 'Usuário não encontrado' });
    }
  });
  
  // Entrar em uma sala
  socket.on('join_room', (roomId) => {
    if (!socket.userId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    socket.join(roomId);
    room.users.add(socket.userId);
    
    // Notificar outros usuários
    socket.to(roomId).emit('user_joined_room', {
      userId: socket.userId,
      username: socket.username,
      petType: socket.petType,
      petEmoji: getPetEmoji(socket.petType)
    });
    
    // Enviar lista de usuários na sala
    const roomUsers = Array.from(room.users).map(userId => {
      const user = users.get(userId);
      return {
        id: userId,
        username: user.username,
        petType: user.petType,
        petEmoji: user.petEmoji,
        mood: user.mood
      };
    });
    
    socket.emit('room_users', roomUsers);
    
    console.log(`${socket.username} entrou na sala ${roomId}`);
  });
  
  // Sair de uma sala
  socket.on('leave_room', (roomId) => {
    if (!socket.userId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    socket.leave(roomId);
    room.users.delete(socket.userId);
    
    socket.to(roomId).emit('user_left_room', {
      userId: socket.userId,
      username: socket.username
    });
    
    console.log(`${socket.username} saiu da sala ${roomId}`);
  });
  
  // Enviar mensagem
  socket.on('send_message', (data) => {
    const { roomId, message } = data;
    
    if (!socket.userId || !message.trim()) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const messageData = {
      id: uuidv4(),
      userId: socket.userId,
      username: socket.username,
      petType: socket.petType,
      petEmoji: getPetEmoji(socket.petType),
      message: message.trim(),
      timestamp: new Date()
    };
    
    // Salvar mensagem
    room.messages.push(messageData);
    if (room.messages.length > 100) {
      room.messages.shift(); // Manter apenas últimas 100 mensagens
    }
    
    // Enviar para todos na sala
    io.to(roomId).emit('new_message', messageData);
    
    console.log(`${socket.username} enviou mensagem em ${roomId}: ${message}`);
  });
  
  // Interação com pet
  socket.on('pet_interaction', (data) => {
    const { action, roomId } = data;
    
    if (!socket.userId) return;
    
    const user = users.get(socket.userId);
    if (!user) return;
    
    // Atualizar humor do pet
    const newMood = getNewMood(action, user.mood);
    user.mood = newMood;
    
    // Notificar outros usuários
    io.to(roomId).emit('pet_interaction_update', {
      userId: socket.userId,
      username: socket.username,
      action,
      newMood,
      petEmoji: user.petEmoji
    });
    
    console.log(`${socket.username} interagiu com pet: ${action}`);
  });
  
  // Solicitar relacionamento
  socket.on('request_relationship', (data) => {
    const { targetUserId, type } = data;
    
    if (!socket.userId) return;
    
    const targetUser = users.get(targetUserId);
    if (!targetUser) return;
    
    // Enviar notificação para o usuário alvo
    io.to(targetUserId).emit('relationship_request', {
      fromUserId: socket.userId,
      fromUsername: socket.username,
      fromPetType: socket.petType,
      fromPetEmoji: getPetEmoji(socket.petType),
      type
    });
    
    console.log(`${socket.username} solicitou relacionamento com ${targetUser.username}`);
  });
  
  // Responder solicitação de relacionamento
  socket.on('respond_relationship', (data) => {
    const { fromUserId, accepted, type } = data;
    
    if (!socket.userId) return;
    
    if (accepted) {
      // Criar relacionamento
      const relationship = {
        id: uuidv4(),
        userId: socket.userId,
        targetUserId: fromUserId,
        type,
        createdAt: new Date()
      };
      
      if (!relationships.has(socket.userId)) {
        relationships.set(socket.userId, []);
      }
      relationships.get(socket.userId).push(relationship);
      
      // Notificar ambos os usuários
      io.to(fromUserId).emit('relationship_accepted', {
        byUserId: socket.userId,
        byUsername: socket.username,
        type
      });
      
      io.to(socket.userId).emit('relationship_created', {
        withUserId: fromUserId,
        type
      });
    } else {
      // Rejeitar relacionamento
      io.to(fromUserId).emit('relationship_rejected', {
        byUserId: socket.userId,
        byUsername: socket.username
      });
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    if (socket.userId) {
      const user = users.get(socket.userId);
      if (user) {
        user.online = false;
        user.lastSeen = new Date();
      }
      
      // Remover de todas as salas
      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.userId)) {
          room.users.delete(socket.userId);
          socket.to(roomId).emit('user_left_room', {
            userId: socket.userId,
            username: socket.username
          });
        }
      });
      
      io.emit('user_offline', { userId: socket.userId, username: socket.username });
      console.log(`${socket.username} desconectado`);
    }
  });
});

// Funções auxiliares
function getPetEmoji(petType) {
  const petEmojis = {
    dog: '🐕',
    cat: '🐱',
    rabbit: '🐰',
    bird: '🐦',
    hamster: '🐹',
    fish: '🐠'
  };
  return petEmojis[petType] || '🐾';
}

function getNewMood(action, currentMood) {
  const moodChanges = {
    play: 'playful',
    feed: 'happy',
    pet: 'excited',
    hug: 'happy'
  };
  return moodChanges[action] || currentMood;
}

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota de health check para Vercel
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Sentipet Server rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`🌐 Status: http://localhost:${PORT}/api/status`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Servidor sendo encerrado...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Exportar para Vercel
module.exports = app; 