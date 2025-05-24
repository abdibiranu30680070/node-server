const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

// Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://your-frontend-url.onrender.com', // Your live frontend
  'https://fmt-viw.onrender.com' // Example - replace with your actual frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Body parser configuration
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Improved error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Import routers
const adminRouter = require('./Routes/adminRouter.js');
const userRouter = require('./Routes/userRouter.js');
const appRouter = require('./Routes/appRouter.js');

// Use routers with proper error handling
app.use('/admin', adminRouter);
app.use('/api/users', userRouter); // More specific path recommended
app.use('/api', appRouter); // More specific path recommended

// Enhanced health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => { // Listen on all network interfaces
  console.log(`Server started successfully on port ${port}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
