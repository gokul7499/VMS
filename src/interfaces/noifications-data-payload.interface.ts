import { EmailRecipient } from '../interfaces/email-recipients.interface';

export interface NotificationDataPayload {
    program_id: string,
    token: string;
    traceId: string;
    eventCode: string;
    recipientEmail: EmailRecipient[];
    payload: any;
    userId: string;
  }