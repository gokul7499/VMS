import Fastify from 'fastify';
import supertest from 'supertest';
import candidateRoutes from '../src/routes/candidate.routes';

// Mock all models used in the controller and its dependencies
jest.mock('../src/models/candidate.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    upsert: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));
jest.mock('../src/models/program-vendor.model', () => ({
  ProgramVendor: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));
jest.mock('../src/models/countries.model', () => ({}));
jest.mock('../src/models/user.model', () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock('../src/models/qualifications.model', () => ({}));
jest.mock('../src/models/qualification-type-model', () => ({}));
jest.mock('../src/models/job-category.model', () => ({}));
jest.mock('../src/models/job-template.model', () => ({}));
jest.mock('../src/models/labour-category.model', () => ({}));
jest.mock('../src/models/cadidate-custom-field.model', () => ({}));
jest.mock('../src/models/tenant.model', () => ({}));
jest.mock('../src/models/programs.model', () => ({}));
jest.mock('../src/models/programs-config.model', () => ({}));
jest.mock('../src/models/currencies.model', () => ({}));

// Mock utility functions and logger
jest.mock('../src/utility/genrateTraceId', () => ({
  __esModule: true,
  default: () => 'mock-trace-id',
}));
jest.mock('../src/utility/loggerService', () => ({
  logger: jest.fn(),
}));
jest.mock('../src/utility/code-genrate-service', () => ({
  CandidateCodeGenerate: jest.fn(() => 'mock-candidate-code'),
  CandidateUniqueIdGenerate: jest.fn(() => 'mock-unique-id'),
}));
jest.mock('../src/utility/baseService', () => ({
  baseSearch: jest.fn((req, res, model, searchFields, responseFields) => res.status(200).send({ status: 'ok', candidates: [] })),
}));
jest.mock('../src/utility/candidate-query', () => {
  return jest.fn().mockImplementation(() => ({
    getCandidatesWithFilters: jest.fn(() => ({
      count: 1,
      candidates: [{ id: '1', first_name: 'Test', last_name: 'User' }]
    })),
  }));
});
jest.mock('../src/utility/candidate-history', () => ({
  createCandidateHistory: jest.fn(),
}));
jest.mock('../src/utility/submission-candidate', () => ({
  fetchUnavailableCandidates: jest.fn(() => []),
}));

jest.mock('../src/config/db', () => ({
  databaseConfig: {
    config: {
      host: 'localhost',
      user: 'test',
      password: 'test',
      port: 3306,
    },
  },
}));

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
}));

const candidateModel = require('../src/models/candidate.model').default;
const { ProgramVendor } = require('../src/models/program-vendor.model');

describe('Candidate Controller', () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify();
    // @ts-ignore
    app.addHook('preHandler', (req, res, done) => {
      req.user = { sub: 'user-1', preferred_username: 'testuser', userType: 'msp' };
      done();
    });
    app.register(candidateRoutes, { prefix: '/' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. createCandidate
  describe('POST /candidate', () => {
    const candidatePayload = {
      candidate: {
        id: undefined,
        program_id: 'program-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_deleted: false,
      },
      tenant: { tenantId: 'tenant-1' },
    };

    it('should create a candidate successfully', async () => {
      ProgramVendor.findOne.mockResolvedValue({ id: 'vendor-1' });
      candidateModel.findOne.mockResolvedValue(null);
      candidateModel.upsert.mockResolvedValue([{ id: 'candidate-1' }]);

      const response = await supertest(app.server)
        .post('/candidate')
        .send(candidatePayload);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Candidate Created Successfully');
      expect(candidateModel.upsert).toHaveBeenCalled();
    });

    it('should return 200 if candidate with same email exists', async () => {
      ProgramVendor.findOne.mockResolvedValue({ id: 'vendor-1' });
      candidateModel.findOne.mockResolvedValue({ id: 'existing-candidate' });

      const response = await supertest(app.server)
        .post('/candidate')
        .send(candidatePayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Candidate with the same email already exists in this program');
      expect(candidateModel.upsert).not.toHaveBeenCalled();
    });

    it('should handle errors and return 500', async () => {
      ProgramVendor.findOne.mockResolvedValue({ id: 'vendor-1' });
      candidateModel.findOne.mockRejectedValue(new Error('DB error'));

      const response = await supertest(app.server)
        .post('/candidate')
        .send(candidatePayload);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed To Create Candidate');
    });
  });

  // 2. getAllCandidate
  describe('GET /program/:program_id/candidate', () => {
    it('should return a list of candidates', async () => {
      candidateModel.findAll.mockResolvedValue([
        { id: '1', first_name: 'Test', middle_name: '', last_name: 'User', is_active: true, name: 'Test User', email: 'test@example.com', tenant_id: 'tenant-1', vendor_id: 'vendor-1', contacts: [{ number: '123' }], candidate_id: '1', preferences: {}, worker_type_id: '', job_title: '', birth_date: '', updated_on: '', state_national_id: '', do_not_rehire_notes: '', do_not_rehire_reason: '', do_not_rehire: false }
      ]);
      ProgramVendor.findAll.mockResolvedValue([
        { id: 'vendor-1', vendor_name: 'Vendor', display_name: 'Vendor', tenant_id: 'tenant-1' }
      ]);
      candidateModel.count.mockResolvedValue(1);

      const response = await supertest(app.server)
        .get('/program/program-1/candidate');

      expect(response.status).toBe(200);
      expect(response.body.candidates.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 3. getCandidateByIdAndProgramId
  describe('GET /program/:program_id/candidate/:id', () => {
    it('should return not found if candidate does not exist', async () => {
      candidateModel.findOne.mockResolvedValue(null);

      const response = await supertest(app.server)
        .get('/program/program-1/candidate/999');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Candidate not found!');
    });
  });

  // 5. candidateSearch
  describe('GET /search', () => {
    it('should return search results', async () => {
      const response = await supertest(app.server)
        .get('/search');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
}); 