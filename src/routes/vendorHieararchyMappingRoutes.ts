import { FastifyInstance } from 'fastify';
import {
    createVendorHierarchyMapping,
    updateVendorHierarchyMapping,
    deleteVendorHierarchyMapping,
    getAllVendorHierarchyMappings,
    getVendorHierarchyMappingById
} from '../controllers/vendorHieararchyMappingController'

async function VendorHierarchyMappingRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/vendor-hierarchy-mapping', createVendorHierarchyMapping);
    fastify.put('/program/:program_id/vendor-hierarchy-mapping/:id', updateVendorHierarchyMapping);
    fastify.delete('/program/:program_id/vendor-hierarchy-mapping/:id', deleteVendorHierarchyMapping);
    fastify.get('/program/:program_id/vendor-hierarchy-mapping', getAllVendorHierarchyMappings);
    fastify.get('/program/:program_id/vendor-hierarchy-mapping/:id', getVendorHierarchyMappingById);
}

export default VendorHierarchyMappingRoutes;
