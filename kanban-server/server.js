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
    origin: '*', // we'll lock this down before deploying
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

// Test route
app.get('/', (req, res) => {
  res.send('Kanban API is running');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User joins a specific board's room
  socket.on('joinBoard', (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board ${boardId}`);
  });

  // User leaves a board's room
  socket.on('leaveBoard', (boardId) => {
    socket.leave(boardId);
    console.log(`Socket ${socket.id} left board ${boardId}`);
  });

  // A card was created — broadcast to others in the board
  socket.on('cardCreated', ({ boardId, card }) => {
    socket.to(boardId).emit('cardCreated', card);
  });

  // A card was moved — broadcast to others in the board
  socket.on('cardMoved', ({ boardId, card }) => {
    socket.to(boardId).emit('cardMoved', card);
  });

  // A list was created — broadcast to others
  socket.on('listCreated', ({ boardId, list }) => {
    socket.to(boardId).emit('listCreated', list);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});