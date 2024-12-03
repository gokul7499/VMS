import { Programs } from '../models/programsModel';
import Candidate from '../models/candidateModel';

export const generateCandidateCode = async (program_id: string): Promise<string> => {
    const program = await Programs.findOne({
        where: { id: program_id },
        attributes: ['unique_id']
    });

    if (!program) {
        throw new Error('Program not found');
    }
    const programCode = program.unique_id.toUpperCase();

    const count = await Candidate.count({
        where: { program_id }
    });
    const nextNumber = (count + 1).toString().padStart(3, '0');
    return `${programCode}-CN-${nextNumber}`;
};