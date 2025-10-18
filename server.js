// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // para testes; restrinja em produção
});

const PORT = process.env.PORT || 3000;

let broadcasterSocketId = null;

io.on('connection', socket => {
  console.log('conn:', socket.id);

  socket.on('broadcaster-register', () => {
    broadcasterSocketId = socket.id;
    console.log('broadcaster registered:', broadcasterSocketId);
  });

  socket.on('watcher-join', () => {
    if (broadcasterSocketId) {
      io.to(broadcasterSocketId).emit('watcher-joined', socket.id);
    } else {
      socket.emit('no-broadcaster');
    }
  });

  socket.on('offer', ({ watcherId, sdp }) => {
    io.to(watcherId).emit('offer', { sdp, broadcasterId: socket.id });
  });

  socket.on('answer', ({ broadcasterId, sdp }) => {
    io.to(broadcasterId).emit('answer', { sdp, watcherId: socket.id });
  });

  socket.on('ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('disc:', socket.id);
    if (socket.id === broadcasterSocketId) {
      broadcasterSocketId = null;
      io.emit('broadcaster-left');
    } else {
      if (broadcasterSocketId) {
        io.to(broadcasterSocketId).emit('watcher-left', socket.id);
      }
    }
  });
});

app.get('/', (req, res) => res.send('Signaling server is running'));

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
