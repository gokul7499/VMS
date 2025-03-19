import { FastifyInstance } from 'fastify';
import {
    createQualification,
    updateQualification,
    deleteQualification,
    getAllQualifications,
    getQualificationById,
    bulkCreateQualifications,
    getQualificationCode
} from '../controllers/qualifications.controller';

async function QualificationsRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/qualifications', async (request, reply) => {
        await createQualification(request, reply);
    });
    fastify.put('/program/:program_id/qualifications/:id', updateQualification);
    fastify.delete('/program/:program_id/qualifications/:id', deleteQualification);
    fastify.get('/program/:program_id/qualifications', getAllQualifications);
    fastify.get('/program/:program_id/qualifications/:id', getQualificationById);
    fastify.post('/program/:program_id/qualifications/bulk-upload', bulkCreateQualifications);
    fastify.get('/program/:program_id/qualificationCode', getQualificationCode);
}

export default QualificationsRoutes;
