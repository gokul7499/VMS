import { FastifyInstance } from 'fastify';
import { getUser, getUserById, getAllUserIDAndUserId, createUser, updateUser, deleteUser, searchUser, getUserHierarchiesByProgram, getUserWorkLocationAndTimeZone ,getPendingUser,getUserAndHierarchieId,getActiveUser} from '../controllers/user.controller';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";

async function userRoutes(fastify: FastifyInstance) {
    fastify.get('/user/', getUser);
    fastify.get('/user/:id', getUserById);
    fastify.post('/user/',
        // {
        //     preHandler: validatePermissions,
        //     config: {
        //         permissions: [Permissions.USER],
        //         action: Actions.CREATE,
        //     },
        // },
        createUser);
    fastify.put('/user/:user_id/program/:program_id',
        // {
        //     preHandler: validatePermissions,
        //     config: {
        //         permissions: [Permissions.USER],
        //         action: Actions.UPDATE,
        //     },
        // },
        updateUser);
    fastify.delete('/user/:id', deleteUser);
    fastify.get('/user/search-user', searchUser);
    fastify.get('/user/program/:program_id',
        // {
        //     preHandler: validatePermissions,
        //     config: {
        //         permissions: [Permissions.USER],
        //         action: Actions.READ,
        //     },
        // },
        getAllUserIDAndUserId);
    fastify.get('/user/:id/program/:program_id', {
        // preHandler: validatePermissions,
        // config: {
        //     permissions: [Permissions.USER],
        //     action: Actions.READ,
        // },
    }, getUserHierarchiesByProgram);
    fastify.get('/user/program/:program_id/user-worklocation',
        //  {
        // preHandler: validatePermissions,
        // config: {
        //     permissions: [Permissions.USER],
        //     action: Actions.READ,
        // },
    // }, 
    getUserWorkLocationAndTimeZone);
    fastify.get('/program/:program_id/user-associated-hierachies',
        // {
        //     preHandler: validatePermissions,
        //     config: {
        //         permissions: [Permissions.USER],
        //         action: Actions.READ,
        //     },
        // },
        getUserAndHierarchieId);

    fastify.get('/program/:program_id/pending-user', getPendingUser);
    fastify.get('/program/:program_id/get-job-manegers', getActiveUser);
}
export default userRoutes;
