import Fastify from 'fastify';
import supertest from 'supertest';
import holidayCalendarRoutes from '../src/routes/holiday-calendar-routes';

// Mock all dependencies
jest.mock('../src/models/holiday-calendar.model', () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../src/models/holiday-calender-hierarchie.model', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../src/models/holiday-calender-work-location.model', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../src/models/holiday-calender-details.model', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../src/service/holiday-calendar.service', () => ({
  HolidayCalendarService: {
    getHolidayCalendar: jest.fn(),
    getHolidayCalendarById: jest.fn(),
  },
}));

jest.mock('../src/utility/genrateTraceId', () => ({
  __esModule: true,
  default: jest.fn(() => 'mock-trace-id'),
}));

jest.mock('../src/utility/loggerService', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../src/config/instance', () => ({
  sequelize: {
    query: jest.fn(() => Promise.resolve([])),
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
  decodeToken: jest.fn(() => ({ sub: 'user-1', preferred_username: 'testuser', userType: 'msp' })),
}));

jest.mock('../src/utility/queries', () => ({
  sameHolidayCalendar: jest.fn(() => 'SELECT * FROM holiday_calendars'),
}));

jest.mock('../src/repositories/global.repository', () => ({
  __esModule: true,
  default: {
    getUserHierarchyData: jest.fn(() => ({ mspHierarchyIds: ['hierarchy-1', 'hierarchy-2'] })),
  },
}));

const HolidayCalendarService = require('../src/service/holiday-calendar.service').HolidayCalendarService;

