import { FastifyReply, FastifyRequest } from "fastify";
import CredentialingPacket from "../models/credentialing-packet.model";
import { decodeToken } from "../middlewares/verifyToken";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from "../config/instance";
import CredentialingPacketInterface from "../interfaces/credentialing-packet.interface";
import CredentialingPacketMapping from "../models/credentialing-packet-mapping.model";

export async function createCredentialingPacket(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const program_id = request.params.program_id;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({ status_code: 401, message: "Unauthorized - Token not found" });
    }

    const token = authHeader.split(" ")[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: "Unauthorized - Invalid token" });
    }

    const userId = user.sub;

    try {
        const { task_category_configs, ...credentialingPacketData } = request.body as CredentialingPacketInterface;

        const transaction = await sequelize.transaction();
        try {
            const createdCredentialingPacket = await CredentialingPacket.create(
                {
                    ...credentialingPacketData,
                    program_id,
                    created_by: userId,
                    updated_by: userId,
                },
                { transaction }
            );

            if (Array.isArray(task_category_configs) && task_category_configs.length > 0) {
                const mappings = task_category_configs.map((config) => ({
                    credentialing_packet_version_id: createdCredentialingPacket.version_id,
                    credentialing_packet_entity_id: createdCredentialingPacket.entity_id,
                    category_id: config.category_id,
                    category_name: config.category_name,
                    task_entity_id: config.task_entity_id,
                    task_version_id: config.task_version_id,
                    task_name: config.task_name,
                    seq_no: config.seq_no,
                    is_mandatory: config.is_mandatory ?? true,
                    trigger: config.trigger,
                    is_enabled: config.is_enabled ?? true,
                    is_deleted: config.is_deleted ?? false,
                    created_by: userId,
                    updated_by: userId,
                }));

                await CredentialingPacketMapping.bulkCreate(mappings, { transaction });
            }

            await transaction.commit();

            reply.status(201).send({
                status_code: 201,
                message: "Credentialing packet created successfully",
                credentialing_packet: createdCredentialingPacket,
                traceId,
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error: any) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating the credentialing packet",
            error: error.message,
            traceId,
        });
    }
}

export async function getCredentialingPacketById(
    request: FastifyRequest<{ Params: { entity_id: string; version?: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { entity_id, version } = request.params;

    try {
        const credentialingPacketOptions: any = {
            where: {
                entity_id,
                is_deleted: false,
                ...(version ? { version } : { latest: true }),
            },
        };

        const credentialingPacketData: any = await CredentialingPacket.findOne(credentialingPacketOptions);

        if (!credentialingPacketData) {
            return reply.status(404).send({
                status_code: 404,
                message: "Credentialing packet not found",
                traceId,
            });
        }

        const mappingOptions: any = {
            where: {
                credentialing_packet_version_id: credentialingPacketData.version_id,
            },
        };

        const credentialingPacketMappings = await CredentialingPacketMapping.findAll(mappingOptions);

        const responseData = {
            ...credentialingPacketData.dataValues,
            task_category_configs: credentialingPacketMappings.map((mapping: any) => ({
                ...mapping.dataValues,
            })),
        };

        return reply.status(200).send({
            status_code: 200,
            message: "Successfully found credentialing packet",
            data: responseData,
            traceId,
        });
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching the credentialing packet",
            traceId,
        });
    }
}

