import { FastifyRequest, FastifyReply } from 'fastify';
import Delegation from '../models/delegation.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { DelegationInterface } from '../interfaces/delegation.interface';

export const createDelegation = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { ...delegationData } = request.body as DelegationInterface;
  try {

    const newDelegation: any = await Delegation.create({
      ...delegationData,
      program_id,
    });

    reply.status(201).send({
      status_code: 201,
      id: newDelegation.id,
      message: 'Delegation created successfully',
      traceId: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};


export const getDelegationById = async (
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const delegation = await Delegation.findOne({
      where: {
        id,
        program_id,
      },
    });

    if (delegation) {
      reply.status(200).send({
        status_code: 200,
        delegation,
        message: 'Delegation retrieved successfully',
        traceId: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Delegation not found for the given program',
        traceId: traceId,
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};

export const updateDelegationById = async (
  request: FastifyRequest<{ Params: { program_id: string; id: string }; Body: DelegationInterface }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const updates = request.body as DelegationInterface;
  const traceId = generateCustomUUID();

  try {
    const [updatedCount] = await Delegation.update(updates, {
      where: {
        id,
        program_id,
      },
    });

    if (updatedCount > 0) {
      reply.status(200).send({
        status_code: 200,
        message: 'Delegation updated successfully',
        traceId: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Delegation not found for the given program',
        traceId: traceId,
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};


export const deleteDelegationById = async (
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();
  try {
    const delegation = await Delegation.findOne({
      where: {
        id,
        program_id,
      },
    });
    if (delegation) {
      await delegation.update({
        is_enabled: false,
        is_deleted: true,
      });
      reply.status(200).send({
        status_code: 200,
        message: 'Delegation deleted successfully',
        traceId: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Delegation not found for the given program',
        traceId: traceId,
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};

