import { databaseConfig } from '../config/db';
import { CandidateMatch, CandidateMatchScore } from '../interfaces/user.interface';
import { PossibleDuplicateCandidate } from '../models/possible-duplicate-candidate.model';
const AI_SERVICE_URL = databaseConfig.config.ai_url;

export async function uploadCandidateResume(
  candidateId: string ,
  vendorId: string,
  resumeUrl: string,
  authHeader: string,
  programId: string
){
  try {
    const uploadResumeUrl = `${AI_SERVICE_URL}/upload-from-url`;

    const payload = {
      url: resumeUrl,
      candidate_id:candidateId,
      vendor_id: vendorId,
      program_id: programId
    };

   const response= await fetch(uploadResumeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Resume upload failed:',response);
    }
    console.log('Resume upload successful for candidate:', response);

  } catch (uploadError) {
    console.error('Error initiating resume upload service call:', uploadError);
  }
}

export async function searchSimilarProfiles(
  candidateId: string,
  resumeText: string,
  vendorId: string | null,
  authHeader: string,
  programId: string,
  userId: string
) {
  console.log("Searching for similar profiles...");
  console.log("Candidate ID:", candidateId);
  console.log("userId", userId);

  try {
    const searchUrl = `${AI_SERVICE_URL}/candidates/search`;

    const vendorSearch = !!vendorId;

    const searchPayload = {
      Candidate_ID: candidateId,
      Resume_Text: resumeText,
      Vendor_Search: vendorSearch,
      ...(vendorSearch && vendorId ? { Vendor_ID: vendorId } : {}),
    };

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch similar profiles: ${response.statusText}`);
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
        candidate_id:query_id,
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
  } catch (searchError) {
    console.error("Error initiating similar profiles search:", searchError);
  }
}


