import { validationResult } from 'express-validator';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const first = errors.array({ onlyFirstError: true })[0];
  return res.status(400).json({
    success: false,
    message: first?.msg || 'Invalid request',
    errors: errors.array()
  });
};

export default validateRequest;
