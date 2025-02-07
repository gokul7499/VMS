import { FastifyInstance } from 'fastify';
import {
    createTimesheetTypeConfig,
    getAllTimesheetTypeConfigs,
    getTimesheetTypeConfigById,
    updateTimesheetTypeConfig,
    deleteTimesheetTypeConfig,
    timesheetTypeConfigFilter,
    getAllRelatedDataByProgram
} from '../controllers/timesheet-type-config.controller';
import { createTimesheetTypeConfigSchema, paramsSchema, querySchema, timesheetTypeConfigFilterSchema } from '../interfaces/timesheet-config.interface';

export default async function timesheetTypeConfigRoutes(fastify: FastifyInstance) {
    fastify.post('/timesheet-type-config',{
        schema: {
            params: paramsSchema,
           body:createTimesheetTypeConfigSchema
        }
    }, createTimesheetTypeConfig);
    fastify.get('/timesheet-type-config/get-all',{
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getAllTimesheetTypeConfigs);
    fastify.get('/timesheet-type-config/get',{
        schema: {
            params: paramsSchema,
        }
    }, getAllRelatedDataByProgram);
    fastify.get('/timesheet-type-config/:id',{
        schema: {
            params: paramsSchema,
        }
    }, getTimesheetTypeConfigById);
    fastify.put('/timesheet-type-config/:id',{
        schema: {
            params: paramsSchema,
            body:createTimesheetTypeConfigSchema
        }
    }, updateTimesheetTypeConfig);
    fastify.delete('/timesheet-type-config/:id', {
        schema: {
            params: paramsSchema,
            body:createTimesheetTypeConfigSchema
        }
    },deleteTimesheetTypeConfig);
    fastify.post('/timesheet-type-config/advanced-filter',{
        schema: {
            params: paramsSchema,
            body:timesheetTypeConfigFilterSchema
        }
    }, timesheetTypeConfigFilter);
}
