import { FastifyRequest, FastifyReply } from 'fastify';
import CountryModel from '../models/countries.model';
import generateCustomUUID from '../utility/genrateTraceId';

export const createCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const payload = request.body as {
            name: string,
            iso_code_2: string,
            iso_code_3: string,
            isd_code: string,
            min_phone_length: number,
            max_phone_length: number,
        };

        const newCountry: any = await CountryModel.create(payload);
        reply.status(201).send({
            status_code: 201,
            data: newCountry?.id,
            message: 'Country Created successfully',
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to create Country',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
};

export const bulkUploadCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const countries = request.body as any[];
        const createdCountries = await CountryModel.bulkCreate(countries);
        reply.status(201).send({
            status_code: 201,
            data: createdCountries,
            message: 'Countries Created successfully',
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to create Countries',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
};
export const getCountries = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { name, id } = request.query as { name?: string; id?: string };
        const whereClause: any = { is_deleted: false };
        if (name) {
            whereClause.name = name;
        }
        if (id) {
            whereClause.id = id;
        }
        const countries = await CountryModel.findAll({
            where: whereClause,
            attributes: {
                exclude: [
                    "is_deleted",
                    "created_on",
                    "modified_on",
                    "created_by",
                    "modified_by",
                ],
            },
            order: [["name", "ASC"]],
        });

        reply.status(200).send({
            status_code: 200,
            message:
                countries.length === 0
                    ? "No Countries found"
                    : "Countries retrieved successfully",
            countries: countries,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to fetch Countries",
            trace_id: generateCustomUUID(),
            error,
        });
    }
};

export const getCountriesById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = request.params as { id: string };
        const countries = await CountryModel.findOne({
            where: {
                id: id,
                is_deleted: false,
            }, attributes: { exclude: ['is_deleted', 'created_on', 'modified_on', 'created_by', 'modified_by'], },
        });
        if (countries) {
            reply.status(200).send({
                status_code: 200,
                country: countries,
                trace_id: generateCustomUUID(),
            });
        }
        else {
            reply.status(200).send({
                status_code: 200,
                message: "Countries not found",
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to fetch Countries',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
};

export const updateCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = request.params as { id: string };
        const {
            name,
            iso_code_2,
            iso_code_3,
            isd_code,
            min_phone_length,
            max_phone_length,
        } = request.body as {
            name: string,
            iso_code_2: string,
            iso_code_3: string,
            isd_code: string,
            min_phone_length: number,
            max_phone_length: number,
        };

        const [updatedRows] = await CountryModel.update(
            {
                name,
                iso_code_2,
                iso_code_3,
                isd_code,
                min_phone_length,
                max_phone_length,
            },
            {
                where: { id },
            }
        );
        if (updatedRows > 0) {
            reply.status(200).send({
                status_code: 200,
                message: 'Country updated successfully',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Country not found',
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to update Country',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
};

export const deleteCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = request.params as { id: string };
        const [updatedRows] = await CountryModel.update(
            {
                is_enabled: false,
                is_deleted: true,
            },
            {
                where: { id },
            }
        );
        if (updatedRows > 0) {
            reply.status(200).send({
                status_code: 200,
                message: 'Country Deleted successfully',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Country not found',
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to delete Country',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
};
