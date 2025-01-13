export interface NotificationDataPayload {
    program_id: string,
    token: string;
    traceId: string;
    eventCode: string;
    recipientEmail: string;
    payload: any;
    userId: string;
  }


  interface EmailRecipient {
    email: string;
  }