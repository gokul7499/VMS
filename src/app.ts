// app.ts
import fastify from "fastify";
import pino from "pino";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import redis from "./config/redis";
import { checkDatabaseConnection, initializeSequelize } from "./config/instance";
import formBodyPlugin from "@fastify/formbody";

dotenv.config();

import registerRoutes from "./routes";

const app = fastify({
  logger: pino({ level: "info" }),
});
 
app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
 
app.get("/", async (request, reply) => {
  reply.send({ message: "Welcome to Fastify API with Redis!" });
});
 
app.register(formBodyPlugin);


app.get("/", async (request, reply) => {
  reply.send({ message: "Welcome to v4-config-api-dev service" });
});

app.post("/store", async (request, reply) => {
  const { key, value } = request.body as { key: string; value: any };

  try {
    await redis.set(key, JSON.stringify(value));
    reply.send({ message: "Data stored in Redis", key, value });
  } catch (error) {
    reply.status(500).send({ error: "Failed to store data", details: error });
  }
});

app.get("/fetch/:key", async (request, reply) => {
  const { key } = request.params as { key: string };

  try {
    const data = await redis.get(key);
    if (data) {
      reply.send({ key, value: JSON.parse(data) });
    } else {
      reply.send({ message: "No data found for the provided key" });
    }
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
