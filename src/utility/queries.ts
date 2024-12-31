import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { MinMaxRateQueryParams } from "../interfaces/rate-card-configuration.interface";

export const getAllRateCardQuery = (hierarchyIdCount: number, jobTemplateIdCount: number, startDate: number | undefined,
    endDate: number | undefined) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    let jobTemplateIdCondition = jobTemplateIdCount > 0
        ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
        : '';
    return `
        SELECT
            rcc.*,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', j.id, 'name', j.template_name)) AS job_templates,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'rate', ex.rate,
                    'max_limit', ex.max_limit,
                    'unit_of_measure', ex.unit_of_measure,
                    'unit_lable', ex.unit_lable,
                    'expense_item_type_config', JSON_OBJECT('id', ex.expense_type_id, 'name', ec.type)
                )
            ) AS expenses
        FROM
            rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            hierarchies h ON h.id = hj.hierarchy_id
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        LEFT JOIN
            job_templates j ON j.id = jt.job_template_id
        LEFT JOIN
            JSON_TABLE(rcc.expenses, '$[*]' COLUMNS (
                expense_type_id CHAR(36) PATH '$.expense_type_id',
                rate DECIMAL(10,2) PATH '$.rate',
                max_limit DECIMAL(10,2) PATH '$.max_limit',
                unit_lable VARCHAR(255) PATH '$.unit_lable',
                unit_of_measure VARCHAR(255) PATH '$.unit_of_measure'
            )) AS ex
            ON ex.expense_type_id IS NOT NULL
        LEFT JOIN
            expense_item_type_config ec ON ec.id = ex.expense_type_id
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = :program_id
            AND (:name IS NULL OR rcc.name LIKE :name)
            AND (COALESCE(:is_enabled, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(:is_shift_rate, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
            ${startDate !== undefined && endDate !== undefined ? 'AND rcc.modified_on BETWEEN :startDate AND :endDate' : ''}
        GROUP BY
            rcc.id
        ORDER BY
            rcc.created_on DESC
        LIMIT :limit OFFSET :offset;
    `;
};

export const fetchProgramConfigValues = `
   SELECT

    COALESCE(MAX(CASE WHEN programs_config.key = 'default_currency' THEN programs_config.value END)) AS defaultCurrency,

    COALESCE(MAX(CASE WHEN programs_config.key = 'time_zone' THEN programs_config.value END)) AS timeZone,

    COALESCE(MAX(CASE WHEN programs_config.key = 'rate_model_for_program' THEN programs_config.value END)) AS rateModel,
     COALESCE(MAX(CASE WHEN programs_config.key = 'default_date_format' THEN programs_config.value END)) AS preferredDateFormat,
    programs_config.program_id

FROM programs_config

WHERE 

    programs_config.program_id =:programId

    AND programs_config.key IN ('default_currency', 'time_zone', 'rate_model_for_program','default_date_format')

GROUP BY programs_config.program_id

LIMIT 0, 1000;


`;
export const getCountQuery = (hierarchyIdCount: number, jobTemplateIdCount: number, startDate: number | undefined,
    endDate: number | undefined) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    let jobTemplateIdCondition = jobTemplateIdCount > 0
        ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
        : '';
    return `
        SELECT COUNT(DISTINCT rcc.id) AS total
        FROM rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = :program_id
            AND (:name IS NULL OR rcc.name LIKE :name)
            AND (COALESCE(:is_enabled, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(:is_shift_rate, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
            ${startDate !== undefined && endDate !== undefined ? 'AND rcc.modified_on BETWEEN :startDate AND :endDate' : ''}
    `;
};

export const rateCardQuery = `
SELECT
    rcc.*,
    IF(rcc.is_shift_rate = 1, true, false) AS is_shift_rate,
    GROUP_CONCAT(DISTINCT JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies,
    GROUP_CONCAT(DISTINCT JSON_OBJECT('id', j.id, 'name', j.template_name)) AS job_templates,
    JSON_ARRAYAGG(JSON_OBJECT(
        'rate', ex.rate,
        'max_limit', ex.max_limit,
        'unit_of_measure', ex.unit_of_measure,
        'unit_lable', ex.unit_lable,
        'expense_item_type_config', JSON_OBJECT('id', ec.id, 'name', ec.type)
    )) AS expenses
FROM
    rate_type_configurations rcc
LEFT JOIN JSON_TABLE(
    COALESCE(rcc.hierarchies, '[]'), '$[*]'
    COLUMNS (
        hierarchy_id CHAR(36) PATH '$'
    )
) AS hj ON hj.hierarchy_id IS NOT NULL
LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
LEFT JOIN JSON_TABLE(
    COALESCE(rcc.job_templates, '[]'), '$[*]'
    COLUMNS (
        job_template_id CHAR(36) PATH '$'
    )
) AS jt ON jt.job_template_id IS NOT NULL
LEFT JOIN job_templates j ON j.id = jt.job_template_id
LEFT JOIN JSON_TABLE(
    COALESCE(rcc.expenses, '[]'), '$[*]'
    COLUMNS (
        expense_type_id CHAR(36) PATH '$.expense_type_id',
        rate DECIMAL(10,2) PATH '$.rate',
        max_limit DECIMAL(10,2) PATH '$.max_limit',
        unit_lable VARCHAR(255) PATH '$.unit_lable',
        unit_of_measure VARCHAR(255) PATH '$.unit_of_measure'
    )
) AS ex ON ex.expense_type_id IS NOT NULL
LEFT JOIN expense_item_type_config ec ON ec.id = ex.expense_type_id
WHERE
    rcc.is_deleted = 0
    AND rcc.id = :id
GROUP BY
    rcc.id;
`;



export const programVendorQuery = (hasUserId: boolean, hasVendorId: boolean) => `
SELECT
  *
FROM
  program_vendors
WHERE
  program_vendors.program_id = :program_id
  ${hasUserId ? 'AND program_vendors.user_id = :user_id' : ''}
  ${hasVendorId ? 'AND program_vendors.id = :vendor_id' : ''};
`;

export const complianceDocumentGetByUserId = `
    SELECT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.modified_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcrm.next_expiry_on,
        vcd.uploaded_document,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', wl.id,
                    'name', wl.name
                )
            )
            FROM work_locations wl
            WHERE JSON_CONTAINS(vcd.work_locations, JSON_QUOTE(wl.id))
        ) AS work_location
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id
    WHERE
        pv.program_id = :program_id
        AND (pv.user_id IS NULL OR pv.user_id = :user_id)
`;

