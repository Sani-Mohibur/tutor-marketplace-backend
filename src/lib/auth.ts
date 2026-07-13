import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { USER_ROLES } from "../constants/user.constants.js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { sendVerificationEmail, sendResetPasswordEmail } from "./email.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BACKEND_URL,

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      const clientUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendResetPasswordEmail(user.email, clientUrl);
    },
  },

  // emailVerification: {
  //   sendOnSignUp: true,
  //   sendVerificationEmail: async ({ user, url, token }, request) => {
  //     await sendVerificationEmail(user.email, url);
  //   },
  // },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
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
        defaultValue: "pending",
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
          // If role is "pending" (from Google OAuth), we skip profile creation here.
          // It will be handled by the /api/profile/finalize-oauth endpoint.
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
