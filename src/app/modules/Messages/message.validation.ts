import z from "zod";

// Send Message Validation
const sendMessage = z.object({
  body: z.object({
    receiverId: z.string({
      required_error: 'ReceiverId is required!',
    }),
    content: z.string({
      required_error: 'Message content is required!',
    }),
  }),
});

// Get Conversation Validation
const getConversation = z.object({
  body: z.object({
    with: z.string({
      required_error: 'Other members id is required!',
    }),
  }),
});

export const messageValidation = {
  sendMessage,
  getConversation,
};
