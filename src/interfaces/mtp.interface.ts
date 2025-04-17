import { UUID } from "crypto";

export interface MtpInterface{
    id:UUID,
    progaram_id:UUID,
    mtp_id:string,
    linked_profiles:JSON,
    talent_name:string
}