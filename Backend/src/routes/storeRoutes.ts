import { Router } from 'express';
import { 
  getPartnerStores, 
  getMyStore, 
  setInitialLocation, 
  requestLocationChange, 
  addMenuItem, 
  deleteMenuItem 
} from '../controllers/storeController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Public: Customers explore all stores
router.get('/my-store', authenticateJWT, authorizeRoles('PARTNER'), getMyStore as any);
router.post('/location/initial', authenticateJWT, authorizeRoles('PARTNER'), setInitialLocation as any);
router.post('/location/request-change', authenticateJWT, authorizeRoles('PARTNER'), requestLocationChange as any);
router.post('/menu', authenticateJWT, authorizeRoles('PARTNER'), addMenuItem as any);
router.delete('/menu/:itemId', authenticateJWT, authorizeRoles('PARTNER'), deleteMenuItem as any);

export default router;