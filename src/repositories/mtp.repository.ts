import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

class MtpRepository {
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
  
  }

  export default MtpRepository;