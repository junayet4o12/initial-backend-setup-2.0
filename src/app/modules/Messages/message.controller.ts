import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { MessageServices } from './message.service';

// Send message controller
const sendMessage = catchAsync(async (req, res) => {
  const senderId = req.user.id
  const files = req.files
  const result = await MessageServices.sendMessage(senderId, req.body, files as Express.Multer.File[] | undefined);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Message sent successfully',
    data: result,
  });
});

// Get conversation between two users
const getMessageUserList = catchAsync(async (req, res) => {
  const me = req.user.id
  const searchTerm = req.query.searchTerm || '';

  const result = await MessageServices.getMessageUserList(
    me as string,
    searchTerm as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User list fetched successfully',
    data: result,
  });
});
const getConversation = catchAsync(async (req, res) => {
  const me = req.user.id
  const other = req.params.id;

  const result = await MessageServices.getConversation(
    me as string,
    other as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Conversation fetched successfully',
    data: result,
  });
});

// Mark message as read
const markMessageAsRead = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?.id; // assuming you have user from auth middleware

  const result = await MessageServices.markMessageAsRead(
    messageId,
    userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Message marked as read',
    data: result,
  });
});

// Delete message
const deleteMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?.id; // assuming you have user from auth middleware

  const result = await MessageServices.deleteMessage(
    messageId,
    userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Message deleted successfully',
    data: result,
  });
});

export const MessageControllers = {
  sendMessage,
  getConversation,
  markMessageAsRead,
  deleteMessage,
  getMessageUserList
};
