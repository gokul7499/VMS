export interface SupportText {
    description: string;
    url: string;
    label: string;
    is_enabled: boolean;
}

export interface SupportTextAction {
    id: string;
    name: string;
    slug: string;
    is_enabled: boolean;
    support_text: SupportText;
}

export interface supportingTextAttributes {
    id: string;
    performed_by: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: number;
    modified_on?: number;
    program_id: string;
    event_id: string;
    module_id: string;
    support_text_action: SupportTextAction[];
    created_by: string;
    modified_by: string;
}