describe('Holiday Calendar Controller - getHolidayCalendarById', () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify();
    // @ts-ignore
    app.addHook('preHandler', (req, res, done) => {
      req.user = { sub: 'user-1', preferred_username: 'testuser', userType: 'msp' };
      done();
    });
    app.register(holidayCalendarRoutes, { prefix: '/' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /program/:program_id/holiday-calendar/:id (getHolidayCalendarById)', () => {
    const programId = 'program-1';
    const holidayId = 'holiday-1';
    const baseUrl = `/program/${programId}/holiday-calendar/${holidayId}`;

    describe('Positive Test Cases', () => {
      it('should return holiday calendar successfully with all related data', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [
            { id: 'hierarchy-1', name: 'Hierarchy 1' },
            { id: 'hierarchy-2', name: 'Hierarchy 2' },
          ],
          work_locations_ids: [
            { id: 'location-1', name: 'Location 1' },
            { id: 'location-2', name: 'Location 2' },
          ],
          holidays: [
            {
              id: 'detail-1',
              holiday_calendar_id: holidayId,
              date: '2024-12-25',
              name: 'Christmas Day',
              is_time_entry_allowed: false,
              is_paid: true,
              is_tax_applicable: false,
            },
            {
              id: 'detail-2',
              holiday_calendar_id: holidayId,
              date: '2024-12-26',
              name: 'Boxing Day',
              is_time_entry_allowed: false,
              is_paid: true,
              is_tax_applicable: false,
            },
          ],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe('HolidayCalendar fetched successfully.');
        expect(response.body.trace_id).toBe('mock-trace-id');
        expect(response.body.data).toEqual(mockHolidayCalendar);
        expect(HolidayCalendarService.getHolidayCalendarById).toHaveBeenCalledWith(programId, holidayId);
      });

      it('should return holiday calendar with empty related data', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy_id).toEqual([]);
        expect(response.body.data.work_locations_ids).toEqual([]);
        expect(response.body.data.holidays).toEqual([]);
      });

      it('should return holiday calendar with only hierarchy data', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [
            { id: 'hierarchy-1', name: 'Hierarchy 1' },
          ],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy_id).toHaveLength(1);
        expect(response.body.data.work_locations_ids).toEqual([]);
        expect(response.body.data.holidays).toEqual([]);
      });

      it('should return holiday calendar with only work location data', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [
            { id: 'location-1', name: 'Location 1' },
          ],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy_id).toEqual([]);
        expect(response.body.data.work_locations_ids).toHaveLength(1);
        expect(response.body.data.holidays).toEqual([]);
      });

      it('should return holiday calendar with only holidays data', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [
            {
              id: 'detail-1',
              holiday_calendar_id: holidayId,
              date: '2024-12-25',
              name: 'Christmas Day',
              is_time_entry_allowed: false,
              is_paid: true,
              is_tax_applicable: false,
            },
          ],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy_id).toEqual([]);
        expect(response.body.data.work_locations_ids).toEqual([]);
        expect(response.body.data.holidays).toHaveLength(1);
      });

      it('should handle holiday calendar with large number of holidays', async () => {
        const largeHolidaysArray = Array.from({ length: 100 }, (_, index) => ({
          id: `detail-${index + 1}`,
          holiday_calendar_id: holidayId,
          date: `2024-12-${String(index + 1).padStart(2, '0')}`,
          name: `Holiday ${index + 1}`,
          is_time_entry_allowed: false,
          is_paid: true,
          is_tax_applicable: false,
        }));

        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: largeHolidaysArray,
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.holidays).toHaveLength(100);
      });

      it('should handle holiday calendar with special characters in name', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas & New Year 2024!@#$%^&*()',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Christmas & New Year 2024!@#$%^&*()');
      });

      it('should handle holiday calendar with very long name', async () => {
        const longName = 'A'.repeat(1000);
        const mockHolidayCalendar = {
          id: holidayId,
          name: longName,
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(longName);
      });
    });

    describe('Negative Test Cases', () => {


      it('should handle service layer errors and return 500', async () => {
        const error = new Error('Database connection failed');
        HolidayCalendarService.getHolidayCalendarById.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An error occurred while fetching holidayCalendar.');
        expect(response.body.trace_id).toBe('mock-trace-id');
        expect(response.body.error).toBe(error.message);
      });

      it('should handle invalid program_id parameter', async () => {
        const error = new Error('Invalid program_id');
        HolidayCalendarService.getHolidayCalendarById.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get('/program/invalid-program/holiday-calendar/invalid-id');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An error occurred while fetching holidayCalendar.');
        expect(response.body.error).toBe('Invalid program_id');
      });

      it('should handle invalid holiday calendar id parameter', async () => {
        const error = new Error('Invalid holiday calendar id');
        HolidayCalendarService.getHolidayCalendarById.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(`/program/${programId}/holiday-calendar/invalid-id`);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An error occurred while fetching holidayCalendar.');
        expect(response.body.error).toBe('Invalid holiday calendar id');
      });

      it('should handle service returning undefined', async () => {
        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(undefined);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('HolidayCalendar not found.');
        expect(response.body.data).toEqual([]);
      });

      it('should handle service returning empty object', async () => {
        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue({});

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('HolidayCalendar fetched successfully.');
        expect(response.body.data).toEqual({});
      });

      it('should handle service returning null for related data', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: null,
          work_locations_ids: null,
          holidays: null,
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy_id).toBeNull();
        expect(response.body.data.work_locations_ids).toBeNull();
        expect(response.body.data.holidays).toBeNull();
      });
    });

    describe('Edge Cases', () => {


      it('should handle special characters in program_id and holiday_id', async () => {
        const specialProgramId = 'program-1!@#$%^&*()';
        const specialHolidayId = 'holiday-1!@#$%^&*()';
        const specialBaseUrl = `/program/${encodeURIComponent(specialProgramId)}/holiday-calendar/${encodeURIComponent(specialHolidayId)}`;

        const mockHolidayCalendar = {
          id: specialHolidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: specialProgramId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(specialBaseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(specialHolidayId);
        expect(response.body.data.program_id).toBe(specialProgramId);
      });

      it('should handle empty string program_id and holiday_id', async () => {
        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(null);

        const response = await supertest(app.server)
          .get('/program//holiday-calendar/');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('HolidayCalendar not found.');
      });

      it('should handle numeric program_id and holiday_id', async () => {
        const numericProgramId = '12345';
        const numericHolidayId = '67890';
        const numericBaseUrl = `/program/${numericProgramId}/holiday-calendar/${numericHolidayId}`;

        const mockHolidayCalendar = {
          id: numericHolidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: numericProgramId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(numericBaseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(numericHolidayId);
        expect(response.body.data.program_id).toBe(numericProgramId);
      });

      it('should handle holiday calendar with null values in required fields', async () => {
        const mockHolidayCalendar = {
          id: null,
          name: null,
          year: null,
          is_enabled: null,
          program_id: null,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBeNull();
        expect(response.body.data.name).toBeNull();
        expect(response.body.data.year).toBeNull();
        expect(response.body.data.is_enabled).toBeNull();
        expect(response.body.data.program_id).toBeNull();
      });

      it('should handle holiday calendar with undefined values', async () => {
        const mockHolidayCalendar = {
          id: undefined,
          name: undefined,
          year: undefined,
          is_enabled: undefined,
          program_id: undefined,
          hierarchy_id: undefined,
          work_locations_ids: undefined,
          holidays: undefined,
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBeUndefined();
        expect(response.body.data.name).toBeUndefined();
        expect(response.body.data.year).toBeUndefined();
        expect(response.body.data.is_enabled).toBeUndefined();
        expect(response.body.data.program_id).toBeUndefined();
      });

      it('should handle very large hierarchy and work location arrays', async () => {
        const largeHierarchyArray = Array.from({ length: 1000 }, (_, index) => ({
          id: `hierarchy-${index}`,
          name: `Hierarchy ${index}`,
        }));

        const largeWorkLocationArray = Array.from({ length: 1000 }, (_, index) => ({
          id: `location-${index}`,
          name: `Location ${index}`,
        }));

        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: largeHierarchyArray,
          work_locations_ids: largeWorkLocationArray,
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy_id).toHaveLength(1000);
        expect(response.body.data.work_locations_ids).toHaveLength(1000);
      });

      it('should handle holiday calendar with complex nested objects in holidays', async () => {
        const complexHolidays = [
          {
            id: 'detail-1',
            holiday_calendar_id: holidayId,
            date: '2024-12-25',
            name: 'Christmas Day',
            is_time_entry_allowed: false,
            is_paid: true,
            is_tax_applicable: false,
            metadata: {
              description: 'A very special holiday',
              category: 'religious',
              importance: 'high',
              custom_fields: {
                region: 'global',
                timezone: 'UTC',
                notes: 'Celebrated worldwide',
              },
            },
          },
        ];

        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: complexHolidays,
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.data.holidays).toHaveLength(1);
        expect(response.body.data.holidays[0].metadata).toBeDefined();
        expect(response.body.data.holidays[0].metadata.description).toBe('A very special holiday');
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle service throwing TypeError', async () => {
        const error = new TypeError('Type error occurred');
        HolidayCalendarService.getHolidayCalendarById.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An error occurred while fetching holidayCalendar.');
        expect(response.body.error).toBe('Type error occurred');
      });

      it('should handle service throwing ReferenceError', async () => {
        const error = new ReferenceError('Reference error occurred');
        HolidayCalendarService.getHolidayCalendarById.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An error occurred while fetching holidayCalendar.');
        expect(response.body.error).toBe('Reference error occurred');
      });



    });

    describe('Performance and Load Test Cases', () => {
      it('should handle concurrent requests for the same holiday calendar', async () => {
        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const concurrentRequests = Array.from({ length: 10 }, () =>
          supertest(app.server)
            .get(baseUrl)
        );

        const responses = await Promise.all(concurrentRequests);

        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.status_code).toBe(200);
          expect(response.body.message).toBe('HolidayCalendar fetched successfully.');
        });
      });

      it('should handle concurrent requests for different holiday calendars', async () => {
        const mockHolidayCalendar1 = {
          id: 'holiday-1',
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        const mockHolidayCalendar2 = {
          id: 'holiday-2',
          name: 'New Year 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: [],
        };

        HolidayCalendarService.getHolidayCalendarById
          .mockResolvedValueOnce(mockHolidayCalendar1)
          .mockResolvedValueOnce(mockHolidayCalendar2);

        const concurrentRequests = [
          supertest(app.server).get(`/program/${programId}/holiday-calendar/holiday-1`),
          supertest(app.server).get(`/program/${programId}/holiday-calendar/holiday-2`),
        ];

        const responses = await Promise.all(concurrentRequests);

        expect(responses[0].status).toBe(200);
        expect(responses[0].body.data.id).toBe('holiday-1');
        expect(responses[1].status).toBe(200);
        expect(responses[1].body.data.id).toBe('holiday-2');
      });

      it('should handle large response payload efficiently', async () => {
        const largeHolidaysArray = Array.from({ length: 10000 }, (_, index) => ({
          id: `detail-${index + 1}`,
          holiday_calendar_id: holidayId,
          date: `2024-12-${String(index + 1).padStart(2, '0')}`,
          name: `Holiday ${index + 1}`,
          is_time_entry_allowed: false,
          is_paid: true,
          is_tax_applicable: false,
        }));

        const mockHolidayCalendar = {
          id: holidayId,
          name: 'Christmas 2024',
          year: '2024',
          is_enabled: true,
          program_id: programId,
          hierarchy_id: [],
          work_locations_ids: [],
          holidays: largeHolidaysArray,
        };

        HolidayCalendarService.getHolidayCalendarById.mockResolvedValue(mockHolidayCalendar);

        const startTime = Date.now();
        const response = await supertest(app.server)
          .get(baseUrl);
        const endTime = Date.now();

        expect(response.status).toBe(200);
        expect(response.body.data.holidays).toHaveLength(10000);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });
  });
});