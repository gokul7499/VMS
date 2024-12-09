import fastify from "fastify";
import pino from "pino";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import { checkDatabaseConnection, syncDatabase } from "./config/instance";
import formBodyPlugin from '@fastify/formbody';

dotenv.config();

import registerRoutes from "./routes";
const app = fastify({
  logger: pino({ level: "info" }),
});
dotenv.config();
app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
app.get("/", async (request, reply) => {
  reply.send({ message: "Welcome to v4-config-api-dev service" });
});

app.register(registerRoutes);
app.register(formBodyPlugin);
let port = 3306;
const start = async () => {
  try {
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.connected) {
      throw new Error(dbStatus.message);
    }

    await syncDatabase();

    app.listen({ port: port, host: "0.0.0.0" }, (err) => {
      if (err) throw err;
    });

    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();