export const complianceDocumentGetByUserAndDocumentId = `
    SELECT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.modified_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcrm.next_expiry_on,
        vcd.uploaded_document,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', wl.id,
                    'name', wl.name
                )
            )
            FROM work_locations wl
            WHERE JSON_CONTAINS(vcd.work_locations, JSON_QUOTE(wl.id))
        ) AS work_location
    FROM
        program_vendors pv
    JOIN
      vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id
    WHERE
        pv.program_id = :program_id
        AND (pv.user_id IS NULL OR pv.user_id = :user_id)
        AND (:document_id IS NULL OR vcd.id = :document_id)
`;

export const complianceDocumentGetByVendorId = `
    SELECT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.modified_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcd.uploaded_document,
        vcrm.next_expiry_on,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', wl.id,
                    'name', wl.name
                )
            )
            FROM work_locations wl
            WHERE JSON_CONTAINS(vcd.work_locations, JSON_QUOTE(wl.id))
        ) AS work_location,
        pv.vendor_name
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id  -- Joining with mapping table
    WHERE
        pv.program_id = :program_id
        AND (pv.id IS NULL OR pv.id = :vendor_id)
        -- Added name filter condition
        AND (:name IS NULL OR vcd.name LIKE :name)
        -- Added is_enabled filter condition
        AND (:is_enabled IS NULL OR vcd.is_enabled LIKE :is_enabled)
    GROUP BY
        vcd.id, vcd.program_id, vcd.name, vcd.act, vcd.document_details, vcd.document_number,
        vcd.upload_document_days, vcd.attached_doc_url,
        vcd.created_on, vcd.modified_on, vcd.is_enabled, vcd.is_deleted, vcd.to_uploaded,
        vcd.no_of_days, vcd.uploaded_document, pv.vendor_name, vcrm.next_expiry_on  -- Add next_expiry_on in GROUP BY
    LIMIT :limit OFFSET :offset
`;

export const complianceDocumentCountByVendorId = `
    SELECT
        COUNT(DISTINCT vcd.id) AS total_count
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    WHERE
        pv.program_id = :program_id
        AND (:vendor_id IS NULL OR pv.id = :vendor_id)
`;

export const complianceDocumentGetByVendorAndDocumentId = `
    SELECT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.modified_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcrm.next_expiry_on,
        vcd.uploaded_document,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', wl.id,
                    'name', wl.name
                )
            )
            FROM work_locations wl
            WHERE JSON_CONTAINS(vcd.work_locations, JSON_QUOTE(wl.id))
        ) AS work_location,
        pv.vendor_name
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id
    WHERE
        pv.program_id = :program_id
        AND (pv.id IS NULL OR pv.id = :vendor_id)
        AND (:document_id IS NULL OR vcd.id = :document_id)
`;

export const complianceGroupQueryWithUserId = `
  SELECT
    vcd.id AS document_id,
    vcd.*
  FROM
    program_vendors pv
  JOIN
    vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
  LEFT JOIN
    vendor_compliance_documents vcd ON vcd.id = :document_id
  WHERE
    pv.program_id = :program_id
    AND pv.user_id = :user_id
   AND (vcd.id IS NULL OR vcd.id = :document_id)
  LIMIT 1;
`;

export const complianceGroupQueryWithVendorId = `
  SELECT
    vcd.id AS document_id,
    vcd.*
  FROM
    program_vendors pv
  JOIN
    vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
  LEFT JOIN
    vendor_compliance_documents vcd ON vcd.id = :document_id
  WHERE
    pv.program_id = :program_id
    AND pv.id = :vendor_id
   AND (vcd.id IS NULL OR vcd.id = :document_id)
  LIMIT 1;
`;

export const getComplianceDocuments = `
  SELECT
    vcd.*
  FROM
    program_vendors pv
  JOIN
   vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
  LEFT JOIN
    vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
  WHERE
    pv.program_id = :program_id
    AND pv.user_id = :user_id
`;

export const getHierarchieWithChildren = `
WITH RECURSIVE hierarchy_cte AS (
  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.name,
    h.is_enabled,
    h.preferred_date_format,
    h.rate_model,
    h.created_on,
    h.modified_on,
    h.code,
    h.program_id
  FROM hierarchies h
  WHERE h.program_id = :program_id
    AND h.parent_hierarchy_id IS NULL
    AND h.is_deleted = false

  UNION ALL

  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.name,
    h.is_enabled,
    h.preferred_date_format,
    h.rate_model,
    h.created_on,
    h.modified_on,
    h.code,
    h.program_id
  FROM hierarchies h
  INNER JOIN hierarchy_cte hc ON h.parent_hierarchy_id = hc.id
  WHERE h.is_deleted = false
)
SELECT *
FROM hierarchy_cte;
`;

export const getAllHierarchies = (hasName: boolean, hasIsEnabled: boolean, startDate?: number, endDate?: number) => `
WITH hierarchy_cte AS (
  SELECT
    h.id,
    h.name,
    h.code,
    h.parent_hierarchy_id,
    h.is_enabled,
    h.modified_on,
    h.program_id,
    h.is_deleted,
    ph.name AS parent_hierarchy_name -- Fetch parent hierarchy name
  FROM hierarchies h
  LEFT JOIN hierarchies ph
    ON h.parent_hierarchy_id = ph.id -- Self-join to get parent name
  WHERE h.program_id = :program_id
    AND h.is_deleted = false
    ${hasName ? 'AND h.name LIKE :name' : ''} -- Conditionally apply name filter
    ${hasIsEnabled ? 'AND h.is_enabled = :is_enabled' : ''}
    ${startDate !== undefined && endDate !== undefined ? 'AND h.modified_on BETWEEN :startDate AND :endDate' : ''}
)

SELECT *
FROM hierarchy_cte
ORDER BY
  CASE
    WHEN parent_hierarchy_id IS NULL THEN 0
    ELSE 1
  END, -- Sort parent hierarchies first
  id;
`;

