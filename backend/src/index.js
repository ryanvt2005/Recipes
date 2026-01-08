require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./config/logger');
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const shoppingListRoutes = require('./routes/shoppingListRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());

// CORS configuration - Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/recipes', recipeRoutes);
app.use('/api/v1/shopping-lists', shoppingListRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource was not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
