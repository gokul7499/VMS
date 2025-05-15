
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

    if (!programConfig) {
        return '--';
    }
    const uniqueId = programConfig.value?.value;

    const firstName = user?.first_name ?? '';
    const lastName = user?.last_name ?? '';

    const getFirstNDigits = (value: string, n: number) =>
        value ? value.slice(0, n) : '';
    const stateNationalId = getFirstNDigits(user?.state_national_id?.toString() ?? '', 3);
    const ssnId = getFirstNDigits(user?.ssn_id?.toString() ?? '', 4);

    const birthDate = user?.birth_date ? new Date(parseInt(user.birth_date, 10)) : null;
    const formattedMonth = birthDate ? (birthDate.getMonth() + 1).toString().padStart(2, '0') : 'XX';
    const formattedDay = birthDate ? birthDate.getDate().toString().padStart(2, '0') : 'XX';
    const birthYear = birthDate ? birthDate.getFullYear().toString() : 'XXXX';
    const getSubstring = (name: string, length: number) => name?.substring(0, length)?.toUpperCase();

    switch (uniqueId) {
        case 'FL-MM-DD': {
            const firstLetter = getSubstring(firstName, 1);
            const firstLetterLastName = getSubstring(lastName, 1);
            return `${firstLetter}${firstLetterLastName}${formattedMonth}${formattedDay}`;
        }
        case 'FF-MM-DD': {
            const firstTwoLetters = getSubstring(firstName, 2);
            return `${firstTwoLetters}${formattedMonth}${formattedDay}`;
        }
        case 'LL-MM-DD': {
            const firstTwoLettersLastName = getSubstring(lastName, 2);
            return `${firstTwoLettersLastName}${formattedMonth}${formattedDay}`;
        }
        case 'FF-MM-DD-XXX': {
            const firstTwoLetters = getSubstring(firstName, 2);
            return `${firstTwoLetters}${formattedMonth}${formattedDay}${stateNationalId}`;
        }
        case 'FF-MM-DD-XXXX': {
            const firstTwoLetters = getSubstring(firstName, 2);
            return `${firstTwoLetters}${formattedMonth}${formattedDay}${ssnId}`;
        }
        case 'LL-MM-DD-XXXX': {
            const firstTwoLettersLastName = getSubstring(lastName, 2);
            return `${firstTwoLettersLastName}${formattedMonth}${formattedDay}${ssnId}`;
        }
        case 'LL-MM-DD-XXX': {
            const firstTwoLettersLastName = getSubstring(lastName, 2);
            return `${firstTwoLettersLastName}${formattedMonth}${formattedDay}${stateNationalId}`;
        }
        case 'FF-DD-MM': {
            const firstTwoLetters = getSubstring(firstName, 2);
            return `${firstTwoLetters}${formattedDay}${formattedMonth}`;
        }
        case 'FFF-LLL-MM-DD': {
            const firstThreeLetters = getSubstring(firstName, 3);
            const firstThreeLettersLastName = getSubstring(lastName, 3);
            return `${firstThreeLetters}${firstThreeLettersLastName}${formattedMonth}${formattedDay}`;
        }
        default: {
            return '--';
        }
    }
};
