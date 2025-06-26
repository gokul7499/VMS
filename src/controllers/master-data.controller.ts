import { FastifyRequest, FastifyReply } from "fastify";
import foundationalData from "../models/master-data.model";
import { FoundationalDataInterface } from "../interfaces/master-data.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { countFoundationDataQuery, foundationDataQuery, masterDataAdvanceFilterQuery } from "../utility/queries";
import FoundationalDataTypes from "../models/master-datatypes.model";
import User from "../models/user.model";
import MasterDataHierarchy from "../models/master-data-hierarchy.model";
import Hierarchies from "../models/hierarchies.model";
import GlobalRepository from "../repositories/global.repository";

export async function getFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as { program_id: string };
        const query = request.query as {
            id?: string;
            name?: string;
            is_enabled?: string;
            updated_on?: string;
            manager_ids?: string;
            code?: string;
            foundational_data_type_id?: string;
            first_name: string;
            page?: string;
            limit?: string;
            is_billable?: string;
        };

        const page = parseInt(query.page ?? '1');
        const limit = parseInt(query.limit ?? '10');
        const offset = (page - 1) * limit;

        let updated_on_start = null;
        let updated_on_end = null;

        if (query.updated_on) {
            const modifiedOnRange = query.updated_on.split(',');
            if (modifiedOnRange.length === 2) {
                updated_on_start = modifiedOnRange[0];
                updated_on_end = modifiedOnRange[1];
            }
        }

        const filters: any = {
            program_id: params.program_id,
            id: query.id ?? null,
            name: query.name ? `%${query.name}%` : null,
            is_enabled: query.is_enabled !== undefined ? query.is_enabled === 'true' : null,
            updated_on_start,
            updated_on_end,
            manager_ids: query.manager_ids ?? null,
            code: query.code ? `%${query.code}%` : null,
            foundational_data_type_id: query.foundational_data_type_id ?? null,
            first_name: query.first_name ? `%${query.first_name}%` : null,
            is_billable: query.is_billable !== undefined ? query.is_billable === 'true' : null,
            limit,
            offset
        };

        // if (query.is_billable !== undefined) {
        //     filters.is_billable = query.is_billable === 'true';
        // }
        const [foundationalDataResult, countResult] = await Promise.all([
            sequelize.query(foundationDataQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            }),
            sequelize.query(countFoundationDataQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            })
        ]);

        const totalRecords = (countResult[0] as any).total;

        const foundationalDataArray = foundationalDataResult.map((row: any) => ({
            ...row,
            slug: row.slug,
            depended_fields: typeof row.depended_fields === 'string' ? JSON.parse(row.depended_fields) : row.depended_fields
        }));

        let foundationalDataTypeName = 'null';
        if (foundationalDataArray.length > 0) {
            foundationalDataTypeName = foundationalDataArray[0].foundational_data_type_name;
        } else if (query.foundational_data_type_id) {
            const foundationalDataType: any = await FoundationalDataTypes.findByPk(query.foundational_data_type_id, {
                attributes: ['name']
            });
            foundationalDataTypeName = foundationalDataType.name || null;
        }

        if (foundationalDataResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                foundational_data_type_name: foundationalDataTypeName,
                message: "foundational data not found",
                foundational_data: [],
                trace_id: traceId,
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Foundational data get successfully",
            foundational_data_type_name: foundationalDataTypeName,
            total_records: totalRecords,
            foundational_data: foundationalDataArray,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getFoundationalDataById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id, id } = request.params as { program_id: string, id: string };

        const foundational_data = await foundationalData.findOne({ where: { program_id, id } });

        if (!foundational_data) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Master Data Not Found.',
                trace_id: traceId,
            });
        }

        const populatedManagers = foundational_data.manager_ids?.length
            ? await User.findAll({
                where: { id: foundational_data.manager_ids },
                attributes: ['id', 'first_name', 'last_name'],
            })
            : [];

        const configuration = foundational_data.foundational_data_type_id
            ? await FoundationalDataTypes.findOne({
                where: { id: foundational_data.foundational_data_type_id },
                attributes: ['id', 'configuration'],
            })
            : [];

        let hierarchie = [];

        if (foundational_data.is_all_hierarchy_associated) {
            hierarchie = await Hierarchies.findAll({
                where: { program_id, is_deleted: false },
                attributes: ['id', 'name'],
            });
        } else {
            hierarchie = await MasterDataHierarchy.findAll({
                where: { master_data_id: id },
                include: [
                    {
                        model: Hierarchies,
                        as: 'hierarchy',
                        attributes: ['id', 'name'],
                    },
                ],
            }).then((data) => data.map((item) => item.hierarchy));
        }

        const populatedAdditionalOwners = foundational_data.additional_mdt_owner?.length
            ? await User.findAll({
                where: { id: foundational_data.additional_mdt_owner },
                attributes: ['id', 'first_name', 'last_name'],
            })
            : [];

        reply.status(200).send({
            status_code: 200,
            message: 'Master data fetched successfully.',
            foundational_data: {
                ...foundational_data.toJSON(),
                manager_ids: populatedManagers,
                hierarchies: hierarchie || [],
                additional_mdt_owner: populatedAdditionalOwners,
                foundational_data_type_id: configuration
            },
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching FoundationalData.',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function createFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string }
    const foundational_data = request.body as FoundationalDataInterface;
    const { name, code } = foundational_data;
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    const user = request?.user;

    const userId = user?.sub;

    try {
        const existingFoundationalDataWithSameName = await foundationalData.findOne({
            where: { name, program_id, is_deleted: false },
        });

        if (existingFoundationalDataWithSameName) {
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data Already Exist.",
                trace_id: traceId,
            });
        }

        const existingFoundationalDataWithSameCode = await foundationalData.findOne({
            where: {
                code: sequelize.where(sequelize.fn('lower', sequelize.col('code')), sequelize.fn('lower', code)),
                program_id,
            },
        });

        if (existingFoundationalDataWithSameCode) {
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data with the same code already exists.",
                trace_id: traceId,
            });
        }

        const foundational_Data = await foundationalData.create({
            ...foundational_data,
            program_id,
            created_by: userId,
            updated_by: userId,
            created_on: Date.now(),
            updated_on: Date.now(),
        }, { transaction });

        if (foundational_data.hierarchy) {
            for (const hierarchyId of foundational_data.hierarchy) {
                if (hierarchyId) {
                    await MasterDataHierarchy.create({
                        master_data_id: foundational_Data.id,
                        hierarchy_id: hierarchyId
                    }, { transaction });
                }
            }
        }
        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            foundational_data_id: foundational_Data.id,
            trace_id: traceId,
            message: 'Master data created successfully.',
        });

    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating master data.',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function updateFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string, id: string };
    let { name, hierarchy } = request.body as { name: string, hierarchy?: string[] };
    name = name.trim();
    const user = request?.user;
    const userId = user?.sub;
    const transaction = await sequelize.transaction();

    try {
        const existingFoundationalDataWithSameName = await foundationalData.findOne({
            where: {
                name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', name)),
                id: { [Op.ne]: id },
                program_id,
                is_deleted: false,
            },
        });

        if (existingFoundationalDataWithSameName) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data with the same name already exists.",
                trace_id: traceId,
            });
        }

        const existingMasterData = await foundationalData.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!existingMasterData) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'Foundational data not found.',
                trace_id: traceId,
            });
        }

        await existingMasterData.update(
            {
                ...request.body as FoundationalDataInterface,
                updated_on: Date.now(),
                updated_by: userId,
            },
            { transaction }
        );

        if (hierarchy && Array.isArray(hierarchy)) {
            await MasterDataHierarchy.destroy({
                where: { master_data_id: id },
                transaction,
            });

            for (const hierarchyId of hierarchy) {
                if (hierarchyId) {
                    await MasterDataHierarchy.create({
                        master_data_id: id,
                        hierarchy_id: hierarchyId
                    }, { transaction });
                }
            }
        }

        await transaction.commit();

        return reply.status(200).send({
            status_code: 200,
            message: 'Foundational data updated successfully.',
            trace_id: traceId,
        });

    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function deleteFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const foundational_data = await foundationalData.findOne({ where: { program_id, id } });
        if (foundational_data) {
            await foundationalData.update({ is_deleted: true, is_enabled: false, updated_by: userId }, { where: { program_id, id } });
            reply.status(204).send({
                status_code: 204,
                message: 'FoundationalData deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'FoundationalData not found.',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting FoundationalData.',
            trace_id: traceId,
        });
    }
}

