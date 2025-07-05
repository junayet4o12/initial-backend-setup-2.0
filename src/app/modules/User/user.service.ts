import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import prisma from '../../utils/prisma';
import { deleteFile, uploadSingleFile } from '../../utils/uploadFiles';
import { getModelKeys } from '../../utils/getModelKeys';

const getAllUsersFromDB = async (query: any) => {
  const keys = await getModelKeys('user');
  const usersQuery = new QueryBuilder<typeof prisma.user>(prisma.user, query, keys);
  const result = await usersQuery
    .search(['firstName', 'lastName', 'email'])
    .filter()
    .sort()
    .fields()
    .exclude()
    .paginate()
    .execute();
  const pagination = await usersQuery.countTotal();

  return {
    meta: pagination,
    result,
  };
};

const getMyProfileFromDB = async (id: string) => {
  const Profile = await prisma.user.findUniqueOrThrow({
    where: {
      id: id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Profile;
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

const updateMyProfileIntoDB = async (
  id: string,
  file: Express.Multer.File | undefined,
  payload: Partial<User>,
) => {
  delete payload?.profile
  const userDetails = await prisma.user.findUniqueOrThrow({
    where: {
      id
    },
    select: {
      id: true,
      profile: true
    }
  })
  if (file) {
    const location = uploadSingleFile(file)
    payload.profile = location
  }

  const result = await prisma.user.update({
    where: {
      id
    },
    data: payload
  })
  if (userDetails.profile) {
    deleteFile(userDetails.profile)
  }
  return result
};

const updateUserRoleStatusIntoDB = async (id: string, role: UserRoleEnum) => {
  const result = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      role: role
    },
  });
  return result;
};
const updateProfileStatus = async (id: string, status: UserStatus) => {
  const result = await prisma.user.update({
    where: {
      id
    },
    data: {
      status
    },
    select: {
      id: true,
      status: true,
      role: true
    },
  })
  return result
}



export const UserServices = {
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateMyProfileIntoDB,
  updateUserRoleStatusIntoDB,
  updateProfileStatus
};








