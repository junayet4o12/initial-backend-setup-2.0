import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { authValidation } from './auth.validation';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post(
  '/login',
  validateRequest.body(authValidation.loginUser),
  AuthControllers.loginUser,
);

router.post(
  '/register',
  validateRequest.body(authValidation.registerUser),
  AuthControllers.registerUser,
);
router.post(
  '/verify-email',
  validateRequest.body(authValidation.verifyOtpValidationSchema),
  AuthControllers.verifyMail,
);
router.post(
  '/resend-verification-email',
  validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.resendVerificationEmail,
);


router.post(
  '/change-password',
  auth('USER', 'SUPERADMIN'),
  AuthControllers.changePassword,
);
router.post(
  '/forget-password',
  validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);
router.post(
  '/forget-password/verify-otp',
  validateRequest.body(authValidation.verifyOtpValidationSchema),
  AuthControllers.verifyForgotPassOtp,
);
router.post(
  '/reset-password',
  validateRequest.body(authValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

export const AuthRouters = router;
