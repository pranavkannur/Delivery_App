import { Router } from 'express';
import {
  createOrder,
  getAvailableOrders,
  getOrders,
  acceptOrder,
  updateOrderStatus,
  completeDelivery,
} from '../controllers/orderController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Protect all order routes with JWT authentication
router.use(authenticateJWT);

// Customer creates an order
router.post('/', authorizeRoles('CUSTOMER'), createOrder);

// Driver views available unassigned orders
router.get('/available', authorizeRoles('DRIVER'), getAvailableOrders);

// Get user orders (Customer sees their orders, Driver sees their assigned orders)
router.get('/', getOrders);

// Driver accepts a pending order
router.put('/:orderId/accept', authorizeRoles('DRIVER'), acceptOrder);

// Driver updates status to PICKED_UP
router.put('/:orderId/status', authorizeRoles('DRIVER'), updateOrderStatus);

// Driver completes delivery with Customer OTP
router.post('/:orderId/complete', authorizeRoles('DRIVER'), completeDelivery);

export default router;