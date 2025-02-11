import { ProgramVendor } from "../models/program-vendor.model";
import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { programVendorInterface, programVendorQueryInterface } from "../interfaces/program-vendor.interface";
import UserMapping from "../models/user-mapping.model";
import Tenant from "../models/tenant.model";
import vendorMarkupConfig from "../models/vendor-markup-config.model";
import VendorGroup from "../models/vendor-group.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import { Op, QueryTypes } from "sequelize";
import { complianceDocumentCountByVendorId, complianceDocumentGetByUserAndDocumentId, complianceDocumentGetByUserId, complianceDocumentGetByVendorAndDocumentId, complianceDocumentGetByVendorId, complianceGroupQueryWithUserId, complianceGroupQueryWithVendorId, getComplianceDocuments, programVendorAdvancedFilter, programVendorQuery, vendorDataQuery, vendorFilterQueryBuilder } from "../utility/queries";
import { VendorComplianceDocumentInterface } from "../interfaces/vendor-compliance-document.interface";
import VendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import VendorDocumentGroupModel from "../models/vendor-document-group.model";
import UserModel from "../models/user.model";
import { log } from "console";
interface VendorDetails {
    expiry_on: any;
    url: any;
    file_name: any;
    display_name: any;
    document_number: any;
    regain_compliance_days: null;
    attached_doc_url: null;
    created_on: any;
    modified_on: any;
    is_enabled: any;
    is_deleted: any;
    no_of_days: any;
    uploaded_document_status: string;
    uploaded_document_expiry_on: any;
    uploaded_document_file_name: any;
    uploaded_document_audited_by: string;
    uploaded_document_audited_on: null;
    work_location: null;
    vendor_name: any;
    act: any;
    program_id: any;
    next_expiry_on: null;
    max_phone_length: any;
    min_phone_length: any;
    iso_code_3: any;
    iso_code_2: any;
    isd_code: any;
    uploaded_document: any;
    to_uploaded: any;
    upload_document_days: number;
    name: any;
    total_count: number;
    id: any;
    status: any;
    tenant_id :any;
    compliance_documents: any;
}


