import { FastifyInstance } from 'fastify';
import { getAllUserMappings, getUserMappingById, createUserMappings, updateUserMappingById, deleteUserMappingById, getUserMappings } from '../controllers/user-mapping.controller';
import { UserMappingAttributes } from '../interfaces/user-mapping.interface'
export async function userMappingRoutes(fastify: FastifyInstance) {
    fastify.get('/usermapping/', getAllUserMappings);
    fastify.get('/usermapping/:id', getUserMappingById);
    fastify.post('/usermapping/', async (request, reply) => createUserMappings(request.body as UserMappingAttributes, reply));
    fastify.put('/usermapping/:id', updateUserMappingById);
    fastify.delete('/usermapping/:id', deleteUserMappingById);
    fastify.get('/program/:program_id/usermapping/:id',getUserMappings);
}

export default userMappingRoutes;

