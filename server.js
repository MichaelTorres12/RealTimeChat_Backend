const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'https://real-time-chat-frontend-bay.vercel.app',
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.use(cors({
  origin: 'https://real-time-chat-frontend-bay.vercel.app',
  methods: ["GET", "POST"],
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
  if (req.file) {
    res.json({ imageUrl: `https://real-time-chat-backend.vercel.app/uploads/${req.file.filename}` });
  } else {
    res.status(400).send('Error al subir la imagen');
  }
});

app.get('/', (req, res) => {
  res.send('Backend del chat en tiempo real');
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  socket.on('joinRoom', ({ username, room }) => {
    socket.join(room);
    console.log(`${username} se ha unido a la sala ${room}`);

    if (rooms[room]) {
      socket.emit('message', {
        user: 'admin',
        text: `Bienvenido a la sala ${room}`,
        history: rooms[room],
      });
    } else {
      rooms[room] = [];
    }

    socket.to(room).emit('message', {
      user: 'admin',
      text: `${username} se ha unido a la sala.`,
    });

    socket.on('message', (message) => {
      const newMessage = { user: username, text: message };
      rooms[room].push(newMessage);
      io.to(room).emit('message', newMessage);
    });

    socket.on('image', (image) => {
      const newMessage = { user: username, image };
      rooms[room].push(newMessage);
      io.to(room).emit('message', newMessage);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
      socket.to(room).emit('message', {
        user: 'admin',
        text: `${username} ha abandonado la sala.`,
      });
    });
  });
});

// No se requiere la escucha explícita del puerto
// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => {
//   console.log(`Servidor escuchando en el puerto ${PORT}`);
// });

module.exports = app;
module.exports.server = server;