export async function getProgramVendors(
    request: FastifyRequest<{
        Params: { program_id: string };
        Querystring: programVendorQueryInterface;
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { vendor_name, user_id, is_enabled, status, modified_on } = request.query;

        const page = parseInt(request.query.page as unknown as string, 10) || 1;
        const limit = parseInt(request.query.limit as unknown as string, 10) || 10;

        const filters: any = { program_id, is_deleted: false };

        if (vendor_name) {
            filters.vendor_name = { [Op.like]: `%${vendor_name}%` };
        }

        if (is_enabled !== undefined) {
            filters.is_enabled = is_enabled;
        }

        if (user_id !== undefined) {
            filters.user_id = user_id;
        }

        if (status) {
            filters.status = status;
        }

        if (modified_on) {
            filters.modified_on = modified_on;
        }

        const offset = (page - 1) * limit;

        const queryOptions: any = {
            where: filters,
            limit,
            offset,
            order: [['created_on', 'DESC']],
        };

        if (!user_id) {
            queryOptions.attributes = [
                'id', 'program_id', 'tenant_id', 'com_doc_group', 'display_name', 'vendor_name', 'is_enabled',
                'modified_on', 'status', 'job', 'created_on', 'candidate', 'compliance_status', 'contact', 'diversity_details'
            ];
        }

        const { rows: program_vendors, count: totalItems } = await ProgramVendor.findAndCountAll(queryOptions);

        const countryIds = new Set();
        program_vendors.forEach(vendor => {
            vendor.addresses?.forEach((address: { country: unknown; }) => {
                if (address.country) countryIds.add(address.country);
            });
            vendor.diversity_details?.forEach((diversity: { country: unknown; }) => {
                if (diversity.country) countryIds.add(diversity.country);
            });
        });

        const countryIdsArray = Array.from(countryIds);
        let countries: any[] = [];

        if (countryIdsArray.length > 0) {
            countries = await sequelize.query(
                `SELECT * FROM countries WHERE id IN (:countryIds)`,
                {
                    replacements: { countryIds: countryIdsArray },
                    type: QueryTypes.SELECT,
                }
            );
        }


        const countryMap: { [key: string]: any } = countries.reduce((acc: { [key: string]: any }, country: any) => {
            acc[country.id] = country;
            return acc;
        }, {});

        const processedVendors = await Promise.all(
            program_vendors.map(async (vendor) => {
                const vendorDocumentGroups = await VendorDocumentGroupModel.findAll({
                    where: { id: vendor.com_doc_group },
                });

                let compliance_status = {
                    status: 'Non-Compliant',
                    is_audited: false,
                    is_compliant: false,
                };

                if (vendorDocumentGroups.length > 0) {
                    const required_documentsIds = vendorDocumentGroups[0].required_documents;

                    const required_documents = await VendorComplianceDocumentModel.findAll({
                        where: {
                            id: required_documentsIds,
                        },
                    });

                    let allDocumentsCompliant = true;

                    for (const doc of required_documents) {
                        if (
                            !doc.uploaded_document ||
                            !doc.uploaded_document.status ||
                            doc.uploaded_document.status.toLowerCase() !== 'compliant'
                        ) {
                            allDocumentsCompliant = false;
                            break;
                        }
                    }

                    if (allDocumentsCompliant) {
                        compliance_status = {
                            status: 'Compliant',
                            is_audited: true,
                            is_compliant: true,
                        };
                    }
                }

                vendor.compliance_status = compliance_status;

                vendor.addresses = vendor.addresses?.map((address: { country: string | number; }) => {
                    const country = countryMap[address.country];
                    if (country) {
                        return {
                            ...address,
                            country: {
                                id: country.id,
                                name: country.name,
                                isd_code: country.isd_code,
                                iso_code_2: country.iso_code_2,
                                iso_code_3: country.iso_code_3,
                                min_phone_length: country.min_phone_length,
                                max_phone_length: country.max_phone_length,
                            },
                        };
                    }
                    return address;
                });

                vendor.diversity_details = vendor.diversity_details?.map((diversity: { country: string | number; }) => {
                    const country = countryMap[diversity.country];
                    if (country) {
                        return {
                            ...diversity,
                            country: {
                                id: country.id,
                                name: country.name,
                            },
                        };
                    }
                    return diversity;
                });

                return vendor;
            })
        );

        reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendors fetched successfully.',
            trace_id: traceId,
            items_per_page: limit,
            total_records: totalItems,
            program_vendors: processedVendors,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching ProgramVendors.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
}


export async function saveProgramVendor(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let users: any = await decodeToken(token);

    if (!users) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const { tenant, user, 'user-group-mapping': userGroupMapping } = request.body as any;
    console.log('tenant', request.body);
    const {id,...userWithoutId}=user
    console.log("weruyitur",user)
    const traceId = generateCustomUUID();
    const { program_id } = request.params;
    if (!program_id) {
        return reply.status(400).send({
            status_code: 400,
            message: 'Program ID is required.',
            trace_id: traceId,
        });
    }

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: users?.preferred_username,
                user_id: users?.sub,
            },
            data: request.body,
            eventname: "creating programVendor",
            status: "success",
            description: `Creating programVendor for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        ProgramVendor
    );

    const transaction = await sequelize.transaction();
    try {
        if (!tenant || !user) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Tenant or User information is missing.',
                trace_id: traceId,
            });
        }

        const vendor = {
            vendor_name: tenant.name,
            status: 'Pending Setup',
            vendor_logo: tenant.logo,
            display_name: tenant.display_name,
            vendor_code : tenant.tenant_code,
            addresses: user.addresses,
            tenant_id:tenant.id,
            background_logo_color: tenant.background_logo_color,
        }

        const contact = [
            {
                first_name: user.first_name,
                middle_name: user.middle_name,
                last_name: user.last_name,
                email: user.email,
                addresses: user.addresses
            }
        ]
       let tenantData;
        const tenants=await Tenant.findOne({where:{id:tenant.id}});
        if(!tenants){
             tenantData = await Tenant.create({ ...tenant }, { transaction });
        }
        else{
            tenantData=tenants
        }
        const programVendors = await ProgramVendor.create({ ...vendor,  program_id}, { transaction });
        const userData = await UserModel.create({ ...userWithoutId, user_id: user.id, tenant_id: tenantData.id, status: user.status, program_id, vendor_id: programVendors.id }, { transaction });
        await UserMapping.create({ id: userGroupMapping.id, status: userGroupMapping.status, tenant_id: tenantData.id, user_id: userData.user_id, program_id, role_id: user.role_id }, { transaction });
        
        await ProgramVendor.update(
            { user_id: userData.user_id, contact },
            { where: { id: programVendors.id, program_id }, transaction }
        );

        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            message: 'ProgramVendor created successfully.',
            trace_id: traceId,
            id: programVendors.id,
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: users?.preferred_username,
                    user_id: users?.sub,
                },
                data: request.body,
                eventname: "create programVendor",
                status: "success",
                description: `create programVendor for ${program_id} successfully: ${programVendors.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            ProgramVendor
        );

    } catch (error: any) {
        // Rollback transaction in case of an error
        await transaction.rollback();

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: users?.preferred_username,
                    user_id: users?.sub,
                },
                data: request.body,
                eventname: "create programVendor",
                status: "failed",
                description: `create programVendor for ${program_id} failed`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            ProgramVendor
        );
        console.log("Validation errors:", error.errors || error.message);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while saving ProgramVendor.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
};


