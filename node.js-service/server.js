require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',           // Local dev frontend
  'https://frnt-viw.onrender.com',   // Production frontend
  'https://node-server-1gbx.onrender.com' // Backend (maybe another environment)
];

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser requests (curl, postman)
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.render.com') // Allow all subdomains of render.com
    ) {
      return callback(null, true);
    }
    console.warn(`CORS blocked for origin: ${origin}`);
    callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Body parser setup
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/admin', require('./Routes/adminRouter'));
app.use('/api/users', require('./Routes/userRouter'));
app.use('/api', require('./Routes/appRouter'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected' // You can improve by adding real DB health check
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Server is running',
    frontend: 'https://frnt-viw.onrender.com',
    endpoints: {
      health: '/health',
      users: '/api/users',
      admin: '/admin'
    }
  });
});

// 404 handler (must come before error handler)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
});
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server on environment port or fallback to 4000 (or your preferred port)
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Frontend URL: https://frnt-viw.onrender.com`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
