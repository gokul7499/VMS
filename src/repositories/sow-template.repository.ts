
export const getSowTemplatesQuery = (whereClause: string) => `
    SELECT 
        t.*, 
        COALESCE((
            SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', h.hierarchy_id,
                'hierarchy_name', hier.name
            ))
            FROM sow_template_hierarchy h 
            LEFT JOIN hierarchies hier ON h.hierarchy_id = hier.id
            WHERE h.sow_template_id = t.id
        ), '[]') AS hierarchy
    FROM sow_templates t
    WHERE ${whereClause}
    LIMIT :limit OFFSET :offset;
`;

export const getSowTemplatesCountQuery = (whereClause: string) => `
    SELECT COUNT(*) AS total 
    FROM sow_templates t
    WHERE ${whereClause};
`;



export const getSowTemplateByIdQuery = `
    SELECT 
        t.*, 
        COALESCE((
            SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', h.hierarchy_id,
                'hierarchy_name', hier.name
            ))
            FROM sow_template_hierarchy h 
            LEFT JOIN hierarchies hier ON h.hierarchy_id = hier.id
            WHERE h.sow_template_id = t.id
        ), '[]') AS hierarchy,
        COALESCE((
            SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', cf.custom_field_id,
                'value', cf.value,
                'custom_field_name', cus.name
            ))
            FROM sow_template_custom_fields cf 
            LEFT JOIN custom_fields cus ON cf.custom_field_id = cus.id
            WHERE cf.sow_template_id = t.id
        ), '[]') AS custom_fields,
        COALESCE((
            SELECT JSON_ARRAYAGG(JSON_OBJECT(
                'id', md.master_data_type_id,
                'master_data', md.master_data,
                'master_data_type_name', mt.name
            ))
            FROM sow_template_master_data md 
            LEFT JOIN master_data_type mt ON md.master_data_type_id = mt.id
            WHERE md.sow_template_id = t.id
        ), '[]') AS master_data
    FROM sow_templates t
    WHERE t.id = :id AND t.program_id = :program_id AND t.is_deleted = false
    LIMIT 1;
`;