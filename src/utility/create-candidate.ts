import { databaseConfig } from '../config/db';
import MtpModel from '../models/mtp.model';
import { PossibleDuplicateCandidate } from '../models/possible-duplicate-candidate.model';
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
  candidateId: any[],
  programId: string,
  userId: string,
  authHeader: any,
  candidate:string,
  paylod:any,
  maxRetries = 3,
  delayMs = 1000
) {
  const searchUrl = `${AI_SERVICE_URL}/candidates/cross-match`;

  const searchPayload = {
    candidate_ids: candidateId
  };
  console.log("searchPayload",searchPayload)
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(searchPayload),
      });

      const result = await response.json();
      console.log("response", result);

      if (!response.ok) {
        throw new Error(`Failed to fetch similar profiles: ${response.statusText}`);
      }

      const matches = result?.duplicate_matches;

      if (result?.success && Array.isArray(matches) && matches.length > 0) {
        const matchingProfile: string[] = [];

        const candidateMatchingScore = matches.map((match: any) => {
          if (!matchingProfile.includes(match.candidate1_id)) {
            matchingProfile.push(match.candidate1_id);
          }

          if (!matchingProfile.includes(match.candidate2_id)) {
            matchingProfile.push(match.candidate2_id);
          }

          return {
            candidate1_id: match.candidate1_id,
            candidate2_id: match.candidate2_id,
            score: match.similarity_score,
          };
        });

        const data = await PossibleDuplicateCandidate.create({
          candidate_id:candidate,
          matching_profile: matchingProfile,
          candidate_matching_score: candidateMatchingScore,
          program_id: programId,
          created_by: userId,
          updated_by: userId,
        });
        console.log("Saved matching profile to DB.", data);
      } else {
        console.log("No duplicate found Create MTP.......");
         const mtpData = await MtpModel.create({
                    ...paylod,
                    created_by: userId,
                    updatedby: userId,
                });
              console.log("mtpData",mtpData)
      }
      return;

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





