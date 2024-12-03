import { FastifyInstance } from "fastify";
import {
    createPasswordPolicy,
    getPasswordPolicy,
    getPasswordPolicyById,
    updatePasswordPolicy,
    deletePasswordPolicy
} from "../controllers/passwordPolicyController";

export default async function (app: FastifyInstance) {
    app.get('/program/:program_id/password-policy', getPasswordPolicy);
    app.get('/program/:program_id/password-policy/:id', getPasswordPolicyById);
    app.post('/password-policy', createPasswordPolicy);
    app.put('/password-policy/:id', updatePasswordPolicy);
    app.delete('/program/:program_id/password-policy/:id', deletePasswordPolicy);
}
