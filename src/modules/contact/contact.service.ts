import { prisma } from "../../lib/prisma.js";

export const contactService = {
  createContact: async (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    return await prisma.contact.create({
      data,
    });
  },

  getAllContacts: async () => {
    return await prisma.contact.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};
