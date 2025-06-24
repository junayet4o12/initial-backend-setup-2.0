import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import prisma from '../../utils/prisma';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';


interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}
// Function to get the keys of a model
async function getModelKeys(modelName: string): Promise<string[]> {
  try {
    // Dynamically access the model from the Prisma client
    const model = (prisma as any)[modelName];  // Type assertion to 'any'

    if (!model) {
      console.warn(`Model '${modelName}' not found on Prisma client.`);
      return [];
    }

    // Attempt to find the first record of the model
    const sampleRecord = await model.findFirst();

    if (!sampleRecord) {
      console.warn(`No records found for model '${modelName}'. Ensure your database has at least one record to correctly retrieve model keys.`);
      return [];
    }

    // Extract the keys from the sample record object
    const keys = Object.keys(sampleRecord);
    return keys;

  } catch (error) {
    console.error(`Error getting model keys for '${modelName}':`, error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}
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
  // Destructure user base fields from payload
  delete payload?.profile
  if (file) {
    const { Location } = await uploadToDigitalOceanAWS(file)
    payload.profile = Location
  }

  const result = await prisma.user.update({
    where: {
      id
    },
    data: payload
  })
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








