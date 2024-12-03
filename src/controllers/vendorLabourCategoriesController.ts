import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import vendorLabourCategoriesModel from "../models/vendorLabourCategoriesModel";
import {vendorLabourCategoriesInterface } from '../interfaces/vendorLabourCateInterface'
import { baseSearch } from "../utility/baseService";

export async function createVendorLabourCategories(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const vendor_labour_category = request.body as vendorLabourCategoriesInterface;
    try {
        const vendorLabourCategoriesData: any = await vendorLabourCategoriesModel.create({
            ...vendor_labour_category,
        });
 
        return reply.status(201).send({
            status_code: 201,
            message: 'Vendor Labour Categories Created Successfully',
            programVendor: vendorLabourCategoriesData.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: generateCustomUUID(),
            message: 'Failed To Create Vendor Labour Categories',
            error,
        });
    }
}

export async function getAllvendorLabourCategories(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_vendor_id','program_id','labour_category_id','labour_category_name', 'is_enabled','modified_on'];
    const responseFields = ['program_vendor_id','program_id','labour_category_id','labour_category_name', 'is_enabled','modified_on'];
    return baseSearch(request, reply, vendorLabourCategoriesModel, searchFields, responseFields);
}

export async function getVendorLabourCategoryById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const vendor_labour_category = await vendorLabourCategoriesModel.findOne({ where: { program_id, id, is_deleted: false } });
        if (vendor_labour_category) {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor Labour Category fetched successfully.',
                trace_id: generateCustomUUID(),
                vendor_labour_category,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor Labour Category not found.',
                vendor_labour_category: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while fetching Vendor Labour Category.',
            trace_id: generateCustomUUID(),
            error,
        });
    }
}
 

export async function updateVendorLabourCategory(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const { program_id, id } = request.params;
    try {
        const [updatedCount] = await vendorLabourCategoriesModel.update(request.body as vendorLabourCategoriesInterface, {
            where: { program_id, id, is_deleted: false },
        });
        if (updatedCount > 0) {
            reply.send({
                status_code: 201,
                message: 'Vendor Labour Category updated successfully.',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                vendor_labour_category: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'Internal Server error',
            trace_id: generateCustomUUID(),
            error,
        });
    }
}
 
export async function deleteVendorLabourCategory(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const vendor_labour_category = await vendorLabourCategoriesModel.findOne({
            where: { program_id, id, is_deleted: false },
        });
        if (vendor_labour_category) {
            await vendorLabourCategoriesModel.update(
                { is_deleted: true, is_enabled: false },
                { where: { program_id, id } }
            );
            reply.status(204).send({
                status_code: 204,
                message: 'Vendor Labour Category deleted successfully.',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                vendor_labour_category: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while deleting Vendor Labour Category.',
            trace_id: generateCustomUUID(),
            error,
        });
    }
}
