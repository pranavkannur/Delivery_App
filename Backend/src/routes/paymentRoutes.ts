import { Router } from 'express';
import { createRazorpayOrder, verifyAndPlaceOrder } from '../controllers/paymentController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('CUSTOMER'));

// Customer endpoints
router.post('/create-order', createRazorpayOrder as any);
router.post('/verify', verifyAndPlaceOrder as any);

export default router;