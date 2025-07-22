import httpStatus from 'http-status';
import { notificationServices } from '../Notification/notification.service';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import { Message } from '@prisma/client';
import prisma from '../../utils/prisma';
import { getSocket } from '../../utils/socket';
import AppError from '../../errors/AppError';

type UploadResponse = {
    Location: string;
};



const sendMessage = async (
    senderId: string,
    payload: Message,
    files: Express.Multer.File[] | undefined,
) => {
    // Option 4: Parallel uploads with settled results (continues even if some fail)
    payload.senderId = senderId
    if (files && files.length > 0) {
        const uploadPromises = files.map(file => uploadToDigitalOceanAWS(file));
        const results = await Promise.allSettled(uploadPromises);

        const urls = results
            .filter(
                (result): result is PromiseFulfilledResult<UploadResponse> =>
                    result.status === 'fulfilled',
            )
            .map(result => result.value.Location);

        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`${failures.length} uploads failed`);
        }

        console.log(urls);
        payload.fileUrls = urls;
    }

    const res = await prisma.message.create({
        data: payload,
        include: {
            sender: true,
            receiver: true,
        },
    });

    const io = getSocket();
    io.to(payload.receiverId).emit('message', res);
    io.to(payload.senderId).emit('message', res);
    notificationServices.createNotification({
        message: `${(res?.content ?? '').slice(0, 70)}`,
        title: `${res.sender?.firstName} sent you a message`,
        type: 'MESSAGE',
        redirectEndpoint: `/message?userId=${res.senderId}`,
        userIds: [res.receiverId],
    });
    return res;
};
export const getMessageUserList = async (userId: string, searchTerm = '') => {
    try {
        // Get access to the native MongoDB driver
        const db = (prisma as any)._mongoClient?.db();
        const messages = db.collection('Message');

        const pipeline: any[] = [
            {
                $match: {
                    $or: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                }
            },
            {
                $addFields: {
                    conversationKey: {
                        $cond: {
                            if: { $lt: ["$senderId", "$receiverId"] },
                            then: { $concat: ["$senderId", "_", "$receiverId"] },
                            else: { $concat: ["$receiverId", "_", "$senderId"] }
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$conversationKey",
                    message: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$message" } },
            {
                $lookup: {
                    from: "User",
                    localField: "senderId",
                    foreignField: "_id",
                    as: "sender"
                }
            },
            {
                $lookup: {
                    from: "User",
                    localField: "receiverId",
                    foreignField: "_id",
                    as: "receiver"
                }
            },
            { $unwind: "$sender" },
            { $unwind: "$receiver" }
        ];

        if (searchTerm) {
            pipeline.push({
                $match: {
                    $or: [
                        { "sender.firstName": { $regex: searchTerm, $options: "i" } },
                        { "sender.lastName": { $regex: searchTerm, $options: "i" } },
                        { "sender.email": { $regex: searchTerm, $options: "i" } },
                        { "receiver.firstName": { $regex: searchTerm, $options: "i" } },
                        { "receiver.lastName": { $regex: searchTerm, $options: "i" } },
                        { "receiver.email": { $regex: searchTerm, $options: "i" } }
                    ]
                }
            });
        }

        const result = await messages.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }
};

const getConversation = async (
    id: string,
    userId: string,
    page = 1,
) => {
    const limit = 50
    const skip = (page - 1) * limit;

    const res = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId, receiverId: id },
                { senderId: id, receiverId: userId },
            ],
        },
        orderBy: { createdAt: 'desc' },
        // skip,
        // take: limit,
    });

    const messageCount = await prisma.message.count({
        where: {
            OR: [
                { senderId: userId, receiverId: id },
                { senderId: id, receiverId: userId },
            ],
        },
    });
    const totalPage = Math.ceil(messageCount / limit);
    const metaData = {
        page,
        limit,
        total: messageCount,
        totalPage,
    }

    return {
        data: res,
        metaData: metaData
    };
};

// Mark a message as read
const markMessageAsRead = async (messageId: string, userId: string) => {
    const message = await prisma.message.findUniqueOrThrow({
        where: { id: messageId },
    });

    if (message.receiverId !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'You are not allowed to mark this message');
    }

    const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
    });

    return updatedMessage;
};

// Delete a message
const deleteMessage = async (messageId: string, userId: string) => {
    const message = await prisma.message.findUniqueOrThrow({
        where: { id: messageId },
    });

    if (message.senderId !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own messages');
    }

    await prisma.message.delete({
        where: { id: messageId },
    });

    return { message: 'Message deleted successfully' };
};

export const MessageServices = {
    sendMessage,
    getMessageUserList,
    getConversation,
    markMessageAsRead,
    deleteMessage
};