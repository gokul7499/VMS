
import { FastifyInstance } from 'fastify';
import {
    vendorComplianceDocumentById,
    createVendorComplianceDocument,
    deleteVendorComplianceDocumentById,
    updateVendorComplianceDocumentById,
    getAllVendorCompDocummentByProgramId,
} from '../controllers/vendorComplianceDocumentController';
async function vendorComplianceDocumentRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/vendor-comp-doc/:id', vendorComplianceDocumentById);
    fastify.post('/program/:program_id/vendor-comp-doc', createVendorComplianceDocument);
    fastify.delete('/program/:program_id/vendor-comp-doc/:id', deleteVendorComplianceDocumentById);
    fastify.put('/program/:program_id/vendor-comp-doc/:id', updateVendorComplianceDocumentById);
    fastify.get('/program/:program_id/vendor-comp-doc', getAllVendorCompDocummentByProgramId)
}
export default vendorComplianceDocumentRoutes;
