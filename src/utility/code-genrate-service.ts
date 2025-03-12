
import Candidate from '../models/candidate.model';
import { ProgramVendor } from '../models/program-vendor.model';

export const generateCandidateCode = async (): Promise<string> => {
    const count = await Candidate.count(); // Remove the where clause to count all records
    const nextNumber = (count + 1).toString().padStart(5, '0');
    return `CAN-${nextNumber}`;
};

export const CandidateCodeGenerate = async (vendor_id: string,program_id:string): Promise<string> => {
    const vendor = await ProgramVendor.findOne({
        where: { tenant_id: vendor_id,program_id:program_id }
    });
    
    const vendor_code = vendor?.vendor_code ? vendor.vendor_code.toUpperCase() : 'VENDOR';
    
    const count = await Candidate.count( {where: { vendor_id: vendor?.id }});  
    const nextNumber = (count + 1).toString().padStart(5, '0');
    
    return `${vendor_code}-CAN-${nextNumber}`;
};
