import { FastifyInstance } from "fastify"; 
import{createLeaveType, getLeaveTypes} from "../controllers/leave-type.controller" ; 


async function leaveTypeRoutes(fastify: FastifyInstance) {
    
fastify.post('/leave-type',createLeaveType) ;
fastify.get('/leave-types', getLeaveTypes);

}

export default leaveTypeRoutes;