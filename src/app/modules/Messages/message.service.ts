import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { Message } from '@prisma/client';
import { getSocket } from '../../utils/socket';
import { uploadFiles } from '../../utils/uploadFiles';


// Send message between two users
const sendMessage = async (senderId: string, payload: Message, files: Express.Multer.File[] | undefined,) => {
    // Check if both users exist
    const time = new Date()
    payload.senderId = senderId
    await prisma.user.findUniqueOrThrow({ where: { id: payload.receiverId } })
    if (files && files.length > 0) {
        const urls = uploadFiles(files)
        payload.fileUrls = urls;
    }

    // Create message
    const message = await prisma.message.create({
        data: {
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            createdAt: time
        },
    });
    const io = getSocket();
    io.to(payload.receiverId).emit('message', message);
    io.to(payload.senderId).emit('message', message);
    return message;
};

// Get all messages between two users (conversation)
const getConversation = async (me: string, other: string) => {
    await prisma.user.findUniqueOrThrow({ where: { id: other } })

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: me, receiverId: other },
                { senderId: other, receiverId: me },
            ],
        },
        orderBy: { createdAt: 'asc' },
    });

    return messages;
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
    getConversation,
    markMessageAsRead,
    deleteMessage,
};