// export const vendorDataQuery = `
// SELECT
//     pv.id,
//     pv.vendor_name,
//     pv.vendor_type,
//     pv.status,
//     pv.supl_ref_id,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', i.id,
//                 'name', i.name
//             )
//         )
//         FROM labour_category i
//         WHERE JSON_CONTAINS(pv.program_industry, JSON_QUOTE(i.id))
//     ) AS program_industry,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', wl.id,
//                 'name', wl.name
//             )
//         )
//         FROM work_locations wl
//         WHERE JSON_CONTAINS(pv.work_locations, JSON_QUOTE(wl.id))
//     ) AS work_locations,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', h.id,
//                 'name', h.name
//             )
//         )
//         FROM hierarchies h
//         WHERE JSON_CONTAINS(pv.hierarchies, JSON_QUOTE(h.id))
//     ) AS hierarchies,
//        CASE
//        WHEN pv.is_labour_category = 1 THEN TRUE
//         ELSE FALSE
//        END AS is_labour_category,
//     CASE
//        WHEN pv.all_work_locations = 1 THEN TRUE
//         ELSE FALSE
//        END AS all_work_locations,
//     CASE
//         WHEN pv.all_hierarchy = 1 THEN TRUE
//         ELSE FALSE
//        END AS all_hierarchy,
//     CASE
//         WHEN pv.all_job_type = 1 THEN TRUE
//         ELSE FALSE
//          END AS all_job_type,

//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', vg.id,
//                 'vendor_group_name', vg.vendor_group_name
//             )
//         )
//         FROM vendor_groups vg
//         WHERE JSON_CONTAINS(pv.vendor_group_id, JSON_QUOTE(vg.id))
//     ) AS vendor_group_id,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', vdg.id,
//                 'name', vdg.name
//             )
//         )
//         FROM vendor_document_groups vdg
//         WHERE JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
//     ) AS com_doc_group,
//     pv.bussiness_structure,
//     pv.job_type,
//     pv.program_id,
//     pv.tenant_id,
//     pv.is_enabled,
//     pv.description,
//     pv.company_website,
//     pv.establish_year,
//     pv.social_media,
//     pv.addresses,
//     pv.contact,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', vmc.id,
//                 'rate_model', vmc.rate_model,
//                 'sliding_scale', vmc.sliding_scale,
//                 'markups', vmc.markups,
//                 'work_locations', (
//                    SELECT JSON_OBJECT(
//                         'id', wl.id,
//                         'name', wl.name
//                     )
//                     FROM work_locations wl
//                     WHERE wl.id = vmc.work_locations
//                 ),
//                 'hierarchy', (
//                     SELECT JSON_OBJECT(
//                         'id', h.id,
//                         'name', h.name
//                     )
//                     FROM hierarchies h
//                     WHERE h.id = vmc.hierarchy
//                 ),
//                 'program_industry', (
//                      SELECT JSON_OBJECT(
//                         'id', i.id,
//                         'name', i.name
//                     )
//                     FROM labour_category i
//                     WHERE i.id = vmc.program_industry
//                 ),
//                 'is_enabled', vmc.is_enabled
//             )
//         )
//         FROM vendor_markup_config vmc
//         WHERE vmc.program_vendor_id = pv.id
//         ORDER BY
//             ((vmc.work_locations IS NULL) + (vmc.hierarchy IS NULL) + (vmc.program_industry IS NULL)) DESC
//     ) AS markup_config
// FROM program_vendors pv
// WHERE pv.id = :id
//   AND pv.program_id = :program_id;
// `;

export const vendorDataQuery = `
SELECT
    pv.id,
    pv.vendor_name,
    pv.vendor_type,
    pv.status,
    pv.supl_ref_id,
    pv.vendor_logo, -- Added vendor_logo here
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', i.id,
                'name', i.name
            )
        )
        FROM labour_category i
        WHERE JSON_CONTAINS(pv.program_industry, JSON_QUOTE(i.id))
    ) AS program_industry,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', wl.id,
                'name', wl.name
            )
        )
        FROM work_locations wl
        WHERE JSON_CONTAINS(pv.work_locations, JSON_QUOTE(wl.id))
    ) AS work_locations,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', h.id,
                'name', h.name
            )
        )
        FROM hierarchies h
        WHERE JSON_CONTAINS(pv.hierarchies, JSON_QUOTE(h.id))
    ) AS hierarchies,
    CASE
       WHEN pv.is_labour_category = 1 THEN TRUE
        ELSE FALSE
       END AS is_labour_category,
    CASE
       WHEN pv.all_work_locations = 1 THEN TRUE
        ELSE FALSE
       END AS all_work_locations,
    CASE
        WHEN pv.all_hierarchy = 1 THEN TRUE
        ELSE FALSE
       END AS all_hierarchy,
    CASE
        WHEN pv.all_job_type = 1 THEN TRUE
        ELSE FALSE
         END AS all_job_type,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', vg.id,
                'vendor_group_name', vg.vendor_group_name
            )
        )
        FROM vendor_groups vg
        WHERE JSON_CONTAINS(pv.vendor_group_id, JSON_QUOTE(vg.id))
    ) AS vendor_group_id,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', vdg.id,
                'name', vdg.name
            )
        )
        FROM vendor_document_groups vdg
        WHERE JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
    ) AS com_doc_group,
    pv.bussiness_structure,
    pv.job_type,
    pv.program_id,
    pv.tenant_id,
    pv.is_enabled,
    pv.description,
    pv.company_website,
    pv.establish_year,
    pv.social_media,
    pv.addresses,
    pv.contact,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', vmc.id,
                'rate_model', vmc.rate_model,
                'sliding_scale', vmc.sliding_scale,
                'markups', vmc.markups,
                'is_all_hierarchy', vmc.is_all_hierarchy = 1,
                'is_all_work_locations', vmc.is_all_work_locations = 1,
                'is_all_labor_category', vmc.is_all_labor_category = 1,
                'work_locations', (
                   SELECT JSON_OBJECT(
                        'id', wl.id,
                        'name', wl.name
                    )
                    FROM work_locations wl
                    WHERE wl.id = vmc.work_locations
                ),
                'hierarchy', (
                    SELECT JSON_OBJECT(
                        'id', h.id,
                        'name', h.name
                    )
                    FROM hierarchies h
                    WHERE h.id = vmc.hierarchy
                ),
                'program_industry', (
                     SELECT JSON_OBJECT(
                        'id', i.id,
                        'name', i.name
                    )
                    FROM labour_category i
                    WHERE i.id = vmc.program_industry
                ),
                'is_enabled', vmc.is_enabled
            )
        )
        FROM vendor_markup_config vmc
        WHERE vmc.program_vendor_id = pv.id
        ORDER BY
            ((vmc.work_locations IS NULL) + (vmc.hierarchy IS NULL) + (vmc.program_industry IS NULL)) DESC
    ) AS markup_config
FROM program_vendors pv
WHERE pv.id = :id
  AND pv.program_id = :program_id;
`;


