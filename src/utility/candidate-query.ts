import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

class CandidateRepository {
    async getCandidatesWithFilters(replacements: any): Promise<any[]> {
        let whereClause = `WHERE program_id = :program_id AND is_deleted = false`;

        if (replacements.candidate_id) whereClause += ` AND candidate_id = :candidate_id`;
        if (replacements.first_name) whereClause += ` AND first_name LIKE :first_name`;
        if (replacements.name) whereClause += ` AND name LIKE :name`;
        if (replacements.middle_name) whereClause += ` AND middle_name LIKE :middle_name`;
        if (replacements.last_name) whereClause += ` AND last_name LIKE :last_name`;
        if (replacements.title) whereClause += ` AND title LIKE :title`;
        if (replacements.is_active !== undefined) whereClause += ` AND is_active = :is_active`;
        if (replacements.worker_type_id) whereClause += ` AND worker_type_id = :worker_type_id`;

        const query = `
            SELECT 
                id, 
                first_name, 
                middle_name, 
                last_name, 
                is_active, 
                name, 
                email, 
                program_id, 
                candidate_id, 
                preferences, 
                worker_type_id, 
                title, 
                birth_date, 
                modified_on, 
                state_national_id, 
                do_not_rehire_notes, 
                do_not_rehire_reason, 
                do_not_rehire
            FROM 
                candidates
            ${whereClause}
            ORDER BY 
                modified_on DESC
            LIMIT :limit OFFSET :offset;
        `;

        const candidates = await sequelize.query(query, {
            replacements: Object.fromEntries(Object.entries(replacements).filter(([_, v]) => v !== undefined)),
            type: QueryTypes.SELECT
        });

        return candidates;
    }
}

export default CandidateRepository;