export const updateProgramVendor = async (
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    const programVendorData = request.body as Partial<programVendorInterface>;
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;

    try {
        const existingProgramVendor = await ProgramVendor.findOne({ where: { program_id, id } });

        if (!existingProgramVendor) {
            return reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found for update.',
                trace_id: traceId,
                program_vendor: []
            });
        }

        await existingProgramVendor.update(programVendorData);

        if (programVendorData.markup_config && Array.isArray(programVendorData.markup_config)) {
            const incomingMarkupIds = programVendorData.markup_config
                .map(markup => markup.id)
                .filter(id => id !== null && id !== "null");

            await vendorMarkupConfig.destroy({
                where: {
                    program_vendor_id: existingProgramVendor.id,
                    id: { [Op.notIn]: incomingMarkupIds },
                },
            });

            for (const markup of programVendorData.markup_config) {
                if (markup.id && markup.id !== null && markup.id !== "null") {
                    await vendorMarkupConfig.update(
                        {
                            ...(markup.rate_model && { rate_model: markup.rate_model }),
                            ...(markup.program_industry && { program_industry: markup.program_industry }),
                            ...(markup.hierarchy && { hierarchy: markup.hierarchy }),
                            ...(markup.work_locations && { work_locations: markup.work_locations }),
                            ...(markup.sliding_scale !== undefined && { sliding_scale: markup.sliding_scale }),
                            ...(markup.markups && { markups: markup.markups }),
                            is_all_hierarchy: markup.is_all_hierarchy ? 1 : 0,
                            is_all_work_locations: markup.is_all_work_locations ? 1 : 0,
                            is_all_labor_category: markup.is_all_labor_category ? 1 : 0,
                        },
                        {
                            where: {
                                id: markup.id, program_vendor_id: existingProgramVendor.id, created_by: userId,
                                modified_by: userId,
                            },
                        }
                    );
                } else if (markup.id === null || markup.id === "null") {
                    const { id, ...markupData } = markup;
                    await vendorMarkupConfig.create({
                        ...markupData,
                        program_vendor_id: existingProgramVendor.id,
                        program_id: program_id,
                        is_enabled: true,
                        is_deleted: false,
                        is_all_hierarchy: markup.is_all_hierarchy ? 1 : 0,
                        is_all_work_locations: markup.is_all_work_locations ? 1 : 0,
                        is_all_labor_category: markup.is_all_labor_category ? 1 : 0,
                    });
                }
            }
        }
        reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendor and VendorMarkupConfig updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating ProgramVendor.',
            trace_id: traceId,
            error: (error as any).message
        });
    }
};