export const foundationDataQuery = `
SELECT
    md.id,
    md.program_id,
    md.name,
    md.is_enabled,
    md.modified_on,
    md.code,
    md.foundational_data_type_id,
    md.depended_fields,
    t.id AS manager_id,
    t.first_name AS first_name,
    t.last_name AS last_name,
    mdt.name AS foundational_data_type_name
FROM
    master_data AS md
LEFT JOIN
    user AS t
    ON md.manager_id = t.id
LEFT JOIN
    master_data_type AS mdt
    ON md.foundational_data_type_id = mdt.id
WHERE
    md.program_id = :program_id
    AND md.is_deleted = 0
    AND (:id IS NULL OR md.id = :id)
    AND (:name IS NULL OR md.name LIKE :name)
    AND (:is_enabled IS NULL OR md.is_enabled = :is_enabled)
    AND (:modified_on_start IS NULL OR :modified_on_end IS NULL OR md.modified_on BETWEEN :modified_on_start AND :modified_on_end)
    AND (:manager_id IS NULL OR md.manager_id = :manager_id)
    AND (:code IS NULL OR md.code LIKE :code)
    AND (:foundational_data_type_id IS NULL OR md.foundational_data_type_id = :foundational_data_type_id)
    AND (:first_name IS NULL OR t.first_name LIKE :first_name)
ORDER BY
    md.created_on DESC
LIMIT
    :limit OFFSET :offset;
`;

export const countFoundationDataQuery = `
SELECT COUNT(DISTINCT md.id) AS total
FROM
    master_data AS md
LEFT JOIN
    user AS t
    ON md.manager_id = t.id
LEFT JOIN
    master_data_type AS mdt
    ON md.foundational_data_type_id = mdt.id
WHERE
    md.program_id = :program_id
    AND md.is_deleted = 0
    AND (:id IS NULL OR md.id = :id)
    AND (:name IS NULL OR md.name LIKE :name)
    AND (:is_enabled IS NULL OR md.is_enabled = :is_enabled)
    AND (:modified_on_start IS NULL OR :modified_on_end IS NULL OR md.modified_on BETWEEN :modified_on_start AND :modified_on_end)
    AND (:manager_id IS NULL OR md.manager_id = :manager_id)
    AND (:code IS NULL OR md.code LIKE :code)
    AND (:foundational_data_type_id IS NULL OR md.foundational_data_type_id = :foundational_data_type_id)
    AND (:first_name IS NULL OR t.first_name LIKE :first_name)
`;

export const existingPairQuery = `
    SELECT rate_type_configurations.id
    FROM rate_type_configurations,
         JSON_TABLE(rate_type_configurations.hierarchies, '$[*]' COLUMNS (hierarchy_id VARCHAR(255) PATH '$')) AS h,
         JSON_TABLE(rate_type_configurations.job_templates, '$[*]' COLUMNS (job_template_id VARCHAR(255) PATH '$')) AS j
    WHERE program_id = :program_id
      AND h.hierarchy_id IN (:hierarchies)
      AND j.job_template_id IN (:jobTemplates)
      AND is_deleted = false
    LIMIT 1
`;

export const getShiftTypesByHierarchiesQuery = `
    SELECT DISTINCT
        st.id AS shift_type_id,
        st.shift_type_name,
        st.shift_type_category,
        st.is_enabled,
        st.shift_type_time
    FROM
        shift_types st
    JOIN
        shift_type_configurations stc ON st.id = stc.shift_type_id
    JOIN
        shift_configuration_hierarchies sch ON stc.shift_config_id = sch.shift_config_id
    WHERE
        sch.hierarchy_id IN (:hierarchy_ids)  -- Use placeholders for dynamic values
    AND
        st.is_enabled = true
    AND
        st.is_deleted = false
    AND
        st.program_id = :program_id
`;

export const rateTypeConfigQuery = (hierarchyIdCount: number, jobTemplateIdCount: number) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    let jobTemplateIdCondition = jobTemplateIdCount > 0
        ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
        : '';

    return `
        SELECT DISTINCT
            REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[*].rate_type_name')), '[', ''), ']', '') AS rate_type_name
        FROM
            rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = :program_id
            AND (COALESCE(:is_enabled, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(:is_shift_rate, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
        AND JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[*].rate_type_name')) IS NOT NULL
        ORDER BY rate_type_name ASC;
    `;
};

export const shiftTypeConfigQuery = (hierarchyIdCount: number, jobTemplateIdCount: number) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    let jobTemplateIdCondition = jobTemplateIdCount > 0
        ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
        : '';
    return `
        SELECT DISTINCT
            JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[0].shift_type')) AS shift_type
        FROM
            rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = '0025d61f-1b53-43fc-951f-e8d19a4e1388'
            AND (COALESCE(NULL, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(NULL, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
        AND JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[0].shift_type')) IS NOT NULL
        ORDER BY shift_type ASC;
    `;
};

export const minMaxRateQuery = ({
    hierarchyIdsJSON,
    jobTemplateId,
    currency,
    unit_of_measure,
    programId,
    is_shift_rate
}: MinMaxRateQueryParams) => {
    const hierarchyIdsArray = typeof hierarchyIdsJSON === 'string'
        ? JSON.parse(hierarchyIdsJSON)
        : hierarchyIdsJSON;
    const isShiftRateValue = is_shift_rate ? '1' : '0';
    return `
    SELECT
        r.unit_of_measure,
        r.currency,
        MIN(r.min_rate) AS min_rate,
        MAX(r.max_rate) AS max_rate
    FROM rate_type_configurations rcc
    JOIN JSON_TABLE(
        rcc.rate_configuration,
        '$[*].rates[*].rate[*]' COLUMNS (
            unit_of_measure VARCHAR(255) PATH '$.unit_of_measure',
            currency VARCHAR(255) PATH '$.currency',
            min_rate DECIMAL(10, 2) PATH '$.min_rate',
            max_rate DECIMAL(10, 2) PATH '$.max_rate'
        )
    ) AS r
    WHERE r.unit_of_measure = '${unit_of_measure}'
      AND r.currency = '${currency}'
      AND JSON_OVERLAPS(rcc.hierarchies, JSON_ARRAY(${hierarchyIdsArray.map((id: string) => `"${id}"`).join(',')}))
      AND JSON_CONTAINS(rcc.job_templates, '"${jobTemplateId}"')
      AND rcc.program_id = '${programId}'
      AND rcc.is_shift_rate='${isShiftRateValue}'
    GROUP BY r.unit_of_measure, r.currency;
    `;
};

