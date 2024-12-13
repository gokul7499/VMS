import { FastifyInstance } from 'fastify';
import {
  createCountry,
  bulkUploadCountry,
  getCountries,
  getCountriesById,
  updateCountry,
  deleteCountry
} from '../controllers/countries.controllers';

export default async function countriesRoutes(fastify: FastifyInstance) {
  fastify.post('/countries/',createCountry);
  fastify.post('/countries/bulk-upload',bulkUploadCountry);
  fastify.get('/countries/get-all', getCountries)
  fastify.get('/countries/:id', getCountriesById);
  fastify.put('/countries/:id', updateCountry);
  fastify.delete('/countries/:id', deleteCountry);
}
