import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken, requireCircleTreasurer } from '../middleware/auth';

const router = Router();

// Public endpoint for basic user list (for reimbursement recipient selection)
router.get('/basic', authenticateToken, userController.getBasicUsers);

// Profile management - available to all authenticated users
router.get('/me', authenticateToken, userController.getCurrentUser);
router.patch('/me', authenticateToken, userController.updateOwnProfile);
router.patch('/me/password', authenticateToken, userController.changeOwnPassword);

// All other user management routes require authentication and Circle Treasurer role
router.use(authenticateToken);
router.use(requireCircleTreasurer);

// Create new user
router.post('/', userController.createUser);

// Get all users with their groups
router.get('/', userController.getAllUsers);

// Get single user by ID with their groups
router.get('/:id', userController.getUserById);

// Update user role (Circle Treasurer, Group Treasurer, or Member)
router.patch('/:id/role', userController.updateUserRole);

// Reset user password (Circle Treasurer only)
router.patch('/:id/reset-password', userController.resetUserPassword);

// Assign user to a group
router.post('/:id/groups', userController.assignUserToGroup);

// Remove user from a group
router.delete('/:id/groups/:groupId', userController.removeUserFromGroup);

// Get all groups for a specific user
router.get('/:id/groups', userController.getUserGroups);

export default router;