export async function deleteProgramVendor(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
    try {
        const { program_id, id } = request.params;
        const program_vendor = await ProgramVendor.findOne({ where: { program_id, id } });
        if (program_vendor) {
            await ProgramVendor.update({ is_deleted: true, is_enabled: false }, {
                where: {
                    program_id, id, created_by: userId,
                    modified_by: userId,
                }
            });
            reply.status(204).send({
                status_code: 204,
                message: 'ProgramVendor deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found.',
                trace_id: traceId,
                program_vendor: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting ProgramVendor.',
            trace_id: traceId,
            error: error,
        });
    }
}

export const getProgramVendorById = async (
    request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    try {
        const vendorData = await sequelize.query<ProgramVendor>(vendorDataQuery, {
            replacements: { id, program_id },
            type: QueryTypes.SELECT
        });

        if (vendorData.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found.',
                trace_id: traceId,
                program_vendor: null,
            });
        }

        const programVendor: ProgramVendor = vendorData[0];

        return reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendor data fetched successfully.',
            trace_id: traceId,
            program_vendor: programVendor,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while retrieving ProgramVendor data.',
            trace_id: traceId,
        });
    }
};

export async function getVendorAndVendorGroup(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, labor_category_id, work_location_id, search } = request.query as {
        hierarchy_ids?: string;
        labor_category_id?: string;
        work_location_id?: string;
        search?: string;
    };
    try {
        const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(',').map(id => id.trim()) : [];
        const laborCategoryIdsArray = labor_category_id ? labor_category_id.split(',').map(id => id.trim()) : [];
        const workLocationIdsArray = work_location_id ? work_location_id.split(',').map(id => id.trim()) : [];

        let vendorFilterQuery = vendorFilterQueryBuilder(
            hierarchyIdsArray,
            laborCategoryIdsArray,
            workLocationIdsArray
        );

        const vendorReplacements: Record<string, any> = {
            program_id,
        };
        hierarchyIdsArray.forEach((id, index) => {
            vendorReplacements[`hierarchy_ids${index}`] = id;
        });
        laborCategoryIdsArray.forEach((id, index) => {
            vendorReplacements[`labor_category_id${index}`] = id;
        });
        workLocationIdsArray.forEach((id, index) => {
            vendorReplacements[`work_location_id${index}`] = id;
        });

        if (search) {
            vendorFilterQuery += ` AND vendor_name LIKE :search`;
            vendorReplacements['search'] = `%${search}%`;
        }

        const filteredVendors = await sequelize.query<VendorDetails>(vendorFilterQuery, {
            replacements: vendorReplacements,
            type: QueryTypes.SELECT,
        });

        const vendorGroupQuery: { where: Record<string, any>; attributes: any } = {
            where: { program_id, is_deleted: false },
            attributes: ['id', 'vendor_group_name'],
        };

        if (search) {
            vendorGroupQuery.where.vendor_group_name = { [Op.like]: `%${search}%` };
        }

        const vendorGroups = await VendorGroup.findAll(vendorGroupQuery);

        const responseVendors = filteredVendors.map(vendor => ({
            id: vendor.tenant_id,
            vendor: vendor.display_name,
        }));

        const combinedResponse = [
            ...responseVendors,
            ...vendorGroups.map(group => ({
                id: group.id,
                vendor: group.vendor_group_name,
                is_group: true,
            })),
        ];

        reply.status(200).send({
            status_code: 200,
            message: 'Vendors retrieved successfully',
            vendors: combinedResponse,
            trace_id: traceId,
        });

    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}

