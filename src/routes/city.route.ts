import { FastifyInstance } from 'fastify';

import {
    getCity,
    createCity,
    updateCity,
    deleteCity,
    getCityById
} from '../controllers/city.controller';
import { permissionCheck } from '../middlewares/permission-check';
import { Actions, Permissions } from '../constants/permissions';

export default async function resourceCityRoutes(fastify: FastifyInstance) {
    fastify.get('/citys', getCity);
    fastify.post(
      '/state/:state_id/:program_id/city',
      {
        preHandler: permissionCheck,  // Apply preHandler for permission check
        config: { permissions: [Permissions.CITY], action:Actions.CREATE },  // Route config for permissions
      },
      createCity  // After permission check passes, invoke the actual handler
    );
  
   fastify.put('/state/:state_id/city/:id', updateCity);
   fastify.delete('/state/:state_id/city/:id', deleteCity);
   fastify.get('/state/:state_id/city/:id', getCityById);
}
