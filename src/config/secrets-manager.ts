import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as dotenv from 'dotenv';
dotenv.config();

const secretName = 'v4/dev/configurator';
const region = 'us-east-1';

const secretsManager = new SecretsManagerClient({ region });

export const getSecretsManager = async () => {
    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const data = await secretsManager.send(command);

        if (data.SecretString) {
            const secret = JSON.parse(data.SecretString);
            return {
                host: secret.DATABASE_HOST,
                port: secret.DATABASE_PORT,
                user: secret.DATABASE_USER,
                password: secret.DATABASE_PASSWORD,
                database: secret.DATABASE_NAME,
            };
        } else {
            throw new Error('Secret is in an invalid format (no SecretString found)');
        }
    } catch (err: any) {
        // Handle different error scenarios
        if (err.name === 'ResourceNotFoundException') {
            console.error('Error: The requested secret ' + secretName + ' was not found');
        } else if (err.name === 'InvalidRequestException') {
            console.error('Error: The request to Secrets Manager was invalid');
        } else if (err.name === 'InvalidParameterException') {
            console.error('Error: One or more parameters provided in the request are invalid');
        } else if (err instanceof SyntaxError) {
            console.error('Error: There was a problem parsing the secret value');
        } else {
            console.error('Unknown error:', err.message || err);
        }
    }
};