export async function updateProgramVendorByUserId(
    request: FastifyRequest<{ Params: { program_id: string, user_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { program_id, user_id } = request.params;
    const programVendorData = request.body as Partial<programVendorInterface>;
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;

    try {
        const existingProgramVendor = await ProgramVendor.findOne({ where: { program_id, user_id } });

        if (!existingProgramVendor) {
            return reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found for update.',
                trace_id: traceId,
                program_vendor: []
            });
        }
        await existingProgramVendor.update(programVendorData, {
            where: {
                created_by: userId,
                modified_by: userId,
            }
        });

        if (programVendorData.markup_config && Array.isArray(programVendorData.markup_config)) {
            for (const markup of programVendorData.markup_config) {
                await vendorMarkupConfig.upsert({
                    id: markup.id,
                    program_id: existingProgramVendor.program_id,
                    program_vendor_id: existingProgramVendor.id,
                    ...markup,
                    is_enabled: true,
                    is_deleted: false,
                });
            }
        }

        const updatedVendor = await ProgramVendor.findOne({ where: { program_id, user_id } });

        reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendor and VendorMarkupConfig updated successfully.',
            trace_id: traceId,
            program_vendor: updatedVendor,
        });

    } catch (error) {
        console.error('Error updating ProgramVendor:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating ProgramVendor.',
            trace_id: traceId,
            error: error,
        });
    }
};

export const getVendorDocuments = async (
    request: FastifyRequest<{ Params: { program_id: string }; Querystring: { vendor_id?: string; document_id?: string, page?: string, limit?: string, name?: string, is_enabled?: string } }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const { vendor_id, document_id, page = '1', limit = '10', name = null, is_enabled = null } = request.query;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const user_id = user?.sub;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const offset = (pageNumber - 1) * pageSize;

    try {
        let documents: VendorDetails[] = [];

        if (vendor_id && document_id) {
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByVendorAndDocumentId, {
                replacements: { program_id, vendor_id, document_id },
                type: QueryTypes.SELECT,
            });
        } else if (vendor_id) {
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByVendorId, {
                replacements: { program_id, vendor_id, name: name ? `%${name}%` : null, is_enabled, limit: pageSize, offset },
                type: QueryTypes.SELECT,
            });
        }
        else if (user_id && document_id) {
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByUserAndDocumentId, {
                replacements: { program_id, user_id, document_id },
                type: QueryTypes.SELECT,
            });
        } else if (user_id) {
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByUserId, {
                replacements: { program_id, user_id, name: name ? `%${name}%` : null, is_enabled, limit: pageSize, offset },
                type: QueryTypes.SELECT,
            });
        } else {
            return reply.status(400).send({
                status_code: 400,
                message: 'Invalid request parameters.',
                trace_id: traceId,
            });
        }
        const uniqueDocuments = documents.filter((doc, index, self) =>
            index === self.findIndex((d) => d.id === doc.id)
        );
        let totalCount = uniqueDocuments.length;
        if (!uniqueDocuments.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No compliance documents found for the given criteria.',
                trace_id: traceId,
                total_count: totalCount,
                page_size: pageSize,
                uploaded_documents: [],
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Vendor documents fetched successfully.',
            trace_id: traceId,
            total_count: totalCount,
            page_size: pageSize,
            uploaded_documents: uniqueDocuments.map(doc => ({
                id: doc.id,
                program_id: doc.program_id,
                name: doc.name,
                act: doc.act,
                document_number: doc.document_number,
                upload_document_days: doc.upload_document_days,
                regain_compliance_days: doc.regain_compliance_days,
                attached_doc_url: doc.attached_doc_url,
                created_on: doc.created_on,
                modified_on: doc.modified_on,
                is_enabled: doc.is_enabled,
                is_deleted: doc.is_deleted,
                to_uploaded: doc.to_uploaded,
                no_of_days: doc.no_of_days,
                uploaded_document: {
                    expiry_on: doc.expiry_on,
                    audited_by: doc.uploaded_document ? doc.uploaded_document.audited_by : "--",
                    next_expiry_on: doc.next_expiry_on,
                    status: doc.status,
                    file_name: doc.file_name,
                    url:doc.url,
                },
                work_location: doc.work_location,
                vendor_name: doc.display_name,
            })),
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching vendor documents.',
            trace_id: traceId,
            error: error.message,
        });
    }
};

