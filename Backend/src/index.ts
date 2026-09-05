import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import adminRoutes from './routes/adminRoutes';
import storeRoutes from './routes/storeRoutes';
import { initSocket } from './services/socketService';
import paymentRoutes from './routes/paymentRoutes';

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});