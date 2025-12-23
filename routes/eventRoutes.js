import express from 'express';
import {
  createEvent,
  getEvents,
  getEvent,
  deleteEvent,
  checkIn,
  triggerStartOTP,
  verifyStartOTP,
  uploadSetupPhotos,
  triggerClosingOTP,
  verifyClosingOTP
} from '../controllers/eventController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Event CRUD
router.route('/')
  .get(protect, getEvents)
  .post(protect, createEvent);

router.route('/:id')
  .get(protect, getEvent)
  .delete(protect, deleteEvent);

// Vendor Check-In
router.post('/:id/checkin', protect, upload.single('arrivalPhoto'), checkIn);

// Customer OTP for Start
router.post('/:id/start-otp', protect, triggerStartOTP);
router.post('/:id/verify-start-otp', protect, verifyStartOTP);

// Event Setup Photos
router.post('/:id/setup-photos', protect, upload.array('photos', 10), uploadSetupPhotos);

// Customer OTP for Closing
router.post('/:id/closing-otp', protect, triggerClosingOTP);
router.post('/:id/verify-closing-otp', protect, verifyClosingOTP);

export default router;
