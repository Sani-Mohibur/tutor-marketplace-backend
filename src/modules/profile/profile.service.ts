import { prisma } from "../../lib/prisma.js";
import { UpdateStudentData, UpdateTutorData } from "./profile.interface.js";

const getStudent = async (userId: string) => {
  return await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, role: true, image: true } },
    },
  });
};

const updateStudent = async (userId: string, payload: UpdateStudentData) => {
  return await prisma.studentProfile.update({
    where: { userId },
    data: payload,
  });
};

const getTutor = async (userId: string) => {
  return await prisma.tutorProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true, role: true, image: true },
      },
      categories: { select: { id: true, name: true } },
    },
  });
};

// Handle m2m - tutor have multiple category
const updateTutor = async (userId: string, payload: UpdateTutorData) => {
  const { categories, ...restPayload } = payload;

  return await prisma.tutorProfile.update({
    where: { userId },
    data: {
      ...restPayload,
      ...(categories && {
        categories: {
          set: categories.map((id) => ({ id })),
        },
      }),
    },
  });
};

const updateUserImage = async (userId: string, imageUrl: string) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: { id: true, image: true },
  });
};

export const profileService = {
  getStudent,
  updateStudent,
  getTutor,
  updateTutor,
  updateUserImage,
};
