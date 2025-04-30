import { Op, Sequelize } from 'sequelize';
import { databaseConfig } from '../config/db';
import MtpModel from '../models/mtp.model';
import { PossibleDuplicateCandidate } from '../models/possible-duplicate-candidate.model';
import { sequelize } from '../config/instance';
const AI_SERVICE_URL = databaseConfig.config.ai_url 

export async function searchSimilarProfiles(
  candidateId: string,
  resumeText: string,
  vendorId: string | null,
  authHeader: string,
  programId: string,
  userId: string,
  uniqueId:String,
  maxRetries = 3,
  delayMs = 1000
) {
   console.log("candidateId",candidateId)
  const searchUrl = `${AI_SERVICE_URL}/upload-and-search`;
  const vendorSearch = !!vendorId;
 console.log("vendorSearch",vendorSearch)
  const searchPayload = {
    candidate_id: candidateId,
    url: resumeText,
    c_unique_id:uniqueId,
    vendor_search: vendorSearch,
    ...(vendorSearch && vendorId ? { vendor_id: vendorId } : {}),
  };
  console.log("similar profile paylod",searchPayload)
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`,
        },
        body: JSON.stringify(searchPayload),
      }); 


      if (!response.ok) {
        return(`Failed to fetch similar profiles: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("similar profile Data",result)
       return result; 

    } catch (searchError) {
      attempt++;
      console.error(`Search attempt ${attempt} failed:`, searchError);

      if (attempt >= maxRetries) {
        console.error("Max retries reached. Search failed.");
        return searchError;
      }

      await new Promise((res) => setTimeout(res, delayMs)); 
    }
  }
}
export async function findDuplicateCandidate(
  candidateId: string[],
  programId: string,
  userId: string,
  authHeader: any,
  candidate: string,
  paylod: any,
  maxRetries = 3,
  delayMs = 1000
) {
  
  const searchUrl = `${AI_SERVICE_URL}/candidates/cross-match`;

  const searchPayload = {
    candidate_ids: candidateId,
  };
  console.log(`[findDuplicateCandidate] - Search Payload:`, JSON.stringify(searchPayload));

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`[findDuplicateCandidate] - Attempt ${attempt + 1} - Sending cross-match request...`);
      const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(searchPayload),
      });

      const result = await response.json();
      console.log(`[findDuplicateCandidate] - Response Received:`, JSON.stringify(result));

      if (!response.ok) {
        console.error(`[findDuplicateCandidate] - Response Not OK:`, response.statusText);
        throw new Error(`Failed to fetch similar profiles: ${response.statusText}`);
      }

      const matches = result?.duplicate_matches;

      if (result?.success && Array.isArray(matches) && matches.length > 0) {
        console.log(`[findDuplicateCandidate] - Duplicate matches found:`, matches.length);

        const matchingProfileSet = new Set<string>();
        const candidateMatchingScore: { candidate1_id: string; candidate2_id: string; score: number }[] = [];

        for (const match of matches) {
          if (match.similarity_score && match.similarity_score > 0) {
            if (match.candidate1_id) matchingProfileSet.add(match.candidate1_id);
            if (match.candidate2_id) matchingProfileSet.add(match.candidate2_id);

            candidateMatchingScore.push({
              candidate1_id: match.candidate1_id,
              candidate2_id: match.candidate2_id,
              score: match.similarity_score,
            });
          }
        }

        const matchingProfile = Array.from(matchingProfileSet);
        console.log(`[findDuplicateCandidate] - Matching Profiles after filtering:`, matchingProfile);
        console.log(`[findDuplicateCandidate] - Candidate Matching Scores:`, candidateMatchingScore);

        if (matchingProfile.length > 0) {
          const possibleDuplicateData = await PossibleDuplicateCandidate.create({
            candidate_id: candidate,
            matching_profile: matchingProfile,
            candidate_matching_score: candidateMatchingScore,
            program_id: programId,
            created_by: userId,
            updated_by: userId,
          });

          console.log(`[findDuplicateCandidate] - PossibleDuplicateCandidate created:`, possibleDuplicateData?.id);
          console.log("matchingProfile", matchingProfile);

          const updatedCount = await updateMtpWithMatchingProfiles(matchingProfile, programId);
          console.log(`[findDuplicateCandidate] - Total MTPs updated: ${updatedCount}`);
        }                              

      } else {
        console.log(`[findDuplicateCandidate] - No duplicate matches found.`);
        const data = await MtpModel.create({
          ...paylod,
          created_by: userId,
          updated_by: userId,
        });
        console.log(data, "create mtp....");
      }

      console.log(`[findDuplicateCandidate] - Successfully completed.`);
      return;

    } catch (searchError) {
      attempt++;
      console.error(`[findDuplicateCandidate] - Error on attempt ${attempt}:`, searchError);

      if (attempt >= maxRetries) {
        console.error(`[findDuplicateCandidate] - Max retries reached. Search failed.`);
        return searchError;
      }

      console.log(`[findDuplicateCandidate] - Retrying after ${delayMs}ms...`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

async function updateMtpWithMatchingProfiles(
  matchingProfileIds: string[],
  programId: string
): Promise<number> {
  if (!matchingProfileIds.length) {
    console.log(`[updateMtpWithMatchingProfiles] - No matching profiles to update`);
    return 0;
  }
  
  if (!programId) {
    throw new Error('Program ID is required');
  }

  try {
    const mtpsToUpdate = await MtpModel.findAll({
      where: {
        program_id: programId,
        [Op.or]: matchingProfileIds.map((id) => {
          return Sequelize.where(
            Sequelize.fn('JSON_CONTAINS', Sequelize.col('linked_profiles'), JSON.stringify(id)),
            1
          );
        })
      }
    });

    console.log(`[updateMtpWithMatchingProfiles] - MTPs found to update: ${mtpsToUpdate.length}`);
    
    const updatedCount = await sequelize.transaction(async (transaction) => {
      let count = 0;
      
      for (const mtp of mtpsToUpdate) {
        const existingLinkedProfiles = mtp.linked_profiles || [];
        const updatedLinkedProfilesSet = new Set([...existingLinkedProfiles, ...matchingProfileIds]);
        const updatedLinkedProfiles = Array.from(updatedLinkedProfilesSet);
        
        await mtp.update({
          linked_profiles: updatedLinkedProfiles
        }, { transaction });
        
        count++;
        console.log(`[updateMtpWithMatchingProfiles] - MTP updated with new linked_profiles. MTP ID: ${mtp.id}`);
      }
      
      return count;
    });
    
    return updatedCount;
  } catch (error) {
    console.error(`[updateMtpWithMatchingProfiles] - Error updating MTPs:`, error);
    throw error; 
  }
}

