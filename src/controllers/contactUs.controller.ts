import { FastifyRequest, FastifyReply } from "fastify";
import { decodeToken } from "../middlewares/verifyToken";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from "../config/instance";
import { QueryTypes } from 'sequelize';
import { sendNotification } from "../utility/notificationService";

export async function createContactUs(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const traceId = generateCustomUUID();

        const { your_detail, support_email, subject, URL, message, program_id, program_name } = request.body as {
            your_detail: string;
            support_email: string;
            subject: string;
            message: string;
            URL?: string;
            program_id?: string;
            program_name?: string;
        }

        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', traceId });
        }
        const token = authHeader.split(' ')[1];
        let user;
        try {
            user = await decodeToken(token);
        } catch (error) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Invalid token',
                traceId,
                error: (error as any).message,
            });
        }

        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token', traceId });
        }

        if (!your_detail || !support_email || !subject || !message) {
            return reply.status(400).send({
                status: 'error',
                message: 'Missing required fields: your_details, email, subject or message.',
            });
        }

        const user_id = user.sub;

        const [userDetails]: any = await sequelize.query(
            `
            SELECT 
                u.first_name AS from_name, 
                u.email AS from_email
            FROM 
                user u
            WHERE 
                u.id = :userId
            `,
            {
                replacements: { userId: user_id },
                type: QueryTypes.SELECT,
            }
        );

        if (!userDetails || userDetails.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: 'User not found',
                traceId,
            });
        }

        const { from_name, from_email } = userDetails;

        (async () => {

            const payload = {
                program_id: program_id ?? '',
                program_name,
                from_name,
                from_email,
                // from_role: userDetails[0].role,
                url: URL,
                template_body: message,
            };

            const eventCode = "CUSTOMER_SUPPORT";
            const notificationPayload = {
                program_id: program_id ?? '',
                token,
                traceId,
                eventCode,
                recipientEmail: from_email,
                payload,
                userId: user?.sub || '',
            };
            sendNotification(notificationPayload);
        })();


        return reply.status(200).send({
            status: 'success',
            message: 'created successfully.',
            data: {
                your_detail,
                support_email,
                subject,
                URL,
                message
            },
        });
    } catch (error) {
        console.error('Error in createContactUs:', error);
        return reply.status(500).send({
            status: 'error',
            message: 'An error occurred while processing your request. Please try again later.',
        });
    }
}
