
import Candidate from '../models/candidate.model';
import { ProgramVendor } from '../models/program-vendor.model';
import ProgramsConfig from '../models/programs-config.model';

export const generateCandidateCode = async (): Promise<string> => {
    const count = await Candidate.count(); // Remove the where clause to count all records
    const nextNumber = (count + 1).toString().padStart(5, '0');
    return `CAN-${nextNumber}`;
};

export const CandidateCodeGenerate = async (vendor_id: string, program_id: string): Promise<string> => {
    const vendor = await ProgramVendor.findOne({
        where: { id: vendor_id, program_id: program_id }
    });

    const vendor_code = vendor?.vendor_code ? vendor.vendor_code.toUpperCase() : 'VENDOR';

    const count = await Candidate.count({ where: { vendor_id: vendor?.id } }); const nextNumber = (count + 1).toString().padStart(5, '0');

    return `${vendor_code}-CAN-${nextNumber}`;
};

export const CandidateUniqueIdGenerate = async (program_id: string, user: any): Promise<string> => {
    const programConfig = await ProgramsConfig.findOne({
        where: {
            program_id,
            config_model: 'platform',
            title: 'Unique Id'
        },
        attributes: ['value']
    });

    if (!programConfig) return '--';
    const uniqueIdFormat = programConfig.value?.value;

    const firstName = user?.first_name ?? '';
    const lastName = user?.last_name ?? '';

    // Get first N characters and uppercase
    const getSubstring = (str: string, length: number) =>
        str?.substring(0, length)?.toUpperCase() || '';

    // Extract digits
    const getFirstNDigits = (value: string | number, n: number) =>
        value?.toString().substring(0, n) ?? '';

    // Parse and format birthdate
    const birthDate = user?.birth_date
        ? new Date(Number(user.birth_date))
        : null;

    const formattedMonth = birthDate
        ? String(birthDate.getMonth() + 1).padStart(2, '0')
        : 'XX';

    const formattedDay = birthDate
        ? String(birthDate.getDate()).padStart(2, '0')
        : 'XX';

    // Extract last N digits
    const getLastNDigits = (value: string | number, n: number) => {
        const str = value?.toString() || '';
        return str.length > n ? str.slice(-n) : str.padStart(n, '0');
    };

    const stateNationalId = getLastNDigits(user?.state_national_id, 3);
    const ssnId = getLastNDigits(user?.ssn_id, 4);

    // Format combinations
    switch (uniqueIdFormat) {
        case 'FF-DD-MM':
            return `${getSubstring(firstName, 2)}${formattedDay}${formattedMonth}`;

        case 'FF-MM-DD':
            return `${getSubstring(firstName, 2)}${formattedMonth}${formattedDay}`;

        case 'FF-MM-DD-XXX':
            return `${getSubstring(firstName, 2)}${formattedMonth}${formattedDay}${stateNationalId}`;

        case 'FF-MM-DD-XXXX':
            return `${getSubstring(firstName, 2)}${formattedMonth}${formattedDay}${ssnId}`;

        case 'FFF-LLL-MM-DD':
            return `${getSubstring(firstName, 3)}${getSubstring(lastName, 3)}${formattedMonth}${formattedDay}`;

        case 'FL-MM-DD':
            return `${getSubstring(firstName, 1)}${getSubstring(lastName, 1)}${formattedMonth}${formattedDay}`;

        case 'LL-MM-DD':
            return `${getSubstring(lastName, 2)}${formattedMonth}${formattedDay}`;

        case 'LL-MM-DD-XXX':
            return `${getSubstring(lastName, 2)}${formattedMonth}${formattedDay}${stateNationalId}`;

        case 'LL-MM-DD-XXXX':
            return `${getSubstring(lastName, 2)}${formattedMonth}${formattedDay}${ssnId}`;

        default:
            return '--';
    }
};