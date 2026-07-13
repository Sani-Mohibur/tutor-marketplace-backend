import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("🌱 Starting database seeding...");

  // Seed Admin account via signup API
  // const adminEmail = "farabisunny5@gmail.com";
  const supportAdminEmail = "supportadmin@skillbridge.com"
  console.log("Checking if admin account exists...");

  const existingUser = await prisma.user.findUnique({
    where: { email: supportAdminEmail },
  });

  if (!existingUser) {
    console.log("Registering admin account via API endpoint...");
    const adminData = {
      name: "Mohibur Rahman",
      email: supportAdminEmail,
      password: "QuantumSync33",
      role: "support_admin",
    };

    const baseUrl = process.env.BACKEND_URL;

    const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.CLIENT_URL!,
      },
      body: JSON.stringify(adminData),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Auth API registration failed: ${errText}`);
    }

    console.log("Elevating user privileges to Admin role...");
    await prisma.user.update({
      where: { email: supportAdminEmail },
      data: {
        // role: "admin",
        emailVerified: true,
      },
    });
    console.log("✅ Seeding completed successfully!");
  } else {
    console.log(
      "Admin user account already exists. Elevating permissions just in case...",
    );
    await prisma.user.update({
      where: { email: supportAdminEmail },
      data: { role: "support_admin" },
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
