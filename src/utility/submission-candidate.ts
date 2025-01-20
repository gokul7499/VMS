import axios from "axios";

export async function fetchUnavailableCandidates(
    program_id: string,
    job_id: string,
    token: any,
    traceId: string
): Promise<number[]> {
    try {
        const response = await axios.get(
            `https://v4-devnlb.simplifysandbox.net:8002/sourcing/v1/api/program/${program_id}/submission-candidate`,
            {
                params: { job_id },
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        return response.data.submission_candidate.map((item: any) => item.candidate_id);
    } catch (error: any) {
        throw new Error(
            error.response?.data.message || "Failed to fetch unavailable candidates"
        );
    }
}