import Fastify from 'fastify';
import supertest from 'supertest';
import vendorDocumentGroupRoutes from '../src/routes/vendor-document-group.route';

// Mock all dependencies
jest.mock('../src/models/vendor-document-group.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../src/models/vendor-compliance-document.model', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
  },
}));

jest.mock('../src/service/vendor-document-group.service', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    createVendorDocumentGroup: jest.fn(),
    getVendorDocumentGroupByIdAndDoc: jest.fn(),
    getVendorDocumentGroups: jest.fn(),
    getVendorDocumentGroupById: jest.fn(),
    updateVendorDocumentGroup: jest.fn(),
    deleteVendorDocumentGroup: jest.fn(),
    filterVendorDocumentGroups: jest.fn(),
  })),
}));

jest.mock('../src/utility/genrateTraceId', () => ({
  __esModule: true,
  default: jest.fn(() => 'mock-trace-id'),
}));

jest.mock('../src/utility/loggerService', () => ({
  logger: jest.fn(),
}));

jest.mock('../src/utility/baseService', () => ({
  baseSearch: jest.fn((req, res, model, searchFields, responseFields) => 
    res.status(200).send({ 
      status_code: 200, 
      message: 'Base search successful',
      vendor_documents_group: [] 
    })
  ),
}));

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
  decodeToken: jest.fn(() => ({ sub: 'user-1', preferred_username: 'testuser', userType: 'msp' })),
}));

