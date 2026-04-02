"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } var _express = require('express'); var _express2 = _interopRequireDefault(_express);
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var _compression = require('compression'); var _compression2 = _interopRequireDefault(_compression);
var _rateLimiter = require('./middleware/rateLimiter');
var _routeMiddleware = require('./middleware/routeMiddleware');
var _authRoutes = require('./routes/authRoutes'); var _authRoutes2 = _interopRequireDefault(_authRoutes);
var _descriptionRoutes = require('./routes/descriptionRoutes'); var _descriptionRoutes2 = _interopRequireDefault(_descriptionRoutes);
var _ssdRoutes = require('./routes/ssdRoutes'); var _ssdRoutes2 = _interopRequireDefault(_ssdRoutes);
var _checkingRoutes = require('./routes/checkingRoutes'); var _checkingRoutes2 = _interopRequireDefault(_checkingRoutes);
var _studentRoutes = require('./routes/studentRoutes'); var _studentRoutes2 = _interopRequireDefault(_studentRoutes);
var _classRoutes = require('./routes/classRoutes'); var _classRoutes2 = _interopRequireDefault(_classRoutes);
var _assignmentRoutes = require('./routes/assignmentRoutes'); var _assignmentRoutes2 = _interopRequireDefault(_assignmentRoutes);
var _submissionRoutes = require('./routes/submissionRoutes'); var _submissionRoutes2 = _interopRequireDefault(_submissionRoutes);
var _notificationRoutes = require('./routes/notificationRoutes'); var _notificationRoutes2 = _interopRequireDefault(_notificationRoutes);
var _errorHandler = require('./middleware/errorHandler');

const app = _express2.default.call(void 0,);

// Middleware
app.use(_cors2.default.call(void 0, {
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.set('trust proxy', true);
app.use(_compression2.default.call(void 0,));
app.use(_express2.default.json({ limit: '10mb' }));
app.use(_express2.default.urlencoded({ extended: true }));

// Request logging middleware
app.use(_routeMiddleware.requestLogger);

// Serve static files from uploads directory
app.use('/uploads', _express2.default.static('uploads'));

// Rate limiting
app.use('/api/', _rateLimiter.apiLimiter);
app.use('/api/auth', _rateLimiter.authLimiter);

// Routes
app.use('/api/auth', _authRoutes2.default);
app.use('/api/descriptions', _descriptionRoutes2.default);
app.use('/api/ssds', _ssdRoutes2.default);
app.use('/api/checking', _checkingRoutes2.default);
app.use('/api/classes', _classRoutes2.default);
app.use('/api/assignments', _assignmentRoutes2.default);
app.use('/api/submissions', _submissionRoutes2.default);
app.use('/api/notifications', _notificationRoutes2.default);
app.use('/api/student', _studentRoutes2.default);
app.use('/api/students', _studentRoutes2.default);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(_errorHandler.errorHandler);

exports.default = app;
