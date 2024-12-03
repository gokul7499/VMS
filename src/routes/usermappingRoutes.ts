import { FastifyInstance } from 'fastify';
import { getAllUserMappings, getUserMappingById, createUserMappings, updateUserMappingById, deleteUserMappingById, getUserMappings } from '../controllers/usermappingController';
import { UserMappingAttributes } from '../interfaces/usermappingInterface'
export async function userMappingRoutes(fastify: FastifyInstance) {
    fastify.get('/usermapping/', getAllUserMappings);
    fastify.get('/usermapping/:id', getUserMappingById);
    fastify.post('/usermapping/', async (request, reply) => createUserMappings(request.body as UserMappingAttributes, reply));
    fastify.put('/usermapping/:id', updateUserMappingById);
    fastify.delete('/usermapping/:id', deleteUserMappingById);
    fastify.get('/usermapping/getall-usermapping',getUserMappings);
}

export default userMappingRoutes;

