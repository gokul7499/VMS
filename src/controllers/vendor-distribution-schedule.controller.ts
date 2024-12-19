import { FastifyRequest, FastifyReply } from "fastify";
import vendorDistributionScheduleModel from "../models/vendor-distribution-schedule.model";
import { updateVendorDistributionScheduleDetail, VendorDistributionSchedule } from "../interfaces/vendor-distribution-schedule.interface"
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import DistScheduleDetail from "../models/dist-schedule-detail.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { ProgramVendor } from "../models/program-vendor.model";

export const createVendorDistributionSchedule = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const vendorDistributionScheduleData = request.body as VendorDistributionSchedule;

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }

    const trace_id = generateCustomUUID();
    try {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating vendor distribution schedule",
                status: "success",
                description: `Creating vendor distribution schedule for ${program_id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendorDistributionScheduleModel
        );

        const { schedules, ...scheduleData } = vendorDistributionScheduleData;
        const existingSchedule = await vendorDistributionScheduleModel.findOne({
            where: {
                name: scheduleData.name,
                program_id: program_id,
            },
        });

        if (existingSchedule) {
            return reply.status(409).send({
                status_code: 409,
                message: 'A vendor distribution schedule with this name already exists in the program.',
                trace_id,
            });
        }

        const newVendorSchedule = await vendorDistributionScheduleModel.create({
            ...scheduleData,
            program_id,
        });

        if (Array.isArray(schedules)) {
            const schedulePromises = schedules.map((schedule) => {
                return DistScheduleDetail.create({
                    duration: schedule.duration,
                    measure_unit: schedule.measure_unit,
                    vendors: schedule.vendors || [],
                    vendor_distrubution_id: newVendorSchedule.id,
                });
            });

            await Promise.all(schedulePromises);
        }

        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create vendor distribution schedule",
                status: "success",
                description: `Created vendor distribution schedule for ${program_id} successfully: ${newVendorSchedule.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendorDistributionScheduleModel
        );

        reply.status(201).send({
            status_code: 201,
            message: 'Vendor Distribution Schedule created successfully.',
            id: newVendorSchedule.id,
            trace_id,
        });
    } catch (error: any) {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create vendor distribution schedule",
                status: "error",
                description: `Error creating vendor distribution schedule for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendorDistributionScheduleModel
        );

        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error.',
            trace_id,
            error: error
        });
    }
};

export async function getAllvendorDistributionSchedules(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'name', 'is_enabled', 'description', 'modified_on'];
    const responseFields = ['program_id', 'id', 'name', 'is_enabled', 'description', 'modified_on'];
    return baseSearch(request, reply, vendorDistributionScheduleModel, searchFields, responseFields);
}

export const getVendorDistributionScheduleById = async (
    request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { program_id, id } = request.params;

        const vendorDistributionSchedule = await vendorDistributionScheduleModel.findOne({
            where: { program_id, id, is_deleted: false },
            attributes: ['id', 'name', 'description', 'is_enabled'],
        });

        if (!vendorDistributionSchedule) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Vendor Distribution Schedule not found.',
                vendor_schedule: [],
            });
        }

        const distScheduleDetails = await DistScheduleDetail.findAll({
            where: { vendor_distrubution_id: id },
            attributes: ['id', 'duration', 'measure_unit', 'vendors'],
        });

        const unitOrder: { [key in 'weeks' | 'hours' | 'days']: number } = {
            hours: 1,
            days: 2,
            weeks: 3,
        };

        const sortedDistScheduleDetails = distScheduleDetails.sort((a, b) => {
            const unitA = a.measure_unit as keyof typeof unitOrder;
            const unitB = b.measure_unit as keyof typeof unitOrder;

            if (unitOrder[unitA] !== unitOrder[unitB]) {
                return unitOrder[unitA] - unitOrder[unitB];
            }

            return a.duration - b.duration;
        });

        const responseData = {
            id: vendorDistributionSchedule.id,
            name: vendorDistributionSchedule.name,
            description: vendorDistributionSchedule.description,
            is_enabled: vendorDistributionSchedule.is_enabled,
            dist_schedule_detail: sortedDistScheduleDetails.map(detail => ({
                id: detail.id,
                duration: detail.duration,
                measure_unit: detail.measure_unit,
                vendors: detail.vendors || [],
            })),
        };

        reply.status(200).send({
            statusCode: 200,
            message: 'Vendor Distribution Schedule fetched successfully.',
            vendor_schedule: responseData,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal Server Error',
        });
    }
};

export const deleteVendorDistributionSchedule = async (
    request: FastifyRequest<{ Params: { id: string; program_id: string } }>, reply: FastifyReply) => {
    try {
        const { id, program_id } = request.params;
        const [vendorSchedule] = await vendorDistributionScheduleModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                modified_on: Date.now(),
            },
            { where: { id, program_id, is_deleted: false } }
        );
        const [distSchedule] = await DistScheduleDetail.update(
            {
                is_deleted: true,
                is_enabled: false,
                modified_on: Date.now(),
            },
            { where: { vendor_distrubution_id: id, is_deleted: false } }
        );

        if (vendorSchedule > 0 && distSchedule > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Vendor Distribution Schedule deleted successfully.",
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(204).send({
                status_code: 204,
                message: "Vendor Distribution Schedule not found.",
                trace_id: generateCustomUUID(),
                vendor_schedule: [],
            });
        }
    } catch (error) {
        console.error("Error deleting Vendor Distribution Schedule:", error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: generateCustomUUID(),
            error,
        });
    }
};

export const updateVendorDistributionSchedule = async (
    request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { program_id, id } = request.params;
        const updateData = request.body as updateVendorDistributionScheduleDetail;

        const vendorDistributionSchedule = await vendorDistributionScheduleModel.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!vendorDistributionSchedule) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Vendor Distribution Schedule not found.',
                vendorDistributionSchedule: [],
                trace_id: generateCustomUUID(),
            });
        }

        if (updateData.name && updateData.name !== vendorDistributionSchedule.name) {
            const existingSchedule = await vendorDistributionScheduleModel.findOne({
                where: {
                    program_id,
                    name: updateData.name,
                    is_deleted: false,
                },
            });

            if (existingSchedule) {
                return reply.status(409).send({
                    statusCode: 409,
                    message: 'A vendor distribution schedule with this name already exists.',
                    trace_id: generateCustomUUID(),
                });
            }
        }

        await vendorDistributionSchedule.update({
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.description && { description: updateData.description }),
            ...(updateData.is_enabled !== undefined && { is_enabled: updateData.is_enabled }),
        });

        if (updateData.schedules && Array.isArray(updateData.schedules)) {
            const existingSchedules = await DistScheduleDetail.findAll({
                where: { vendor_distrubution_id: id },
            });

            const incomingScheduleIds = updateData.schedules
                .filter((schedule) => schedule.id && schedule.id !== "null")
                .map((schedule) => schedule.id);

            const schedulesToDelete = existingSchedules.filter(
                (existingSchedule) => !incomingScheduleIds.includes(existingSchedule.id)
            );

            for (const scheduleToDelete of schedulesToDelete) {
                await DistScheduleDetail.destroy({
                    where: { id: scheduleToDelete.id },
                });
            }

            for (const schedule of updateData.schedules) {
                if (schedule.id && schedule.id !== "null") {
                    await DistScheduleDetail.update(
                        {
                            ...(schedule.duration !== undefined && { duration: schedule.duration }),
                            ...(schedule.measure_unit !== undefined && { measure_unit: schedule.measure_unit }),
                            ...(schedule.vendors !== undefined && { vendors: schedule.vendors }),
                        },
                        {
                            where: { id: schedule.id, vendor_distrubution_id: id },
                        }
                    );
                } else {
                    const { id, ...scheduleData } = schedule;
                    await DistScheduleDetail.create({
                        ...scheduleData,
                        vendor_distrubution_id: vendorDistributionSchedule.id,
                    });
                }
            }
        }

        reply.status(200).send({
            statusCode: 200,
            message: 'Vendor Distribution Schedule updated successfully.',
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal Server Error',
            trace_id: generateCustomUUID(),
        });
    }
};




export const getVendorDistributionScheduleByIds = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Querystring: {
            program_industry?: string;
            work_locations?: string;
            hierarchies?: string;
        };
    }>,
    reply: FastifyReply
) => {
    try {
        const { program_id, id } = request.params;

        // Split query parameters into arrays
        const program_industry_ids = request.query.program_industry ? request.query.program_industry.split(',') : [];
        const work_location_ids = request.query.work_locations ? request.query.work_locations.split(',') : [];
        const hierarchy_ids = request.query.hierarchies ? request.query.hierarchies.split(',') : [];

        // Step 1: Fetch the vendor distribution schedule
        const vendorDistributionSchedule = await vendorDistributionScheduleModel.findOne({
            where: { program_id, id, is_deleted: false },
            attributes: ['id', 'name', 'description', 'is_enabled'],
        });

        if (!vendorDistributionSchedule) {
            return reply.status(404).send({
                statusCode: 404,
                message: 'Vendor Distribution Schedule not found.',
                vendor_schedule: [],
            });
        }

        // Step 2: Fetch all program vendors
        const allProgramVendors = await ProgramVendor.findAll({
            attributes: ['id', 'program_industry', 'work_locations', 'hierarchies'],
        });

        // Step 3: Filter vendors based on conditions
        const vendorIds: string[] = [];  // Define vendorIds as a string array

        for (const vendor of allProgramVendors) {
            const matchesIndustry = vendor.program_industry && vendor.program_industry.some((industry: string) => program_industry_ids.includes(industry));
            const matchesLocation = vendor.work_locations && vendor.work_locations.some((location: string) => work_location_ids.includes(location));
            const matchesHierarchy = vendor.hierarchies && vendor.hierarchies.some((hierarchy: string) => hierarchy_ids.includes(hierarchy));

            // If the vendor matches any of the conditions, add it to the vendorIds array
            if (matchesIndustry || matchesLocation || matchesHierarchy) {
                vendorIds.push(vendor.id);
            }
        }

        console.log('Matching Vendor IDs:', vendorIds);

        // Step 4: Fetch distribution schedule details
        const distScheduleDetails = await DistScheduleDetail.findAll({
            where: {
                vendor_distrubution_id: id,
            },
            attributes: ['id', 'duration', 'measure_unit', 'vendors'],
        });

        // Step 5: Format distribution schedule details
        const formattedDistScheduleDetails = distScheduleDetails.map(detail => {
            const vendors = Array.isArray(detail.vendors) ? detail.vendors : [];
            const filteredVendors = vendors.filter(vendor => vendorIds.includes(vendor));

            return {
                id: detail.id,
                duration: detail.duration,
                measure_unit: detail.measure_unit,
                vendors: filteredVendors.length > 0 ? filteredVendors : [],
            };
        });
        const responseData = {
            id: vendorDistributionSchedule.id,
            name: vendorDistributionSchedule.name,
            description: vendorDistributionSchedule.description,
            is_enabled: vendorDistributionSchedule.is_enabled,
            dist_schedule_detail: formattedDistScheduleDetails,
        };

        reply.status(200).send({
            statusCode: 200,
            message: 'Vendor Distribution Schedule fetched successfully.',
            vendor_schedule: responseData,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal Server Error',
        });
    }
};


// export const getVendorDistributionScheduleByIds = async (
//     request: FastifyRequest<{
//         Params: { program_id: string; id: string },
//         Querystring: { program_industry: string; work_locations: string; hierarchies: string }
//     }>,
//     reply: FastifyReply
// ) => {
//     try {
//         const { program_id, id } = request.params;
//         const { program_industry, work_locations, hierarchies } = request.query;

//        
//        

//        

//         // Define sorting order for measure units
//         const unitOrder: { [key in 'weeks' | 'hours' | 'days']: number } = {
//             hours: 1,
//             days: 2,
//             weeks: 3,
//         };

//         // Sort distribution schedule details by measure unit and duration
//         const sortedDistScheduleDetails = distScheduleDetails.sort((a, b) => {
//             const unitA = a.measure_unit as keyof typeof unitOrder;
//             const unitB = b.measure_unit as keyof typeof unitOrder;

//            

//             return a.duration - b.duration;
//         });

//         // Filter vendors by program_industry, work_locations, and hierarchies
//         const filteredDistScheduleDetails = await Promise.all(
//             sortedDistScheduleDetails.map(async detail => {
//                 const filteredVendors = await Promise.all(
//                     (detail.vendors || []).map(async vendorId => {
//                         const vendorRecord = await programVendor.findOne({
//                             where: {
//                                 id: vendorId,
//                                 program_industry,
//                                  work_locations,
//                                  hierarchies,
//                             },
//                         });
//                         return vendorRecord ? vendorId : null;
//                     })
//                 );

//                 return {
//                     id: detail.id,
//                     duration: detail.duration,
//                     measure_unit: detail.measure_unit,
//                     vendors: filteredVendors.filter(vendorId => vendorId !== null),
//                 };
//             })
//         );

//         

//         reply.status(200).send({
//             statusCode: 200,
//             message: 'Vendor Distribution Schedule fetched successfully.',
//             vendor_schedule: responseData,
//             trace_id: generateCustomUUID(),
//         });
//     } catch (error) {
//         reply.status(500).send({
//             statusCode: 500,
//             message: 'Internal Server Error',
//         });
//     }
// };




