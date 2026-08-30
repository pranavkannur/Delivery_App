import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import { initSocket } from './services/socketService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for both Express and WebSockets
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Health check / Root route
app.get('/', (req: Request, res: Response) => {
  res.send('Delivery App API & WebSocket Server is running');
});

// Start Server with WebSocket support
server.listen(PORT, () => {
  console.log(`🚀 Server with WebSockets is running on port ${PORT}`);
});