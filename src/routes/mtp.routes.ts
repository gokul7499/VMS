import { FastifyInstance } from "fastify";
import * as mtpController from '../controllers/mtp.controller';
import { verifyToken } from "../middlewares/verifyToken";

async function mtpRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/mtp', {
    }, mtpController.createMtp);

    fastify.get('/program/:program_id/mtp', {
    }, mtpController.getAllMtp);
    
    fastify.get('/program/:program_id/mtp/:id', {
    }, mtpController.getMtpById);

    fastify.put('/program/:program_id/mtp-link-unlink/:id', {
    }, mtpController.linkUnlinkMtp);
}

export default mtpRoutes;