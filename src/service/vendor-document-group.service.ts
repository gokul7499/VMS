import { Op, QueryTypes } from "sequelize";
import { VendorDocumentGroup } from "../interfaces/vendor-document-group.interface";
import vendordocumentgroupModel from "../models/vendor-document-group.model";
import vendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import { sequelize } from "../config/instance";
import { vendorDocumentGroupFilterQuery } from "../utility/queries";

class VendorDocumentGroupService {
    
    async createVendorDocumentGroup(
        vendorDocumentsGroup: VendorDocumentGroup,
        program_id: string,
        userId: string
    ) {
        const { required_documents } = vendorDocumentsGroup;
        
        // Check if document group with same name already exists
        const existingDocument = await vendordocumentgroupModel.findOne({
            where: {
                name: vendorDocumentsGroup.name,
                program_id,
            },
        });

        if (existingDocument) {
            throw new Error('Vendor document group name already exists. Please use a different name.');
        }

        const total_documents = Array.isArray(required_documents) ? required_documents.length : 0;

        const item = await vendordocumentgroupModel.create({
            ...vendorDocumentsGroup, 
            total_documents, 
            created_by: userId,
            updated_by: userId,
        });

        return {
            vendor_documents_group_id: item.id,
            message: 'Vendor document group created successfully'
        };
    }

    async getVendorDocumentGroupByIdAndDoc(
        id: string,
        program_id: string,
        required_documents?: string
    ) {
        const query: any = {
            where: {
                id,
                program_id,
                is_deleted: false
            },
            attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
        };

        if (required_documents) {
            query.where.required_documents = required_documents;
        }

        const vendorDocumentsGroup = await vendordocumentgroupModel.findOne(query);

        if (!vendorDocumentsGroup) {
            return null;
        }

        return {
            vendorDocumentsGroup,
            message: "Vendor documents group found"
        };
    }

    async getVendorDocumentGroups(
        params: VendorDocumentGroup,
        query: VendorDocumentGroup & any
    ) {
        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        
        // Clean up query parameters
        const cleanQuery = { ...query };
        delete cleanQuery.page;
        delete cleanQuery.limit;
        cleanQuery.is_enabled = true;

        const searchConditions: any = {};
        if (cleanQuery.name) {
            searchConditions.name = { [Op.like]: `%${cleanQuery.name}%` };
        }
        if (cleanQuery.entity_ref) {
            searchConditions.entity_ref = { [Op.like]: `%${cleanQuery.entity_ref}%` };
        }

        const whereCondition = {
            ...cleanQuery,
            program_id: params.program_id,
            ...searchConditions,
            is_deleted: false,
        };

        const count = await vendordocumentgroupModel.count({
            where: whereCondition,
        });

        const vendorDocumentsGroup = await vendordocumentgroupModel.findAll({
            where: whereCondition,
            attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (vendorDocumentsGroup.length === 0) {
            return {
                vendorDocumentsGroup: [],
                total_records: 0,
                items_per_page: limit,
                message: "Vendor documents group not found"
            };
        }

        const vendorDocumentsGroupWithCount = vendorDocumentsGroup.map(group => {
            return {
                ...group.toJSON(),
                total_documents: group.required_documents.length,
            };
        });

        return {
            vendorDocumentsGroup: vendorDocumentsGroupWithCount,
            total_records: count,
            items_per_page: limit,
            message: "Vendor documents group found"
        };
    }

    async getVendorDocumentGroupById(program_id: string, id: string) {
        const vendorDocumentsGroup = await vendordocumentgroupModel.findOne({
            where: { program_id, id }
        });

        if (!vendorDocumentsGroup) {
            return {
                vendor_documents_group: [],
                message: "Vendor documents group not found"
            };
        }

        const required_documents = await vendorComplianceDocumentModel.findAll({
            where: { id: vendorDocumentsGroup?.required_documents, is_enabled: true },
            attributes: ['id', 'name']
        });

        return {
            vendorDocumentsGroup: {
                ...vendorDocumentsGroup.dataValues,
                required_documents
            },
            message: "Vendor documents group found"
        };
    }

    async updateVendorDocumentGroup(
        id: string,
        program_id: string,
        documentGroupData: Partial<VendorDocumentGroup>,
        userId: string
    ) {
        const { required_documents, name } = documentGroupData;

        // Find the document group
        const documentGroup = await vendordocumentgroupModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });

        if (!documentGroup) {
            throw new Error('Document group not found');
        }

        // Check for name conflicts if name is being updated
        if (name) {
            const existingGroupWithName = await vendordocumentgroupModel.findOne({
                where: {
                    name,
                    program_id,
                    is_deleted: false,
                    id: { [Op.ne]: id },
                },
            });

            if (existingGroupWithName) {
                throw new Error('Vendor document group name already exists. Please use a different name.');
            }
        }

        let total_documents = documentGroup.total_documents;
        if (Array.isArray(required_documents)) {
            total_documents = required_documents.length;
        }

        await documentGroup.update({
            ...documentGroupData,
            total_documents,
            updated_by: userId,
            updated_on: Date.now()
        });

        return {
            message: 'Document group updated successfully'
        };
    }

    async deleteVendorDocumentGroup(id: string, program_id: string, userId: string) {
        const [numRowsDeleted] = await vendordocumentgroupModel.update({
            is_enabled: false,
            updated_on: Date.now(),
            is_deleted: true
        }, {
            where: { id, program_id, updated_by: userId }
        });

        if (numRowsDeleted > 0) {
            return {
                vendor_documents_group_id: id,
                message: 'Document group deleted successfully'
            };
        } else {
            return {
                vendor_documents_group: [],
                message: "Vendor documents group not found"
            };
        }
    }

    async filterVendorDocumentGroups(
        program_id: string,
        filters: {
            id?: string;
            name?: string;
            description?: string;
            is_enabled?: string | boolean;
            updated_on?: any[];
            page?: string;
            limit?: string;
        }
    ) {
        const { id, name, description, is_enabled, updated_on, page, limit } = filters;

        const isEnabledFilter = typeof is_enabled === 'string' ? is_enabled === 'true' : is_enabled;
        const pageNumber = parseInt(page ?? '1', 10);
        const limitNumber = parseInt(limit ?? '10', 10);
        const offset = (pageNumber - 1) * limitNumber;

        const hasUpdatedOnFilter = Array.isArray(updated_on) && updated_on.length > 0;
        let updatedOnStart: any = undefined;
        let updatedOnEnd: any = undefined;

        if (hasUpdatedOnFilter) {
            const startDate = new Date(updated_on[0]);
            updatedOnStart = startDate.setHours(0, 0, 0, 0);
            updatedOnEnd = (updated_on.length === 1 || updated_on[1] === 0)
                ? startDate.setHours(23, 59, 59, 999)
                : updated_on[1];
        }

        const query = vendorDocumentGroupFilterQuery(
            Boolean(id),
            Boolean(name),
            Boolean(description),
            isEnabledFilter !== undefined,
            hasUpdatedOnFilter
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            name: name ? `%${name}%` : undefined,
            description: description ? `%${description}%` : undefined,
            limit: limitNumber,
            offset,
            is_enabled: isEnabledFilter,
            updated_on_start: updatedOnStart,
            updated_on_end: updatedOnEnd,
        };

        const data = await sequelize.query<{ total_count: any }>(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalRecords = data.length > 0 ? data[0].total_count : 0;

        return {
            vendor_documents_group: data,
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            message: data.length > 0 ? 'Vendor document groups fetched successfully.' : 'No records found.'
        };
    }
}

export default VendorDocumentGroupService;