export const getProgramVendorByUserId = async (
    request: FastifyRequest<{ Params: { program_id: string }; Querystring: { user_id?: string, vendor_id?: string } }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const { user_id, vendor_id } = request.query;
    const traceId = generateCustomUUID();

    try {
        const hasUserId = !!user_id;
        const hasVendorId = !!vendor_id;

        const program_vendor = await sequelize.query<VendorDetails>(programVendorQuery(hasUserId, hasVendorId), {
            replacements: { program_id, user_id, vendor_id },
            type: QueryTypes.SELECT
        });

        if (!program_vendor.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor not found for the given program.',
                program_vendor: [],
                trace_id: traceId,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Vendor details fetched successfully.',
            trace_id: traceId,
            program_vendor: program_vendor
        });

    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching vendor details.',
            trace_id: traceId,
        });
    }
};

export async function updateComplianceDocument(
    request: FastifyRequest<{ Params: { program_id: string }, Querystring: { user_id?: string, vendor_id?: string, document_id: string } }>,
    reply: FastifyReply
) {
    const { program_id } = request.params;
    const { document_id, vendor_id } = request.query;
    const complianceDocumentUpdate = request.body as Partial<VendorComplianceDocumentInterface>;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', trace_id: traceId });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    const user_id = user?.sub;

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token', trace_id: traceId });
    }
    try {
        const query = user_id && document_id
            ? complianceGroupQueryWithUserId
            : vendor_id && document_id
                ? complianceGroupQueryWithVendorId
                : null;

        if (!query) {
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid query parameters. Please provide either a user_id or vendor_id along with document_id.",
                trace_id: traceId,
            });
        }

        const complianceDocuments: VendorDetails[] = await sequelize.query<VendorDetails>(query, {
            replacements: { program_id, user_id, vendor_id, document_id },
            type: QueryTypes.SELECT,
        });

        if (!complianceDocuments || complianceDocuments.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: "Program vendor or document not found.",
                trace_id: traceId,
                user_document: []
            });
        }
        const vendorRecord: any = await sequelize.query(
            `SELECT pv.id 
             FROM user u
             JOIN program_vendors pv ON u.tenant_id = pv.tenant_id
             WHERE u.user_id = :user_id AND u.program_id = :program_id AND pv.program_id = :program_id`,
            {
                replacements: { user_id, program_id },
                type: QueryTypes.SELECT,
            }
        );
        
        const vendorId = vendorRecord[0].id;
        const documentData = complianceDocuments[0];

        const uploadedDocument = complianceDocumentUpdate.uploaded_document;

        const expiryDateFromPayload = complianceDocumentUpdate.uploaded_document?.expiry_on;
        if (!expiryDateFromPayload) {
            return reply.status(400).send({
                status_code: 400,
                message: "Expiry date must be provided in the uploaded_document.",
                trace_id: traceId,
            });
        }

        const expiryDate = new Date(expiryDateFromPayload);
        if (isNaN(expiryDate.getTime())) {
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid expiry date format.",
                trace_id: traceId,
            });
        }

        const upload_document_days = documentData.upload_document_days || 0;
        const status = documentData.to_uploaded;

        let nextUpdateDueDate = new Date(expiryDate);

        if (status === "Before Expiration") {
            nextUpdateDueDate.setDate(nextUpdateDueDate.getDate() - upload_document_days);
        } else if (status === 'After Expiration') {
            nextUpdateDueDate.setDate(nextUpdateDueDate.getDate() + upload_document_days);
        }

        const userData = await UserModel.findAll({
            where: { program_id, id: user.sub }
        });

        let audited_by = user.preferred_username;

        if (userData.length > 0 && userData[0].user_type === 'vendor' || 'Vendor') {
            audited_by = "--";
        }

        if (complianceDocumentUpdate) {
            complianceDocumentUpdate.uploaded_document.audited_by = audited_by;
            complianceDocumentUpdate.uploaded_document.audited_on = new Date();
        }

        await VendorComplianceReqDocMappingModel.destroy({
            where: {
                vendor_id: vendorId,
                program_id: program_id
            }
        });
        if (uploadedDocument) {
            await VendorComplianceReqDocMappingModel.create({
                program_id: program_id,
                required_document_id: document_id,
                user_id: user_id,
                vendor_id: vendorId ?? null,
                url: uploadedDocument.url,
                uploaded_on: Date.now(),
                compliance_note: uploadedDocument.compliance_note,
                file_name: uploadedDocument.file_name,
                next_expiry_on: nextUpdateDueDate.getTime(),
                expiry_on: uploadedDocument.expiry_on,
                created_by: user_id,
                modified_by: user_id,
                status: uploadedDocument.status,
                is_enabled: true,
                is_deleted: false,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: "Compliance document updated successfully.",
            trace_id: traceId,
        });

    } catch (error:any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error:error.message
        });
    }
}

