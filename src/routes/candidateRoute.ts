import { FastifyInstance } from "fastify";
import {
    createCandidate,
    getAllCandidate,
    getCandidateByIdAndProgramId,
    updateCandidateByIdAndProgramId,
    deleteCandidateByIdAndProgramId,
    candidateSearch
} from '../controllers/candidateController'

export default async function candidateRoutes(fastify: FastifyInstance) {
    fastify.post('/candidate', createCandidate)
    fastify.get('/program/:program_id/candidate', getAllCandidate)
    fastify.get('/program/:program_id/candidate/:id', getCandidateByIdAndProgramId)
    fastify.put('/program/:program_id/candidate/:id', updateCandidateByIdAndProgramId);
    fastify.delete('/program/:program_id/candidate/:id', deleteCandidateByIdAndProgramId);
    fastify.get('/search',candidateSearch);
}