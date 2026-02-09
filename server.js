const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' }
});

// Track connected clients
let senders = 0;
let receivers = 0;

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Client identifies as sender or receiver
  socket.on('register', (role) => {
    socket.role = role;
    if (role === 'sender') {
      senders++;
      socket.join('senders');
    } else if (role === 'receiver') {
      receivers++;
      socket.join('receivers');
    }
    // Broadcast updated client counts
    io.emit('clients', { senders, receivers });
    console.log(`Registered ${role}: ${socket.id} (senders: ${senders}, receivers: ${receivers})`);
  });

  // Relay settings from sender to all receivers
  socket.on('settings', (data) => {
    io.to('receivers').emit('settings', data);
  });

  // Latency ping: sender -> server -> receiver -> server -> sender
  socket.on('ping-test', (data) => {
    data.serverReceived = Date.now();
    io.to('receivers').emit('ping-test', data);
  });

  socket.on('pong-test', (data) => {
    data.receiverEchoed = Date.now();
    io.to('senders').emit('pong-test', data);
  });

  // Burst test: relay rapid messages
  socket.on('burst', (data) => {
    io.to('receivers').emit('burst', data);
  });

  socket.on('burst-ack', (data) => {
    io.to('senders').emit('burst-ack', data);
  });

  socket.on('disconnect', () => {
    if (socket.role === 'sender') senders = Math.max(0, senders - 1);
    if (socket.role === 'receiver') receivers = Math.max(0, receivers - 1);
    io.emit('clients', { senders, receivers });
    console.log(`Disconnected: ${socket.id} (senders: ${senders}, receivers: ${receivers})`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
