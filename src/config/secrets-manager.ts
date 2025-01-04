import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import * as dotenv from "dotenv";

dotenv.config();

const secretName = "v4/dev/configurator";
const region = "us-east-1";

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
            throw new Error("Secret is in an invalid format (no SecretString found)");
        }
    } catch (err: any) {
        if (err.name === "AccessDeniedException") {
            console.error(
                `Access Denied: Ensure the IAM user has permissions to access the secret ${secretName}`
            );
        } else if (err.name === "ResourceNotFoundException") {
            console.error(`Secret not found: ${secretName}`);
        } else {
            console.error("Unknown error while retrieving secret:", err.message || err);
        }
        throw new Error("Failed to retrieve database configuration from Secrets Manager");
    }
};