jest.mock('../src/middlewares/vaildate-permissions', () => ({
  validatePermissions: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock('../src/constants/permissions', () => ({
  Actions: { CREATE: 'CREATE', READ: 'READ', UPDATE: 'UPDATE', DELETE: 'DELETE' },
  Permissions: { VENDOR_COMPLIANCE_DOCUMENT_GROUP: 'VENDOR_COMPLIANCE_DOCUMENT_GROUP' },
}));

jest.mock('../src/utility/queries', () => ({
  vendorDocumentGroupFilterQuery: jest.fn(() => 'SELECT * FROM vendor_document_groups'),
}));

jest.mock('../src/config/instance', () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

const VendorDocumentGroupService = require('../src/service/vendor-document-group.service').default;

describe('Vendor Document Group Controller', () => {
  let app: any;
  let mockVendorDocumentGroupService: any;

  beforeAll(async () => {
    app = Fastify();
    // @ts-ignore
    app.addHook('preHandler', (req, res, done) => {
      req.user = { sub: 'user-1', preferred_username: 'testuser', userType: 'msp' };
      done();
    });
    app.register(vendorDocumentGroupRoutes, { prefix: '/' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVendorDocumentGroupService = new VendorDocumentGroupService();
  });

  describe('POST /program/:program_id/vendor-documents-group (createVendordocumentsgroup)', () => {
    const programId = 'program-1';
    const baseUrl = `/program/${programId}/vendor-documents-group`;
    
    const validPayload = {
      name: 'Test Document Group',
      description: 'Test description',
      required_documents: ['doc-1', 'doc-2'],
      is_enabled: true,
    };

    describe('Positive Test Cases', () => {
      it('should create vendor document group successfully', async () => {
        const mockResult = {
          vendor_documents_group_id: 'group-1',
          message: 'Vendor document group created successfully'
        };

        mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(validPayload);

        expect(response.status).toBe(201);
        expect(response.body.status_code).toBe(201);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendor_documents_group_id).toBe(mockResult.vendor_documents_group_id);
        expect(response.body.trace_id).toBe('mock-trace-id');
        expect(mockVendorDocumentGroupService.createVendorDocumentGroup).toHaveBeenCalledWith(
          validPayload,
          programId,
          'user-1'
        );
      });

      it('should create vendor document group with empty required_documents array', async () => {
        const payloadWithEmptyDocs = {
          ...validPayload,
          required_documents: []
        };

        const mockResult = {
          vendor_documents_group_id: 'group-2',
          message: 'Vendor document group created successfully'
        };

        mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(payloadWithEmptyDocs);

        expect(response.status).toBe(201);
        expect(mockVendorDocumentGroupService.createVendorDocumentGroup).toHaveBeenCalledWith(
          payloadWithEmptyDocs,
          programId,
          'user-1'
        );
      });
    });

    describe('Negative Test Cases', () => {
      it('should return 409 when document group name already exists', async () => {
        const error = new Error('Vendor document group name already exists. Please use a different name.');
        mockVendorDocumentGroupService.createVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(validPayload);

        expect(response.status).toBe(409);
        expect(response.body.status_code).toBe(409);
        expect(response.body.message).toBe(error.message);
        expect(response.body.trace_id).toBe('mock-trace-id');
      });

      it('should return 500 for database errors', async () => {
        const error = new Error('Database connection failed');
        mockVendorDocumentGroupService.createVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(validPayload);

        expect(response.status).toBe(500);
        expect(response.body.status_code).toBe(500);
        expect(response.body.message).toBe(error.message);
      });

      it('should handle missing required fields', async () => {
        const invalidPayload = {
          description: 'Test description'
          // missing name and required_documents
        };

        const error = new Error('Validation error');
        mockVendorDocumentGroupService.createVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(invalidPayload);

        expect(response.status).toBe(500);
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle very long document group name', async () => {
        const longNamePayload = {
          ...validPayload,
          name: 'A'.repeat(1000) // Very long name
        };

        const mockResult = {
          vendor_documents_group_id: 'group-3',
          message: 'Vendor document group created successfully'
        };

        mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(longNamePayload);

        expect(response.status).toBe(201);
      });

      it('should handle large required_documents array', async () => {
        const largeDocsPayload = {
          ...validPayload,
          required_documents: Array.from({ length: 100 }, (_, i) => `doc-${i}`)
        };

        const mockResult = {
          vendor_documents_group_id: 'group-4',
          message: 'Vendor document group created successfully'
        };

        mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(largeDocsPayload);

        expect(response.status).toBe(201);
      });
    });
  });

  describe('GET /program/:program_id/vendor-group/:id (getVendorDocumentsGroupByIdAndDoc)', () => {
    const programId = 'program-1';
    const groupId = 'group-1';
    const baseUrl = `/program/${programId}/vendor-group/${groupId}`;

    describe('Positive Test Cases', () => {
      it('should return vendor document group successfully', async () => {
        const mockResult = {
          vendorDocumentsGroup: {
            id: groupId,
            name: 'Test Group',
            description: 'Test description',
            required_documents: ['doc-1', 'doc-2']
          },
          message: 'Vendor documents group found'
        };

        mockVendorDocumentGroupService.getVendorDocumentGroupByIdAndDoc.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendorDocumentsGroup).toEqual(mockResult.vendorDocumentsGroup);
        expect(mockVendorDocumentGroupService.getVendorDocumentGroupByIdAndDoc).toHaveBeenCalledWith(
          groupId,
          programId,
          undefined
        );
      });
    });

    describe('Negative Test Cases', () => {
      it('should return 200 with not found message when group does not exist', async () => {
        mockVendorDocumentGroupService.getVendorDocumentGroupByIdAndDoc.mockResolvedValue(null);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe('Vendor documents group not found');
      });

      it('should return 500 for database errors', async () => {
        const error = new Error('Database error');
        mockVendorDocumentGroupService.getVendorDocumentGroupByIdAndDoc.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(500);
        expect(response.body.status_code).toBe(500);
        expect(response.body.message).toBe('An error occurred while fetching vendor documents group.');
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle invalid UUID format for group ID', async () => {
        const invalidId = 'invalid-id-123';
        const invalidUrl = `/program/${programId}/vendor-group/${invalidId}`;

        const error = new Error('Invalid UUID format');
        mockVendorDocumentGroupService.getVendorDocumentGroupByIdAndDoc.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(invalidUrl);

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /program/:program_id/vendor-documents-group/:id (getVendordocumentsgroupId)', () => {
    const programId = 'program-1';
    const groupId = 'group-1';
    const baseUrl = `/program/${programId}/vendor-documents-group/${groupId}`;

    describe('Positive Test Cases', () => {
      it('should return vendor document group with related documents', async () => {
        const mockResult = {
          vendorDocumentsGroup: {
            id: groupId,
            name: 'Test Group',
            description: 'Test description',
            required_documents: [
              { id: 'doc-1', name: 'Document 1' },
              { id: 'doc-2', name: 'Document 2' }
            ]
          },
          message: 'Vendor documents group found'
        };

        mockVendorDocumentGroupService.getVendorDocumentGroupById.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(201);
        expect(response.body.status_code).toBe(201);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendorDocumentsGroup).toEqual(mockResult.vendorDocumentsGroup);
        expect(mockVendorDocumentGroupService.getVendorDocumentGroupById).toHaveBeenCalledWith(
          programId,
          groupId
        );
      });

      it('should return group with empty required_documents', async () => {
        const mockResult = {
          vendorDocumentsGroup: {
            id: groupId,
            name: 'Test Group',
            description: 'Test description',
            required_documents: []
          },
          message: 'Vendor documents group found'
        };

        mockVendorDocumentGroupService.getVendorDocumentGroupById.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(201);
        expect(response.body.vendorDocumentsGroup.required_documents).toEqual([]);
      });
    });

    describe('Negative Test Cases', () => {
      it('should return 201 with not found message when group does not exist', async () => {
        const mockResult = {
          vendor_documents_group: [],
          message: 'Vendor documents group not found'
        };

        mockVendorDocumentGroupService.getVendorDocumentGroupById.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendorDocumentsGroup).toEqual([]);
      });

      it('should return 500 for database errors', async () => {
        const error = new Error('Database query failed');
        mockVendorDocumentGroupService.getVendorDocumentGroupById.mockRejectedValue(error);

        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(500);
        expect(response.body.status_code).toBe(500);
        expect(response.body.message).toBe('Internal Server Error');
        expect(response.body.error).toBe(error.message);
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle non-existent program_id', async () => {
        const nonExistentProgramUrl = `/program/non-existent/vendor-documents-group/${groupId}`;
        
        const mockResult = {
          vendor_documents_group: [],
          message: 'Vendor documents group not found'
        };

        mockVendorDocumentGroupService.getVendorDocumentGroupById.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .get(nonExistentProgramUrl);

        expect(response.status).toBe(201);
        expect(response.body.vendorDocumentsGroup).toEqual([]);
      });
    });
  });

  describe('PUT /program/:program_id/vendor-documents-group/:id (updateVendordocumentsgroup)', () => {
    const programId = 'program-1';
    const groupId = 'group-1';
    const baseUrl = `/program/${programId}/vendor-documents-group/${groupId}`;
    
    const updatePayload = {
      name: 'Updated Group Name',
      description: 'Updated description',
      required_documents: ['doc-1', 'doc-2', 'doc-3'],
    };

    describe('Positive Test Cases', () => {
      it('should update vendor document group successfully', async () => {
        const mockResult = {
          message: 'Document group updated successfully'
        };

        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(updatePayload);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe(mockResult.message);
        expect(mockVendorDocumentGroupService.updateVendorDocumentGroup).toHaveBeenCalledWith(
          groupId,
          programId,
          updatePayload,
          'user-1'
        );
      });

      it('should update only specific fields', async () => {
        const partialUpdate = {
          description: 'Only description updated'
        };

        const mockResult = {
          message: 'Document group updated successfully'
        };

        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(partialUpdate);

        expect(response.status).toBe(200);
        expect(mockVendorDocumentGroupService.updateVendorDocumentGroup).toHaveBeenCalledWith(
          groupId,
          programId,
          partialUpdate,
          'user-1'
        );
      });
    });

    describe('Negative Test Cases', () => {
      it('should return 404 when document group not found', async () => {
        const error = new Error('Document group not found');
        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(updatePayload);

        expect(response.status).toBe(404);
        expect(response.body.status_code).toBe(404);
        expect(response.body.message).toBe(error.message);
      });

      it('should return 400 when name already exists', async () => {
        const error = new Error('Vendor document group name already exists. Please use a different name.');
        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(updatePayload);

        expect(response.status).toBe(400);
        expect(response.body.status_code).toBe(400);
        expect(response.body.message).toBe(error.message);
      });

      it('should return 500 for general database errors', async () => {
        const error = new Error('Database connection failed');
        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(updatePayload);

        expect(response.status).toBe(500);
        expect(response.body.status_code).toBe(500);
        expect(response.body.message).toBe(error.message);
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle empty update payload', async () => {
        const emptyPayload = {};

        const mockResult = {
          message: 'Document group updated successfully'
        };

        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(emptyPayload);

        expect(response.status).toBe(200);
      });

      it('should handle null values in payload', async () => {
        const nullPayload = {
          name: null,
          description: null,
          required_documents: null
        };

        const mockResult = {
          message: 'Document group updated successfully'
        };

        mockVendorDocumentGroupService.updateVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .put(baseUrl)
          .send(nullPayload);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('DELETE /program/:program_id/vendor-documents-group/:id (deleteVendordocumentsgroup)', () => {
    const programId = 'program-1';
    const groupId = 'group-1';
    const baseUrl = `/program/${programId}/vendor-documents-group/${groupId}`;

    describe('Positive Test Cases', () => {
      it('should delete vendor document group successfully', async () => {
        const mockResult = {
          vendor_documents_group_id: groupId,
          message: 'Document group deleted successfully'
        };

        mockVendorDocumentGroupService.deleteVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .delete(baseUrl);

        expect(response.status).toBe(204);
        expect(response.body.status_code).toBe(204);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendor_documents_group_id).toBe(groupId);
        expect(mockVendorDocumentGroupService.deleteVendorDocumentGroup).toHaveBeenCalledWith(
          groupId,
          programId,
          'user-1'
        );
      });
    });

    describe('Negative Test Cases', () => {
      it('should return 200 when document group not found for deletion', async () => {
        const mockResult = {
          vendor_documents_group: [],
          message: 'Vendor documents group not found'
        };

        mockVendorDocumentGroupService.deleteVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .delete(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendor_documents_group).toEqual([]);
      });

      it('should return 500 for database errors during deletion', async () => {
        const error = new Error('Database deletion failed');
        mockVendorDocumentGroupService.deleteVendorDocumentGroup.mockRejectedValue(error);

        const response = await supertest(app.server)
          .delete(baseUrl);

        expect(response.status).toBe(500);
        expect(response.body.status_code).toBe(500);
        expect(response.body.message).toBe('Internal Server Error');
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle deletion of already deleted group', async () => {
        const mockResult = {
          vendor_documents_group: [],
          message: 'Vendor documents group not found'
        };

        mockVendorDocumentGroupService.deleteVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .delete(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(mockResult.message);
      });
    });
  });

  describe('POST /program/:program_id/vendor-documents-group/advance-filter (vendorDocumentGroupFilter)', () => {
    const programId = 'program-1';
    const baseUrl = `/program/${programId}/vendor-documents-group/advance-filter`;

    const filterPayload = {
      id: 'group-1',
      name: 'Test',
      description: 'Description',
      is_enabled: 'true',
      updated_on: ['2024-01-01', '2024-01-31'],
      page: '1',
      limit: '10'
    };

    describe('Positive Test Cases', () => {
      it('should filter vendor document groups successfully', async () => {
        const mockResult = {
          vendor_documents_group: [
            {
              id: 'group-1',
              name: 'Filtered Group',
              description: 'Filtered description',
              total_count: 1
            }
          ],
          total_records: 1,
          page: 1,
          limit: 10,
          message: 'Vendor document groups fetched successfully.'
        };

        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(filterPayload);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe(mockResult.message);
        expect(response.body.vendor_documents_group).toEqual(mockResult.vendor_documents_group);
        expect(response.body.total_records).toBe(1);
        expect(mockVendorDocumentGroupService.filterVendorDocumentGroups).toHaveBeenCalledWith(
          programId,
          filterPayload
        );
      });

      it('should return empty results when no matches found', async () => {
        const mockResult = {
          vendor_documents_group: [],
          total_records: 0,
          page: 1,
          limit: 10,
          message: 'No records found.'
        };

        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(filterPayload);

        expect(response.status).toBe(200);
        expect(response.body.vendor_documents_group).toEqual([]);
        expect(response.body.message).toBe('No records found.');
      });

      it('should filter with partial criteria', async () => {
        const partialFilter = {
          name: 'Test',
          page: '1',
          limit: '5'
        };

        const mockResult = {
          vendor_documents_group: [
            { id: 'group-1', name: 'Test Group 1' },
            { id: 'group-2', name: 'Test Group 2' }
          ],
          total_records: 2,
          page: 1,
          limit: 5,
          message: 'Vendor document groups fetched successfully.'
        };

        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(partialFilter);

        expect(response.status).toBe(200);
        expect(response.body.vendor_documents_group).toHaveLength(2);
      });
    });

    describe('Negative Test Cases', () => {
      it('should return 500 for database errors during filtering', async () => {
        const error = new Error('Database query failed');
        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockRejectedValue(error);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(filterPayload);

        expect(response.status).toBe(500);
        expect(response.body.status_code).toBe(500);
        expect(response.body.message).toBe('Internal Server Error');
        expect(response.body.error).toBe(error.message);
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle empty filter payload', async () => {
        const emptyFilter = {};

        const mockResult = {
          vendor_documents_group: [],
          total_records: 0,
          page: 1,
          limit: 10,
          message: 'No records found.'
        };

        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(emptyFilter);

        expect(response.status).toBe(200);
      });

      it('should handle invalid date ranges', async () => {
        const invalidDateFilter = {
          ...filterPayload,
          updated_on: ['invalid-date', 'another-invalid-date']
        };

        const error = new Error('Invalid date format');
        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockRejectedValue(error);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(invalidDateFilter);

        expect(response.status).toBe(500);
      });

      it('should handle single date in updated_on array', async () => {
        const singleDateFilter = {
          ...filterPayload,
          updated_on: ['2024-01-01']
        };

        const mockResult = {
          vendor_documents_group: [],
          total_records: 0,
          page: 1,
          limit: 10,
          message: 'No records found.'
        };

        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(singleDateFilter);

        expect(response.status).toBe(200);
      });

      it('should handle boolean and string values for is_enabled', async () => {
        const booleanEnabledFilter = {
          ...filterPayload,
          is_enabled: true
        };

        const mockResult = {
          vendor_documents_group: [],
          total_records: 0,
          page: 1,
          limit: 10,
          message: 'No records found.'
        };

        mockVendorDocumentGroupService.filterVendorDocumentGroups.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(baseUrl)
          .send(booleanEnabledFilter);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('GET /program/:program_id/vendor-documents-group (getAllVendorCompDocummentGroupByProgramId)', () => {
    const programId = 'program-1';
    const baseUrl = `/program/${programId}/vendor-documents-group`;

    describe('Positive Test Cases', () => {
      it('should return vendor document groups using base search', async () => {
        const response = await supertest(app.server)
          .get(baseUrl);

        expect(response.status).toBe(200);
        expect(response.body.status_code).toBe(200);
        expect(response.body.message).toBe('Base search successful');
        expect(response.body.vendor_documents_group).toEqual([]);
      });
    });

    describe('Edge Test Cases', () => {
      it('should handle base search with query parameters', async () => {
        const response = await supertest(app.server)
          .get(baseUrl)
          .query({ 
            name: 'test',
            is_enabled: 'true',
            page: '1',
            limit: '20'
          });

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling and Logging', () => {
    const programId = 'program-1';
    const createUrl = `/program/${programId}/vendor-documents-group`;
    
    const validPayload = {
      name: 'Test Document Group',
      description: 'Test description',
      required_documents: ['doc-1', 'doc-2'],
      is_enabled: true,
    };

    it('should log success events properly', async () => {
      const mockResult = {
        vendor_documents_group_id: 'group-1',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(validPayload);

      expect(response.status).toBe(201);
      
      // Verify logger was called for both creating and created events
      const { logger } = require('../src/utility/loggerService');
      expect(logger).toHaveBeenCalledTimes(2);
      
      // Check the first logger call (creating event)
      expect(logger).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({
          trace_id: 'mock-trace-id',
          eventname: 'creating vendor documents group',
          status: 'success',
          level: 'info'
        }),
        expect.any(Object)
      );
      
      // Check the second logger call (created event)
      expect(logger).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          trace_id: 'mock-trace-id',
          eventname: 'created vendor documents group',
          status: 'success',
          level: 'success'
        }),
        expect.any(Object)
      );
    });

    it('should log error events properly', async () => {
      const error = new Error('Database error');
      mockVendorDocumentGroupService.createVendorDocumentGroup.mockRejectedValue(error);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(validPayload);

      expect(response.status).toBe(500);
      
      // Verify error logger was called
      const { logger } = require('../src/utility/loggerService');
      expect(logger).toHaveBeenCalledWith(
        expect.objectContaining({
          trace_id: 'mock-trace-id',
          eventname: 'creating vendor documents group',
          status: 'error',
          level: 'error'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should include user information in service calls', async () => {
      const programId = 'program-1';
      const createUrl = `/program/${programId}/vendor-documents-group`;
      
      const validPayload = {
        name: 'Test Document Group',
        description: 'Test description',
        required_documents: ['doc-1'],
        is_enabled: true,
      };

      const mockResult = {
        vendor_documents_group_id: 'group-1',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(mockVendorDocumentGroupService.createVendorDocumentGroup).toHaveBeenCalledWith(
        validPayload,
        programId,
        'user-1' // Verify user ID is passed correctly
      );
    });
  });

  describe('Trace ID Generation', () => {
    it('should include trace_id in all responses', async () => {
      const programId = 'program-1';
      const groupId = 'group-1';
      const getUrl = `/program/${programId}/vendor-documents-group/${groupId}`;

      const mockResult = {
        vendorDocumentsGroup: {
          id: groupId,
          name: 'Test Group'
        },
        message: 'Vendor documents group found'
      };

      mockVendorDocumentGroupService.getVendorDocumentGroupById.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .get(getUrl);

      expect(response.status).toBe(201);
      expect(response.body.trace_id).toBe('mock-trace-id');
    });

    it('should include trace_id in error responses', async () => {
      const programId = 'program-1';
      const groupId = 'group-1';
      const getUrl = `/program/${programId}/vendor-documents-group/${groupId}`;

      const error = new Error('Service error');
      mockVendorDocumentGroupService.getVendorDocumentGroupById.mockRejectedValue(error);

      const response = await supertest(app.server)
        .get(getUrl);

      expect(response.status).toBe(500);
      expect(response.body.trace_id).toBe('mock-trace-id');
    });
  });

  describe('Input Validation and Sanitization', () => {
    const programId = 'program-1';
    const createUrl = `/program/${programId}/vendor-documents-group`;

    it('should handle special characters in input', async () => {
      const specialCharsPayload = {
        name: 'Test & <script>alert("xss")</script>',
        description: 'Description with "quotes" and \'apostrophes\'',
        required_documents: ['doc-1'],
        is_enabled: true,
      };

      const mockResult = {
        vendor_documents_group_id: 'group-1',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(specialCharsPayload);

      expect(response.status).toBe(201);
      expect(mockVendorDocumentGroupService.createVendorDocumentGroup).toHaveBeenCalledWith(
        specialCharsPayload,
        programId,
        'user-1'
      );
    });

    it('should handle unicode characters in input', async () => {
      const unicodePayload = {
        name: 'Test 测试 тест テスト',
        description: 'Description with émojis 🚀 and ñ characters',
        required_documents: ['doc-1'],
        is_enabled: true,
      };

      const mockResult = {
        vendor_documents_group_id: 'group-1',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(unicodePayload);

      expect(response.status).toBe(201);
    });
  });

  describe('Concurrent Operations', () => {
    const programId = 'program-1';
    const createUrl = `/program/${programId}/vendor-documents-group`;

    it('should handle multiple simultaneous create requests', async () => {
      const payload1 = {
        name: 'Group 1',
        description: 'Description 1',
        required_documents: ['doc-1'],
        is_enabled: true,
      };

      const payload2 = {
        name: 'Group 2',
        description: 'Description 2',
        required_documents: ['doc-2'],
        is_enabled: true,
      };

      const mockResult1 = {
        vendor_documents_group_id: 'group-1',
        message: 'Vendor document group created successfully'
      };

      const mockResult2 = {
        vendor_documents_group_id: 'group-2',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const [response1, response2] = await Promise.all([
        supertest(app.server).post(createUrl).send(payload1),
        supertest(app.server).post(createUrl).send(payload2)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.vendor_documents_group_id).toBe('group-1');
      expect(response2.body.vendor_documents_group_id).toBe('group-2');
    });
  });

  describe('Large Data Handling', () => {
    const programId = 'program-1';
    const createUrl = `/program/${programId}/vendor-documents-group`;

    it('should handle large required_documents arrays', async () => {
      const largePayload = {
        name: 'Large Group',
        description: 'Group with many documents',
        required_documents: Array.from({ length: 1000 }, (_, i) => `doc-${i}`),
        is_enabled: true,
      };

      const mockResult = {
        vendor_documents_group_id: 'group-large',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(largePayload);

      expect(response.status).toBe(201);
      expect(mockVendorDocumentGroupService.createVendorDocumentGroup).toHaveBeenCalledWith(
        largePayload,
        programId,
        'user-1'
      );
    });

    it('should handle very long descriptions', async () => {
      const longDescPayload = {
        name: 'Test Group',
        description: 'A'.repeat(10000), // Very long description
        required_documents: ['doc-1'],
        is_enabled: true,
      };

      const mockResult = {
        vendor_documents_group_id: 'group-long',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send(longDescPayload);

      expect(response.status).toBe(201);
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response format across all endpoints', async () => {
      const programId = 'program-1';
      const groupId = 'group-1';

      // Test create response format
      const createResult = {
        vendor_documents_group_id: groupId,
        message: 'Vendor document group created successfully'
      };
      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(createResult);

      const createResponse = await supertest(app.server)
        .post(`/program/${programId}/vendor-documents-group`)
        .send({
          name: 'Test Group',
          description: 'Test',
          required_documents: ['doc-1'],
          is_enabled: true,
        });

      expect(createResponse.body).toHaveProperty('status_code');
      expect(createResponse.body).toHaveProperty('message');
      expect(createResponse.body).toHaveProperty('trace_id');

      // Test get response format
      const getResult = {
        vendorDocumentsGroup: { id: groupId, name: 'Test Group' },
        message: 'Vendor documents group found'
      };
      mockVendorDocumentGroupService.getVendorDocumentGroupById.mockResolvedValue(getResult);

      const getResponse = await supertest(app.server)
        .get(`/program/${programId}/vendor-documents-group/${groupId}`);

      expect(getResponse.body).toHaveProperty('status_code');
      expect(getResponse.body).toHaveProperty('message');
      expect(getResponse.body).toHaveProperty('trace_id');

      // Test update response format
      const updateResult = {
        message: 'Document group updated successfully'
      };
      mockVendorDocumentGroupService.updateVendorDocumentGroup.mockResolvedValue(updateResult);

      const updateResponse = await supertest(app.server)
        .put(`/program/${programId}/vendor-documents-group/${groupId}`)
        .send({ name: 'Updated Name' });

      expect(updateResponse.body).toHaveProperty('status_code');
      expect(updateResponse.body).toHaveProperty('message');
      expect(updateResponse.body).toHaveProperty('trace_id');
    });
  });

  describe('Parameter Validation', () => {
    describe('Program ID Validation', () => {
      it('should handle missing program_id', async () => {
        const invalidUrl = '/program//vendor-documents-group';

        const response = await supertest(app.server)
          .post(invalidUrl)
          .send({
            name: 'Test Group',
            description: 'Test',
            required_documents: ['doc-1'],
            is_enabled: true,
          });

        expect(response.status).toBe(404); // Route not found
      });

      it('should handle special characters in program_id', async () => {
        const specialCharProgramId = 'program-with-special-chars@#$';
        const specialUrl = `/program/${encodeURIComponent(specialCharProgramId)}/vendor-documents-group`;

        const mockResult = {
          vendor_documents_group_id: 'group-1',
          message: 'Vendor document group created successfully'
        };

        mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

        const response = await supertest(app.server)
          .post(specialUrl)
          .send({
            name: 'Test Group',
            description: 'Test',
            required_documents: ['doc-1'],
            is_enabled: true,
          });

        expect(response.status).toBe(201);
      });
    });

    describe('Group ID Validation', () => {
      it('should handle missing group_id in update', async () => {
        const programId = 'program-1';
        const invalidUrl = `/program/${programId}/vendor-documents-group/`;

        const response = await supertest(app.server)
          .put(invalidUrl)
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(404); // Route not found
      });

      it('should handle empty string group_id', async () => {
        const programId = 'program-1';
        const emptyIdUrl = `/program/${programId}/vendor-documents-group/ `;

        const response = await supertest(app.server)
          .get(emptyIdUrl);

        expect(response.status).toBe(404); // Route not found
      });
    });
  });

  describe('Content-Type and Payload Validation', () => {
    const programId = 'program-1';
    const createUrl = `/program/${programId}/vendor-documents-group`;

    it('should handle invalid JSON payload', async () => {
      const response = await supertest(app.server)
        .post(createUrl)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400); // Bad request for invalid JSON
    });

    it('should handle missing Content-Type header', async () => {
      const mockResult = {
        vendor_documents_group_id: 'group-1',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(mockResult);

      const response = await supertest(app.server)
        .post(createUrl)
        .send({
          name: 'Test Group',
          description: 'Test',
          required_documents: ['doc-1'],
          is_enabled: true,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Service Integration', () => {
    it('should pass correct parameters to service methods', async () => {
      const programId = 'test-program';
      const groupId = 'test-group';
      
      // Test create
      const createPayload = {
        name: 'Service Test Group',
        description: 'Testing service integration',
        required_documents: ['doc-1', 'doc-2'],
        is_enabled: true,
      };

      const createResult = {
        vendor_documents_group_id: 'new-group-id',
        message: 'Vendor document group created successfully'
      };

      mockVendorDocumentGroupService.createVendorDocumentGroup.mockResolvedValue(createResult);

      await supertest(app.server)
        .post(`/program/${programId}/vendor-documents-group`)
        .send(createPayload);

      expect(mockVendorDocumentGroupService.createVendorDocumentGroup).toHaveBeenCalledWith(
        createPayload,
        programId,
        'user-1'
      );

      // Test update
      const updatePayload = { name: 'Updated Name' };
      const updateResult = { message: 'Document group updated successfully' };

      mockVendorDocumentGroupService.updateVendorDocumentGroup.mockResolvedValue(updateResult);

      await supertest(app.server)
        .put(`/program/${programId}/vendor-documents-group/${groupId}`)
        .send(updatePayload);

      expect(mockVendorDocumentGroupService.updateVendorDocumentGroup).toHaveBeenCalledWith(
        groupId,
        programId,
        updatePayload,
        'user-1'
      );

      // Test delete
      const deleteResult = {
        vendor_documents_group_id: groupId,
        message: 'Document group deleted successfully'
      };

      mockVendorDocumentGroupService.deleteVendorDocumentGroup.mockResolvedValue(deleteResult);

      await supertest(app.server)
        .delete(`/program/${programId}/vendor-documents-group/${groupId}`);

      expect(mockVendorDocumentGroupService.deleteVendorDocumentGroup).toHaveBeenCalledWith(
        groupId,
        programId,
        'user-1'
      );
    });
  });
});