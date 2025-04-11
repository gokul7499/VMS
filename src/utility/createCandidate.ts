import { databaseConfig } from '../config/db';
import { PossibleDuplicateCandidate } from '../models/possible_duplicate_candidate.model';
const AI_SERVICE_URL = databaseConfig.config.ai_url;

export async function uploadCandidateResume(
  candidate_id: string |unknown,
  vendorId: string,
  resume_url: string,
  authHeader: string,
  program_id:string
): Promise<void> {
  try {
    const uploadResumeUrl = `${AI_SERVICE_URL}/upload-from-url`;

    const payload = {
      url: resume_url,
      candidate_id,
      vendor_id: vendorId,
      program_id
    };

    console.log("Payload being sent:", payload);

    const response = await fetch(uploadResumeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Resume upload response:', data);
  } catch (uploadError) {
    console.error('Error initiating resume upload service call:', uploadError);
  }
}
export async function searchSimilarProfiles(
  candidateId: string | unknown,
  resumeText: string,
  vendorId: string | null,
  authHeader: string,
  programId: string,
  userId: string
): Promise<void> {
  try {
    const searchUrl = `${AI_SERVICE_URL}/candidates/search`;

    const vendorSearch = !!vendorId;

    const searchPayload = {
      Candidate_ID: candidateId,
      Resume_Text: resumeText,
      Vendor_Search: vendorSearch,
      ...(vendorSearch && vendorId ? { Vendor_ID: vendorId } : {}),
    };

    console.log("_______________________Profiles Payload:", searchPayload);

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(searchPayload),
    });

    const result = await response.json();
    console.log("********************* result:", result);

    const matches = result?.results?.matches;

    if (result?.success && Array.isArray(matches) && matches.length > 0) {
      const matchingProfile = matches.map((match: { candidate_id: string }) => match.candidate_id);
      const candidateMatchingScore = matches.map(
        (match: { candidate_id: string; similarity_score: number }) => ({
          candidate_id: match.candidate_id,
          score:match.similarity_score
        })
      );

     const data= await PossibleDuplicateCandidate.create({
        candidate_id: result.results.query_id,
        vendor_id: result.results.vendor_id,
        matching_profile: matchingProfile,
        candidate_matching_score: candidateMatchingScore,
        program_id: programId,
        created_by: userId,
        updated_by: userId,
      });

      console.log("Saved matching duplicate candidate",data);
    } else {
      console.log(" No matches found.");
    }
  } catch (searchError) {
    console.error("Error initiating similar profiles search:", searchError);
  }
}

  