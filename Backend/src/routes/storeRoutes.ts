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
router.get('/', getPartnerStores);

// Partner protected endpoints
router.get('/my-store', authenticateJWT, authorizeRoles('PARTNER'), getMyStore);
router.post('/location/initial', authenticateJWT, authorizeRoles('PARTNER'), setInitialLocation);
router.post('/location/request-change', authenticateJWT, authorizeRoles('PARTNER'), requestLocationChange);
router.post('/menu', authenticateJWT, authorizeRoles('PARTNER'), addMenuItem);
router.delete('/menu/:itemId', authenticateJWT, authorizeRoles('PARTNER'), deleteMenuItem);

export default router;