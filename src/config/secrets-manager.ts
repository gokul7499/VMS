import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import * as dotenv from "dotenv";
 
dotenv.config();
 
const secretName = process.env.SECRET_NAME ?? "v4/qa/configurator";
const region = "us-east-1";
 
const secretsManager = new SecretsManagerClient({ region });
 
export const getSecretsManager = async () => {
    if (process.env.NODE_ENV === 'local') {
        return {
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT,
            user: process.env.DATABASE_USERNAME,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
        };
    }
 
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
            throw new Error("Secret is in an invalid format (no SecretString found)");
        }
    } catch (err: any) {
        console.error("Failed to retrieve database configuration from Secrets Manager:", err.message || err);
        throw err;
    }
};