import { FastifyInstance } from "fastify";
import { getHolidayCalendar, getHolidayCalendarById, createHolidayCalendar, updateHolidayCalendar, deleteHolidayCalendar,getHolidayCalendarAdvancedFilter } from "../controllers/holiday-calendar.controller"
// import { Permissions,Actions } from "../constants/permissions";
import { validatePermissions } from "../middlewares/vaildate-permissions";

async function holidayCalendarRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/holiday-calendar',{
        // preHandler: validatePermissions,
        // config: {
        //   permissions: [Permissions.HOLIDAY_CALANDER],
        //   action: Actions.READ,
        // },
      }, getHolidayCalendar);
    fastify.get('/program/:program_id/holiday-calendar/:id',{
        // preHandler: validatePermissions,
        // config: {
        //   permissions: [Permissions.HOLIDAY_CALANDER],
        //   action: Actions.READ,
        // },
      }, getHolidayCalendarById);
    fastify.post('/holiday-calendar', createHolidayCalendar);
    fastify.put('/program/:program_id/holiday-calendar/:id',{
        // preHandler: validatePermissions,
        // config: {
        //   permissions: [Permissions.HOLIDAY_CALANDER],
        //   action: Actions.UPDATE,
        // },
      }, updateHolidayCalendar);
    fastify.delete('/program/:program_id/holiday-calendar/:id',{
        preHandler: validatePermissions,
        // config: {
        //   permissions: [Permissions.HOLIDAY_CALANDER],
        //   action: Actions.DELETE,
        // },
      }, deleteHolidayCalendar);
      fastify.post('/program/:program_id/holiday-calendar-advanced-filter',{
        // preHandler: validatePermissions,
        // config: {
        //   permissions: [Permissions.HOLIDAY_CALANDER],
        //   action: Actions.DELETE,
        // },
      }, getHolidayCalendarAdvancedFilter);
}


export default holidayCalendarRoutes;