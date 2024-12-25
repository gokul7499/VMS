import fastify from "fastify";
import pino from "pino";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import redis from "./config/redis";
import { checkDatabaseConnection } from "./config/instance";
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

app.register(registerRoutes);
app.register(formBodyPlugin);
let port = 8000;

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
    reply.status(500).send({ error: "Failed to fetch data", details: error });
  }
});

const start = async () => {
  try {
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.connected) {
      throw new Error(dbStatus.message);
    }

    app.listen({ port: port, host: "0.0.0.0" }, (err) => {
      if (err) throw err;
      app.log.info(`🚀 Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
