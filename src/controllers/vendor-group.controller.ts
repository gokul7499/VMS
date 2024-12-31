
import { FastifyRequest, FastifyReply } from 'fastify';
import { vendorGroupInterface } from '../interfaces/vendor-group.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { baseSearch } from '../utility/baseService';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import VendorGroup from '../models/vendor-group.model';
import { ProgramVendor } from '../models/program-vendor.model';

export const createVendorGroup = async (
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) => {
  const program_id = request.params.program_id;
  const vendorGroup = request.body as vendorGroupInterface;
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({status_code:401, message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({status_code:401, message: 'Unauthorized - Invalid token' });
  }

  if (!vendorGroup.vendor_group_name) {
    logger(
      {
        trace_id:traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor group",
        status: "error",
        description: `Error creating vendor group for ${program_id}: vendor_group_name is required`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      VendorGroup
    );

    return reply.status(400).send({
      status_code: 400,
      message: 'Vendor group name is required.',
      trace_id:traceId 
    });
  }

  try {
    const [createdVendorGroup, created] = await VendorGroup.findOrCreate({
      where: { vendor_group_name: vendorGroup.vendor_group_name, program_id },
      defaults: { ...vendorGroup, program_id },
    });

    if (!created) {
      return reply.status(409).send({
        status_code: 409,
        message: 'This vendor group with the same name already exists.',
        trace_id:traceId,
      });
    }

    const vendorIdsToUpdate = vendorGroup.vendors.filter((id:any) => id); 

    if (vendorIdsToUpdate.length > 0) {
      await ProgramVendor.update(
        { vendor_group_id: createdVendorGroup.id },
        { where: { id: vendorIdsToUpdate, program_id } }
      );
    }

    logger(
      {
        trace_id:traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor group",
        status: "success",
        description: `Vendor group created successfully for ${program_id}: ${createdVendorGroup.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      VendorGroup
    );

    return reply.status(201).send({
      status_code: 201,
      trace_id:traceId,
      message: 'Vendor group created successfully.',
      vendor_group_id: createdVendorGroup.id,
    });
  } catch (error: any) {
    logger(
      {
        trace_id:traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor group",
        status: "error",
        description: `Error creating vendor group for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      VendorGroup
    );

    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating Vendor Group.',
      trace_id:traceId,
      error: (error as Error).message,
    });
  }
};

export async function getVendorGroups(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['id', 'vendor_group_name', 'description', 'is_enabled', 'program_id'];
    const responseFields = ['id', 'vendor_group_name', 'is_enabled', 'description', 'modified_on', 'program_id'];
    return baseSearch(request, reply, VendorGroup, searchFields, responseFields);
}

export async function getVendorGroupById(
    request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
    reply: FastifyReply
) {
    const { id, program_id } = request.params;
const traceId= generateCustomUUID();
  try {
        const vendorGroup = await VendorGroup.findOne({
            where: { id, program_id, is_deleted: false },
            include: [
                {
                    model: ProgramVendor,
                    as: 'program_vendor',
                    attributes: ['id', 'vendor_name'],
                },
            ],
        });

        if (!vendorGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor Group not found.',
                trace_id: traceId,
            });
        }
        const vendorIds = vendorGroup.vendors || [];
        const detailedVendors = await ProgramVendor.findAll({
            where: { id: vendorIds },
            attributes: ['id', 'vendor_name'],
        });

        return reply.status(200).send({
            status_code: 200,
            message: 'Vendor Group found.',
            vendor_group: {
                ...vendorGroup.toJSON(),
                vendors: detailedVendors.map(vendor => vendor.toJSON()),
            },
            trace_id: traceId,
        });
    } catch (error) {
        console.error('Server error:', error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error',
            error: (error as Error).message,
        });
    }
}

export async function updateVendorGroup(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const data: Partial<vendorGroupInterface> = request.body as Partial<vendorGroupInterface>;
  const traceId= generateCustomUUID();

  try {
      if (data.vendor_group_name) {
          const existingVendorGroup = await VendorGroup.findOne({
              where: {
                  program_id,
                  vendor_group_name: data.vendor_group_name,
                  id: { [Op.ne]: id } 
              }
          });

          if (existingVendorGroup) {
              return reply.status(409).send({
                  status_code: 409,
                  message: 'This vendor group same name already exists',
                  trace_id: traceId,
              });
          }
      }

      const vendorGroup = await VendorGroup.findOne({
          where: { id, program_id }
      });

      if (vendorGroup) {
          await vendorGroup.update(data);
          return reply.status(200).send({
              status_code: 200,
              message: 'Vendor group updated successfully.',
              trace_id: traceId,
          });
      } else {
          return reply.status(200).send({
              status_code: 200,
              message: 'Vendor Group not found.',
              trace_id: traceId,
              vendor_group: []
          });
      }
  } catch (error) {
      console.error(error);
      return reply.status(500).send({
          status_code: 500,
          message: 'Internal Server Error',
          trace_id: traceId,
          error: (error as Error).message,
      });
  }
}

export const deleteVendorGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const traceId= generateCustomUUID();

    try {
        const vendorGroup = await VendorGroup.findOne({ where: { id, program_id } });

        if (vendorGroup) {
            vendorGroup.is_deleted = true;
            await vendorGroup.save();
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor Group deleted successfully.',
                trace_id: traceId
            });
        } else {
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor Group not found.',
                trace_id: traceId,
                vendor_group: []
            });
        }
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}








