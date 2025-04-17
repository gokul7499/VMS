
import { uploadCandidateResume } from '../utility/create-candidate';

jest.mock('../config/db', () => ({
  databaseConfig: {
    config: {
      ai_url: 'https://v4-dev.simplifysandbox.net/vms-ai-v4',
    }
  },
  initializeDatabase: jest.fn()
}));

jest.mock('../models/possible-duplicate-candidate.model', () => ({
  PossibleDuplicateCandidate: {
    create: jest.fn(),
  },
}));


describe('uploadCandidateResume', () => {
  const candidateId = '6547e46c-23c0-467a-8e36-e37e811100ff';
  const vendorId = '0daebadc-3ac3-4727-93a2-5ac99f2973d5';
  const resumeUrl = 'https://imageuploadv4.s3.us-east-1.amazonaws.com/image/1234/Kirtigirme%20Resume.pdf';
  const authHeader = 'Bearer test-token';
  const programId = 'test-program';

  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should successfully upload the resume on the first try', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true });

    await uploadCandidateResume(candidateId, vendorId, resumeUrl, authHeader, programId);

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://v4-dev.simplifysandbox.net/vms-ai-v4/upload-from-url');

    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      url: resumeUrl,
      candidate_id: candidateId,
      vendor_id: vendorId,
      program_id: programId,
    });
  });

  it('should retry up to maxRetries on failure and then throw error', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Upload failed'));

    await expect(
      uploadCandidateResume(candidateId, vendorId, resumeUrl, authHeader, programId, 2, 10)
    ).rejects.toThrow('Upload failed');

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle non-OK response', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

    await uploadCandidateResume(candidateId, vendorId, resumeUrl, authHeader, programId);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
