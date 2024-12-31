import { Model, QueryTypes } from 'sequelize';
import ProgramModule from '../models/program-module.model';
import { Module } from '../models/module.model';
import hierarchies from '../models/hierarchies.model';
import generateSlug from '../plugins/slugGenerate';
import qualificationTypeModel from '../models/qualification-type-model'
import { rateType } from '../models/rate-type.model';
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

    // const result: any[] = await sequelize.query(fetchProgramConfigValues, {
    //     replacements: { programId },
    //     type: QueryTypes.SELECT,
    // });
    // if (result.length === 0) {
    //     console.log("No configuration data found for this program. No hierarchy record will be created.");
    //     return null;
    // }
    // const defaultCurrency = result[0]?.defaultCurrency?.id || 'INR';
    // const timeZone = result[0]?.timeZone?.id || 'UTC';
    // const rateModel = result[0]?.rateModel?.[0] || 'Bill Rate';
    // const preferredDateFormat = result[0]?.preferredDateFormat || 'DD/MM/YYYY';
    const hierarchy = await hierarchies.create({
        program_id: programId,
        name,
        code: "--",
        hierarchy_level: 1,
        hierarchy_order: 1,
        is_enabled: true,
        
        default_date_format: "MM/DD/YYYY",
        default_time_format: "12 Hours",
        default_timezone : "da5d6254-4980-42e9-9896-0c23f8512eaf",
        default_currency: "5cc1357f-a90d-40b0-971f-74c8ddafb8c7",
        default_language : "adc0bb59-7c4f-4479-bc3c-20d1498ba13b",
        unit_of_measure: [
        {
            value: "Daily",
            is_default: true
        }
        ],
        rate_model: "bill_rate",
        is_vendor_neutral_program: false,
        is_hide_candidate_img: true,
        support_email: "support@gmail.com",
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