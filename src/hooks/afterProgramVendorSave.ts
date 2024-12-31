import { Model } from "sequelize";
import vendorWorkLocationMapping from "../models/vendor-work-location-mapping.model";
import VendorHierarchyMapping from "../models/vendor-hieararchy-mapping.model";
import vendorLabourCategoriesModel from "../models/vendor-labour-categories.model";
import IndustriesModel from "../models/labour-categories.model";
import hierarchies from "../models/hierarchies.model";
import WorkLocationModel from "../models/work-location.model";

export const createVendorWorkLocationMapping = async (record: Model) => {
    if (Array.isArray((record as any).work_locations)) {
        for (const workLocation of (record as any).work_locations) {
            const work_location_name = await WorkLocationModel.findOne({ where: { id: workLocation }, attributes: ['name'] });
            await vendorWorkLocationMapping.create({
                program_vendor_id: (record as any).id,
                program_id: (record as any).program_id,
                work_location_id: workLocation,
                vendor_work_location_name: work_location_name?.dataValues.name || 'unknown',
                labour_category_id: (record as any).labor_category,
            });
        }
    }
};


export const createVendorHierarchyMapping = async (record: Model) => {
    if ((record as any).hierarchies && (record as any).hierarchies.length > 0) {
        for (const hierarchy of (record as any).hierarchies) {
            const hierarchy_name = await hierarchies.findOne({
                where: { id: hierarchy },
                attributes: ['name'],
            });
            await VendorHierarchyMapping.create({
                program_vendor_id: (record as any).id,
                program_id: (record as any).program_id,
                hierarchy_id: hierarchy,
                hierarchy_name: hierarchy_name?.name || 'unknown',
            });
        }
    }
};


export const createVendorLabourCategories = async (record: Model) => {
    if ((record as any).labor_category && (record as any).labor_category.length > 0) {
        for (const laborCategory of (record as any).labor_category) {
            const category_name = await IndustriesModel.findOne({
                where: { id: laborCategory },
                attributes: ['name'],
            });
            await vendorLabourCategoriesModel.create({
                program_vendor_id: (record as any).id,
                program_id: (record as any).program_id,
                labour_category_id: laborCategory,
                labour_category_name: category_name?.dataValues.name || 'unknown',
            });
        }
    }
};


