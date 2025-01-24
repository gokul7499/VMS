
import Candidate from '../models/candidate.model';

export const generateCandidateCode = async (): Promise<string> => {
    const count = await Candidate.count(); // Remove the where clause to count all records
    const nextNumber = (count + 1).toString().padStart(5, '0');
    return `CAN-${nextNumber}`;
};

export const CandidateCodeGenerate= async (vendor_id: string): Promise<string> => {
    const count = await Candidate.count({
        where: { vendor_id }
    }); 
    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `CAN-${nextNumber}`;
};