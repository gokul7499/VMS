import { FastifyInstance } from 'fastify';
import {
    createRateConfigurations,
    getAllRateConfigurations,
    getRateConfigurationById,
    updateRateConfigurations,
    deleteRateConfigurations,
    getAllRateConfigurationRates,
    getAllHierarchiesAndJobTemplates,
    getAllRateConfigurationBudget,
    rateConfigurationsFilter
} from '../controllers/rate-configurations.controller';

async function rateConfigurationsRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/rate-configurations', createRateConfigurations);
    fastify.get('/program/:program_id/rate-configurations/get-all', getAllRateConfigurations);
    fastify.get('/program/:program_id/rate-configurations/:id', getRateConfigurationById);
    fastify.put('/program/:program_id/rate-configurations/:id', updateRateConfigurations);
    fastify.delete('/program/:program_id/rate-configurations/:id', deleteRateConfigurations);
    fastify.get('/program/:program_id/rate-configurations', getAllRateConfigurationRates);
    fastify.get('/program/:program_id/get-all/hierarchie', getAllHierarchiesAndJobTemplates);
    fastify.post('/program/:program_id/rate-configurations/budget', getAllRateConfigurationBudget);
    fastify.post('/program/:program_id/rate-configurations/advance-filter', rateConfigurationsFilter);
}

export default rateConfigurationsRoutes;
