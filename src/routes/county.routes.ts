
import { FastifyInstance } from "fastify";
import {
    createCounty,
    getCountyById,
    updateCountyById,
    deleteCountyById,
    getAllCounty,
} from "../controllers/county.controller";
async function countyRoutes(fastify: FastifyInstance) {
    fastify.get("/county/:id", getCountyById);
    fastify.post("/county", createCounty);
    fastify.delete("/county/:id", deleteCountyById);
    fastify.put("/county/:id", updateCountyById);
    fastify.get("/county", getAllCounty);
}
export default countyRoutes;
