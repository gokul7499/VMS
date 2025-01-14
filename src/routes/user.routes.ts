import { FastifyInstance } from 'fastify';
import { getUser, getUserById,getAllUserIDAndUserId, createUser, updateUser, deleteUser, searchUser ,getUserHierarchiesByProgram,getUserWorkLocationAndTimeZone} from '../controllers/user.controller';

async function userRoutes(fastify: FastifyInstance) {
    fastify.get('/user/', getUser);
    fastify.get('/user/:id', getUserById);
    fastify.post('/user/',createUser);
    fastify.put('/user/:id/program/:program_id', updateUser);
    fastify.delete('/user/:id', deleteUser);
    fastify.get('/user/search-user', searchUser);
    fastify.get('/user/program/:program_id', getAllUserIDAndUserId);
    fastify.get('/user/:id/program/:program_id', getUserHierarchiesByProgram);
    fastify.get('/user/program/:program_id/user-worklocation', getUserWorkLocationAndTimeZone);
}
export default userRoutes;
