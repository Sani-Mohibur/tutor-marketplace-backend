import { prisma } from "../../lib/prisma.js";
import { paginationHelper } from "../../utils/paginationHelper.js";

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

  getAllContacts: async (query: any) => {
    const paginationResult = paginationHelper.calculatePagination({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder || "desc",
    });

    const [totalContacts, contacts] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.findMany({
        skip: paginationResult.skip,
        take: paginationResult.limit,
        orderBy: {
          [paginationResult.sortBy]: paginationResult.sortOrder,
        },
      }),
    ]);

    return {
      meta: {
        page: paginationResult.page,
        limit: paginationResult.limit,
        totalContacts,
        totalPages: Math.ceil(totalContacts / paginationResult.limit),
      },
      data: contacts,
    };
  },
};
