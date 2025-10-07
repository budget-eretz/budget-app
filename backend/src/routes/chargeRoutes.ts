import { Router } from 'express';
import * as chargeController from '../controllers/chargeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/my', chargeController.getMyCharges);
router.post('/', chargeController.createCharge);
router.patch('/:id', chargeController.updateCharge);
router.delete('/:id', chargeController.deleteCharge);

export default router;
