import { sequelize } from '../config/instance';
import jobTemplateModel from '../models/job-template.model';
import JobTempletReposit from './job-template-query';
const JobTempletRepository= new JobTempletReposit();

export const generateJobTemplateCode = async (program_id: string): Promise<string> => {
    const transaction = await sequelize.transaction();
    try {
        const programResult = await JobTempletRepository.programQuery(program_id);

        if (!programResult || programResult.length === 0) {
            throw new Error('Program not found');
        }

        const programName = programResult[0].name.replace(/\s+/g, '');
        const programCode = programName.slice(0, 3).toUpperCase();

        const lastEntry = await jobTemplateModel.findOne({
            where: { program_id },
            order: [['created_on', 'DESC']],
            attributes: ['job_id'],
            transaction,
        });

        let nextNumber = '001';

        if (lastEntry?.job_id) {
            const lastCode = lastEntry.job_id.split('-').pop();
            const incrementedNumber = parseInt(lastCode ?? '0', 10) + 1;
            nextNumber = incrementedNumber.toString().padStart(3, '0');
        }

        const uniqueCode = `${programCode}-JT-${nextNumber}`;

        await transaction.commit();
        return uniqueCode;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};


export const generateRandomCode = (): string => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};
