import { FastifyInstance } from 'fastify';
import {
    getVendorGroups,
    getVendorGroupById,
    createVendorGroup,
    updateVendorGroup,
    deleteVendorGroup,
} from '../controllers/vendor-group.controller';

async function VendorGroupRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/vendor-groups', createVendorGroup);
    fastify.get('/program/:program_id/vendor-groups/all', getVendorGroups);
    fastify.get('/program/:program_id/vendor-groups/:id', getVendorGroupById);
    fastify.put('/program/:program_id/vendor-groups/:id', updateVendorGroup);
    fastify.delete('/program/:program_id/vendor-groups/:id', deleteVendorGroup);
}

export default VendorGroupRoutes;
