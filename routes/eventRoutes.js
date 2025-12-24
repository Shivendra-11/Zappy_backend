import express from 'express';
import { body, param } from 'express-validator';
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
  verifyClosingOTP,
  getEventAnalytics
} from '../controllers/eventController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

// Analytics
router.get('/analytics', protect, getEventAnalytics);

// Event CRUD
router.route('/')
  .get(protect, getEvents)
  .post(
    protect,
    [
      body('eventName')
        .trim()
        .notEmpty().withMessage('Event name is required')
        .isLength({ min: 2, max: 120 }).withMessage('Event name must be 2-120 characters'),
      body('customerName')
        .trim()
        .notEmpty().withMessage('Customer name is required')
        .isLength({ min: 2, max: 120 }).withMessage('Customer name must be 2-120 characters'),
      body('customerEmail')
        .trim()
        .notEmpty().withMessage('Customer email is required')
        .isEmail().withMessage('Please provide a valid customer email')
        .normalizeEmail(),
      body('customerPhone')
        .trim()
        .notEmpty().withMessage('Customer phone is required')
        .isLength({ min: 7, max: 20 }).withMessage('Customer phone must be 7-20 characters'),
      body('eventDate')
        .notEmpty().withMessage('Event date is required')
        .isISO8601().withMessage('Event date must be a valid date (YYYY-MM-DD)')
        .toDate(),
      body('location')
        .trim()
        .notEmpty().withMessage('Please provide event location')
        .isLength({ min: 2, max: 200 }).withMessage('Location must be 2-200 characters')
    ],
    validateRequest,
    createEvent
  );

router.route('/:id')
  .get(protect, getEvent)
  .delete(protect, deleteEvent);

// Vendor Check-In
router.post('/:id/checkin', protect, upload.single('arrivalPhoto'), checkIn);

// Customer OTP for Start
router.post(
  '/:id/start-otp',
  protect,
  [param('id').isMongoId().withMessage('Invalid event id')],
  validateRequest,
  triggerStartOTP
);
router.post(
  '/:id/verify-start-otp',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid event id'),
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required')
      .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit number')
  ],
  validateRequest,
  verifyStartOTP
);

// Event Setup Photos
router.post('/:id/setup-photos', protect, upload.array('photos', 10), uploadSetupPhotos);

// Customer OTP for Closing
router.post(
  '/:id/closing-otp',
  protect,
  [param('id').isMongoId().withMessage('Invalid event id')],
  validateRequest,
  triggerClosingOTP
);
router.post(
  '/:id/verify-closing-otp',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid event id'),
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required')
      .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit number')
  ],
  validateRequest,
  verifyClosingOTP
);

export default router;
