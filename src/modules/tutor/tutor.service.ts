import { prisma } from "../../lib/prisma.js";
import {
  paginationHelper,
  PaginationOptions,
} from "../../utils/paginationHelper.js";

interface TutorFilterQuery {
  search?: string;
  categories?: string[];
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
}

const searchTutors = async (
  filters: TutorFilterQuery,
  options: PaginationOptions,
) => {
  const { search, categories, minPrice, maxPrice, minRating } = filters;

  // 1. Compute pagination variables (skip, limit, order)
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const priceCondition: { gte?: number; lte?: number } = {};
  if (minPrice) priceCondition.gte = parseFloat(minPrice);
  if (maxPrice) priceCondition.lte = parseFloat(maxPrice);

  // 2. Build the centralized database filtering conditions matrix
  const whereConditions = {
    AND:
      categories && categories.length > 0
        ? categories.map((categoryName) => ({
            categories: {
              some: {
                name: {
                  equals: categoryName,
                  mode: "insensitive" as const, // Makes category string matching bulletproof against case drift
                },
              },
            },
          }))
        : undefined,

    pricePerHour: minPrice || maxPrice ? priceCondition : undefined,
    rating: minRating ? { gte: parseFloat(minRating) } : undefined,
    user: search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : undefined,
  };

  // 3. Query records with boundaries and count matches in parallel
  const [tutorsData, totalMatches] = await Promise.all([
    prisma.tutorProfile.findMany({
      where: whereConditions,
      include: {
        user: { select: { name: true, email: true, image: true } },
        categories: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.tutorProfile.count({ where: whereConditions }),
  ]);

  const totalPage = Math.ceil(totalMatches / limit);

  // 4. Map records cleanly to match your frontend data expectations
  const formattedTutors = tutorsData.map((tutor: any) => ({
    ...tutor,
    name: tutor.user?.name || "Unknown Mentor",
    categories: tutor.categories.map((cat: any) => cat.name),
  }));

  // 5. Return meta data and matching rows payload
  return {
    meta: {
      page,
      limit,
      total: totalMatches,
      totalPage,
    },
    data: formattedTutors,
  };
};

const getAllCategories = async () => {
  return await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc", // Alphabetical order for clean UI presentation
    },
  });
};

const getTutorById = async (id: string) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      categories: {
        select: {
          id: true,
          name: true,
        },
      },
      reviews: {
        include: {
          studentProfile: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tutor) return null;

  // Flattening the categories list data to maintain clean string array interface shape
  return {
    ...tutor,
    name: tutor.user?.name || "Unknown Mentor",
    categories: tutor.categories.map((cat: any) => cat.name),
  };
};

export const tutorService = {
  searchTutors,
  getAllCategories,
  getTutorById,
};
