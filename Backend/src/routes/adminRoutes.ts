import { Router } from 'express';
import { getAdminStats, getAdminOrders, getAdminDrivers } from '../controllers/adminController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Protect all admin routes
router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/orders', getAdminOrders);
router.get('/drivers', getAdminDrivers);

export default router;