export const rateModelQuery = `
WITH RECURSIVE hierarchy_tree AS (
  -- Base case: Start with the selected hierarchies (including parent and child hierarchies)
  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.rate_model
  FROM
    hierarchies h
  WHERE
    h.id IN (:hierarchyIds)
    AND h.program_id = :programId

  UNION ALL

  -- Recursive case: Climb up the hierarchy by joining parents recursively
  SELECT
    parent_h.id,
    parent_h.parent_hierarchy_id,
    parent_h.rate_model
  FROM
    hierarchies parent_h
  JOIN
    hierarchy_tree ht ON parent_h.id = ht.parent_hierarchy_id
  WHERE
    parent_h.program_id = :programId
)

-- 1. First check: If two or more hierarchies share the same rate model, return that rate model
SELECT rate_model
FROM hierarchy_tree
GROUP BY rate_model
HAVING COUNT(DISTINCT id) >= 2  -- Ensure that at least two hierarchies have the same rate model

UNION ALL

-- Second query: If no common rate model, return the rate model of the common parent
SELECT rate_model
FROM (
  SELECT rate_model, id
  FROM hierarchy_tree
  ORDER BY id ASC  -- prioritize closest common parent (by id)
  LIMIT 1
) AS common_parent_rate_model


UNION ALL

-- 3. Third check: If no parent hierarchy is present, fallback to the rate model of the first available child hierarchy
SELECT rate_model
FROM (
  SELECT rate_model
  FROM hierarchy_tree
  WHERE parent_hierarchy_id IS NOT NULL
  ORDER BY rate_model
  LIMIT 1
) AS common_child_rate_model

LIMIT 1;
`;

export const getChildWorkflowsQuery = (hierarchyIdCount: number) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND h.id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    return `
    SELECT wf.id AS workflow_id,
           wf.name AS workflow_name,
           wf.created_on,
           wf.flow_type,
           wf.is_enabled,
           wf.placement_order,
           e.id AS event_id,
           e.name AS event_name,
           e.module_id,
           m.id AS module_id,
           m.name AS module_name,
           JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies
    FROM workflow_config wf
    LEFT JOIN event e ON wf.event_id = e.id
    LEFT JOIN module m ON wf.module = m.id
    LEFT JOIN JSON_TABLE(wf.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
      ON hj.hierarchy_id IS NOT NULL
    LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
    WHERE wf.program_id = :program_id
      AND wf.workflow_id = :workflow_id
      AND wf.flow_type = :flow_type
      AND wf.is_deleted = 0
      AND (:name IS NULL OR wf.name LIKE :name)
      AND (:is_enabled IS NULL OR wf.is_enabled = :is_enabled)
      ${hierarchyIdCondition}
    GROUP BY wf.id, wf.name, wf.created_on, e.id, e.name, m.id, m.name, wf.is_enabled
     ORDER BY wf.placement_order;
    `;
};

export const getparentWorkflowsQuery = (hierarchyIdCount: number) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND h.id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    return `
    SELECT wf.id AS workflow_id,
           wf.name AS workflow_name,
           wf.created_on,
           wf.flow_type,
           wf.is_enabled,
           wf.placement_order,
           e.id AS event_id,
           e.name AS event_name,
           e.module_id,
           m.id AS module_id,
           m.name AS module_name,
           JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies
    FROM workflow_config wf
    LEFT JOIN event e ON wf.event_id = e.id
    LEFT JOIN module m ON wf.module = m.id
    LEFT JOIN JSON_TABLE(wf.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
      ON hj.hierarchy_id IS NOT NULL
    LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
    WHERE wf.id = :workflow_id
      AND wf.program_id = :program_id
      AND wf.flow_type = :flow_type
      AND wf.is_deleted = 0
      AND (:name IS NULL OR wf.name LIKE :name)
      AND (:is_enabled IS NULL OR wf.is_enabled = :is_enabled)
      ${hierarchyIdCondition}
    GROUP BY wf.id, wf.name, wf.created_on, e.id, e.name, m.id, m.name, wf.is_enabled
    ORDER BY wf.placement_order;
    `;
};

