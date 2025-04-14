import { databaseConfig } from '../config/db';
import { PossibleDuplicateCandidate } from '../models/possible_duplicate_candidate.model';
const AI_SERVICE_URL = databaseConfig.config.ai_url;

export async function uploadCandidateResume(
  candidate_id: string ,
  vendorId: string,
  resume_url: string,
  authHeader: string,
  program_id: string
): Promise<void> {
  try {
    const uploadResumeUrl = `${AI_SERVICE_URL}/upload-from-url`;

    const payload = {
      url: resume_url,
      candidate_id,
      vendor_id: vendorId,
      program_id
    };

    const response = await fetch(uploadResumeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    await response.json();
  } catch (uploadError) {
    console.error('Error initiating resume upload service call:', uploadError);
  }
}
export async function searchSimilarProfiles(
  candidateId: string ,
  resumeText: string,
  vendorId: string | null,
  authHeader: string,
  programId: string,
  userId: string
): Promise<void> {
  console.log("Searching for similar profiles...");
  console.log("Candidate ID:", candidateId);
  console.log("userId",userId)
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
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(searchPayload),
    });

    const result = await response.json();

    const matches = result?.results?.matches;

    if (result?.success && Array.isArray(matches) && matches.length > 0) {
      const matchingProfile = matches.map((match: { candidate_id: string }) => match.candidate_id);
      const candidateMatchingScore = matches.map(
        (match: { candidate_id: string; similarity_score: number }) => ({
          candidate_id: match.candidate_id,
          score: match.similarity_score
        })
      );

      const data = await PossibleDuplicateCandidate.create({
        candidate_id: result.results.query_id,
        vendor_id: result.results.vendor_id,
        matching_profile: matchingProfile,
        candidate_matching_score: candidateMatchingScore,
        program_id: programId,
        created_by: userId,
        updated_by: userId,
      });

      console.log("Saved matching profile to DB.", data);
    } else {
      console.log(" No matches found.");
    }
  } catch (searchError) {
    console.error("Error initiating similar profiles search:", searchError);
  }
}

