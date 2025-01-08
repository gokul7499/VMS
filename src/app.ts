// app.ts
import fastify from "fastify";
import pino from "pino";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import { initializeSequelize, checkDatabaseConnection } from "./config/instance"; 
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

app.get("/", async (request, reply) => {
  reply.send({ message: "Welcome to v4-config-api-dev service" });
});

app.get("/config/v1/api/health-check", async (request, reply) => {
  const startTime = Date.now(); // Start time for latency measurement

  try {
    app.log.info(`Route Trace ID: ${(request as any).traceId || "N/A"}`);

    const connectionStatus = await checkDatabaseConnection(); // Check database connection

    const latency = Date.now() - startTime; // Calculate latency

    return reply.status(connectionStatus.connected ? 200 : 503).send({
      status: connectionStatus.connected ? "connected" : "disconnected",
      message: connectionStatus.message,
      database: connectionStatus.database,
      service: "config",
      timestamp: new Date().toISOString(),
      latency: latency, // Include latency in milliseconds
    });
  } catch (error) {
    return reply.status(500).send({
      status: "error",
      message: "Failed to check database connection",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

const start = async () => {
  try {
    await initializeSequelize(); // Initialize Sequelize first
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.connected) {
      throw new Error(dbStatus.message);
    }

    const port = 8000; 
    app.listen({ port, host: "0.0.0.0" }, (err) => {
      if (err) throw err;
    });

    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();