export const countChildWorkflowsQuery = (hierarchyIdCount: number) => {
    let hierarchyIdCondition = hierarchyIdCount > 0
        ? `AND h.id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
        : '';
    return `
    SELECT COUNT(DISTINCT wf.id) AS total_workflows
    FROM workflow_config wf
    LEFT JOIN module m ON wf.module = m.id
    LEFT JOIN JSON_TABLE(wf.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
      ON hj.hierarchy_id IS NOT NULL
    LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
    WHERE wf.program_id = :program_id
      AND wf.flow_type = :flow_type
      AND wf.workflow_id = :workflow_id
      AND wf.is_deleted = 0
      AND (:name IS NULL OR wf.name LIKE :name)
      AND (:is_enabled IS NULL OR wf.is_enabled = :is_enabled)
      ${hierarchyIdCondition};
    `;
};

export const programVendorAdvancedFilter = (
    hasQueryName: boolean,
    hasCountry: boolean,
    hierarchyIdsArray: string[],
    laborCategoryIdsArray: string[],
    workLocationIdsArray: string[],
    jobtypeIdsArray: string[]
) => {
    const hierarchyIdsClause = hierarchyIdsArray.length
        ? `AND (${hierarchyIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.hierarchies, JSON_QUOTE(:hierarchy_ids${index}), '$')`).join(' OR ')})`
        : '';

    const laborCategoryIdsClause = laborCategoryIdsArray.length
        ? `AND (${laborCategoryIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.program_industry, JSON_QUOTE(:labor_category_id${index}), '$')`).join(' OR ')})`
        : '';

    const workLocationIdsClause = workLocationIdsArray.length
        ? `AND (${workLocationIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.work_locations, JSON_QUOTE(:work_location_id${index}), '$')`).join(' OR ')})`
        : '';

    const jobTypeIdsClause = jobtypeIdsArray.length
        ? `AND (${jobtypeIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.job_type, JSON_QUOTE(:job_type${index}), '$')`).join(' OR ')})`
        : '';

    const countryClause = hasCountry
        ? `AND JSON_UNQUOTE(JSON_EXTRACT(program_vendors.addresses, '$[0].country')) = :country_id`
        : '';

    return `
        SELECT
            program_vendors.*,
            JSON_ARRAYAGG(
                JSON_OBJECT('id', hierarchies.id, 'name', hierarchies.name)
            ) AS hierarchies  -- Aggregate hierarchies into a JSON array
        FROM
            program_vendors
        LEFT JOIN
            hierarchies ON JSON_VALID(program_vendors.hierarchies)
            AND JSON_CONTAINS(program_vendors.hierarchies, JSON_QUOTE(CAST(hierarchies.id AS CHAR)))
        WHERE
            program_vendors.is_deleted = false
            AND program_vendors.program_id = :program_id
            ${hasQueryName ? 'AND program_vendors.vendor_name LIKE :vendor_name' : ''}
            ${hierarchyIdsClause}
            ${laborCategoryIdsClause}
            ${workLocationIdsClause}
            ${jobTypeIdsClause}
            ${countryClause}
        GROUP BY
            program_vendors.id
        ORDER BY
            program_vendors.id ASC
        LIMIT :limit
        OFFSET :offset;
    `;
};

export const vendorFilterQueryBuilder = (
    hierarchyIdsArray: string[],
    laborCategoryIdsArray: string[],
    workLocationIdsArray: string[]
) => {
    const hierarchyIdsClause = hierarchyIdsArray.length
        ? `AND (${hierarchyIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.hierarchies, JSON_QUOTE(:hierarchy_ids${index}), '$')`).join(' OR ')})`
        : '';

    const laborCategoryIdsClause = laborCategoryIdsArray.length
        ? `AND (${laborCategoryIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.program_industry, JSON_QUOTE(:labor_category_id${index}), '$')`).join(' OR ')})`
        : '';

    const workLocationIdsClause = workLocationIdsArray.length
        ? `AND (${workLocationIdsArray.map((_, index) =>
            `JSON_CONTAINS(program_vendors.work_locations, JSON_QUOTE(:work_location_id${index}), '$')`).join(' OR ')})`
        : '';

    return `
        SELECT
            program_vendors.*
        FROM
            program_vendors
        WHERE
            program_vendors.is_deleted = false
            AND program_vendors.program_id = :program_id
            AND status = 'Active'
            ${hierarchyIdsClause}
            ${laborCategoryIdsClause}
            ${workLocationIdsClause}
    `;
};


export const hierarchyDetailsQuery = `
SELECT
  h.id,
  h.name,
  h.parent_hierarchy_id,
  parent_h.name AS parent_name,
  h.rate_model AS rate
FROM
  hierarchies h
LEFT JOIN
  hierarchies parent_h ON h.parent_hierarchy_id = parent_h.id
WHERE
  h.id IN (:hierarchyIds)
  AND h.program_id = :programId
`;

export const parentRateModelQuery = `
          SELECT *
          FROM hierarchies
          WHERE id IN (:parentIds)
          AND program_id = :programId
          LIMIT 1
        `;

export const getWorkLocationTimeZoneByUserId = `
        SELECT
          JSON_ARRAYAGG(
               JSON_OBJECT(
                  'work_location_id', work_locations.id,
                  'work_location_name', work_locations.name
              )
          ) AS work_location,
          JSON_ARRAYAGG(
               JSON_OBJECT(
                  'time_zone_id', time_zones.id,
                  'time_zone_name', time_zones.name
              )
          ) AS time_zone
        FROM
          user
        LEFT JOIN
          work_locations ON (
            JSON_CONTAINS(user.work_location_ids, JSON_QUOTE(work_locations.id))
          )
        LEFT JOIN
          time_zones ON user.time_zone_id = time_zones.id
        WHERE
          user.id IN (:user_ids) AND user.program_id = :program_id
      `;

export const getMasterDataForHeirarchiesQuery = () => {
    return `
        SELECT
            h.id AS hierarchy_id,
            h.name AS hierarchy_name,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', fdt.id,
                    'name', fdt.name,
                    'user_association_exclude', JSON_EXTRACT(fdt.configuration, '$.user_association_exclude'),
                    'value', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id', fd.id,
                                'name', fd.name
                            )
                        )
                        FROM master_data fd
                        WHERE fd.foundational_data_type_id = fdt.id AND fd.is_enabled = 1
                    )
                )
            ) AS master_data
        FROM hierarchies h
        LEFT JOIN hierarchies_master_data hmd ON h.id = hmd.hierarchy_id
        LEFT JOIN master_data_type fdt ON hmd.foundation_data_type_id = fdt.id
        WHERE h.id IN (:hierarchy_ids) AND fdt.is_enabled = 1
        GROUP BY h.id, h.name
    `;
};
export const masterDataQuery = `
    SELECT
      h.*,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', fdt.id,
          'name', fdt.name
        )
      ) AS foundational_data,
      ph.name AS parent_hierarchy_name
    FROM
      hierarchies h
    LEFT JOIN
      hierarchies_master_data hmd
      ON h.id = hmd.hierarchy_id
    LEFT JOIN
      master_data_type fdt
      ON hmd.foundation_data_type_id = fdt.id
    LEFT JOIN
      hierarchies ph
      ON h.parent_hierarchy_id = ph.id
    WHERE
      h.id = :hierarchy_id
    GROUP BY
      h.id, ph.name;
`;


export const getAllExpenseConfigHierarchies = `
  SELECT
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'id', unique_hierarchies.id,
        'name', unique_hierarchies.name
      )
    ) AS hierarchies_d
  FROM (
    SELECT DISTINCT
      h.id,
      h.name
    FROM
      expense_configuration AS ec
    LEFT JOIN
      hierarchies AS h ON JSON_CONTAINS(ec.hierarchy, JSON_QUOTE(CAST(h.id AS CHAR)))
    WHERE
      ec.program_id = :program_id -- Use the program_id passed as a parameter
  ) AS unique_hierarchies;
