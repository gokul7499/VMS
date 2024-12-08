import { Model, QueryTypes } from 'sequelize';
import ProgramModule from '../models/programModuleModel';
import { Module } from '../models/moduleModel';
import hierarchies from '../models/hierarchiesModel';
import generateSlug from '../plugins/slugGenerate';
import qualificationTypeModel from '../models/qualificationTypeModel'
import { rateType } from '../models/rateTypeModel';
import { sequelize } from '../config/instance';
import { fetchProgramConfigValues } from '../utility/queries';

export const createProgramModule = async (record: Model) => {

    let modules = await Module.findAll({
        where: {
            is_deleted: false,
            parent_module_id: null
        },
    });
    let module = modules.map((module: any) => ({
        module_id: module?.id,
        is_enabled: module?.is_enabled,
    }));
    await ProgramModule.create({
        program_id: (record as any).id,
        modules: module,
    });
};

//create hierarchy for program
export const createHierarchy = async (record: Model) => {
    const { id: programId, name } = record as any;
    console.log("program", programId);

    const code = generateSlug(name, {
        trim: true,
        removedspecial: true,
    });

    const result: any[] = await sequelize.query(fetchProgramConfigValues, {
        replacements: { programId },
        type: QueryTypes.SELECT,
    });
    if (result.length === 0) {
        console.log("No configuration data found for this program. No hierarchy record will be created.");
        return null;
    }
    const defaultCurrency = result[0]?.defaultCurrency?.id || 'INR';
    const timeZone = result[0]?.timeZone?.id || 'UTC';
    const rateModel = result[0]?.rateModel?.[0] || 'Bill Rate';
    const preferredDateFormat = result[0]?.preferredDateFormat || 'DD/MM/YYYY';
    const hierarchy = await hierarchies.create({
        program_id: programId,
        name,
        code: "--",
        hierarchy_level: 1,
        hierarchy_order: 1,
        is_enabled: true,
        rate_model:rateModel,
        preferred_date_format: preferredDateFormat,
        is_vendor_neutral: false,
        is_rate_card_enforced: false,
        is_hidden: false,
        currency_id: defaultCurrency,
        is_default_timezone: timeZone,
    });

    return hierarchy;
};

export const createQualificationTypes = async (record: Model) => {
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
        });
    }
};

export const createRateTypes = async (record: Model) => {
    await rateType.create({
        program_id: (record as any).id,
        name: "Standard",
        type: "Standard",
        description: "standard bill rate and pay rate",
        bill_rate: [
            {
                "differential_type": "Factor Differential",
                "differential_on": "Bill Rate",
                "differential_value": 1.00
            }
        ],
        pay_rate: [
            {
                "differential_type": "Fixed Differential",
                "differential_on": "Pay Rate",
                "differential_value": 1.00
            }
        ],
        abbreviation: "ST",
        is_enabled: true,
        is_deleted: false,
        is_shift_rate: false,
        is_billable: true,
        created_by: (record as any).created_by,
        modified_by: (record as any).modified_by,
    });
}