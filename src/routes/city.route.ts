import { FastifyInstance } from 'fastify';
import { Permissions } from '../constants/permissions';
import {
    getCity,
    createCity,
    updateCity,
    deleteCity,
    getCityById
} from '../controllers/city.controller';

export default async function resourceCityRoutes(fastify: FastifyInstance) {
    fastify.get('/citys', getCity);
    fastify.post(
    "/state/:state_id/:program_id/city",
    {
      config: {
        permissions: [Permissions.CREATE_CITY]
      }
    },
    createCity
  );
  
   fastify.put('/state/:state_id/city/:id', updateCity);
   fastify.delete('/state/:state_id/city/:id', deleteCity);
   fastify.get('/state/:state_id/city/:id', getCityById);
}
