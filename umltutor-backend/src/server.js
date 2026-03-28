"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _dotenv = require('dotenv'); var _dotenv2 = _interopRequireDefault(_dotenv);
const { initializeApplication } = require('./utils/startup');

// Load environment variables immediately
_dotenv2.default.config();

// Initialize application directories and checks (silent by default)
initializeApplication();

var _http = require('http');
var _socketio = require('socket.io');
var _express = require('express'); var _express2 = _interopRequireDefault(_express);
var _app = require('./app'); var _app2 = _interopRequireDefault(_app);

const httpServer = _http.createServer.call(void 0, _app2.default);
const io = new (0, _socketio.Server)(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve uploaded files statically
_app2.default.use('/uploads', _express2.default.static('uploads'));

// Socket.IO setup (if needed)
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  httpServer.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Error: Port ${PORT} is already in use.`);
      console.error(`Try killing the process using this port or change the PORT in your .env file.`);
      process.exit(1);
    } else {
      console.error('Server error:', e);
      process.exit(1);
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

exports.httpServer = httpServer; exports.io = io;