export async function updateCredentialingPacket(
    request: FastifyRequest<{
        Params: { program_id: string; entity_id: string };
        Body: CredentialingPacketInterface,
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { program_id, entity_id } = request.params;
    const {
        name,
        description,
        is_enabled,
        associations,
        task_category_configs,
    } = request.body;

    if (!Array.isArray(task_category_configs)) {
        return reply.status(400).send({
            status_code: 400,
            message: '`task_category_configs` must be an array.',
            traceId,
        });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Token not found',
            traceId,
        });
    }

    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Invalid token',
            traceId,
        });
    }

    const userId = user.sub;
    const transaction = await sequelize.transaction();

    try {
        const existingCredentialingPacket = await CredentialingPacket.findOne({
            where: { entity_id, is_deleted: false, latest: true },
            attributes: ['version', 'version_id'],
            order: [['version', 'DESC']],
        });

        const newVersion = existingCredentialingPacket ? existingCredentialingPacket.version + 1 : 1;

        if (existingCredentialingPacket) {
            await CredentialingPacket.update(
                { latest: false, updated_on: BigInt(Date.now()), updated_by: userId },
                {
                    where: { version_id: existingCredentialingPacket.version_id },
                    transaction,
                }
            );

            await CredentialingPacketMapping.update(
                {
                    is_deleted: true,
                    updated_on: BigInt(Date.now()),
                    updated_by: userId,
                },
                {
                    where: {
                        credentialing_packet_version_id: existingCredentialingPacket.version_id,
                        credentialing_packet_entity_id: entity_id,
                    },
                    transaction,
                }
            );
        }

        const newCredentialingPacket = await CredentialingPacket.create(
            {
                entity_id,
                program_id,
                version: newVersion,
                name,
                description,
                is_enabled,
                pre_credentialing_packet_entity_id: existingCredentialingPacket?.pre_credentialing_packet_entity_id,
                pre_credentialing_packet_version: existingCredentialingPacket?.pre_credentialing_packet_version,
                associations: JSON.stringify(associations),
                previous_version_id: existingCredentialingPacket?.version_id || null,
                latest: true,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );

        if (!newCredentialingPacket) {
            throw new Error('Failed to create a new credentialing packet version.');
        }

        const credentialingPacketMappings = task_category_configs.map((config: any) => ({
            credentialing_packet_version_id: newCredentialingPacket.version_id,
            credentialing_packet_entity_id: newCredentialingPacket.entity_id,
            category_id: config.category_id,
            category_name: config.category_name,
            task_entity_id: config.task_entity_id,
            task_version_id: config.task_version_id,
            task_name: config.task_name,
            seq_no: config.seq_no,
            is_mandatory: config.is_mandatory ?? true,
            trigger: config.trigger,
            is_enabled: config.is_enabled ?? true,
            is_deleted: false,
            created_by: userId,
            updated_by: userId,
        }));

        await CredentialingPacketMapping.bulkCreate(credentialingPacketMappings, { transaction });

        await transaction.commit();

        return reply.status(200).send({
            status_code: 200,
            message: 'Credentialing packet updated and new version created successfully',
            data: newCredentialingPacket,
            traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        console.error('Update error:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating the credentialing packet',
            error: error.message,
            traceId,
        });
    }
}

export async function deleteCredentialingPacket(
    request: FastifyRequest<{ Params: { entity_id: string } }>,
    reply: FastifyReply
) {
    const { entity_id } = request.params;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Token not found',
            traceId,
        });
    }

    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Invalid token',
            traceId,
        });
    }

    const userId = user?.sub;

    try {
        const credentialingPackets = await CredentialingPacket.findAll({
            where: { entity_id, is_deleted: false },
        });

        if (credentialingPackets.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Credentialing packet not found',
                traceId,
            });
        }

        const transaction = await sequelize.transaction();

        try {
            await CredentialingPacket.update(
                {
                    is_deleted: true,
                    updated_by: userId,
                    updated_on: BigInt(Date.now()),
                },
                {
                    where: { entity_id },
                    transaction,
                }
            );

            await CredentialingPacketMapping.update(
                {
                    is_deleted: true,
                    updated_by: userId,
                    updated_on: BigInt(Date.now()),
                },
                {
                    where: {
                        credentialing_packet_entity_id: entity_id,
                    },
                    transaction,
                }
            );

            await transaction.commit();

            return reply.status(200).send({
                status_code: 200,
                message: 'Credentialing packet deleted successfully',
                traceId,
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting the credentialing packet',
            traceId,
            error,
        });
    }
}

