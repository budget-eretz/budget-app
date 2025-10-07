import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import { authenticateToken, requireCircleTreasurer } from '../middleware/auth';

const router = Router();

// All group management routes require Circle Treasurer access
router.get('/', authenticateToken, requireCircleTreasurer, groupController.getAllGroups);
router.get('/:id', authenticateToken, requireCircleTreasurer, groupController.getGroupById);
router.post('/', authenticateToken, requireCircleTreasurer, groupController.createGroup);
router.patch('/:id', authenticateToken, requireCircleTreasurer, groupController.updateGroup);
router.delete('/:id', authenticateToken, requireCircleTreasurer, groupController.deleteGroup);
router.get('/:id/members', authenticateToken, requireCircleTreasurer, groupController.getGroupMembers);

export default router;
