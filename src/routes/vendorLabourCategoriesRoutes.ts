import { FastifyInstance } from 'fastify';
import {
    createVendorLabourCategories,
    getAllvendorLabourCategories,
    getVendorLabourCategoryById,
    updateVendorLabourCategory,
    deleteVendorLabourCategory

} from '../controllers/vendorLabourCategoriesController'

async function vendorLabourCategoryRoutes(fastify: FastifyInstance) {
    fastify.post('/vendor-labour-category', createVendorLabourCategories);
    fastify.get('/program/:program_id/vendor-labour-category/', getAllvendorLabourCategories);
    fastify.get('/program/:program_id/vendor-labour-category/:id', getVendorLabourCategoryById);
    fastify.put('/program/:program_id/vendor-labour-category/:id', updateVendorLabourCategory);
    fastify.delete('/program/:program_id/vendor-labour-category/:id', deleteVendorLabourCategory);
}
export default vendorLabourCategoryRoutes;