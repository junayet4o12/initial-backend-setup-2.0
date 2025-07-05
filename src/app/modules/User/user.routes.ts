import express from 'express';
import auth from '../../middlewares/auth';
import { UserControllers } from './user.controller';
import { parseBody } from '../../middlewares/parseBody';
import validateRequest from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
import { upload } from '../../middlewares/upload';
const router = express.Router();


router.get('/', UserControllers.getAllUsers);

router.get('/me', auth('USER', 'SUPERADMIN'), UserControllers.getMyProfile);

router.get('/:id', UserControllers.getUserDetails);
router.put(
  '/update-profile',
  auth('USER', 'SUPERADMIN'),
  upload.single('image'),
  parseBody,
  validateRequest.body(userValidation.updateUser),
  UserControllers.updateMyProfile,
);

router.put(
  '/user-role/:id',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.updateUserRoleSchema),
  UserControllers.updateUserRoleStatus,
);
router.put(
  '/user-status/:id',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.updateUserStatus),
  UserControllers.updateUserStatus,
);


export const UserRouters = router;
