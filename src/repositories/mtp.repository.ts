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

async getAllMtpData(
  programId: string,
  limit: number,
  offset: number,
  talentName?: string,
  mtpId?: string,
  doNotRehire?: string,
  updatedOn?: string,
  linkedProfilesCount?: number
): Promise<{ data: any[]; count: number }> {
  const hasTalentName = talentName && talentName.trim() !== '';
  const hasMtpId = mtpId && mtpId.trim() !== '';
  const hasDoNotRehire = doNotRehire !== undefined;
  const hasUpdatedOn = updatedOn && updatedOn.trim() !== '';
  const hasLinkedProfilesCount = linkedProfilesCount !== undefined;

  let query = `
          SELECT 
            mtp.*, 
            c.do_not_rehire, 
            JSON_LENGTH(mtp.linked_profiles) AS linked_profiles_count,
            COUNT(*) OVER() AS total_count
          FROM mtp
          LEFT JOIN candidates c ON mtp.mtp_candidate_id = c.user_id
          WHERE mtp.program_id = :program_id
          AND mtp.is_deleted = false
        `;

  const replacements: any = {
    program_id: programId,
    limit,
    offset,
  };

  if (hasTalentName) {
    query += ` AND mtp.talent_name LIKE :talentNamePattern`;
    replacements.talentNamePattern = `%${talentName}%`;
  }

  if (hasMtpId) {
    query += ` AND mtp.mtp_id LIKE :mtpIdPattern`;
    replacements.mtpIdPattern = `%${mtpId}%`;
  }

  if (hasDoNotRehire) {
    query += ` AND c.do_not_rehire = :doNotRehire`;
    replacements.doNotRehire = doNotRehire === 'true'; 
  }

  if (hasUpdatedOn) {
    const dateInMilliseconds = new Date(updatedOn).getTime();
    
    query += ` AND mtp.updated_on = :updatedOn`;
    replacements.updatedOn = dateInMilliseconds;
  }

  if (hasLinkedProfilesCount) {
    query += ` AND JSON_LENGTH(mtp.linked_profiles) = :linkedProfilesCount`;
    replacements.linkedProfilesCount = Number(linkedProfilesCount);
  }

  query += ` LIMIT :limit OFFSET :offset`;

  const data = await sequelize.query(query, {
    replacements,
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
    m.mtp_id,
    m.mtp_candidate_id,
    m.is_master_profile,
JSON_ARRAYAGG(JSON_OBJECT(
          'mtp_candidate_id', c.id,
          'program_id', c.program_id,
          'vendor_id', c.vendor_id,
          'candidate_id', c.candidate_id,
          'birth_date', c.birth_date,
          'address', c.addresses,
          'email', c.email,
          'contacts', c.contacts,
          'do_not_rehire',c.do_not_rehire,
          'do_not_rehire_notes',c.do_not_rehire_notes,
          'do_not_rehire_reason',rc.name
        )) AS linked_profiles
  FROM 
    mtp m
LEFT JOIN 
candidates c ON JSON_CONTAINS(m.linked_profiles, JSON_QUOTE(c.id), '$') 
             OR m.mtp_candidate_id = c.id  
LEFT JOIN reason_codes rc ON rc.id = c.do_not_rehire_reason
  WHERE 
    m.program_id = :program_id
    AND m.id = :id;
`;
         const result = await sequelize.query(query, {
           replacements: { program_id: programId,id },
           type: QueryTypes.SELECT,
          raw: true,
         });
        console.log("mtpDtata",result)
      return result;
  }

  async getCandidate(programId: string,candidateId:any): Promise<any> {
    const query =`
        SELECT 
            MIN(c.candidate_id) AS candidate_id,
            MIN(c.program_id) AS program_id,
            CONCAT(MIN(c.first_name), ' ', MIN(c.last_name)) AS candidate_name
        FRom 
            candidates c             
        WHERE 
            c.program_id = :program_id
            AND c.id = :candidate_id;
    `;

    const result = await sequelize.query(query, {
        replacements: { program_id:programId,candidate_id:candidateId},
        type: QueryTypes.SELECT,
        raw: true,
    });
    return result;
}

async getAllMtp(programId: string): Promise<any> {
    const query = `
        SELECT 
            s.mtp_candidate_id AS candidate_id
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

async getMtpByLinkedProfile(programId: string,linkedProfileId:any): Promise<any> {
  const query = `
      SELECT 
          s.linked_profiles AS candidate_id
      FROM 
          mtp s
      WHERE s.program_id = :program_id
      AND s.linked_profiles=:linkedProfileId
  `;

  const result = await sequelize.query(query, {
      replacements: { program_id: programId,linked_profiles:linkedProfileId },
      type: QueryTypes.SELECT,
      raw: true,
  });
  return result; 
}

async getLinkProfiles(programId: any, mtpCandidateId: any): Promise<any> {
  const query = `
    WITH target_candidate AS (
      SELECT * FROM candidates WHERE id = :mtp_candidate_id
    ),
    matched_mtp AS (
      SELECT 
        m.id,
        m.talent_name,
        m.updated_on,
        m.mtp_id,
        m.mtp_candidate_id,
        m.linked_profiles,
        (
          JSON_LENGTH(IFNULL(m.linked_profiles, '[]')) - 
          IF(JSON_CONTAINS(IFNULL(m.linked_profiles, '[]'), JSON_QUOTE(m.mtp_candidate_id), '$'), 1, 0)
        ) AS linked_profiles_count
      FROM mtp m
      WHERE 
        m.program_id = :program_id
        AND (
          m.mtp_candidate_id = :mtp_candidate_id
          OR JSON_CONTAINS(IFNULL(m.linked_profiles, '[]'), JSON_QUOTE(:mtp_candidate_id), '$')
        )
        AND NOT EXISTS (
          SELECT 1 FROM submitted_candidate_disabled_mtp dm 
          WHERE dm.candidate_id = m.mtp_candidate_id
        )
    ),
    candidate_matches AS (
      SELECT 
        m.id AS mtp_id,
        c.*,
        (
          IF(c.first_name = t.first_name, 1, 0) +
          IF(c.last_name = t.last_name, 1, 0) +
          IF(c.middle_name = t.middle_name, 1, 0) +
          IF(CAST(c.birth_date AS CHAR) = CAST(t.birth_date AS CHAR), 1, 0) +
          IF(c.email = t.email, 1, 0)
        ) AS match_score
      FROM matched_mtp m
      JOIN candidates c 
        ON JSON_CONTAINS(IFNULL(m.linked_profiles, '[]'), JSON_QUOTE(c.id), '$')
      JOIN target_candidate t
    ),
    ranked_matches AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY mtp_id ORDER BY match_score DESC) AS rn
      FROM candidate_matches
    ),
    best_match AS (
      SELECT * FROM ranked_matches WHERE rn = 1 AND match_score > 0
    )
    SELECT 
      m.id,
      m.talent_name,
      m.updated_on,
      m.mtp_id,
      m.mtp_candidate_id,
      m.linked_profiles_count,
      JSON_OBJECT(
        'mtp_candidate_id', bm.id,
        'first_name', bm.first_name,
        'last_name', bm.last_name,
        'middle_name', bm.middle_name,
        'program_id', bm.program_id,
        'candidate_id', bm.candidate_id,
        'birth_date', bm.birth_date,
        'email', bm.email,
        'contacts', bm.contacts
      ) AS linked_profile
    FROM matched_mtp m
    LEFT JOIN best_match bm ON bm.mtp_id = m.id;
  `;

  const result = await sequelize.query(query, {
    replacements: { program_id: programId, mtp_candidate_id: mtpCandidateId },
    type: QueryTypes.SELECT,
    raw: true,
  });

  return result;
}



  }

  export default MtpRepository;