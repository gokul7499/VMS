import { FastifyInstance } from 'fastify';
import { createVendordocumentsgroup, deleteVendordocumentsgroup, getVendorDocumentsGroupByIdAndDoc, getVendordocumentsgroupId, updateVendordocumentsgroup, getAllVendorCompDocummentGroupByProgramId } from '../controllers/vendordocumentgroupController';

async function vendordocumentsgroup(fastify: FastifyInstance) {
    fastify.post('/vendor-documents-group', createVendordocumentsgroup);
    // fastify.get('/program/:program_id/vendor-documents-groups', getVendordocumentsgroup);
    fastify.get('/program/:program_id/vendor-documents-group/:id', getVendordocumentsgroupId);
    fastify.put('/program/:program_id/vendor-documents-group/:id', updateVendordocumentsgroup);
    fastify.get('/program/:program_id/vendor-group/:id', getVendorDocumentsGroupByIdAndDoc);
    fastify.delete('/program/:program_id/vendor-documents-group/:id', deleteVendordocumentsgroup);
    fastify.get('/program/:program_id/vendor-documents-group', getAllVendorCompDocummentGroupByProgramId);
}

export default vendordocumentsgroup;