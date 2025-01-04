import fastify from "fastify";
import pino from "pino";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import { checkDatabaseConnection } from "./config/instance";
import formBodyPlugin from "@fastify/formbody";
import registerRoutes from "./routes";

dotenv.config();

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
let port = 8000;
const start = async () => {
  try {
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.connected) {
      throw new Error(dbStatus.message);
    }

    // Import models and routes after Sequelize is initialized
    // require("./models");
    const registerRoutes = require("./routes").default;
    app.register(registerRoutes);

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
