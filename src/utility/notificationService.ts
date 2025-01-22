import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { NotificationDataPayload } from '../interfaces/noifications-data-payload.interface'
import { EmailRecipient } from '../interfaces/email-recipient';
import { databaseConfig } from '../config/db';
const auth_db = databaseConfig.config.database_auth;

function getNotificationUrl(): string | undefined {
    return databaseConfig.config.notification_url;
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
        `SELECT logo,name FROM tenant WHERE id = :tenent_id`,
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
    let name = result[0].name;
    let user: any;
    const type = payload.payload.user_type;
    console.log('Payload data : ', payload.payload);

    //TODO : remove the auth db call, this is temporay solution, the super user should exist in config db too
    if (type === 'super_user') {
        console.log('Inside the super user query')
        user = await sequelize.query(
            `SELECT * FROM ${auth_db}.user WHERE user_id = :user_id`,
            {
                replacements: { user_id: payload.userId },
                type: QueryTypes.SELECT
            }
        )
    } else {
        user = await sequelize.query(
            `SELECT * FROM user WHERE id = :user_id  AND program_id = :program_id`,
            {
                replacements: { program_id: payload.program_id, user_id: payload.userId },
                type: QueryTypes.SELECT
            }
        )
    }
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

    const data = payload.payload;
    if (payload.recipientEmail.length > 0) {
        payload.recipientEmail.forEach((element: EmailRecipient) => {
            const senderEmail = payload.payload?.from_email || "noreply@simplifyvms.com";
            Object.assign(data, {
                fullName: `${element.first_name} ${element.middle_name || ""} ${element.last_name}`,
                created_by_first_name: userData.first_name,
                created_by_last_name: userData.last_name,
                logo_url: tenantLogo,
                name: name
            });
            const emailData = element.email;
            console.log("emailData", emailData);

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
                                email: emailData
                            }
                        ],
                        sender: {
                            email: senderEmail
                        }
                    }
                },
                payload: data,
                userId: payload.userId ?? "",
                language: "en"
            };
            console.log("notificationData :-", notificationData)
            try {
                const response = axios.post(
                    `${notificationUrl}/notification-message/`, notificationData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${payload.token}`,
                        },
                    }
                );
                console.log(response);


            } catch (error: any) {
                console.error('Failed to send notification:', error.message, error.response?.data);
            }
        });
    }

}