import * as bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { generateToken } from '../../utils/generateToken';
import prisma from '../../utils/prisma';
import { User } from '@prisma/client';
import { verification } from '../../utils/generateEmailVerificationLink';
import Email, { sendOtpViaMail } from '../../utils/sendMail';
import { Response } from 'express';
import { generateOTP, getOtpStatusMessage, otpExpiryTime } from '../../utils/otp';
import jwt from 'jsonwebtoken'
import { verifyOtp } from '../../utils/verifyOtp';
import sendResponse from '../../utils/sendResponse';
const loginUserFromDB = async (res: Response, payload: {
  email: string;
  password: string;
}) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });
  const isCorrectPassword: Boolean = await bcrypt.compare(
    payload.password,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  if (userData.role !== 'SUPERADMIN' && (!userData.email || !userData.emailVerificationTokenExpires || new Date(userData.emailVerificationTokenExpires) < new Date())) {
    const otp = generateOTP();

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.update({
        where: { email: userData.email },
        data: {
          otp,
          otpExpiry: otpExpiryTime(),
        },
      });

      try {
        await sendOtpViaMail(newUser.email, otp);
        sendResponse(res, {
          statusCode: httpStatus.OK,
          message: ' Please check your email for the verification link.',
          data: '',
        });
      } catch {
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
      }

    });
  } else {
    const accessToken = await generateToken(
      {
        id: userData.id,
        name: userData.firstName + ' ' + userData.lastName,
        email: userData.email,
        role: userData.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );
    return {
      id: userData.id,
      name: userData.firstName + ' ' + userData.lastName,
      email: userData.email,
      role: userData.role,
      accessToken: accessToken,
    };
  }


};

const registerUserIntoDB = async (payload: User) => {
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  const isUserExistWithTheGmail = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (isUserExistWithTheGmail?.id) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists');
  }

  const otp = generateOTP();
  const userData: User = {
    ...payload,
    password: hashedPassword,
    otp,
    otpExpiry: otpExpiryTime(),
  };

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: userData,
    });

    try {
      await sendOtpViaMail(newUser.email, otp);
    } catch {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
    }
  });
};

const verifyMail = async (payload: { email: string; otp: string }) => {
  const { userData } = await verifyOtp(payload);
  await prisma.user.update({
    where: {
      email: userData.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
      isEmailVerified: true,
      emailVerificationToken: verification.generateEmailVerificationToken(),
      emailVerificationTokenExpires: new Date(Date.now() + 3600 * 1000),
    },
    select: {
      id: true
    }
  });

  const accessToken = await generateToken(
    {
      id: userData.id,
      name: userData.firstName + ' ' + userData.lastName,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );
  return {
    id: userData.id,
    name: userData.firstName + ' ' + userData.lastName,
    email: userData.email,
    role: userData.role,
    accessToken: accessToken,
  };
}


const changePassword = async (user: any, payload: any) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: 'ACTIVE',
    },
  });

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.oldPassword,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new Error('Password incorrect!');
  }

  const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: 'Password changed successfully!',
  };
};

const resendUserVerificationEmail = async (email: string) => {
  const [emailVerificationLink, hashedToken] =
    verification.generateEmailVerificationLink();

  const user = await prisma.user.update({
    where: { email: email },
    data: {
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: new Date(Date.now() + 3600 * 1000),
    },
  });

  const emailSender = new Email(user);
  await emailSender.sendEmailVerificationLink(
    'Email verification link',
    emailVerificationLink,
  );
  return user;
};

const forgetPassword = async (email: string) => {

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email
    },
    select: {
      status: true,
      id: true,
      otpExpiry: true,
      otp: true
    }
  });


  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'User has blocked')
  }
  if (userData.otp && userData.otpExpiry && new Date(userData.otpExpiry).getTime() > Date.now()) {
    const message = getOtpStatusMessage(userData.otpExpiry);
    throw new AppError(httpStatus.CONFLICT, message)
  }
  const otp = generateOTP()
  const expireTime = otpExpiryTime()
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email },
        data: {
          otp, otpExpiry: expireTime
        }
      });
      try {
        await sendOtpViaMail(email, otp);
      } catch (emailErr) {
        await tx.user.update({
          where: { email },
          data: {
            otp: null,
            otpExpiry: null,
          },
        })
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
      }
    })
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP');
  }
}
const verifyForgotPassOtp = async (payload: { email: string; otp: string }) => {

  const { userData } = await verifyOtp(payload)


  // Create token for password reset
  const resetToken = generateToken(
    {
      id: userData.id,
      name: userData.firstName + ' ' + userData.lastName,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    '600s',
  );

  const resetUILink = `${config.base_url_client}/auth/reset-password?email=${userData.email}&token=${resetToken}`;

  // Prisma transaction
  await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
    },
  });

  return { resetUILink, expireInMinutes: 5 };
}

const resetPassword = async (payload: {
  email: string;
  newPassword: string;
}, token: string) => {
  if (!token) {
    throw new AppError(httpStatus.FORBIDDEN, 'Token is missing!')
  }

  const userData = await prisma.user.findFirstOrThrow({
    where: {
      email: payload.email,
    },
  })

  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'User has blocked')
  }

  const decoded = jwt.verify(token, config.jwt.access_secret as string) as JwtPayload

  const { email, role, } = decoded;
  if (email !== payload.email) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are forbidden!')
  }



  if (!decoded || !decoded.exp) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
  }

  const newHashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds))

  await prisma.user.update({
    where: {
      email: email
    },
    data: {
      password: newHashedPassword,
    }
  })
}



export const AuthServices = {
  loginUserFromDB,
  registerUserIntoDB,
  changePassword,
  resendUserVerificationEmail,
  forgetPassword,
  verifyForgotPassOtp,
  resetPassword,
  verifyMail
};


