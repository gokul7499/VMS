import { FastifyInstance } from 'fastify';
import { createVendordocumentsgroup, deleteVendordocumentsgroup, getVendorDocumentsGroupByIdAndDoc, getVendordocumentsgroupId, updateVendordocumentsgroup, getAllVendorCompDocummentGroupByProgramId, vendorDocumentGroupFilter} from '../controllers/vendor-document-group.controller';

async function vendordocumentsgroup(fastify: FastifyInstance) {
    fastify.post('/vendor-documents-group', createVendordocumentsgroup);
    fastify.get('/program/:program_id/vendor-documents-group/:id', getVendordocumentsgroupId);
    fastify.put('/program/:program_id/vendor-documents-group/:id', updateVendordocumentsgroup);
    fastify.get('/program/:program_id/vendor-group/:id', getVendorDocumentsGroupByIdAndDoc);
    fastify.delete('/program/:program_id/vendor-documents-group/:id', deleteVendordocumentsgroup);
    fastify.get('/program/:program_id/vendor-documents-group', getAllVendorCompDocummentGroupByProgramId);
    fastify.post('/program/:program_id/vendor-documents-group/advance-filter', vendorDocumentGroupFilter);
}

export default vendordocumentsgroup;