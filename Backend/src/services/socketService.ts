import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import prisma from '../config/db';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow frontend apps to connect
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`⚡ WebSocket client connected: ${socket.id}`);

    // Customer or Driver joins a room dedicated to an active order
    socket.on('join_order_room', (orderId: string) => {
      socket.join(`order_${orderId}`);
      console.log(`📦 Socket ${socket.id} joined room: order_${orderId}`);
    });

    // Driver emits live GPS coordinates
    socket.on('driver_location_update', async (data: {
      orderId: string;
      driverId: string;
      latitude: number;
      longitude: number;
    }) => {
      const { orderId, driverId, latitude, longitude } = data;

      try {
        // 1. Update driver's latest position & log tracking point
        await prisma.$transaction([
          prisma.driver.update({
            where: { id: driverId },
            data: { latitude, longitude },
          }),
          prisma.trackingLog.create({
            data: {
              orderId,
              latitude,
              longitude,
            },
          }),
        ]);

        // 2. Broadcast coordinates to everyone in this order's room (the customer!)
        socket.to(`order_${orderId}`).emit('live_driver_location', {
          orderId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error logging live driver location:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Helper function to emit real-time events from controllers
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};