`;

export const configAdvancedFilter = (
    hasConfigName: boolean,
    hasStatus: boolean,
    hasModifiedOn: boolean,
    hierarchyIdsArray: string[]
) => {
    const hierarchyIdsClause = hierarchyIdsArray.length
        ? `AND ${hierarchyIdsArray.map((_, index) => `JSON_CONTAINS(expense_type_hierarchies.hierarchy, JSON_QUOTE(:hierarchy_ids${index}), '$')`).join(' AND ')}`
        : '';

    return `
      SELECT
        config.id,
        config.config_name,
        config.status,
        config.modified_on,
        JSON_ARRAYAGG(
          JSON_OBJECT('id', hierarchies.id, 'name', hierarchies.name)
        ) AS hierarchies
      FROM
        expense_configuration AS config
      LEFT JOIN
      expense_type_hierarchies on config.id =expense_type_hierarchies.expense_config_id
      LEFT JOIN 
      hierarchies on expense_type_hierarchies.hierarchy = hierarchies.id
      WHERE
        config.is_deleted = false
        AND config.program_id = :program_id
        ${hasConfigName ? 'AND config.config_name LIKE :config_name' : ''}
        ${hasStatus ? 'AND config.status = :status' : ''}
        ${hasModifiedOn ? 'AND config.modified_on = :modified_on' : ''}
        ${hierarchyIdsClause}
      GROUP BY
        config.id, config.config_name, config.status, config.modified_on
      ORDER BY
        config.modified_on DESC
      LIMIT :limit
      OFFSET :offset;
    `;
};

export const getAllExpenseTypeByHierarchies = (
    hierarchyCondition: string,
    isEnabled: boolean | null
): string => {
    const isEnabledCondition = isEnabled !== null ? `AND ec.is_enabled = ${isEnabled}` : "";
    return `
      WITH HierarchyMatches AS (
        SELECT ec.id AS expense_config_id
        FROM expense_configuration ec
        WHERE ec.program_id = :program_id
        AND (${hierarchyCondition})
        ${isEnabledCondition}
        LIMIT 1
      )
      SELECT et.*
      FROM expense_item_type_config et
      JOIN HierarchyMatches hm ON et.expense_config_id = hm.expense_config_id
      WHERE et.program_id = :program_id;
    `;
};

export const resonCode = `
SELECT 
    reason_codes.id,
    reason_codes.program_id,
    reason_codes.event_id,
    reason_codes.module_id,
    reason_codes.reason,
    event.name AS event_name,
    module.name AS module_name
FROM reason_codes
INNER JOIN event ON reason_codes.event_id = event.id
INNER JOIN module ON reason_codes.module_id = module.id
WHERE reason_codes.program_id = :program_id
AND (:module_name IS NULL OR module.name LIKE :module_name)
AND (:event_name IS NULL OR event.name LIKE :event_name);
`;

export const timesheetConfigAdvancedFilter = (
    hasId: boolean,
    hasQueryName: boolean,
    hierarchyIdsArray: string[],
    laborCategoryIdsArray: string[],
    startDate: number | undefined,
    endDate: number | undefined,
    newStartDate: number | undefined,
    newEndDate: number | undefined,
    hasIsEnabled: boolean
) => {
    const hierarchyIdsClause = hierarchyIdsArray.length ?
        `INNER JOIN JSON_TABLE(timesheet_type_config.hierarchies, '$[*]' COLUMNS(hierarchy_id VARCHAR(255) PATH '$')) AS hierarchyTable 
    ON hierarchyTable.hierarchy_id IN (${hierarchyIdsArray.map((_, index) => `:hierarchy_id${index}`).join(', ')})` : ''

    const laborCategoryClause = laborCategoryIdsArray.length ?
        `INNER JOIN JSON_TABLE(timesheet_type_config.labor_category, '$[*]' COLUMNS(labor_category_id VARCHAR(255) PATH '$')) AS labourTable 
    ON labourTable.labor_category_id IN (${laborCategoryIdsArray.map((_, index) => `:labor_category_id${index}`).join(', ')})` : ''

    return `
      SELECT
        timesheet_type_config.*,
        COUNT(timesheet_type_config.id) OVER () AS total_count
      FROM
        timesheet_type_config
      ${hierarchyIdsClause}
      ${laborCategoryClause}
      WHERE
        timesheet_type_config.is_deleted = false
        AND timesheet_type_config.program_id = :program_id
        ${hasId ? 'AND timesheet_type_config.id = :id' : ''}
        ${hasQueryName ? 'AND timesheet_type_config.title LIKE :title' : ''}
        ${startDate !== undefined && endDate !== undefined ? 'AND timesheet_type_config.created_on BETWEEN :startDate AND :endDate' : ''}
        ${newStartDate !== undefined && newEndDate !== undefined ? 'AND timesheet_type_config.modified_on BETWEEN :newStartDate AND :newEndDate' : ''}
        ${hasIsEnabled ? 'AND timesheet_type_config.is_enabled = :is_enabled' : ''}
      GROUP BY
        timesheet_type_config.id
      ORDER BY
        timesheet_type_config.id ASC
      LIMIT :limit
      OFFSET :offset;
    `;
};

export const getMasterData = `
SELECT 
 JSON_OBJECT(
     'id',hierarchies.id,
     'name',hierarchies.name
     )AS hierarchy,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'master_data_type', JSON_OBJECT(
                'id', master_data_type.id,
                'name', master_data_type.name
            ),
            'foundational_data_ids', (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', md1.id,
                        'name', md1.name
                    )
                )
                FROM master_data AS md1
                WHERE JSON_CONTAINS(user_master_data.foundation_data_ids, JSON_QUOTE(md1.id), '$')
            ),
            'default_master_data', JSON_OBJECT(
                'id', md2.id,
                'name', md2.name
            ),
            'is_associated', TRUE
        )
    ) AS master_data
FROM 
    user_master_data
LEFT JOIN 
    master_data_type ON user_master_data.foundation_data_type_id = master_data_type.id
LEFT JOIN 
    hierarchies ON user_master_data.hierarchy_id = hierarchies.id
LEFT JOIN 
    master_data AS md2 ON user_master_data.default_master_data = md2.id
WHERE 
    user_master_data.user_id = :id
GROUP BY 
    hierarchies.id, hierarchies.name, master_data_type.id, master_data_type.name, md2.id, md2.name
