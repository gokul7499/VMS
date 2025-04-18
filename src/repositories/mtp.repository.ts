import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
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


      async getAllMtpData(programId: string): Promise<{
      }[]> {
        const query = `
               Select *
               from mtp
               where program_id=:program_id
            `;
    
          const data = await sequelize.query(query, {
          replacements: { program_id:programId },
          type: QueryTypes.SELECT,
        });
        return data;
      }
      async getPossibleDuplicateCandidate(programId: any, candidateId: any): Promise<any> {
        console.log("programId", programId)
        console.log("candidateId", candidateId)
        const query = `
            SELECT 
                MIN(pdc.candidate_id) AS candidate_id,
                MIN(pdc.program_id) AS program_id
            FROM 
                candidates c
            JOIN 
                possible_duplicate_candidate pdc ON c.user_id = pdc.candidate_id
            WHERE 
                c.program_id = :program_id
                AND c.user_id = :candidate_id;
        `;
    
        const result = await sequelize.query(query, {
            replacements: { program_id: programId, candidate_id: candidateId },
            type: QueryTypes.SELECT,
            raw: true,
        });
        return result;
    }
    
  
  }

  export default MtpRepository;