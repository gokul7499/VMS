import { databaseConfig } from '../config/db';
import { CandidateMatch, CandidateMatchScore } from '../interfaces/user.interface';
import { PossibleDuplicateCandidate } from '../models/possible-duplicate-candidate.model';
const AI_SERVICE_URL = databaseConfig.config.ai_url 

export async function uploadCandidateResume(
  candidateId: string,
  vendorId: string,
  resumeUrl: string,
  authHeader: string,
  programId: string,
  uniqueId:string,
  maxRetries = 3,
  delayMs = 1000
) {
  const uploadResumeUrl = `${AI_SERVICE_URL}/upload-from-url`;
  const payload = {
    url: resumeUrl,
    candidate_id: candidateId,
    vendor_id: vendorId,
    program_id: programId,
    c_unique_id:uniqueId
  };

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(uploadResumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(payload),
      });
      console.log("Response", response);
    if (!response.ok) {
      console.error('Resume upload failed:',response);
    }
      console.log(`Resume upload succeeded on attempt ${attempt + 1}`);
      return; 

    } catch (uploadError) {
      attempt++;
      console.error(`Upload attempt ${attempt} failed:`, uploadError);

      if (attempt >= maxRetries) {
        console.error('Max retries reached. Upload failed.');
        return uploadError;
      }

      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}


export async function searchSimilarProfiles(
  candidateId: string,
  resumeText: string,
  vendorId: string | null,
  authHeader: string,
  programId: string,
  userId: string,
  maxRetries = 3,
  delayMs = 1000
) {

  const searchUrl = `${AI_SERVICE_URL}/candidates/search`;
  const vendorSearch = !!vendorId;

  const searchPayload = {
    Candidate_ID: candidateId,
    Resume_Text: resumeText,
    Vendor_Search: vendorSearch,
    ...(vendorSearch && vendorId ? { Vendor_ID: vendorId } : {}),
  };

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

      if (!response.ok) {
        return(`Failed to fetch similar profiles: ${response.statusText}`);
      }

      const result = await response.json();
      const matches: CandidateMatch[] = result?.results?.matches;

      if (result?.success && Array.isArray(matches) && matches.length > 0) {
        const { query_id, vendor_id, matches } = result.results;
        const matchingProfile: string[] = matches.map(
          (match: CandidateMatch) => match.candidate_id
        );

        const candidateMatchingScore: CandidateMatchScore[] = matches.map(
          (match: CandidateMatch) => ({
            candidate_id: match.candidate_id,
            vendor_id: match.vendor_id,
            score: match.similarity_score,
          })
        );

        const data = await PossibleDuplicateCandidate.create({
          candidate_id: query_id,
          vendor_id: vendor_id,
          matching_profile: matchingProfile,
          candidate_matching_score: candidateMatchingScore,
          program_id: programId,
          created_by: userId,
          updated_by: userId,
        });

        console.log("Saved matching profile to DB.", data);
      } else {
        console.log("No matches found.");
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

export async function findDuplicateCandidate(
  candidateId: any[],
  programId: string,
  userId: string,
  authHeader: any,
  mtpCandidateId:string,
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
          candidate_id:mtpCandidateId,
          matching_profile: matchingProfile,
          candidate_matching_score: candidateMatchingScore,
          program_id: programId,
          created_by: userId,
          updated_by: userId,
        });
        console.log("Saved matching profile to DB.", data);
      } else {
        console.log("No matches found.");
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





