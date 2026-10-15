/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Defines the Express endpoints for room API operations.
 */

import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  archiveRoom,
  attachRoomImage,
  createRoom,
  createRoomImageUpload,
  getRoom,
  listRooms,
  removeRoomImage,
  searchAvailability,
  updateRoom,
} from '../controllers/roomController';
import {
  validateAttachRoomImage,
  validateCreateRoom,
  validateRoomImageUpload,
  validateUpdateRoom,
} from '../middleware/validation';

const router = Router();

router.get('/availability', authenticate, searchAvailability);
router.get('/', authenticate, listRooms);
router.post('/', authenticate, requireRoles(['MANAGER']), validateCreateRoom, createRoom);
router.post('/:id/image-upload', authenticate, requireRoles(['MANAGER']), validateRoomImageUpload, createRoomImageUpload);
router.post('/:id/image', authenticate, requireRoles(['MANAGER']), validateAttachRoomImage, attachRoomImage);
router.delete('/:id/image', authenticate, requireRoles(['MANAGER']), removeRoomImage);
router.get('/:id', authenticate, getRoom);
router.patch('/:id', authenticate, requireRoles(['MANAGER']), validateUpdateRoom, updateRoom);
router.delete('/:id', authenticate, requireRoles(['MANAGER']), archiveRoom);

export default router;
