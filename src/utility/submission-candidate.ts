import axios from "axios";

export async function fetchUnavailableCandidates(
    program_id: string,
    job_id: string,
    traceId: string
): Promise<number[]> {
    try {
        const response = await axios.get(
            `http://v4-qanlb.simplifysandbox.net:8002/sourcing/v1/api/program/${program_id}/submission-candidate`,
            { params: { job_id } }
        );

        return response.data.submission_candidate.map((item: any) => item.candidate_id);
    } catch (error: any) {
        throw new Error(
            error.response?.data.message || "Failed to fetch unavailable candidates"
        );
    }
}
