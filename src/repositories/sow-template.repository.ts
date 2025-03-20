export const getSowTemplatesQuery = (whereClause: string) => `
SELECT 
    t.id,
    t.program_id,
    t.type,
    t.template_title,
    t.description,
    t.code,
    t.created_on,
    t.updated_on,
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
        SELECT JSON_OBJECT(
            'id', p.id,
            'label', p.label
        )
        FROM dev_vms_configurator.picklistitems p
        WHERE p.id = t.type
        LIMIT 1
    ), NULL) AS picklist_items
FROM sow_templates t
WHERE ${whereClause}
ORDER BY t.created_on DESC
LIMIT :limit OFFSET :offset;
`;

export const getSowTemplatesCountQuery = (whereClause: string) => `
    SELECT COUNT(*) AS total 
    FROM sow_templates t
    WHERE ${whereClause};
`;



export const getSowTemplateByIdQuery = `
   SELECT 
    t.id,
    t.code,
    t.type,
    t.template_title,
    t.description,
    t.is_sow_assignment,
    t.is_sow_expense,
    t.is_sow_milestones,
    t.is_sow_payment_req,
    t.is_sow_schedule_payments,
    t.is_sow_desc_mandatory,
    t.upload_description,
    t.is_update_sow_desc,
    t.is_req_doc_mandatory,
    t.is_deleted,
    t.program_id,
    t.created_by,
    t.updated_by,
    t.created_on,
    t.updated_on,
    -- Existing hierarchy, custom_fields, and master_data
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
    ), '[]') AS master_data,
 COALESCE((
        SELECT JSON_OBJECT(
            'id', p.id,
            'label', p.label
        )
        FROM dev_vms_configurator.picklistitems p
        WHERE p.id = t.type
        LIMIT 1
    ), NULL) AS picklist_items
FROM sow_templates t
WHERE t.id = :id AND t.program_id = :program_id AND t.is_deleted = false
LIMIT 1;
`;