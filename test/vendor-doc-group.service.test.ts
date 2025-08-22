diff --git a/test/vendor-document-group.service.test.ts b/test/vendor-document-group.service.test.ts
--- a/test/vendor-document-group.service.test.ts
+++ b/test/vendor-document-group.service.test.ts
@@ -0,0 +1,1768 @@
+import VendorDocumentGroupService from '../src/service/vendor-document-group.service';
+import { VendorDocumentGroup } from '../src/interfaces/vendor-document-group.interface';
+
+// Mock all dependencies
+jest.mock('../src/models/vendor-document-group.model', () => ({
+  __esModule: true,
+  default: {
+    findOne: jest.fn(),
+    create: jest.fn(),
+    findAll: jest.fn(),
+    count: jest.fn(),
+    update: jest.fn(),
+  },
+}));
+
+jest.mock('../src/models/vendor-compliance-document.model', () => ({
+  __esModule: true,
+  default: {
+    findAll: jest.fn(),
+  },
+}));
+
+jest.mock('../src/config/instance', () => ({
+  sequelize: {
+    query: jest.fn(),
+  },
+}));
+
+jest.mock('../src/utility/queries', () => ({
+  vendorDocumentGroupFilterQuery: jest.fn(),
+}));
+
+// Import mocked modules
+const vendordocumentgroupModel = require('../src/models/vendor-document-group.model').default;
+const vendorComplianceDocumentModel = require('../src/models/vendor-compliance-document.model').default;
+const { sequelize } = require('../src/config/instance');
+const { vendorDocumentGroupFilterQuery } = require('../src/utility/queries');
+
+describe('VendorDocumentGroupService', () => {
+  let service: VendorDocumentGroupService;
+
+  beforeEach(() => {
+    jest.clearAllMocks();
+    service = new VendorDocumentGroupService();
+  });
+
+  describe('createVendorDocumentGroup', () => {
+    const mockVendorDocumentGroup: VendorDocumentGroup = {
+      program_id: 'program-1',
+      id: 'group-1',
+      name: 'Test Document Group',
+      description: 'Test description',
+      required_documents: ['doc-1', 'doc-2'] as any,
+      is_enabled: true,
+      total_documents: 2,
+      items_per_page: 10,
+      trace_id: 'trace-1',
+      created_by: 'user-1' as any,
+      updated_by: 'user-1' as any
+    };
+
+    describe('Positive Test Cases', () => {
+      it('should create vendor document group successfully', async () => {
+        const mockCreatedItem = {
+          ...mockVendorDocumentGroup,
+          id: 'group-1'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue(mockCreatedItem);
+
+        const result = await service.createVendorDocumentGroup(
+          mockVendorDocumentGroup,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: {
+            name: mockVendorDocumentGroup.name,
+            program_id: 'program-1',
+          },
+        });
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith({
+          ...mockVendorDocumentGroup,
+          total_documents: 2,
+          created_by: 'user-1',
+          updated_by: 'user-1',
+        });
+
+        expect(result).toEqual({
+          vendor_documents_group_id: 'group-1',
+          message: 'Vendor document group created successfully'
+        });
+      });
+
+      it('should create vendor document group with empty required_documents', async () => {
+        const mockGroupWithEmptyDocs = {
+          ...mockVendorDocumentGroup,
+          required_documents: [] as any
+        };
+
+        const mockCreatedItem = {
+          ...mockGroupWithEmptyDocs,
+          id: 'group-2'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue(mockCreatedItem);
+
+        const result = await service.createVendorDocumentGroup(
+          mockGroupWithEmptyDocs as any,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith({
+          ...mockGroupWithEmptyDocs,
+          total_documents: 0,
+          created_by: 'user-1',
+          updated_by: 'user-1',
+        });
+
+        expect(result.vendor_documents_group_id).toBe('group-2');
+      });
+
+      it('should create vendor document group with non-array required_documents', async () => {
+        const mockGroupWithNonArrayDocs = {
+          ...mockVendorDocumentGroup,
+          required_documents: 'not-an-array' as any
+        };
+
+        const mockCreatedItem = {
+          ...mockGroupWithNonArrayDocs,
+          id: 'group-3'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue(mockCreatedItem);
+
+        const result = await service.createVendorDocumentGroup(
+          mockGroupWithNonArrayDocs,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith({
+          ...mockGroupWithNonArrayDocs,
+          total_documents: 0,
+          created_by: 'user-1',
+          updated_by: 'user-1',
+        });
+
+        expect(result.vendor_documents_group_id).toBe('group-3');
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should throw error when document group name already exists', async () => {
+        const existingGroup = { id: 'existing-group', name: 'Test Document Group' };
+        vendordocumentgroupModel.findOne.mockResolvedValue(existingGroup);
+
+        await expect(
+          service.createVendorDocumentGroup(mockVendorDocumentGroup as any, 'program-1', 'user-1')
+        ).rejects.toThrow('Vendor document group name already exists. Please use a different name.');
+
+        expect(vendordocumentgroupModel.create).not.toHaveBeenCalled();
+      });
+
+      it('should throw error when database create fails', async () => {
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockRejectedValue(new Error('Database create failed'));
+
+        await expect(
+          service.createVendorDocumentGroup(mockVendorDocumentGroup as any, 'program-1', 'user-1')
+        ).rejects.toThrow('Database create failed');
+      });
+
+      it('should throw error when findOne fails', async () => {
+        vendordocumentgroupModel.findOne.mockRejectedValue(new Error('Database query failed'));
+
+        await expect(
+          service.createVendorDocumentGroup(mockVendorDocumentGroup as any, 'program-1', 'user-1')
+        ).rejects.toThrow('Database query failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle null required_documents', async () => {
+        const mockGroupWithNullDocs = {
+          ...mockVendorDocumentGroup,
+          required_documents: null as any
+        };
+
+        const mockCreatedItem = {
+          ...mockGroupWithNullDocs,
+          id: 'group-null'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue(mockCreatedItem);
+
+        const result = await service.createVendorDocumentGroup(
+          mockGroupWithNullDocs,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith({
+          ...mockGroupWithNullDocs,
+          total_documents: 0,
+          created_by: 'user-1',
+          updated_by: 'user-1',
+        });
+
+        expect(result.vendor_documents_group_id).toBe('group-null');
+      });
+
+      it('should handle undefined required_documents', async () => {
+        const mockGroupWithUndefinedDocs = {
+          ...mockVendorDocumentGroup,
+          required_documents: undefined as any
+        };
+
+        const mockCreatedItem = {
+          ...mockGroupWithUndefinedDocs,
+          id: 'group-undefined'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue(mockCreatedItem);
+
+        const result = await service.createVendorDocumentGroup(
+          mockGroupWithUndefinedDocs,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith({
+          ...mockGroupWithUndefinedDocs,
+          total_documents: 0,
+          created_by: 'user-1',
+          updated_by: 'user-1',
+        });
+
+        expect(result.vendor_documents_group_id).toBe('group-undefined');
+      });
+
+      it('should handle very large required_documents array', async () => {
+        const largeDocsArray = Array.from({ length: 1000 }, (_, i) => `doc-${i}`);
+        const mockGroupWithLargeDocs = {
+          ...mockVendorDocumentGroup,
+          required_documents: largeDocsArray
+        };
+
+        const mockCreatedItem = {
+          ...mockGroupWithLargeDocs,
+          id: 'group-large'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue(mockCreatedItem);
+
+        const result = await service.createVendorDocumentGroup(
+          mockGroupWithLargeDocs as any,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith({
+          ...mockGroupWithLargeDocs,
+          total_documents: 1000,
+          created_by: 'user-1',
+          updated_by: 'user-1',
+        });
+
+        expect(result.vendor_documents_group_id).toBe('group-large');
+      });
+    });
+  });
+
+  describe('getVendorDocumentGroupByIdAndDoc', () => {
+    describe('Positive Test Cases', () => {
+      it('should return vendor document group when found', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          name: 'Test Group',
+          description: 'Test description',
+          required_documents: ['doc-1', 'doc-2']
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+
+        const result = await service.getVendorDocumentGroupByIdAndDoc(
+          'group-1',
+          'program-1'
+        );
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: {
+            id: 'group-1',
+            program_id: 'program-1',
+            is_deleted: false
+          },
+          attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
+        });
+
+        expect(result).toEqual({
+          vendorDocumentsGroup: mockGroup,
+          message: "Vendor documents group found"
+        });
+      });
+
+      it('should return vendor document group with required_documents filter', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          name: 'Test Group',
+          required_documents: ['doc-1']
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+
+        const result = await service.getVendorDocumentGroupByIdAndDoc(
+          'group-1',
+          'program-1',
+          'doc-1'
+        );
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: {
+            id: 'group-1',
+            program_id: 'program-1',
+            is_deleted: false,
+            required_documents: 'doc-1'
+          },
+          attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
+        });
+
+        expect(result).toEqual({
+          vendorDocumentsGroup: mockGroup,
+          message: "Vendor documents group found"
+        });
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should return null when document group not found', async () => {
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+
+        const result = await service.getVendorDocumentGroupByIdAndDoc(
+          'non-existent',
+          'program-1'
+        );
+
+        expect(result).toBeNull();
+      });
+
+      it('should throw error when database query fails', async () => {
+        vendordocumentgroupModel.findOne.mockRejectedValue(new Error('Database query failed'));
+
+        await expect(
+          service.getVendorDocumentGroupByIdAndDoc('group-1', 'program-1')
+        ).rejects.toThrow('Database query failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle empty string parameters', async () => {
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+
+        const result = await service.getVendorDocumentGroupByIdAndDoc('', '');
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: {
+            id: '',
+            program_id: '',
+            is_deleted: false
+          },
+          attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
+        });
+
+        expect(result).toBeNull();
+      });
+
+      it('should handle special characters in IDs', async () => {
+        const specialId = 'group-@#$%';
+        const specialProgramId = 'program-!@#';
+        
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+
+        await service.getVendorDocumentGroupByIdAndDoc(specialId, specialProgramId);
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: {
+            id: specialId,
+            program_id: specialProgramId,
+            is_deleted: false
+          },
+          attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
+        });
+      });
+    });
+  });
+
+  describe('getVendorDocumentGroups', () => {
+    const mockParams = { program_id: 'program-1' } as VendorDocumentGroup;
+    const mockQuery = { page: '1', limit: '10', name: 'Test' } as VendorDocumentGroup & any;
+
+    describe('Positive Test Cases', () => {
+      it('should return paginated vendor document groups successfully', async () => {
+        const mockGroups = [
+          {
+            id: 'group-1',
+            name: 'Group 1',
+            required_documents: ['doc-1', 'doc-2'],
+            toJSON: () => ({ id: 'group-1', name: 'Group 1', required_documents: ['doc-1', 'doc-2'] })
+          },
+          {
+            id: 'group-2',
+            name: 'Group 2',
+            required_documents: ['doc-3'],
+            toJSON: () => ({ id: 'group-2', name: 'Group 2', required_documents: ['doc-3'] })
+          }
+        ];
+
+        vendordocumentgroupModel.count.mockResolvedValue(2);
+        vendordocumentgroupModel.findAll.mockResolvedValue(mockGroups);
+
+        const result = await service.getVendorDocumentGroups(mockParams, mockQuery);
+
+        expect(vendordocumentgroupModel.count).toHaveBeenCalledWith({
+          where: {
+            name: { [require('sequelize').Op.like]: '%Test%' },
+            program_id: 'program-1',
+            is_enabled: true,
+            is_deleted: false,
+          },
+        });
+
+        expect(vendordocumentgroupModel.findAll).toHaveBeenCalledWith({
+          where: {
+            name: { [require('sequelize').Op.like]: '%Test%' },
+            program_id: 'program-1',
+            is_enabled: true,
+            is_deleted: false,
+          },
+          attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
+          limit: 10,
+          order: [["created_on", "DESC"]],
+          offset: 0,
+        });
+
+        expect(result).toEqual({
+          vendorDocumentsGroup: [
+            { id: 'group-1', name: 'Group 1', required_documents: ['doc-1', 'doc-2'], total_documents: 2 },
+            { id: 'group-2', name: 'Group 2', required_documents: ['doc-3'], total_documents: 1 }
+          ],
+          total_records: 2,
+          items_per_page: 10,
+          message: "Vendor documents group found"
+        });
+      });
+
+      it('should return empty result when no groups found', async () => {
+        vendordocumentgroupModel.count.mockResolvedValue(0);
+        vendordocumentgroupModel.findAll.mockResolvedValue([]);
+
+        const result = await service.getVendorDocumentGroups(mockParams, mockQuery);
+
+        expect(result).toEqual({
+          vendorDocumentsGroup: [],
+          total_records: 0,
+          items_per_page: 10,
+          message: "Vendor documents group not found"
+        });
+      });
+
+      it('should handle default pagination parameters', async () => {
+        const queryWithoutPagination = { name: 'Test' } as VendorDocumentGroup & any;
+
+        vendordocumentgroupModel.count.mockResolvedValue(0);
+        vendordocumentgroupModel.findAll.mockResolvedValue([]);
+
+        await service.getVendorDocumentGroups(mockParams, queryWithoutPagination);
+
+        expect(vendordocumentgroupModel.findAll).toHaveBeenCalledWith({
+          where: expect.objectContaining({
+            program_id: 'program-1',
+            is_enabled: true,
+            is_deleted: false,
+          }),
+          attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
+          limit: 10,
+          order: [["created_on", "DESC"]],
+          offset: 0,
+        });
+      });
+
+      it('should handle entity_ref search condition', async () => {
+        const queryWithEntityRef = { entity_ref: 'entity-123' } as VendorDocumentGroup & any;
+
+        vendordocumentgroupModel.count.mockResolvedValue(0);
+        vendordocumentgroupModel.findAll.mockResolvedValue([]);
+
+        await service.getVendorDocumentGroups(mockParams, queryWithEntityRef);
+
+        expect(vendordocumentgroupModel.count).toHaveBeenCalledWith({
+          where: expect.objectContaining({
+            entity_ref: { [require('sequelize').Op.like]: '%entity-123%' },
+          }),
+        });
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should throw error when count query fails', async () => {
+        vendordocumentgroupModel.count.mockRejectedValue(new Error('Count query failed'));
+
+        await expect(
+          service.getVendorDocumentGroups(mockParams, mockQuery)
+        ).rejects.toThrow('Count query failed');
+      });
+
+      it('should throw error when findAll query fails', async () => {
+        vendordocumentgroupModel.count.mockResolvedValue(5);
+        vendordocumentgroupModel.findAll.mockRejectedValue(new Error('FindAll query failed'));
+
+        await expect(
+          service.getVendorDocumentGroups(mockParams, mockQuery)
+        ).rejects.toThrow('FindAll query failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle invalid page and limit values', async () => {
+        const invalidQuery = { page: 'invalid', limit: 'invalid' } as VendorDocumentGroup & any;
+
+        vendordocumentgroupModel.count.mockResolvedValue(0);
+        vendordocumentgroupModel.findAll.mockResolvedValue([]);
+
+        const result = await service.getVendorDocumentGroups(mockParams, invalidQuery);
+
+        expect(vendordocumentgroupModel.findAll).toHaveBeenCalledWith({
+          where: expect.objectContaining({
+            program_id: 'program-1',
+            is_enabled: true,
+            is_deleted: false,
+          }),
+          attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
+          limit: NaN, // Invalid limit becomes NaN
+          order: [["created_on", "DESC"]],
+          offset: NaN, // Invalid offset becomes NaN
+        });
+
+        expect(result.items_per_page).toBe(NaN);
+      });
+
+      it('should handle zero and negative page numbers', async () => {
+        const zeroPageQuery = { page: '0', limit: '5' } as VendorDocumentGroup & any;
+
+        vendordocumentgroupModel.count.mockResolvedValue(0);
+        vendordocumentgroupModel.findAll.mockResolvedValue([]);
+
+        await service.getVendorDocumentGroups(mockParams, zeroPageQuery);
+
+        expect(vendordocumentgroupModel.findAll).toHaveBeenCalledWith({
+          where: expect.any(Object),
+          attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
+          limit: 5,
+          order: [["created_on", "DESC"]],
+          offset: -5, // (0-1) * 5
+        });
+      });
+
+      it('should handle very large page numbers', async () => {
+        const largePageQuery = { page: '999999', limit: '1000' } as VendorDocumentGroup & any;
+
+        vendordocumentgroupModel.count.mockResolvedValue(0);
+        vendordocumentgroupModel.findAll.mockResolvedValue([]);
+
+        await service.getVendorDocumentGroups(mockParams, largePageQuery);
+
+        expect(vendordocumentgroupModel.findAll).toHaveBeenCalledWith({
+          where: expect.any(Object),
+          attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
+          limit: 1000,
+          order: [["created_on", "DESC"]],
+          offset: 999998000, // (999999-1) * 1000
+        });
+      });
+
+      it('should handle groups with malformed required_documents', async () => {
+        const mockGroups = [
+          {
+            id: 'group-1',
+            name: 'Group 1',
+            required_documents: null,
+            toJSON: () => ({ id: 'group-1', name: 'Group 1', required_documents: null })
+          }
+        ];
+
+        vendordocumentgroupModel.count.mockResolvedValue(1);
+        vendordocumentgroupModel.findAll.mockResolvedValue(mockGroups);
+
+        await expect(
+          service.getVendorDocumentGroups(mockParams, mockQuery)
+        ).rejects.toThrow(); // Should throw when trying to access .length on null
+      });
+    });
+  });
+
+  describe('getVendorDocumentGroupById', () => {
+    describe('Positive Test Cases', () => {
+      it('should return vendor document group with related documents', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          name: 'Test Group',
+          required_documents: ['doc-1', 'doc-2'],
+          dataValues: {
+            id: 'group-1',
+            name: 'Test Group',
+            description: 'Test description'
+          }
+        };
+
+        const mockRelatedDocs = [
+          { id: 'doc-1', name: 'Document 1' },
+          { id: 'doc-2', name: 'Document 2' }
+        ];
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+        vendorComplianceDocumentModel.findAll.mockResolvedValue(mockRelatedDocs);
+
+        const result = await service.getVendorDocumentGroupById('program-1', 'group-1');
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: { program_id: 'program-1', id: 'group-1' }
+        });
+
+        expect(vendorComplianceDocumentModel.findAll).toHaveBeenCalledWith({
+          where: { id: ['doc-1', 'doc-2'], is_enabled: true },
+          attributes: ['id', 'name']
+        });
+
+        expect(result).toEqual({
+          vendorDocumentsGroup: {
+            ...mockGroup.dataValues,
+            required_documents: mockRelatedDocs
+          },
+          message: "Vendor documents group found"
+        });
+      });
+
+      it('should return group with empty related documents', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          name: 'Test Group',
+          required_documents: [],
+          dataValues: {
+            id: 'group-1',
+            name: 'Test Group'
+          }
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+        vendorComplianceDocumentModel.findAll.mockResolvedValue([]);
+
+        const result = await service.getVendorDocumentGroupById('program-1', 'group-1');
+
+        expect(result.vendorDocumentsGroup.required_documents).toEqual([]);
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should return not found message when group does not exist', async () => {
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+
+        const result = await service.getVendorDocumentGroupById('program-1', 'non-existent');
+
+        expect(result).toEqual({
+          vendor_documents_group: [],
+          message: "Vendor documents group not found"
+        });
+
+        expect(vendorComplianceDocumentModel.findAll).not.toHaveBeenCalled();
+      });
+
+      it('should throw error when main query fails', async () => {
+        vendordocumentgroupModel.findOne.mockRejectedValue(new Error('Main query failed'));
+
+        await expect(
+          service.getVendorDocumentGroupById('program-1', 'group-1')
+        ).rejects.toThrow('Main query failed');
+      });
+
+      it('should throw error when related documents query fails', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          required_documents: ['doc-1'],
+          dataValues: { id: 'group-1' }
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+        vendorComplianceDocumentModel.findAll.mockRejectedValue(new Error('Related docs query failed'));
+
+        await expect(
+          service.getVendorDocumentGroupById('program-1', 'group-1')
+        ).rejects.toThrow('Related docs query failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle null required_documents in group', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          required_documents: null,
+          dataValues: { id: 'group-1' }
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+        vendorComplianceDocumentModel.findAll.mockResolvedValue([]);
+
+        const result = await service.getVendorDocumentGroupById('program-1', 'group-1');
+
+        expect(vendorComplianceDocumentModel.findAll).toHaveBeenCalledWith({
+          where: { id: null, is_enabled: true },
+          attributes: ['id', 'name']
+        });
+
+        expect(result.vendorDocumentsGroup.required_documents).toEqual([]);
+      });
+
+      it('should handle undefined dataValues', async () => {
+        const mockGroup = {
+          id: 'group-1',
+          required_documents: [],
+          dataValues: undefined
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+        vendorComplianceDocumentModel.findAll.mockResolvedValue([]);
+
+        const result = await service.getVendorDocumentGroupById('program-1', 'group-1');
+
+        expect(result.vendorDocumentsGroup).toEqual({
+          required_documents: []
+        });
+      });
+    });
+  });
+
+  describe('updateVendorDocumentGroup', () => {
+    const mockDocumentGroup = {
+      id: 'group-1',
+      total_documents: 2,
+      update: jest.fn()
+    };
+
+    describe('Positive Test Cases', () => {
+      it('should update vendor document group successfully', async () => {
+        const updateData = {
+          name: 'Updated Name',
+          description: 'Updated description',
+          required_documents: ['doc-1', 'doc-2', 'doc-3'] as any
+        };
+
+        vendordocumentgroupModel.findOne
+          .mockResolvedValueOnce(mockDocumentGroup) // First call for finding the group
+          .mockResolvedValueOnce(null); // Second call for name conflict check - no conflict
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        const result = await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledWith({
+          where: {
+            id: 'group-1',
+            program_id: 'program-1',
+            is_deleted: false,
+          },
+        });
+
+        expect(mockDocumentGroup.update).toHaveBeenCalledWith({
+          ...updateData,
+          total_documents: 3,
+          updated_by: 'user-1',
+          updated_on: expect.any(Number)
+        });
+
+        expect(result).toEqual({
+          message: 'Document group updated successfully'
+        });
+      });
+
+      it('should update without changing name (no name conflict check)', async () => {
+        const updateData = {
+          description: 'Updated description only'
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockDocumentGroup);
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        const result = await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        // Should not call findOne for name conflict since no name provided
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledTimes(1);
+
+        expect(result.message).toBe('Document group updated successfully');
+      });
+
+      it('should update with empty required_documents array', async () => {
+        const updateData = {
+          required_documents: [] as any
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockDocumentGroup);
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        expect(mockDocumentGroup.update).toHaveBeenCalledWith({
+          ...updateData,
+          total_documents: 0,
+          updated_by: 'user-1',
+          updated_on: expect.any(Number)
+        });
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should throw error when document group not found', async () => {
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+
+        await expect(
+          service.updateVendorDocumentGroup('non-existent', 'program-1', {}, 'user-1')
+        ).rejects.toThrow('Document group not found');
+      });
+
+      it('should throw error when name already exists', async () => {
+        const updateData = { name: 'Existing Name' };
+        const existingGroupWithName = { id: 'other-group' };
+
+        vendordocumentgroupModel.findOne
+          .mockResolvedValueOnce(mockDocumentGroup) // First call for finding the group
+          .mockResolvedValueOnce(existingGroupWithName); // Second call for name conflict check
+
+        await expect(
+          service.updateVendorDocumentGroup('group-1', 'program-1', updateData, 'user-1')
+        ).rejects.toThrow('Vendor document group name already exists. Please use a different name.');
+
+        expect(mockDocumentGroup.update).not.toHaveBeenCalled();
+      });
+
+      it('should throw error when update operation fails', async () => {
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockDocumentGroup);
+        mockDocumentGroup.update.mockRejectedValue(new Error('Update failed'));
+
+        await expect(
+          service.updateVendorDocumentGroup('group-1', 'program-1', { description: 'test' }, 'user-1')
+        ).rejects.toThrow('Update failed');
+      });
+
+      it('should throw error when name conflict check fails', async () => {
+        const updateData = { name: 'New Name' };
+
+        vendordocumentgroupModel.findOne
+          .mockResolvedValueOnce(mockDocumentGroup) // First call succeeds
+          .mockRejectedValueOnce(new Error('Name check query failed')); // Second call fails
+
+        await expect(
+          service.updateVendorDocumentGroup('group-1', 'program-1', updateData, 'user-1')
+        ).rejects.toThrow('Name check query failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle non-array required_documents in update', async () => {
+        const updateData = {
+          required_documents: 'not-an-array' as any
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockDocumentGroup);
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        expect(mockDocumentGroup.update).toHaveBeenCalledWith({
+          ...updateData,
+          total_documents: 2, // Should keep existing total_documents
+          updated_by: 'user-1',
+          updated_on: expect.any(Number)
+        });
+      });
+
+      it('should handle null required_documents in update', async () => {
+        const updateData = {
+          required_documents: null as any
+        };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockDocumentGroup);
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        expect(mockDocumentGroup.update).toHaveBeenCalledWith({
+          ...updateData,
+          total_documents: 2, // Should keep existing total_documents
+          updated_by: 'user-1',
+          updated_on: expect.any(Number)
+        });
+      });
+
+      it('should handle empty string name in update', async () => {
+        const updateData = { name: '' };
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(mockDocumentGroup);
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        // Should not perform name conflict check for empty string
+        expect(vendordocumentgroupModel.findOne).toHaveBeenCalledTimes(1);
+      });
+
+      it('should handle name update with same name (no conflict)', async () => {
+        const updateData = { name: 'Unique Name' };
+
+        vendordocumentgroupModel.findOne
+          .mockResolvedValueOnce(mockDocumentGroup) // First call for finding the group
+          .mockResolvedValueOnce(null); // Second call for name conflict check - no conflict
+
+        mockDocumentGroup.update.mockResolvedValue(undefined);
+
+        const result = await service.updateVendorDocumentGroup(
+          'group-1',
+          'program-1',
+          updateData,
+          'user-1'
+        );
+
+        expect(result.message).toBe('Document group updated successfully');
+      });
+    });
+  });
+
+  describe('deleteVendorDocumentGroup', () => {
+    describe('Positive Test Cases', () => {
+      it('should delete vendor document group successfully', async () => {
+        vendordocumentgroupModel.update.mockResolvedValue([1]); // 1 row affected
+
+        const result = await service.deleteVendorDocumentGroup('group-1', 'program-1', 'user-1');
+
+        expect(vendordocumentgroupModel.update).toHaveBeenCalledWith({
+          is_enabled: false,
+          updated_on: expect.any(Number),
+          is_deleted: true
+        }, {
+          where: { id: 'group-1', program_id: 'program-1', updated_by: 'user-1' }
+        });
+
+        expect(result).toEqual({
+          vendor_documents_group_id: 'group-1',
+          message: 'Document group deleted successfully'
+        });
+      });
+
+      it('should handle multiple rows deleted', async () => {
+        vendordocumentgroupModel.update.mockResolvedValue([3]); // 3 rows affected
+
+        const result = await service.deleteVendorDocumentGroup('group-1', 'program-1', 'user-1');
+
+        expect(result).toEqual({
+          vendor_documents_group_id: 'group-1',
+          message: 'Document group deleted successfully'
+        });
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should return not found when no rows deleted', async () => {
+        vendordocumentgroupModel.update.mockResolvedValue([0]); // 0 rows affected
+
+        const result = await service.deleteVendorDocumentGroup('non-existent', 'program-1', 'user-1');
+
+        expect(result).toEqual({
+          vendor_documents_group: [],
+          message: "Vendor documents group not found"
+        });
+      });
+
+      it('should throw error when delete operation fails', async () => {
+        vendordocumentgroupModel.update.mockRejectedValue(new Error('Delete operation failed'));
+
+        await expect(
+          service.deleteVendorDocumentGroup('group-1', 'program-1', 'user-1')
+        ).rejects.toThrow('Delete operation failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle empty string parameters', async () => {
+        vendordocumentgroupModel.update.mockResolvedValue([0]);
+
+        const result = await service.deleteVendorDocumentGroup('', '', '');
+
+        expect(vendordocumentgroupModel.update).toHaveBeenCalledWith({
+          is_enabled: false,
+          updated_on: expect.any(Number),
+          is_deleted: true
+        }, {
+          where: { id: '', program_id: '', updated_by: '' }
+        });
+
+        expect(result.message).toBe("Vendor documents group not found");
+      });
+
+      it('should handle null return from update', async () => {
+        vendordocumentgroupModel.update.mockResolvedValue(null);
+
+        await expect(
+          service.deleteVendorDocumentGroup('group-1', 'program-1', 'user-1')
+        ).rejects.toThrow(); // Should throw when trying to destructure null
+      });
+
+      it('should handle undefined return from update', async () => {
+        vendordocumentgroupModel.update.mockResolvedValue(undefined);
+
+        await expect(
+          service.deleteVendorDocumentGroup('group-1', 'program-1', 'user-1')
+        ).rejects.toThrow(); // Should throw when trying to destructure undefined
+      });
+    });
+  });
+
+  describe('filterVendorDocumentGroups', () => {
+    const mockFilters = {
+      id: 'group-1',
+      name: 'Test',
+      description: 'Description',
+      is_enabled: 'true',
+      updated_on: ['2024-01-01', '2024-01-31'],
+      page: '1',
+      limit: '10'
+    };
+
+    describe('Positive Test Cases', () => {
+      it('should filter vendor document groups successfully', async () => {
+        const mockQueryResult = [
+          {
+            id: 'group-1',
+            name: 'Filtered Group',
+            total_count: 1
+          }
+        ];
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue(mockQueryResult);
+
+        const result = await service.filterVendorDocumentGroups('program-1', mockFilters);
+
+        expect(vendorDocumentGroupFilterQuery).toHaveBeenCalledWith(
+          true,  // Boolean(id)
+          true,  // Boolean(name)
+          true,  // Boolean(description)
+          true,  // isEnabledFilter !== undefined
+          true   // hasUpdatedOnFilter
+        );
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          'SELECT * FROM vendor_document_groups',
+          {
+            replacements: {
+              program_id: 'program-1',
+              id: 'group-1',
+              name: '%Test%',
+              description: '%Description%',
+              limit: 10,
+              offset: 0,
+              is_enabled: true,
+              updated_on_start: 1704067200000,
+              updated_on_end: '2024-01-31',
+            },
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+
+        expect(result).toEqual({
+          vendor_documents_group: mockQueryResult,
+          total_records: 1,
+          page: 1,
+          limit: 10,
+          message: 'Vendor document groups fetched successfully.'
+        });
+      });
+
+      it('should return empty results when no matches found', async () => {
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        const result = await service.filterVendorDocumentGroups('program-1', mockFilters);
+
+        expect(result).toEqual({
+          vendor_documents_group: [],
+          total_records: 0,
+          page: 1,
+          limit: 10,
+          message: 'No records found.'
+        });
+      });
+
+      it('should handle boolean is_enabled filter', async () => {
+        const booleanFilter = {
+          ...mockFilters,
+          is_enabled: true
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', booleanFilter);
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              is_enabled: true,
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle single date in updated_on array', async () => {
+        const singleDateFilter = {
+          ...mockFilters,
+          updated_on: ['2024-01-01']
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', singleDateFilter);
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              updated_on_start: expect.any(Number),
+              updated_on_end: expect.any(Number), // Should set end time to 23:59:59
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle filters without optional parameters', async () => {
+        const minimalFilters = {
+          page: '2',
+          limit: '5'
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', minimalFilters);
+
+        expect(vendorDocumentGroupFilterQuery).toHaveBeenCalledWith(
+          false, // Boolean(id)
+          false, // Boolean(name)
+          false, // Boolean(description)
+          false, // isEnabledFilter !== undefined
+          false  // hasUpdatedOnFilter
+        );
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              program_id: 'program-1',
+              id: undefined,
+              name: undefined,
+              description: undefined,
+              limit: 5,
+              offset: 5, // (2-1) * 5
+              is_enabled: undefined,
+              updated_on_start: undefined,
+              updated_on_end: undefined,
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+    });
+
+    describe('Negative Test Cases', () => {
+      it('should throw error when query generation fails', async () => {
+        vendorDocumentGroupFilterQuery.mockImplementation(() => {
+          throw new Error('Query generation failed');
+        });
+
+        await expect(
+          service.filterVendorDocumentGroups('program-1', mockFilters)
+        ).rejects.toThrow('Query generation failed');
+      });
+
+      it('should throw error when database query fails', async () => {
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockRejectedValue(new Error('Database query failed'));
+
+        await expect(
+          service.filterVendorDocumentGroups('program-1', mockFilters)
+        ).rejects.toThrow('Database query failed');
+      });
+    });
+
+    describe('Edge Test Cases', () => {
+      it('should handle invalid page and limit values', async () => {
+        const invalidFilters = {
+          page: 'invalid',
+          limit: 'invalid'
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        const result = await service.filterVendorDocumentGroups('program-1', invalidFilters);
+
+        expect(result.page).toBe(NaN); // Invalid page becomes NaN
+        expect(result.limit).toBe(NaN); // Invalid limit becomes NaN
+      });
+
+      it('should handle negative page and limit values', async () => {
+        const negativeFilters = {
+          page: '-1',
+          limit: '-5'
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        const result = await service.filterVendorDocumentGroups('program-1', negativeFilters);
+
+        expect(result.page).toBe(-1);
+        expect(result.limit).toBe(-5);
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              limit: -5,
+              offset: 10, // (-1-1) * -5 = 10
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle zero page and limit values', async () => {
+        const zeroFilters = {
+          page: '0',
+          limit: '0'
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', zeroFilters);
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              limit: 0,
+              offset: -0, // (0-1) * 0 = -0
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle empty array updated_on', async () => {
+        const emptyDateFilter = {
+          ...mockFilters,
+          updated_on: []
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', emptyDateFilter);
+
+        expect(vendorDocumentGroupFilterQuery).toHaveBeenCalledWith(
+          true,  // Boolean(id)
+          true,  // Boolean(name)
+          true,  // Boolean(description)
+          true,  // isEnabledFilter !== undefined
+          false  // hasUpdatedOnFilter (empty array)
+        );
+      });
+
+      it('should handle null updated_on', async () => {
+        const nullDateFilter = {
+          ...mockFilters,
+          updated_on: null
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', nullDateFilter as any);
+
+        expect(vendorDocumentGroupFilterQuery).toHaveBeenCalledWith(
+          true,  // Boolean(id)
+          true,  // Boolean(name)
+          true,  // Boolean(description)
+          true,  // isEnabledFilter !== undefined
+          false  // hasUpdatedOnFilter (null is not an array)
+        );
+      });
+
+      it('should handle invalid date strings in updated_on', async () => {
+        const invalidDateFilter = {
+          ...mockFilters,
+          updated_on: ['invalid-date', 'another-invalid-date']
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        const result = await service.filterVendorDocumentGroups('program-1', invalidDateFilter);
+
+        // Should still process but with NaN dates
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              updated_on_start: NaN, // Will be NaN for invalid date
+              updated_on_end: 'another-invalid-date',
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle is_enabled as string "false"', async () => {
+        const falseEnabledFilter = {
+          ...mockFilters,
+          is_enabled: 'false'
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', falseEnabledFilter);
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              is_enabled: false,
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle updated_on with second element as 0', async () => {
+        const zeroEndDateFilter = {
+          ...mockFilters,
+          updated_on: ['2024-01-01', 0]
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        await service.filterVendorDocumentGroups('program-1', zeroEndDateFilter);
+
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              updated_on_start: expect.any(Number),
+              updated_on_end: expect.any(Number), // Should set to 23:59:59 of start date
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+
+      it('should handle very large page numbers', async () => {
+        const largePageFilter = {
+          page: '999999',
+          limit: '1000'
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        const result = await service.filterVendorDocumentGroups('program-1', largePageFilter);
+
+        expect(result.page).toBe(999999);
+        expect(result.limit).toBe(1000);
+        expect(sequelize.query).toHaveBeenCalledWith(
+          expect.any(String),
+          {
+            replacements: expect.objectContaining({
+              limit: 1000,
+              offset: 999998000, // (999999-1) * 1000
+            }),
+            type: require('sequelize').QueryTypes.SELECT,
+          }
+        );
+      });
+    });
+  });
+
+  describe('Error Handling and Resilience', () => {
+    it('should handle model method returning unexpected data types', async () => {
+      // Test create with unexpected return
+      vendordocumentgroupModel.findOne.mockResolvedValue(null);
+      vendordocumentgroupModel.create.mockResolvedValue({ id: null });
+
+      const result = await service.createVendorDocumentGroup(
+                 {
+           name: 'Test',
+           description: 'Test',
+           required_documents: [],
+         } as any,
+        'program-1',
+        'user-1'
+      );
+
+      expect(result.vendor_documents_group_id).toBeNull();
+    });
+
+    it('should handle concurrent access scenarios', async () => {
+      // Simulate race condition where group is created between check and create
+      vendordocumentgroupModel.findOne.mockResolvedValue(null);
+      vendordocumentgroupModel.create.mockRejectedValue(
+        new Error('duplicate key value violates unique constraint')
+      );
+
+      await expect(
+        service.createVendorDocumentGroup(
+                   {
+           name: 'Concurrent Test',
+           description: 'Test',
+           required_documents: [],
+         } as any,
+          'program-1',
+          'user-1'
+        )
+      ).rejects.toThrow('duplicate key value violates unique constraint');
+    });
+
+    it('should handle database connection timeout', async () => {
+      vendordocumentgroupModel.findOne.mockRejectedValue(new Error('connection timeout'));
+
+      await expect(
+        service.createVendorDocumentGroup(
+                   {
+           name: 'Timeout Test',
+           description: 'Test',
+           required_documents: [],
+         } as any,
+          'program-1',
+          'user-1'
+        )
+      ).rejects.toThrow('connection timeout');
+    });
+  });
+
+  describe('Data Type Validation', () => {
+    it('should handle various data types in required_documents', async () => {
+      const testCases = [
+        { input: ['doc-1', 'doc-2'], expected: 2 },
+        { input: [], expected: 0 },
+        { input: null, expected: 0 },
+        { input: undefined, expected: 0 },
+        { input: 'string', expected: 0 },
+        { input: 123, expected: 0 },
+        { input: {}, expected: 0 },
+        { input: [1, 2, 3], expected: 3 },
+        { input: [''], expected: 1 },
+        { input: [null, undefined], expected: 2 },
+      ];
+
+      for (const testCase of testCases) {
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue({ id: 'test-id' });
+
+        await service.createVendorDocumentGroup(
+                     {
+             name: `Test-${testCase.input}`,
+             description: 'Test',
+             required_documents: testCase.input as any,
+           } as any,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith(
+          expect.objectContaining({
+            total_documents: testCase.expected,
+          })
+        );
+
+        jest.clearAllMocks();
+      }
+    });
+  });
+
+  describe('Performance and Memory', () => {
+    it('should handle large datasets efficiently', async () => {
+      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
+        id: `group-${i}`,
+        name: `Group ${i}`,
+        total_count: 10000
+      }));
+
+      vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+      sequelize.query.mockResolvedValue(largeDataset);
+
+      const result = await service.filterVendorDocumentGroups('program-1', {
+        page: '1',
+        limit: '10000'
+      });
+
+      expect(result.vendor_documents_group).toHaveLength(10000);
+      expect(result.total_records).toBe(10000);
+    });
+
+    it('should handle memory-intensive operations', async () => {
+      const memoryIntensiveGroup = {
+        id: 'memory-test',
+        name: 'A'.repeat(100000), // Very long string
+        description: 'B'.repeat(100000),
+        required_documents: Array.from({ length: 50000 }, (_, i) => `doc-${i}`),
+        dataValues: {
+          id: 'memory-test',
+          name: 'A'.repeat(100000),
+          description: 'B'.repeat(100000),
+        }
+      };
+
+      vendordocumentgroupModel.findOne.mockResolvedValue(memoryIntensiveGroup);
+      vendorComplianceDocumentModel.findAll.mockResolvedValue([]);
+
+      const result = await service.getVendorDocumentGroupById('program-1', 'memory-test');
+
+      expect(result.message).toBe("Vendor documents group found");
+      expect(result.vendorDocumentsGroup.required_documents).toEqual([]);
+    });
+  });
+
+  describe('Boundary Value Testing', () => {
+    describe('String Length Boundaries', () => {
+      it('should handle maximum string lengths', async () => {
+        const maxLengthGroup = {
+          name: 'A'.repeat(255), // Typical VARCHAR max length
+          description: 'B'.repeat(65535), // TEXT field max length
+          required_documents: [],
+        } as any;
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue({ id: 'max-length-id' });
+
+        const result = await service.createVendorDocumentGroup(
+          maxLengthGroup,
+          'program-1',
+          'user-1'
+        );
+
+        expect(result.vendor_documents_group_id).toBe('max-length-id');
+      });
+
+      it('should handle empty strings', async () => {
+        const emptyStringGroup = {
+          name: '',
+          description: '',
+          required_documents: [],
+        } as any;
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue({ id: 'empty-string-id' });
+
+        const result = await service.createVendorDocumentGroup(
+          emptyStringGroup,
+          '',
+          ''
+        );
+
+        expect(result.vendor_documents_group_id).toBe('empty-string-id');
+      });
+    });
+
+    describe('Array Length Boundaries', () => {
+      it('should handle maximum array size', async () => {
+        const maxArrayGroup = {
+          name: 'Max Array Test',
+          description: 'Test',
+          required_documents: Array.from({ length: 100000 }, (_, i) => `doc-${i}`),
+        } as any;
+
+        vendordocumentgroupModel.findOne.mockResolvedValue(null);
+        vendordocumentgroupModel.create.mockResolvedValue({ id: 'max-array-id' });
+
+        const result = await service.createVendorDocumentGroup(
+          maxArrayGroup,
+          'program-1',
+          'user-1'
+        );
+
+        expect(vendordocumentgroupModel.create).toHaveBeenCalledWith(
+          expect.objectContaining({
+            total_documents: 100000,
+          })
+        );
+      });
+    });
+
+    describe('Numeric Boundaries', () => {
+      it('should handle maximum safe integer values', async () => {
+        const maxIntFilters = {
+          page: Number.MAX_SAFE_INTEGER.toString(),
+          limit: Number.MAX_SAFE_INTEGER.toString()
+        };
+
+        vendorDocumentGroupFilterQuery.mockReturnValue('SELECT * FROM vendor_document_groups');
+        sequelize.query.mockResolvedValue([]);
+
+        const result = await service.filterVendorDocumentGroups('program-1', maxIntFilters);
+
+        expect(result.page).toBe(Number.MAX_SAFE_INTEGER);
+        expect(result.limit).toBe(Number.MAX_SAFE_INTEGER);
+      });
+    });
+  });
+
+  describe('State Management', () => {
+    it('should maintain state consistency during operations', async () => {
+      const mockGroup = {
+        id: 'state-test',
+        total_documents: 5,
+        update: jest.fn()
+      };
+
+      vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+      mockGroup.update.mockResolvedValue(undefined);
+
+      // First update
+      await service.updateVendorDocumentGroup(
+        'state-test',
+        'program-1',
+        { required_documents: ['doc-1', 'doc-2'] as any },
+        'user-1'
+      );
+
+      expect(mockGroup.update).toHaveBeenCalledWith(
+        expect.objectContaining({
+          total_documents: 2,
+        })
+      );
+
+      // Second update with different documents
+      await service.updateVendorDocumentGroup(
+        'state-test',
+        'program-1',
+        { required_documents: ['doc-1', 'doc-2', 'doc-3', 'doc-4'] as any },
+        'user-2'
+      );
+
+      expect(mockGroup.update).toHaveBeenLastCalledWith(
+        expect.objectContaining({
+          total_documents: 4,
+          updated_by: 'user-2',
+        })
+      );
+    });
+  });
+
+  describe('Integration Scenarios', () => {
+    it('should handle complete CRUD lifecycle', async () => {
+      // Create
+      vendordocumentgroupModel.findOne.mockResolvedValue(null);
+      vendordocumentgroupModel.create.mockResolvedValue({ id: 'lifecycle-test' });
+
+      const createResult = await service.createVendorDocumentGroup(
+        {
+          name: 'Lifecycle Test',
+          description: 'Test',
+          required_documents: ['doc-1'],
+        } as any,
+        'program-1',
+        'user-1'
+      );
+
+      expect(createResult.vendor_documents_group_id).toBe('lifecycle-test');
+
+      // Read
+      const mockGroup = {
+        id: 'lifecycle-test',
+        dataValues: { id: 'lifecycle-test', name: 'Lifecycle Test' },
+        required_documents: ['doc-1'],
+        update: jest.fn()
+      };
+
+      vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+      vendorComplianceDocumentModel.findAll.mockResolvedValue([{ id: 'doc-1', name: 'Document 1' }]);
+
+      const readResult = await service.getVendorDocumentGroupById('program-1', 'lifecycle-test');
+
+      expect(readResult.message).toBe("Vendor documents group found");
+
+      // Update
+      vendordocumentgroupModel.findOne.mockResolvedValue(mockGroup);
+
+      const updateResult = await service.updateVendorDocumentGroup(
+        'lifecycle-test',
+        'program-1',
+        { description: 'Updated description' },
+        'user-1'
+      );
+
+      expect(updateResult.message).toBe('Document group updated successfully');
+
+      // Delete
+      vendordocumentgroupModel.update.mockResolvedValue([1]);
+
+      const deleteResult = await service.deleteVendorDocumentGroup(
+        'lifecycle-test',
+        'program-1',
+        'user-1'
+      );
+
+      expect(deleteResult.message).toBe('Document group deleted successfully');
+    });
+  });
+});
