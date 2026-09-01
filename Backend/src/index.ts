import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import adminRoutes from './routes/adminRoutes';
import { initSocket } from './services/socketService';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io WebSockets
initSocket(server);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server with WebSockets is running on port ${PORT}`);
});