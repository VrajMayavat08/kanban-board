const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');
const listRoutes = require('./routes/listRoutes');
const cardRoutes = require('./routes/cardRoutes');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// Test route
app.get('/', (req, res) => {
  res.send('Kanban API is running');
});

// Socket.io connection handling
// Tracks who is currently viewing each board: { boardId: { socketId: user } }
const boardPresence = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User joins a board room, now with identity
  socket.on('joinBoard', ({ boardId, user }) => {
    socket.join(boardId);
    socket.data.boardId = boardId;
    socket.data.user = user;

    if (!boardPresence[boardId]) boardPresence[boardId] = {};
    boardPresence[boardId][socket.id] = user;

    // Broadcast updated presence to everyone in the room (including sender)
    io.to(boardId).emit('presenceUpdate', Object.values(boardPresence[boardId]));
    console.log(`${user?.name} joined board ${boardId}`);
  });

  socket.on('leaveBoard', (boardId) => {
    removeFromPresence(socket, boardId);
    socket.leave(boardId);
  });

  socket.on('cardCreated', ({ boardId, card }) => {
    socket.to(boardId).emit('cardCreated', card);
  });

  socket.on('cardMoved', ({ boardId, card }) => {
    socket.to(boardId).emit('cardMoved', card);
  });

  socket.on('listCreated', ({ boardId, list }) => {
    socket.to(boardId).emit('listCreated', list);
  });

  socket.on('disconnect', () => {
    const boardId = socket.data.boardId;
    if (boardId) removeFromPresence(socket, boardId);
    console.log('User disconnected:', socket.id);
  });

  socket.on('cardDeleted', ({ boardId, cardId }) => {
    socket.to(boardId).emit('cardDeleted', cardId);
  });

  socket.on('listDeleted', ({ boardId, listId }) => {
    socket.to(boardId).emit('listDeleted', listId);
  });
});

// Helper: remove a socket from a board's presence and broadcast the update
function removeFromPresence(socket, boardId) {
  if (boardPresence[boardId]) {
    delete boardPresence[boardId][socket.id];
    if (Object.keys(boardPresence[boardId]).length === 0) {
      delete boardPresence[boardId];
    } else {
      io.to(boardId).emit('presenceUpdate', Object.values(boardPresence[boardId]));
    }
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});