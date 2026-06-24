import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { USER_ROLES } from "../constants/user.constants.js";
import { APIError, createAuthMiddleware } from "better-auth/api";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [process.env.CLIENT_URL!],
  advanced: {
    useSecureCookies: true,
  },
  cookie: {
    secure: true,
    sameSite: "none",
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: USER_ROLES.STUDENT,
        required: true,
      },
      banned: {
        type: "boolean",
        defaultValue: false,
        required: true,
      },
    },
  },

  // automatic profile generation
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.role === USER_ROLES.STUDENT) {
            await prisma.studentProfile.create({
              data: { userId: user.id },
            });
          } else if (user.role === USER_ROLES.TUTOR) {
            await prisma.tutorProfile.create({
              data: { userId: user.id },
            });
          }
        },
      },
    },
  },

  // banned user can't login
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-in")) {
        const body = ctx.body as any; // Better Auth pre-parses the body into ctx.body
        const email = body?.email;

        if (email) {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (user?.banned) {
            // Safely reject the sign-in with a Better Auth built-in API Error
            throw new APIError("FORBIDDEN", {
              message: "Your account has been banned. Access denied.",
            });
          }
        }
      }
    }),
  },
});