export async function foundationalDataFilter(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    try {
        const user = request.user;
        if (!user) {
            return reply.status(400).send({ status_code: 400, message: 'user is requried.' });
        }
        const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);

        const query = request.query as { master_data_type_id?: string };
        const body = request.body as {
            id?: string;
            name?: string;
            is_enabled?: boolean;
            updated_on?: string;
            manager_ids?: string;
            code?: string;
            first_name?: string;
            page?: number;
            limit?: number;
            is_billable?: boolean;
            hierarchie_ids?: string[];
        };

        const page = body.page ?? 1;
        const limit = body.limit ?? 10;
        const offset = (page - 1) * limit;

        let updated_on_start = null;
        let updated_on_end = null;
        if (body.updated_on) {
            const modifiedOnRange = body.updated_on.split(',');
            if (modifiedOnRange.length === 2) {
                updated_on_start = modifiedOnRange[0];
                updated_on_end = modifiedOnRange[1];
            }
        }

        const replacements: any = {
            program_id: program_id,
            foundational_data_type_id: query.master_data_type_id ?? null,
            id: body.id ?? null,
            name: body.name ? `%${body.name}%` : null,
            is_enabled: body.is_enabled ?? null,
            updated_on_start,
            updated_on_end,
            manager_ids: body.manager_ids ?? null,
            code: body.code ? `%${body.code}%` : null,
            first_name: body.first_name ? `%${body.first_name}%` : null,
            limit,
            offset,
        };

        let hierarchyFilter = '';
        if (body.hierarchie_ids && body.hierarchie_ids.length > 0) {
            hierarchyFilter = `
            AND (
              md.is_all_hierarchy_associated = 1
              OR md.id IN (
                SELECT master_data_id
                FROM master_data_hierarchy
                WHERE hierarchy_id IN (:hierarchie_ids)
                )
            )`;
            replacements.hierarchie_ids = body.hierarchie_ids;
        }

        let mspHierarchyFilter = '';
        if (mspHierarchyIds && mspHierarchyIds.length > 0) {
            mspHierarchyFilter = `
            AND (
               md.is_all_hierarchy_associated = 1
               OR md.id IN (
                SELECT master_data_id
                FROM master_data_hierarchy
                WHERE hierarchy_id IN (:mspHierarchyIds)
               )
            )
            `;
            replacements.mspHierarchyIds = mspHierarchyIds;
        }

        let masterDataType: string | null = null;
        if (query.master_data_type_id) {
            const foundationalDataTypeResult = await sequelize.query<any>(
                `SELECT name FROM master_data_type WHERE id = :foundational_data_type_id`,
                {
                    replacements,
                    type: QueryTypes.SELECT,
                }
            );
            if (foundationalDataTypeResult.length > 0) {
                masterDataType = foundationalDataTypeResult[0].name;
            }
        }

        const foundationalDataResult = await sequelize.query<{ total_count: any }>(
            masterDataAdvanceFilterQuery(hierarchyFilter, mspHierarchyFilter),
            {
                replacements,
                type: QueryTypes.SELECT,
            }
        );
        const totalRecords = foundationalDataResult.length > 0 ? foundationalDataResult[0].total_count : 0;
        const foundationalDataArray = foundationalDataResult.map((row: any) => ({
            ...row,
            slug: row.slug,
            depended_fields:
                typeof row.depended_fields === 'string'
                    ? JSON.parse(row.depended_fields)
                    : row.depended_fields,
        }));

        reply.status(200).send({
            status_code: 200,
            message: 'Foundational data retrieved successfully',
            foundational_data_type_name: masterDataType,
            total_records: totalRecords,
            data: foundationalDataArray,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message,
        });
    }
}
