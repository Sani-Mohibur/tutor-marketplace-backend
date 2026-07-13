import { prisma } from "../../lib/prisma.js";
import { UpdateStudentData, UpdateTutorData } from "./profile.interface.js";

const getStudent = async (userId: string) => {
  return await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, role: true, image: true, isNameChanged: true } },
    },
  });
};

const updateStudent = async (userId: string, payload: UpdateStudentData) => {
  const { name, ...restPayload } = payload;

  return await prisma.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({
        where: { id: userId },
        data: { name, isNameChanged: true },
      });
    }
    return await tx.studentProfile.update({
      where: { userId },
      data: restPayload,
    });
  });
};

const getTutor = async (userId: string) => {
  return await prisma.tutorProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true, role: true, image: true, isNameChanged: true },
      },
      categories: { select: { id: true, name: true } },
    },
  });
};

// Handle m2m - tutor have multiple category
const updateTutor = async (userId: string, payload: UpdateTutorData) => {
  const { categories, name, ...restPayload } = payload;

  return await prisma.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({
        where: { id: userId },
        data: { name, isNameChanged: true },
      });
    }

    return await tx.tutorProfile.update({
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
