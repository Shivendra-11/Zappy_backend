import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { body } from 'express-validator';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.post(
	'/register',
	[
		body('name')
			.trim()
			.notEmpty().withMessage('Name is required')
			.isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
		body('email')
			.trim()
			.notEmpty().withMessage('Email is required')
			.isEmail().withMessage('Please provide a valid email')
			.normalizeEmail(),
		body('password')
			.notEmpty().withMessage('Password is required')
			.isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
			.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)
			.withMessage('Password must include uppercase, lowercase, number, and special character'),
		body('phone')
			.trim()
			.notEmpty().withMessage('Phone is required')
			.isLength({ min: 7, max: 20 }).withMessage('Phone must be 7-20 characters')
	],
	validateRequest,
	register
);

router.post(
	'/login',
	[
		body('email')
			.trim()
			.notEmpty().withMessage('Email is required')
			.isEmail().withMessage('Please provide a valid email')
			.normalizeEmail(),
		body('password')
			.notEmpty().withMessage('Password is required')
	],
	validateRequest,
	login
);
router.get('/me', protect, getMe);

export default router;
