import jobTemplateModel from '../models/job-template.model';
import { Programs } from '../models/programs.model';

export const generateJobTemplateCode = async (program_id: string): Promise<string> => {
    const program = await Programs.findOne({
        where: { id: program_id },
        attributes: ['name']
    });

    if (!program) {
        throw new Error('Program not found');
    }
    const programName = program.name.replace(/\s+/g, '');
    const programCode = programName.slice(0, 3).toUpperCase();

    const lastEntry = await jobTemplateModel.findOne({
        where: { program_id },
        order: [['created_on', 'DESC']]
    });

    let nextNumber = '001'; 

    if (lastEntry?.job_id) {
        const lastCode = lastEntry.job_id.split('-').pop(); 
        const incrementedNumber = parseInt(lastCode ?? '0', 10) + 1;
        nextNumber = incrementedNumber.toString().padStart(3, '0'); 
    }

    return `${programCode}-JT-${nextNumber}`;
};

export const generateRandomCode = (): string => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};
