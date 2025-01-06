import { Model, QueryTypes } from 'sequelize';
import ProgramModule from '../models/program-module.model';
import { Module } from '../models/module.model';
import hierarchies from '../models/hierarchies.model';
import generateSlug from '../plugins/slugGenerate';
import qualificationTypeModel from '../models/qualification-type-model'
import rateType from '../models/rate-type.model';
import { sequelize } from '../config/instance';
import { fetchProgramConfigValues } from '../utility/queries';


export const createProgramModule = async (record: Model,transaction: any) => {

    let modules = await Module.findAll({
        where: {
            is_deleted: false,
            parent_module_id: null
        },
        transaction 
    });
    let module = modules.map((module: any) => ({
        module_id: module?.id,
        is_enabled: module?.is_enabled,
    }));
    await ProgramModule.create({
        program_id: (record as any).id,
        modules: module,
    },{transaction});
};

export const createHierarchy = async (record: Model, transaction: any) => {
    const { id: programId, name } = record as any;
    console.log("program", programId);

    const code = generateSlug(name, {
        trim: true,
        removedspecial: true,
    });

    const hierarchy = await hierarchies.create({
        program_id: programId,
        name,
        code: "--",
        hierarchy_level: 1,
        hierarchy_order: 1,
        is_enabled: true,        
        default_date_format: "MM/DD/YYYY",
        default_time_format: "24 Hours",
        default_timezone : "(UTC-05:00) Eastern Standard Time (North America)",
        default_currency: "USD",
        default_language : "English",
        unit_of_measure: [
        {
            label: "Hourly",
            is_default: true
        }
        ],
        rate_model: "Bill Rate (No Markup)",
        is_vendor_neutral_program: false,
        is_hide_candidate_img: true,
        support_email: "noreply@simplifyvms.com",
    },{ transaction });

    return hierarchy;
};

export const createQualificationTypes = async (record: Model,transaction: any) => {
    const defaultQualificationTypes = [
        { name: 'Skill', code: 'skill', type: 'Predefined' },
        { name: 'Education', code: 'education', type: 'Predefined' },
        { name: 'Certificates', code: 'certificate', type: 'Predefined' },
        { name: 'Vaccination', code: 'vaccination', type: 'Predefined' },
        { name: 'Speciality', code: 'speciality', type: 'Predefined' },
        { name: 'Document', code: 'document', type: 'Predefined' },
    ];

    for (let qualification of defaultQualificationTypes) {
        await qualificationTypeModel.create({
            program_id: (record as any).id,
            name: qualification.name,
            code: qualification.code,
            type: qualification.type,
            is_enabled: true,
            is_deleted: false,
            created_by: (record as any).created_by,
            modified_by: (record as any).modified_by,
        },{transaction});
    }
};

export const createRateTypes = async (record: Model,transaction: any) => {
    const picklistItemResult = await sequelize.query<{ id: any }>(
        `SELECT id 
         FROM picklistitems
         WHERE defined_by = 'predefined' 
           AND label = 'Standard'
         LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    const picklistItemId = picklistItemResult[0].id;

    await rateType.create({
        program_id: (record as any).id,
        name: "Standard Rate",
        rate_type_category: picklistItemId,
        rate: null,
        abbreviation: "ST",
        is_enabled: true,
        is_deleted: false,
        is_shift_rate: false,
        is_base_rate: true,
        created_by: (record as any).created_by,
        modified_by: (record as any).modified_by,
    },{transaction});
} 