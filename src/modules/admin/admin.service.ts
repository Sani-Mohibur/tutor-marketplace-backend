import ApiError from "../../errors/ApiError.js";
import { prisma } from "../../lib/prisma.js";
import { paginationHelper } from "../../utils/paginationHelper.js";

const getPublicStats = async () => {
  const [totalTutors, totalStudents, totalSlots] = await Promise.all([
    prisma.user.count({ where: { role: "tutor" } }),
    prisma.user.count({ where: { role: "student" } }),
    prisma.availability.count(),
  ]);

  return {
    totalTutors,
    totalStudents,
    totalSlots,
  };
};

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalTutors,
    totalStudents,
    totalAdmins,
    totalBookings,
    totalAvailabilities,
    totalFeatured,
    totalVerified,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "tutor" } }),
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.booking.count(),
    prisma.availability.count(),
    prisma.tutorProfile.count({ where: { isFeatured: true } }),
    prisma.tutorProfile.count({ where: { isVerified: true } }),
  ]);

  return {
    totalUsers,
    totalTutors,
    totalStudents,
    totalAdmins,
    totalBookings,
    totalAvailabilities,
    totalFeatured,
    totalVerified,
  };
};

const updateUserBanStatus = async (userId: string, banned: boolean) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  if (user.role === "admin") {
    throw new ApiError(400, "Administrators cannot be banned.");
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { banned },
    select: { id: true, email: true, role: true, banned: true },
  });
};

const createCategory = async (
  name: string,
  description?: string | null,
  icon?: string | null,
  isFeatured?: boolean
) => {
  const normalizedName = name.trim();

  const existingCategory = await prisma.category.findUnique({
    where: { name: normalizedName },
  });

  if (existingCategory) {
    throw new ApiError(400, "Category with this name already exists.");
  }

  return await prisma.category.create({
    data: { name: normalizedName, description, icon, isFeatured },
  });
};

const updateCategory = async (
  id: string,
  name: string,
  description?: string | null,
  icon?: string | null,
  isFeatured?: boolean
) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(404, "Category not found.");
  }

  const normalizedName = name.trim();
  if (normalizedName !== category.name) {
    const existing = await prisma.category.findUnique({ where: { name: normalizedName } });
    if (existing) throw new ApiError(400, "Category with this name already exists.");
  }

  return await prisma.category.update({
    where: { id },
    data: { name: normalizedName, description, icon, isFeatured },
  });
};

const getAllCategories = async (query: any) => {
  const paginationResult = paginationHelper.calculatePagination({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
  });

  const [totalCategories, categories] = await Promise.all([
    prisma.category.count(),
    prisma.category.findMany({
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
      totalCategories,
      totalPages: Math.ceil(totalCategories / paginationResult.limit),
    },
    data: categories,
  };
};

const getFeaturedCategories = async () => {
  return await prisma.category.findMany({
    where: { isFeatured: true },
    orderBy: { createdAt: "desc" },
  });
};

const deleteCategory = async (id: string) => {
  // Check if the category exists
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new ApiError(404, "Category not found.");
  }

  return await prisma.category.delete({
    where: { id },
  });
};

const updateTutorFeaturedStatus = async (
  tutorProfileId: string,
  isFeatured: boolean,
) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
  });

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found.");
  }

  return await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: { isFeatured },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const getAllUsers = async (query: any) => {
  if (query.chart === "true") {
    const users = await prisma.user.findMany({
      where: { role: { in: ["student", "tutor"] } },
      select: { role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      meta: { chart: true },
      data: users,
    };
  }

  const paginationResult = paginationHelper.calculatePagination({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  const whereConditions: any = {};

  // 1. Search name or email
  if (query.search) {
    whereConditions.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  // 2. Filter by explicit system role
  if (query.role && query.role !== "all") {
    whereConditions.role = query.role;
  }

  // 3. Filter by operational banned state
  if (query.banned && query.banned !== "all") {
    whereConditions.banned = query.banned === "true";
  }

  const [totalUsers, users] = await Promise.all([
    prisma.user.count({ where: whereConditions }),
    prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
      },
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
      totalUsers,
      totalPages: Math.ceil(totalUsers / paginationResult.limit),
    },
    data: users,
  };
};

// 1. Fetch All Tutors with Advanced Administrative Query Filter Matrix
const getAllTutors = async (query: any) => {
  const paginationResult = paginationHelper.calculatePagination({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
  });

  const whereConditions: any = {};

  // Operational state condition parsing
  if (query.isFeatured && query.isFeatured !== "all") {
    whereConditions.isFeatured = query.isFeatured === "true";
  }

  if (query.isVerified && query.isVerified !== "all") {
    whereConditions.isVerified = query.isVerified === "true";
  }

  // Cross-relational User search mapping logic
  if (query.search) {
    whereConditions.user = {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }

  const [totalTutors, tutors] = await Promise.all([
    prisma.tutorProfile.count({ where: whereConditions }),
    prisma.tutorProfile.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            banned: true,
          },
        },
        categories: { select: { id: true, name: true } },
      },
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
      totalTutors,
      totalPages: Math.ceil(totalTutors / paginationResult.limit),
    },
    data: tutors,
  };
};

// 2. Toggle Tutor Verification State Handler
const updateTutorVerificationStatus = async (
  tutorProfileId: string,
  isVerified: boolean,
) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
  });

  if (!tutor) {
    throw new ApiError(404, "Tutor profile instance could not be found.");
  }

  return await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: { isVerified },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

// 3. View All Platform Bookings with Dynamic Profile Structural Sub-Matrix
const getAllBookings = async (query: any) => {
  const paginationResult = paginationHelper.calculatePagination({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
  });

  const whereConditions: any = {};

  if (query.status && query.status !== "all") {
    whereConditions.status = query.status;
  }

  if (query.studentProfileId) {
    whereConditions.studentProfileId = query.studentProfileId;
  }

  const [totalBookings, bookings] = await Promise.all([
    prisma.booking.count({ where: whereConditions }),
    prisma.booking.findMany({
      where: whereConditions,
      include: {
        studentProfile: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        tutorProfile: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        availability: true,
      },
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
      totalBookings,
      totalPages: Math.ceil(totalBookings / paginationResult.limit),
    },
    data: bookings,
  };
};

// 4. View All Availabilities Master Log Matrix
const getAllAvailabilities = async (query: any) => {
  const paginationResult = paginationHelper.calculatePagination({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    sortBy: query.sortBy || "slot",
    sortOrder: query.sortOrder || "asc",
  });

  const whereConditions: any = {};

  if (query.status && query.status !== "all") {
    whereConditions.status = query.status;
  }

  if (query.isBooked) {
    whereConditions.isBooked = query.isBooked === "true";
  }

  const [totalAvailabilities, availabilities] = await Promise.all([
    prisma.availability.count({ where: whereConditions }),
    prisma.availability.findMany({
      where: whereConditions,
      include: {
        tutorProfile: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
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
      totalAvailabilities,
      totalPages: Math.ceil(totalAvailabilities / paginationResult.limit),
    },
    data: availabilities,
  };
};

export const adminService = {
  getPublicStats,
  getDashboardStats,
  updateUserBanStatus,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getFeaturedCategories,
  updateTutorFeaturedStatus,
  getAllUsers,
  getAllTutors,
  updateTutorVerificationStatus,
  getAllBookings,
  getAllAvailabilities,
};
