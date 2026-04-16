import { Router } from 'express';
import * as groupBankTransferController from '../controllers/groupBankTransferController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireTreasurer);

router.get('/stats', groupBankTransferController.getGroupBankTransferStats);
router.get('/', groupBankTransferController.getGroupBankTransfers);
router.post('/', groupBankTransferController.createGroupBankTransfer);
router.post('/:id/execute', groupBankTransferController.executeGroupBankTransfer);
router.delete('/:id', groupBankTransferController.deleteGroupBankTransfer);

export default router;
