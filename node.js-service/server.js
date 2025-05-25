require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());

// Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://frnt-viw.onrender.com', // Your frontend
  'https://node-server-1gbx.onrender.com' // Your backend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all subdomains of render.com for flexibility
    if (allowedOrigins.some(allowed => origin === allowed) || 
        origin.endsWith('.render.com')) {
      return callback(null, true);
    }
    
    const msg = `CORS blocked for origin: ${origin}`;
    console.warn(msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: [
    'Content-Length',
    'Authorization'
  ],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// Body parser configuration
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const adminRouter = require('./Routes/adminRouter');
const userRouter = require('./Routes/userRouter');
const appRouter = require('./Routes/appRouter');

app.use('/admin', adminRouter);
app.use('/api/users', userRouter);
app.use('/api', appRouter);

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected' // Add your DB status check here
  });
});

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

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Server setup
const port = process.env.PORT || 10000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on port ${port}`);
  console.log(`Frontend: https://frnt-viw.onrender.com`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
