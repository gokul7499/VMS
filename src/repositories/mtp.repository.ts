import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { Json } from "sequelize/types/utils";
class MtpRepository {
    static getAllMtpData(programId: string) {
        throw new Error("Method not implemented.");
    }
    async programQuery(program_id: string): Promise<{
        unique_id: string; name: string
      }[]> {
        const query = `
                SELECT 
                    programs.name,
                    programs.unique_id
                FROM programs
                WHERE programs.id = :program_id;
            `;
    
        const data = await sequelize.query<{ name: string, unique_id: string }>(query, {
          replacements: { program_id },
          type: QueryTypes.SELECT,
        });
    
        return data;
      }


      async getAllMtpData(
        programId: string,
        limit: number,
        offset: number
      ): Promise<{ data: any[]; count: number }> {
        const query = `
          SELECT *, COUNT(*) OVER() AS total_count
          FROM mtp
          WHERE program_id = :program_id
          GROUP BY mtp.id
          LIMIT :limit OFFSET :offset
        `;
      
        const data = await sequelize.query(query, {
          replacements: { program_id: programId, limit, offset },
          type: QueryTypes.SELECT,
        });
      
        const count = data.length > 0 ? Number((data[0] as any).total_count) : 0;
      
        return { data, count };
      }
      
      async getPossibleDuplicateCandidate(programId: string): Promise<any> {    
        const query = `
            SELECT 
                pdc.matching_profile AS candidate_id,
                pdc.program_id AS program_id
            FROM 
                possible_duplicate_candidate pdc
          
            WHERE 
                pdc.program_id = :program_id
        `;
    
        const result = await sequelize.query(query, {
            replacements: { program_id: programId},
            type: QueryTypes.SELECT,
            raw: true,
        });
    
        return result;
    }

    async getMtpById(programId: any, id: any): Promise<any> {
      console.log("programId", programId)
      console.log("candidateId", id)
      const query = `
  SELECT 
    m.id,
    m.talent_name,
    m.updated_on,
JSON_ARRAYAGG(JSON_OBJECT(
          'program_id', c.program_id,
          'vendor_id', c.vendor_id,
          'candidate_id', c.candidate_id,
          'birth_date', c.birth_date,
          'address', c.addresses,
          'email', c.email,
          'contacts', c.contacts
        )) AS linked_profiles
  FROM 
    mtp m
  JOIN 
    candidates c ON JSON_CONTAINS(m.linked_profiles, JSON_QUOTE(c.user_id), '$')
  WHERE 
    m.program_id = :program_id
    AND m.id = :id;
`;

         const result = await sequelize.query(query, {
           replacements: { program_id: programId,id },
           type: QueryTypes.SELECT,
          raw: true,
         });

      return result;
  }

  async getCandidate(programId: string,candidateId:any): Promise<any> {
    console.log("program_id88888888888888",programId)
    console.log("candidateId",candidateId)

    const query =`
        SELECT 
            MIN(c.candidate_id) AS candidate_id,
            MIN(c.program_id) AS program_id,
            CONCAT(MIN(c.first_name), ' ', MIN(c.last_name)) AS candidate_name
        FRom 
            candidates c             
        WHERE 
            c.program_id = :program_id
            AND c.user_id = :candidate_id;
    `;

    const result = await sequelize.query(query, {
        replacements: { program_id:programId,candidate_id:candidateId},
        type: QueryTypes.SELECT,
        raw: true,
    });
    console.log("talentDDDDDDDDDDDDDDDDDD",result)
    return result;
}

async getAllMtp(programId: string): Promise<any> {
    const query = `
        SELECT 
            s.linked_profiles AS candidate_id
        FROM 
            mtp s
        WHERE s.program_id = :program_id
    `;

    const result = await sequelize.query(query, {
        replacements: { program_id: programId },
        type: QueryTypes.SELECT,
        raw: true,
    });
    return result; 
}
    
  
  }

  export default MtpRepository;