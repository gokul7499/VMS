import { searchSimilarProfiles } from '../utility/create-candidate';
import { PossibleDuplicateCandidate } from '../models/possible-duplicate-candidate.model';
import { jest } from '@jest/globals';

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
jest.mock('../config/db', () => ({
    databaseConfig: {
      config: {
        ai_url: 'https://v4-dev.simplifysandbox.net/vms-ai-v4'
      }
    },
    initializeDatabase: jest.fn()
  }));

  
jest.mock('../models/possible-duplicate-candidate.model', () => ({
  PossibleDuplicateCandidate: {
    create: jest.fn(),
  },
}));

describe('searchSimilarProfiles', () => {
  const candidateId = '6547e46c-23c0-467a-8e36-e37e811100ff';
  const vendorId = '0daebadc-3ac3-4727-93a2-5ac99f2973d5';
  const resumeText = 'https://imageuploadv4.s3.us-east-1.amazonaws.com/image/1234/Kirtigirme%20Resume.pdf';
  const authHeader = 'Bearer token';
  const programId = '3d8c2ef5-97cc-4876-a3d3-3b7362bda689';
  const userId = '6547e46c-23c0-467a-8e36-e37e811100ff';

  const mockApiResponse = {
    success: true,
    results: {
      query_id: candidateId,
      vendor_id: vendorId,
      vendor_search: true,
      matches: [
        {
          candidate_id: candidateId,
          vendor_id: vendorId,
          similarity_score: 0.85,
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save matches to DB when matches are found', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const mockCreate = PossibleDuplicateCandidate.create as jest.Mock;

    await searchSimilarProfiles(candidateId, resumeText, vendorId, authHeader, programId, userId);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      candidate_id: candidateId,
      vendor_id: vendorId,
      matching_profile: ['6547e46c-23c0-467a-8e36-e37e811100ff'],
      candidate_matching_score: [
        {
          candidate_id: candidateId,
          vendor_id: vendorId,
          score: 0.85,
        },
      ],
      program_id: programId,
      created_by: userId,
      updated_by: userId,
    });
  });
});
