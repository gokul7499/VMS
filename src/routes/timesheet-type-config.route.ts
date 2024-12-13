import { FastifyInstance } from 'fastify';
import {
    createTimesheetTypeConfig,
    getAllTimesheetTypeConfigs,
    getTimesheetTypeConfigById,
    updateTimesheetTypeConfig,
    deleteTimesheetTypeConfig,
} from '../controllers/timesheet-type-config.controller';

export default async function timesheetTypeConfigRoutes(fastify: FastifyInstance) {
    fastify.post('/timesheet-type-config', createTimesheetTypeConfig);
    fastify.get('/timesheet-type-config/get-all', getAllTimesheetTypeConfigs);
    fastify.get('/timesheet-type-config/:id', getTimesheetTypeConfigById);
    fastify.put('/timesheet-type-config/:id', updateTimesheetTypeConfig);
    fastify.delete('/timesheet-type-config/:id', deleteTimesheetTypeConfig);
}