export async function getComplianceDocument(
    request: FastifyRequest<{ Params: { program_id: string; user_id: string }, Querystring: { document_id?: string } }>,
    reply: FastifyReply
) {
    const { program_id, user_id } = request.params;
    const { document_id } = request.query;
    const traceId = generateCustomUUID();

    try {
        const query = document_id
            ? complianceGroupQueryWithUserId
            : getComplianceDocuments;

        const complianceDocuments = await sequelize.query(query, {
            replacements: { program_id, user_id, document_id },
            type: QueryTypes.SELECT,
        });

        if (!complianceDocuments || complianceDocuments.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Program vendor or compliance document not found.',
                trace_id: traceId,
                compliance_document: [],
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Compliance documents retrieved successfully.',
            trace_id: traceId,
            data: complianceDocuments,
        });

    } catch (error) {
        console.error('Error fetching compliance document data:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function advanceFilter(
    request: FastifyRequest<{
        Params: { program_id: string };
        Body: {
            vendor_name?: string;
            country_id?: string;
            hierarchy_ids?: string[];
            labor_category_id?: string[];
            work_location_id?: string[];
            job_type?: string[];
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { vendor_name, country_id, hierarchy_ids, labor_category_id, work_location_id, job_type, page, limit } = request.body;

        const hasQueryName = !!vendor_name;
        const hasCountry = !!country_id;
        const hasPage = !!page;
        const hasLimit = !!limit;
        const hierarchyIdsArray = hierarchy_ids || [];
        const laborCategoryIdsArray = labor_category_id || [];
        const workLocationIdsArray = work_location_id || [];
        const jobtypeIdsArray = job_type || [];

        const pageNumber = hasPage ? parseInt(page, 10) : 1;
        const limitNumber = hasLimit ? parseInt(limit, 10) : 10;
        const offset = (pageNumber - 1) * limitNumber;

        const query = programVendorAdvancedFilter(
            hasQueryName,
            hasCountry,
            hierarchyIdsArray,
            laborCategoryIdsArray,
            workLocationIdsArray,
            jobtypeIdsArray,
        );

        const replacements: Record<string, any> = {
            program_id,
            vendor_name: vendor_name ? `${vendor_name}%` : null,
            country_id: country_id ?? null,
            limit: limitNumber,
            offset: offset,
        };

        hierarchyIdsArray.forEach((id, index) => {
            replacements[`hierarchy_ids${index}`] = id;
        });
        laborCategoryIdsArray.forEach((id, index) => {
            replacements[`labor_category_id${index}`] = id;
        });
        workLocationIdsArray.forEach((id, index) => {
            replacements[`work_location_id${index}`] = id;
        });
        jobtypeIdsArray.forEach((id, index) => {
            replacements[`job_type${index}`] = id;
        });

        const data = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        if (data.length > 0) {
            return reply.status(201).send({
                status_code: 201,
                message: 'ProgramVendors fetched successfully.',
                trace_id: traceId,
                total_records: data.length,
                program_vendors: data,
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total_pages: Math.ceil(data.length / limitNumber),
                },
            });
        } else {
            return reply.status(200).send({ status_code: 200, message: "No records found", program_vendors: [], trace_id: traceId });
        }
    } catch (error) {
        return reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}
