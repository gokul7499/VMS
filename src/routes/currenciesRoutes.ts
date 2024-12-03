import { FastifyInstance } from 'fastify';
import {
    getCurrencies,
    getCurrenciesById,
    createCurrencies,
    updateCurrencies,
    deleteCurrencies,
    bulkUploadCurrencies
} from '../controllers/currenciesController';

async function currenciesRoutes(fastify: FastifyInstance) {
    fastify.post('/currencies', createCurrencies);
    fastify.post('/currencies/bulk-upload', bulkUploadCurrencies);
    fastify.get('/currencies/search', getCurrencies);
    fastify.get('/currencies/:id', getCurrenciesById);
    fastify.put('/currencies/:id', updateCurrencies);
    fastify.delete('/currencies/:id', deleteCurrencies);
}
export default currenciesRoutes