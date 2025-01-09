import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { NotificationDataPayload } from '../interfaces/noifications-data-payload.interface';

function getNotificationUrl(): string | undefined {
  return process.env.NOTIFICATION_URL;
}

function validateToken(token: string | undefined): boolean {
  if (!token) {
    console.error('Notification token is not defined.');
    return false;
  }
  return true;
}

export async function sendNotification(payload: NotificationDataPayload): Promise<void> {
  const programData = await sequelize.query(
    `SELECT * FROM programs WHERE id =:program_id`,
    {
      replacements: { program_id: payload.program_id },
      type: QueryTypes.SELECT
    }
  )
  const program = programData[0] as any
  if (!program) {
    console.error("Program not found for ID:", payload.program_id);
    return;
  }
  const tenent_id = program.client_id || program.msp_id;
  if (!tenent_id) {
    console.error("Tenant ID is missing in the payload.");
    return;
  }

  const result = await sequelize.query(
    `SELECT logo FROM Tenant WHERE id = :tenent_id`,
    {
      replacements: { tenent_id },
      type: QueryTypes.SELECT
    }
  ) as any;

  if (!result || result.length === 0) {
    console.error("Tenant logo not found for tenant ID:", tenent_id);
    return;
  }

  let tenantLogo = result[0].logo;
  let name;
  if (!result[0].logo) {
    const result = await sequelize.query(
      `SELECT name FROM tenant WHERE id = :tenent_id`,
      {
        replacements: { tenent_id },
        type: QueryTypes.SELECT
      }) as any;
    if (!result || result.length === 0) {
      console.error("Tenant name not found for tenant ID:", tenent_id);
      return;
    }
    name = result[0].name;
  }

  const user = await sequelize.query(
    `SELECT * FROM user WHERE program_id =:program_id AND id =:user_id`,
    {
      replacements: { program_id: payload.program_id, user_id: payload.userId },
      type: QueryTypes.SELECT
    }
  )
  const userData = user[0] as any
  if (!userData) {
    console.error("User not found for program ID:", payload.program_id, "and user ID:", payload.userId);
    return;
  }

  const notificationUrl = getNotificationUrl();

  if (!notificationUrl) {
    console.error('Notification URL is not defined in environment variables.');
    return;
  }

  if (!validateToken(payload.token)) {
    return;
  }

  const fullName = `${userData.first_name} ${userData.middle_name} ${userData.last_name}`;
  const created_by_first_name = userData.first_name;
  const created_by_last_name = userData.last_name;

  const data = payload.payload;
  Object.assign(data, {
    fullName,
    created_by_first_name,
    created_by_last_name,
    tenantLogo,
    name,
  });

  const notificationData = {
    entityRefId: "simplifyvms",
    program_id: payload.program_id,
    traceId: payload.traceId,
    eventCode: payload.eventCode,
    channels: [
      "EMAIL"
    ],
    recipient: {
      email: {
        to: [
          {
            email: payload.recipientEmail
          }
        ],
        sender: {
          email: "noreply@simplifyvms.com"
        }
      }
    },
    payload: data,
    userId: payload.userId ?? "",
    language: "en"
  };

  const updatedData = {
    ...data,
    fullName,
    created_by_first_name,
    created_by_last_name
  };

  try {
    const response = await axios.post(
      `${notificationUrl}/notification-message/`,
      {
        notificationData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${payload.token}`,
        },
      }
    );


  } catch (error: any) {
    console.error('Failed to send notification:', error.message, error.response?.data);
  }
}