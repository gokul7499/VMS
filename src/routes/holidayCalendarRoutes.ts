import { FastifyInstance } from "fastify";
import { getHolidayCalendar, getHolidayCalendarById, createHolidayCalendar, updateHolidayCalendar, deleteHolidayCalendar } from "../controllers/holidayCalendarController"

async function holidayCalendarRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/holiday-calendar', getHolidayCalendar);
    fastify.get('/program/:program_id/holiday-calendar/:id', getHolidayCalendarById);
    fastify.post('/holiday-calendar', createHolidayCalendar);
    fastify.put('/program/:program_id/holiday-calendar/:id', updateHolidayCalendar);
    fastify.delete('/program/:program_id/holiday-calendar/:id', deleteHolidayCalendar);
}


export default holidayCalendarRoutes;