import { databaseConfig } from '../config/db';
const AI_SERVICE_URL = databaseConfig.config.ai_url;

export async function uploadCandidateResume(
  candidate_id: string |unknown,
  vendorId: string,
  resume_url: string,
  authHeader: string
): Promise<void> {
  try {
    const uploadResumeUrl = `${AI_SERVICE_URL}/upload-from-url`;

    const payload = {
      url: resume_url,
      candidate_id,
      vendor_id: vendorId,
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
  authHeader: string
): Promise<void> {
  try {
    const searchUrl = `${AI_SERVICE_URL}/candidates/search`;

    const vendorSearch = !!vendorId; 

    const searchPayload: {
      Candidate_ID: string | unknown;
      Resume_Text: string;
      Vendor_Search: boolean;
      Vendor_ID?: string;
    } = {
      Candidate_ID: candidateId,
      Resume_Text: resumeText,
      Vendor_Search: vendorSearch,
    };
    if (vendorSearch && vendorId) {
      searchPayload.Vendor_ID = vendorId;
    }

    console.log('_______________________Profiles Payload:', searchPayload);

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(searchPayload),
    });

    const result = await response.json();
    console.log('********************* result:', result);

  } catch (searchError) {
    console.error('Error initiating similar profiles search:', searchError);
  }
}


 export async function findDuplicateCandidates(
    candidateIds: string[],
    authHeader: string
  ): Promise<void> {
    try {
      const findDuplicatesUrl = `${AI_SERVICE_URL}/candidates/find-duplicates`;
  
      const payload = {
        candidate_ids: candidateIds
      };
  
      console.log('Initiating duplicate candidate search with payload:', payload);
  
    const response=await  fetch(findDuplicatesUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json();
      console.log('Duplicate candidates response:', result);
       
    } catch (error) {
      console.error('Error initiating find duplicates search:', error);
    }
  }
  