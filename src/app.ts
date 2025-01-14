import fastify from "fastify";
import pino from "pino";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import { checkDatabaseConnection, initializeSequelize } from "./config/instance";
import formBodyPlugin from "@fastify/formbody";

dotenv.config();

const app = fastify({
  logger: pino({ level: "info" }),
});

app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

app.register(formBodyPlugin);

const start = async () => {
  try {
    // Initialize Sequelize and check DB connection
    await initializeSequelize();
    const dbStatus = await checkDatabaseConnection();

    if (!dbStatus.connected) {
      throw new Error(dbStatus.message);
    }

    // Register health-check route after DB connection is confirmed
    app.get("/config/health-check", async (request, reply) => {
      const startTime = Date.now();
      try {
        app.log.info(`Route Trace ID: ${(request as any).traceId || "N/A"}`);
        const connectionStatus = await checkDatabaseConnection();
        app.log.info(`Database connection status: ${connectionStatus.connected ? "connected" : "disconnected"}`);
        const latency = Date.now() - startTime;
        return reply.status(connectionStatus.connected ? 200 : 503).send({
          status: connectionStatus.connected ? "connected" : "disconnected",
          message: connectionStatus.message,
          database: connectionStatus.database,
          service: "config",
          timestamp: new Date().toISOString(),
          latency: latency,
        });
      } catch (error) {
        return reply.status(500).send({
          status: "error",
          message: "Failed to check database connection",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Register other routes here
    const registerRoutes = require("./routes").default;
    app.register(registerRoutes);

    const port = 8000;
    app.listen({ port, host: "0.0.0.0" }, (err) => {
      if (err) throw err;
      app.log.info(`🚀 Server is running on http://localhost:${port}`);
    });

    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
