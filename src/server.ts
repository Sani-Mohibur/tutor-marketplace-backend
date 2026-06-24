import http from "http";
import app from "./app.js";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma.js";

// Load local environmental variables
dotenv.config();

const PORT = process.env.PORT;
const server = http.createServer(app);

async function startServer() {
  try {
    console.log("⏳ Connecting to the database...");
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ An error occurred during startup:", error);
    process.exit(1);
  }
}

startServer();
