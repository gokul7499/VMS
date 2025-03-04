import Qualifications from '../models/qualifications.model';
import qualificationTypeModel from '../models/qualification-type-model';

export const generateQualificationCode = async (qualification_type_id: string, title: string): Promise<string> => {
    const qualificationType = await qualificationTypeModel.findOne({
        where: { id: qualification_type_id },
        attributes: ['name']
    });

    if (!qualificationType) {
        throw new Error('Qualification type not found');
    }

    const qualificationTypePrefix = qualificationType.name.substring(0, 2).toUpperCase();

    const generateTitlePrefix = (title: string) => {
        const words = title.trim().split(/[\s_]+/); // Split by space or underscore
        return words
            .slice(0, 2) // Take the first two words
            .map(word => word.charAt(0).toUpperCase()) // Take the first letter of each word
            .join(''); // Join them together
    };

    const titlePrefix = generateTitlePrefix(title);

    const lastEntry = await Qualifications.findOne({
        where: { qualification_type_id },
        attributes: ['code'],
        order: [['created_on', 'DESC']]
    });

    let nextNumber = '001';
    if (lastEntry?.code) {
        const lastCode = lastEntry.code.split('-').pop();
        const incrementedNumber = (parseInt(lastCode, 10) + 1).toString().padStart(3, '0');
        nextNumber = incrementedNumber;
    }

    return `${qualificationTypePrefix}-${titlePrefix}-${nextNumber}`;
};

