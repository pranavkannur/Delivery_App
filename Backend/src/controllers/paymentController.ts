import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getIO } from '../services/socketService';

// Razorpay Test Keys (Can be configured in .env or defaults to official test sandbox)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

// 1. Create a Razorpay Order
export const createRazorpayOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body; // Amount in INR Rupees
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Valid amount is required' });
      return;
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    const receiptId = `rcpt_${crypto.randomBytes(4).toString('hex')}`;

    // If real keys are provided, call Razorpay REST API
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const authHeader = 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receiptId,
        }),
      });

      const orderData = await response.json();
      if (!response.ok) {
        res.status(response.status).json({ error: orderData.error?.description || 'Razorpay order creation failed' });
        return;
      }

      res.status(200).json({
        razorpayOrderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
      return;
    }

    // Default: Mock sandbox mode if keys not yet set in .env
    const mockOrderId = `order_${crypto.randomBytes(7).toString('hex')}`;
    res.status(200).json({
      razorpayOrderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      isMock: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error initializing payment' });
  }
};

// 2. Verify Razorpay Payment & Place Order
export const verifyAndPlaceOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const customerId = req.user.id;

    const {
      pickupAddress,
      deliveryAddress,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      items,
      totalAmount,
      paymentMethod, // 'RAZORPAY' | 'CASH_ON_DELIVERY'
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    let verified = false;

    if (paymentMethod === 'RAZORPAY') {
      if (process.env.RAZORPAY_KEY_SECRET && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
        // Cryptographic HMAC SHA256 Verification
        const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (generatedSignature === razorpaySignature) {
          verified = true;
        } else {
          res.status(400).json({ error: 'Payment verification failed: Invalid cryptographic signature' });
          return;
        }
      } else {
        // Test / Sandbox mode approval
        verified = true;
      }
    }

    // Generate Order receipt ID (e.g. ORD-A3F82C91) and Handover OTP
    const orderId = `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const order = await prisma.order.create({
      data: {
        id: orderId,
        customerId,
        pickupAddress,
        deliveryAddress,
        pickupLat: parseFloat(pickupLat) || 0,
        pickupLng: parseFloat(pickupLng) || 0,
        deliveryLat: parseFloat(deliveryLat) || 0,
        deliveryLng: parseFloat(deliveryLng) || 0,
        items,
        totalAmount: parseFloat(totalAmount),
        deliveryOtp,
        status: 'PENDING',
        paymentMethod: paymentMethod === 'CASH_ON_DELIVERY' ? 'CASH_ON_DELIVERY' : 'RAZORPAY',
        paymentStatus: verified ? 'PAID' : 'PENDING',
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
      },
    });

    // Notify connected drivers via WebSocket
    try {
      getIO().emit('new_order_available', {
        orderId: order.id,
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      });
    } catch (socketErr) {
      console.warn('Socket broadcast failed:', socketErr);
    }

    res.status(201).json({
      message: verified ? 'Payment successful! Order placed with store.' : 'Order placed with Cash on Delivery.',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error finalizing order payment' });
  }
};