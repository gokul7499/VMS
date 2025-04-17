import { FastifyInstance } from "fastify";
import * as mtpController from '../controllers/mtp.controller';

async function mtpRoutes(fastify: FastifyInstance) {

    fastify.post('/program/:program_id/mtp', {
    }, mtpController.createMtp);

    // fastify.get('/program/:program_id/candidate', {
    // }, mtpController.getAllMtp);

}

export default mtpRoutes;