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
  const candidateId = '123';
  const vendorId = 'V456';
  const resumeText = '09999';
  const authHeader = 'Bearer token';
  const programId = 'Program001';
  const userId = 'UserXYZ';

  const mockApiResponse = {
    success: true,
    results: {
      query_id: candidateId,
      vendor_id: vendorId,
      vendor_search: true,
      matches: [
        {
          candidate_id: '789',
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
      matching_profile: ['789'],
      candidate_matching_score: [
        {
          candidate_id: '789',
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
