import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserFromDB(res,req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const registerUser = catchAsync(async (req, res) => {
  const result = await AuthServices.registerUserIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message:
      'User registered successfully. Please check your email for the verification link.',
    data: result,
  });
});

const resendUserVerificationEmail = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthServices.resendUserVerificationEmail(email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification email sent successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await AuthServices.changePassword(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.forgetPassword(req.body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification Otp has sent to email!!!',
    data: result,
  });
});
const verifyMail = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyMail(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Mail Verified',
    data: result,
  });
});
const verifyForgotPassOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyForgotPassOtp(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: ' Otp has verified.!',
    data: result,
  });
});
const resetPassword = catchAsync(async (req, res) => {
  const token = req.headers.authorization as string
  const result = await AuthServices.resetPassword(req.body, token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: result,
  });
});



export const AuthControllers = {
  loginUser,
  registerUser,
  changePassword,
  resendUserVerificationEmail,
  forgetPassword,
  verifyForgotPassOtp,
  resetPassword,
  verifyMail
};