`;

export const getAllRateTypes = (
    hasName: boolean,
    hasId: boolean,
    hasIsEnabled: boolean,
    isShiftRateValue: boolean,
    isBaseRate: boolean,
    hasDifferentialOn: boolean,
    hasRateTypeCategory: boolean,
    hasShiftType: boolean,
    startDate?: number,
    endDate?: number,
    limit?: number,
    offset?: number
) => `
      WITH rate_type AS (
        SELECT
          rt.id,
          rt.name,
          rt.program_id,
          rt.is_enabled,
          rt.is_shift_rate,
          rt.abbreviation,
          rt.is_base_rate,
          rt.rate,
          rt.modified_on,
          COUNT(*) OVER() AS total_records,
          CASE 
            WHEN shift_types.id IS NULL THEN NULL
            ELSE JSON_OBJECT(
                'id', shift_types.id,
                'name', shift_types.shift_type_name
            )
          END AS shift_type,
          CASE 
            WHEN picklistitems.id IS NULL THEN NULL
            ELSE JSON_OBJECT(
              'id', picklistitems.picklist_id,
              'label', picklistitems.label,
              'value', picklistitems.value
            )
          END AS rate_type_category,
          JSON_EXTRACT(rt.rate, '$[0].differential_on') AS differential_on
        FROM rate_type rt
        LEFT JOIN shift_types 
          ON rt.shift_type = shift_types.id
        LEFT JOIN picklistitems 
          ON rt.rate_type_category = picklistitems.id
        WHERE rt.program_id = :program_id
          AND rt.is_deleted = false
          ${hasId ? "AND rt.id = :id" : ""}
          ${hasName ? "AND rt.name LIKE CONCAT('%', :name, '%')" : ""}
          ${hasIsEnabled ? "AND rt.is_enabled = :is_enabled" : ""}
          ${isShiftRateValue ? "AND rt.is_shift_rate = :is_shift_rate" : ""}
          ${isBaseRate ? "AND rt.is_base_rate = :is_base_rate" : ""}
          ${hasDifferentialOn
        ? "AND JSON_EXTRACT(rt.rate, '$[0].differential_on') LIKE CONCAT('%', :differential_on, '%')"
        : ""
    }
          ${hasRateTypeCategory
        ? "AND picklistitems.label LIKE CONCAT('%', :rate_type_category, '%')"
        : ""
    }
          ${hasShiftType
        ? "AND shift_types.shift_type_name LIKE CONCAT('%', :shift_type, '%')"
        : ""
    }
          ${startDate !== undefined && endDate !== undefined
        ? "AND rt.modified_on BETWEEN :startDate AND :endDate"
        : ""
    }
        GROUP BY 
          rt.id, 
          rt.name, 
          rt.program_id, 
          rt.is_enabled, 
          rt.is_shift_rate, 
          rt.abbreviation, 
          rt.is_base_rate, 
          rt.rate, 
          rt.modified_on, 
          picklistitems.picklist_id, 
          picklistitems.label, 
          picklistitems.value
      )
      SELECT *
      FROM rate_type
      ORDER BY modified_on DESC 
      LIMIT :limit OFFSET :offset;
    `;

export const getExpenseType = `
   SELECT 
    ec.config_name,
    ec.id AS expense_config_id,
    ec.program_id,
    et.name AS expense_type_name,
    et.category AS expense_type_category,
    et.apply_msp_fee,
    et.appply_tax,
    et.allow_unit_based,
    et.id AS expense_type_id,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', h.id,
            'name', h.name
        )
    ) AS hierarchy
FROM expense_configuration ec
LEFT JOIN expense_type_mapping etm ON ec.id = etm.expense_config_id
LEFT JOIN expense_item_type_config et ON etm.expense_type_id = et.id
LEFT JOIN expense_type_hierarchies eth ON ec.id = eth.expense_config_id
LEFT JOIN hierarchies h ON eth.hierarchy = h.id
WHERE ec.program_id =:program_id
  AND ec.id =:id
GROUP BY ec.id, et.id;
`
export const getAllExpenseTypeHierarchy = `
SELECT 
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', h.id,
            'name', h.name
        )
    ) AS hierarchy
FROM expense_configuration ec
INNER JOIN expense_type_hierarchies eth ON ec.id = eth.expense_config_id
INNER JOIN hierarchies h ON eth.hierarchy = h.id
WHERE ec.program_id = :program_id
 AND ec.id=ec.id;
`;

export const getAllRateConfigurationsQuery = async (replacements: any) => {
    let whereConditions = `rc.is_deleted = 0 AND rc.program_id = :program_id`;

    if (replacements.name) {
        whereConditions += ` AND rc.name LIKE CONCAT('%', :name, '%')`;
    }
    if (replacements.is_enabled !== undefined) {
        whereConditions += ` AND rc.is_enabled = :is_enabled`;
    }
    if (replacements.is_shift_rate !== undefined) {
        whereConditions += ` AND rc.is_shift_rate = :is_shift_rate`;
    }
    if (replacements.startDate && replacements.endDate) {
        whereConditions += ` AND rc.modified_on BETWEEN :startDate AND :endDate`;
    }

    const sqlQuery = `
      SELECT 
        rc.id AS rate_configuration_id,
        rc.name,
        rc.is_enabled,
        rc.is_shift_rate,
        rc.created_on,
        rc.modified_on,
        h.hierarchies,
        jt.job_templates,
        rt.base_rates
      FROM 
        rate_configurations AS rc
      LEFT JOIN (
        SELECT rch.rate_configuration_id, JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies
        FROM rate_configuration_hierarchies AS rch
        LEFT JOIN hierarchies AS h ON rch.hierarchy_id = h.id
        GROUP BY rch.rate_configuration_id
      ) AS h ON h.rate_configuration_id = rc.id
      LEFT JOIN (
        SELECT rcjt.rate_configuration_id, JSON_ARRAYAGG(JSON_OBJECT('id', jt.id, 'name', jt.template_name)) AS job_templates
        FROM rate_configuration_job_templates AS rcjt
        LEFT JOIN job_templates AS jt ON rcjt.job_template_id = jt.id
        GROUP BY rcjt.rate_configuration_id
      ) AS jt ON jt.rate_configuration_id = rc.id
      LEFT JOIN (
        SELECT rcbt.rate_configuration_id, JSON_ARRAYAGG(JSON_OBJECT('id', rt.id, 'name', rt.name)) AS base_rates
        FROM rate_configuration_base_rate_types AS rcbt
        LEFT JOIN rate_type AS rt ON rcbt.rate_type_id = rt.id
        GROUP BY rcbt.rate_configuration_id
      ) AS rt ON rt.rate_configuration_id = rc.id
      WHERE ${whereConditions}
      ORDER BY rc.created_on DESC
      LIMIT :limit OFFSET :offset;
    `;

    return await sequelize.query(sqlQuery, {
        replacements,
        type: QueryTypes.SELECT,
    });
};