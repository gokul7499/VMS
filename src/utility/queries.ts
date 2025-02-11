import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { MinMaxRateQueryParams } from "../interfaces/rate-card-configuration.interface";
import { databaseConfig } from '../config/db';
const auth_db = databaseConfig.config.database_auth;

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
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
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
        (SELECT COUNT(*)
         FROM program_vendors pv_count
         JOIN vendor_document_groups vdg_count ON JSON_CONTAINS(pv_count.com_doc_group, JSON_QUOTE(vdg_count.id))
         LEFT JOIN vendor_compliance_documents vcd_count ON JSON_CONTAINS(vdg_count.required_documents, JSON_QUOTE(vcd_count.id))
         LEFT JOIN vendor_compliance_req_doc_mappings vcrm_count ON vcd_count.id = vcrm_count.required_document_id
         WHERE pv_count.program_id = :program_id AND (pv_count.user_id IS NULL OR pv_count.user_id = :user_id)
        ) AS total_count
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id
    WHERE
        pv.program_id = :program_id
        AND (pv.user_id IS NULL OR pv.user_id = :user_id)
        AND (:name IS NULL OR vcd.name LIKE :name)
        AND (:is_enabled IS NULL OR vcd.is_enabled = :is_enabled)
    LIMIT :page_size
    OFFSET :offset;
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
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
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
        vcrm.next_expiry_on,
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
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
        pv.display_name
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
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
        vcd.uploaded_document,
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
    h.default_date_format,
    h.rate_model,
    h.created_on,
    h.modified_on,
    h.code,
    h.program_id,
    h.support_email,
    h.default_timezone,
    h.is_hide_candidate_img,
    h.default_language,
    h.default_currency,
    h.default_time_format
  FROM hierarchies h
  WHERE h.program_id = :program_id
    AND h.parent_hierarchy_id IS NULL
    AND h.is_deleted = false
    AND h.is_enabled = true
  UNION ALL

  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.name,
    h.is_enabled,
    h.default_date_format,
    h.rate_model,
    h.created_on,
    h.modified_on,
    h.code,
    h.program_id,
    h.support_email,
    h.default_timezone,
    h.is_hide_candidate_img,
    h.default_language,
    h.default_currency,
    h.default_time_format
  FROM hierarchies h
  INNER JOIN hierarchy_cte hc ON h.parent_hierarchy_id = hc.id
  WHERE h.is_deleted = false AND h.is_enabled = true
)
SELECT *
FROM hierarchy_cte;
`;

export const getAllHierarchies = (
  hasName: boolean,
  hasIsEnabled: boolean,
  startDate?: number,
  endDate?: number
) => `
WITH hierarchy_cte AS (
  SELECT
    h.id,
    h.name,
    h.code,
    h.parent_hierarchy_id,
    h.is_enabled,
    h.modified_on,
    h.created_on, -- Include created_on
    h.program_id,
    h.is_deleted,
    h.is_not_editable,
    ph.name AS parent_hierarchy_name -- Fetch parent hierarchy name
  FROM hierarchies h
  LEFT JOIN hierarchies ph
    ON h.parent_hierarchy_id = ph.id -- Self-join to get parent name
  WHERE h.program_id = :program_id
    AND h.is_deleted = false
    ${hasName ? 'AND h.name LIKE :name' : ''} -- Conditionally apply name filter
    ${hasIsEnabled ? 'AND h.is_enabled = :is_enabled' : ''}
    ${startDate !== undefined && endDate !== undefined
    ? 'AND h.modified_on BETWEEN :startDate AND :endDate'
    : ''
  }
),
total_count_cte AS (
  SELECT COUNT(*) AS total_count FROM hierarchy_cte
)

SELECT
  h.*,
  (SELECT total_count FROM total_count_cte) AS total_count
FROM hierarchy_cte h
ORDER BY
  CASE
    WHEN h.parent_hierarchy_id IS NULL THEN 0
    ELSE 1
  END, -- Sort parent hierarchies first
  h.created_on ASC, -- Sort by created_on in ascending order
  h.id
LIMIT :limit OFFSET :offset;
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
    pv.display_name,
    pv.vendor_type,
    pv.status,
    pv.supl_ref_id,
    pv.is_job_auto_opt_in,
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

export const parentHierarchyDetailsQuery = `
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
    h.id IN (:parentHierarchyIds)
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
                  'time_zone_name', user.time_zone_id
              )
          ) AS time_zone
        FROM
          user
        LEFT JOIN
          work_locations ON (
            JSON_CONTAINS(user.work_location_ids, JSON_QUOTE(work_locations.id))
          )
        WHERE
          user.user_id IN (:user_ids) AND user.program_id = :program_id
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
        h.id,
        h.parent_hierarchy_id,
        h.name,
        h.is_enabled,
        h.rate_model,
        h.created_on,
        h.modified_on,
        h.code,
        h.is_deleted,
        h.program_id,
        h.default_date_format,
        h.default_time_format,
        h.default_language,
        h.is_vendor_neutral_program,
        h.is_hide_candidate_img,
        h.manage_tax,
        h.manage_adjustment,
        h.custom_fields,
        h.default_timezone,
        h.default_currency,
        h.unit_of_measure,
        h.support_email,
        h.is_not_editable,
        JSON_OBJECT(
            'id', uom.id,
            'name', uom.label
        ) AS default_unit_of_measure,
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
    LEFT JOIN
        picklistitems uom
        ON JSON_UNQUOTE(JSON_EXTRACT(h.unit_of_measure, '$[0].id')) = uom.id
    WHERE
        h.id = :hierarchy_id
    GROUP BY
        h.id, ph.name, uom.id, uom.label
    LIMIT 0, 1000;
`;

export const getAllExpenseConfigHierarchies = `
 SELECT
  ec.program_id,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', h.id,
      'name', h.name
    )
  ) AS hierarchy
FROM expense_configuration ec
LEFT JOIN expense_type_hierarchies eth ON ec.id = eth.expense_config_id
LEFT JOIN hierarchies h ON eth.hierarchy = h.id
WHERE ec.program_id = :program_id
GROUP BY ec.program_id
LIMIT 0, 1000;
`;

export const configAdvancedFilter = (
  hasConfigName: boolean,
  hasStatus: boolean,
  hasModifiedOn: boolean,
  hasIsEnabled: boolean,
  hierarchyIdsArray: string[],
  modifiedOnArray: string[] | undefined
) => {
  const hierarchyIdsClause = hierarchyIdsArray.length
    ? `AND ec.id IN (
          SELECT expense_config_id
          FROM expense_type_hierarchies
          WHERE expense_type_hierarchies.hierarchy IN (${hierarchyIdsArray.map((_, index) => `:hierarchy${index}`).join(', ')})
        )`
    : '';

  const modifiedOnClause = modifiedOnArray && modifiedOnArray.length
    ? `AND ec.modified_on IN (${modifiedOnArray.map((_, index) => `:modified_on${index}`).join(', ')})`
    : '';

  return `
    SELECT
      ec.id AS expense_config_id,
      ec.config_name,
      ec.program_id,
      ec.is_enabled,
      ec.modified_on,
      ec.status,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', h.id,
            'name', h.name
          )
        )
        FROM expense_type_hierarchies
        LEFT JOIN hierarchies h ON expense_type_hierarchies.hierarchy = h.id
        WHERE expense_type_hierarchies.expense_config_id = ec.id
      ) AS hierarchy,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'expense_type_name', et.name,
          'expense_type_category', et.category,
          'apply_msp_fee', et.apply_msp_fee,
          'apply_tax', et.appply_tax,
          'allow_unit_based', et.allow_unit_based,
          'expense_type_id', et.id
        )
      ) AS expense_item_type_config
    FROM
      expense_configuration ec
    LEFT JOIN expense_type_mapping etm ON ec.id = etm.expense_config_id
    LEFT JOIN expense_item_type_config et ON etm.expense_type_id = et.id
    WHERE
      ec.is_deleted = false
      AND ec.program_id = :program_id
      ${hasConfigName ? 'AND ec.config_name LIKE :config_name' : ''}
      ${hasStatus ? 'AND ec.status = :status' : ''}
      ${hasIsEnabled ? 'AND ec.is_enabled = :is_enabled' : ''}
      ${hasModifiedOn && modifiedOnArray && modifiedOnArray.length ? modifiedOnClause : ''}
      ${hierarchyIdsClause}
    GROUP BY
      ec.id, ec.config_name, ec.program_id, ec.is_enabled
    ORDER BY
      ec.modified_on DESC
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
  hasTitle: boolean,
  hierarchyIdsArray: string[],
  laborCategoryIdsArray: string[],
  hasTimesheetRuleGroup: boolean,
  hasTimesheetFormat: boolean,
  hasAllocationMethod: boolean,
  hasIsEnabled: boolean
) => {
  const hierarchyIdsClause = hierarchyIdsArray.length
    ? `INNER JOIN JSON_TABLE(timesheet_type_config.hierarchies, '$[*]' COLUMNS(hierarchy_id VARCHAR(255) PATH '$')) AS hierarchyTable
       ON hierarchyTable.hierarchy_id IN (${hierarchyIdsArray.map((_, index) => `:hierarchy_id${index}`).join(', ')})`
    : '';

  const laborCategoryClause = laborCategoryIdsArray.length
    ? `INNER JOIN JSON_TABLE(timesheet_type_config.labor_category, '$[*]' COLUMNS(labor_category_id VARCHAR(255) PATH '$')) AS laborTable
       ON laborTable.labor_category_id IN (${laborCategoryIdsArray.map((_, index) => `:labor_category_id${index}`).join(', ')})`
    : '';

  return `
      SELECT
        timesheet_type_config.*,
        COUNT(timesheet_type_config.id) OVER () AS total_count,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', h.id, 'name', h.name)
          )
          FROM hierarchies h
          WHERE JSON_CONTAINS(timesheet_type_config.hierarchies, JSON_QUOTE(h.id))
        ) AS hierarchies,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', lc.id, 'name', lc.name)
          )
          FROM labour_category lc
          WHERE JSON_CONTAINS(timesheet_type_config.labor_category, JSON_QUOTE(lc.id))
        ) AS labor_category,
        JSON_OBJECT('id', trg.id, 'name', trg.rule_group_name) AS timesheet_rule_group
      FROM
        timesheet_type_config
      LEFT JOIN timesheet_expense_rule_groups trg ON timesheet_type_config.timesheet_rule_group = trg.id
      ${hierarchyIdsClause}
      ${laborCategoryClause}
      WHERE
        timesheet_type_config.is_deleted = false
        AND timesheet_type_config.program_id = :program_id
        ${hasId ? 'AND timesheet_type_config.id = :id' : ''}
        ${hasTitle ? 'AND timesheet_type_config.title LIKE :title' : ''}
        ${hasIsEnabled ? 'AND timesheet_type_config.is_enabled = :is_enabled' : ''}
        ${hasTimesheetRuleGroup ? 'AND timesheet_type_config.timesheet_rule_group = :timesheet_rule_group' : ''}
        ${hasTimesheetFormat ? 'AND timesheet_type_config.timesheet_format = :timesheet_format' : ''}
        ${hasAllocationMethod ? 'AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(timesheet_type_config.allocations, "$.allocation_method"))) = LOWER(:allocation_method)' : ''}
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
        'master_data', JSON_OBJECT(
            'id', master_data_type.id,
            'name', master_data_type.name,
            'configuration',master_data_type.configuration
        ),
        'associated_master_data', (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', md1.id,
                    'name', md1.name
                )
            )
            FROM master_data AS md1
            WHERE JSON_CONTAINS(user_master_data.associated_master_data, JSON_QUOTE(md1.id), '$')
        ),
        'default_master_data', JSON_OBJECT(
            'id', md2.id,
            'name', md2.name
        ),
        'is_all_associated', user_master_data.is_all_associated=1
    ) AS foundational_data
FROM
    user_master_data
LEFT JOIN
    master_data_type ON user_master_data.master_data = master_data_type.id
LEFT JOIN
    master_data AS md2 ON user_master_data.default_master_data = md2.id
WHERE
    user_master_data.user_id = :user_id;
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
  hasRateTypeCategoryLabels: boolean,
  hasAbbreviation: boolean,
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
            'id', picklistitems.id,
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
    : ""}
        ${hasRateTypeCategory ? "AND rt.rate_type_category = :rate_type_category" : ""}
        ${hasRateTypeCategoryLabels ? "AND picklistitems.value IN (:rate_type_category_labels)" : ""}
        ${hasAbbreviation ? "AND rt.abbreviation LIKE CONCAT('%', :abbreviation, '%')" : ""}
        ${hasShiftType ? "AND rt.shift_type = :shift_type" : ""}
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

export const rateTypeTotalCount = `
  SELECT count(*) AS total_records
  FROM rate_type
  WHERE program_id = :program_id AND is_deleted = false
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
    ec.id AS config_id,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', h.id,
            'name', h.name
        )
    ) AS hierarchy
  FROM expense_configuration ec
  LEFT JOIN expense_type_hierarchies eth ON ec.id = eth.expense_config_id
  LEFT JOIN hierarchies h ON eth.hierarchy = h.id
  WHERE ec.program_id = :program_id
  GROUP BY ec.id

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
  if (replacements.job_template_id) {
    whereConditions += ` AND rc.id IN (
          SELECT DISTINCT rcjt.rate_configuration_id
          FROM rate_configuration_job_templates AS rcjt
          WHERE rcjt.job_template_id = :job_template_id
      )`;
  }
  if (replacements.hierarchy_id) {
    whereConditions += ` AND rc.id IN (
          SELECT DISTINCT rch.rate_configuration_id
          FROM rate_configuration_hierarchies AS rch
          WHERE rch.hierarchy_id = :hierarchy_id
      )`;
  }
  if (replacements.rate_type) {
    whereConditions += ` AND rc.id IN (
          SELECT DISTINCT rcbr.rate_configuration_id
          FROM rate_configuration_base_rate_types AS rcbr
          WHERE rcbr.rate_type_id = :rate_type
      )`;
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
      SELECT rcbt.rate_configuration_id, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', rt.id, 
            'name', rt.name,
            'rate_types', (
              SELECT JSON_ARRAYAGG(JSON_OBJECT('id', rt2.id, 'name', rt2.name))
              FROM rate_configuration_rate_types AS rcrt
              JOIN rate_type AS rt2 ON rcrt.rate_type_id = rt2.id
              WHERE rcrt.base_rate_type_id = rcbt.id
            )
          )
        ) AS base_rates
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

export const sameRateConfiguration = `
    SELECT rc.id
    FROM rate_configurations rc
    JOIN rate_configuration_hierarchies rh ON rc.id = rh.rate_configuration_id
    JOIN rate_configuration_job_templates rjt ON rc.id = rjt.rate_configuration_id
    WHERE rc.program_id = :program_id
    AND rh.hierarchy_id IN (:hierarchies)
    AND rjt.job_template_id IN (:job_templates)
    `;

export const rateConfigHierarchiesAndJobTemplates = `
    WITH RateConfigurations AS (
      SELECT
        id AS rate_configuration_id
      FROM
        rate_configurations
      WHERE
        program_id = :program_id
    ),
    HierarchiesData AS (
      SELECT
        rh.hierarchy_id
      FROM
        rate_configuration_hierarchies rh
      JOIN
        RateConfigurations rc ON rh.rate_configuration_id = rc.rate_configuration_id
    ),
    JobTemplatesData AS (
      SELECT
        rjt.job_template_id
      FROM
        rate_configuration_job_templates rjt
      JOIN
        RateConfigurations rc ON rjt.rate_configuration_id = rc.rate_configuration_id
    ),
    RateTypesData AS (
      SELECT DISTINCT
        rbrt.rate_type_id,
        rt.name AS rate_name
      FROM
        rate_configuration_base_rate_types rbrt
      JOIN
        rate_type rt ON rbrt.rate_type_id = rt.id
      JOIN
        RateConfigurations rc ON rbrt.rate_configuration_id = rc.rate_configuration_id
    )
    SELECT DISTINCT
      h.id AS hierarchy_id,
      h.name AS hierarchy_name,
      jt.id AS job_template_id,
      jt.template_name AS job_template_name,
      rtd.rate_type_id AS rate_id,
      rtd.rate_name AS rate_name
    FROM
      hierarchies h
    LEFT JOIN
      HierarchiesData hd ON h.id = hd.hierarchy_id
    LEFT JOIN
      job_templates jt ON jt.id IN (SELECT job_template_id FROM JobTemplatesData)
    LEFT JOIN
      RateTypesData rtd ON rtd.rate_type_id IS NOT NULL
    WHERE
      hd.hierarchy_id IS NOT NULL;
`;

export const rateTypeShiftAndRate = `
    WITH RateTypeData AS (
      SELECT
        rt.shift_type,
        rt.rate_type_category
      FROM
        rate_type rt
      WHERE
        rt.program_id = :program_id
    ),
    ShiftTypeDetails AS (
      SELECT
        st.id AS shift_type_id,
        st.shift_type_name AS shift_type_name
      FROM
        shift_types st
      JOIN
        RateTypeData rtd ON rtd.shift_type = st.id
    ),
    RateTypeCategoryDetails AS (
      SELECT
        pi.id AS rate_type_category_id,
        pi.value AS rate_type_category_value
      FROM
        picklistitems pi
      JOIN
        RateTypeData rtd ON rtd.rate_type_category = pi.id
    )
    SELECT
      st.shift_type_id AS shift_id,
      st.shift_type_name AS shift_name,
      rt.rate_type_category_id AS rate_type_id,
      rt.rate_type_category_value AS rate_type_value
    FROM
      ShiftTypeDetails st
    LEFT JOIN
      RateTypeCategoryDetails rt ON st.shift_type_id = rt.rate_type_category_id
    UNION
    SELECT
      st.shift_type_id AS shift_id,
      st.shift_type_name AS shift_name,
      rt.rate_type_category_id AS rate_type_id,
      rt.rate_type_category_value AS rate_type_value
    FROM
      ShiftTypeDetails st
    RIGHT JOIN
      RateTypeCategoryDetails rt ON st.shift_type_id = rt.rate_type_category_id;
  `;

export const getExpenseTypeAndRateType = `
  SELECT
    timesheet_expense_rules.id,
    CASE
      WHEN COUNT(expense_item_type_config.id) = 0 THEN NULL
      ELSE JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', expense_item_type_config.id,
          'name', expense_item_type_config.name
        )
      )
    END AS expense_line_item,
    CASE
      WHEN COUNT(rate_type.id) = 0 THEN NULL
      ELSE JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', rate_type.id,
          'name', rate_type.name,
          'abbreviation', rate_type.abbreviation
        )
      )
    END AS expense_rate_type
  FROM
    timesheet_expense_rules
  LEFT JOIN
    expense_item_type_config
    ON JSON_CONTAINS(
      timesheet_expense_rules.expense_line_item,
      JSON_QUOTE(expense_item_type_config.id),
      '$'
    )
  LEFT JOIN
    rate_type
    ON JSON_CONTAINS(
      timesheet_expense_rules.apply_rate_type,
      JSON_QUOTE(rate_type.id),
      '$'
    )
  WHERE
    timesheet_expense_rules.program_id = :program_id
    AND timesheet_expense_rules.is_deleted = false
  GROUP BY
    timesheet_expense_rules.id;
  `;
export const getQuery = () => `
    SELECT
        (SELECT id FROM currencies WHERE name = :currencyName LIMIT 1) AS currency,
        (SELECT id FROM language WHERE name = :languageName LIMIT 1) AS language,
        (SELECT id FROM time_zones WHERE name = :timeZoneName LIMIT 1) AS timeZone,
        (SELECT id FROM picklistitems WHERE label = :rateModelLabel LIMIT 1) AS rateModel,
        (SELECT id FROM picklistitems WHERE label = :unitOfMeasureLabel LIMIT 1) AS unitOfMeasure
`;

export const hierarchie = `
    SELECT
        h.id,
        h.parent_hierarchy_id,
        h.name,
        h.is_enabled,
        h.rate_model,
        h.created_on,
        h.modified_on,
        h.code,
        h.is_deleted,
        h.program_id,
        h.default_date_format,
        h.default_time_format,
        h.default_language,
        h.is_vendor_neutral_program,
        h.is_hide_candidate_img,
        h.manage_tax,
        h.manage_adjustment,
        h.default_timezone,
        h.default_currency,
        h.unit_of_measure,
        h.support_email,
        h.is_not_editable,
        JSON_OBJECT(
            'id', uom.id,
            'name', uom.label
        ) AS default_unit_of_measure,
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', custom_fields.id,
                    'name', custom_fields.name,
                    'value', JSON_UNQUOTE(JSON_EXTRACT(hierarchies_custom_field.value, '$'))
                )
            )
            FROM hierarchies_custom_field
            LEFT JOIN custom_fields ON hierarchies_custom_field.customfield_id = custom_fields.id
            WHERE hierarchies_custom_field.hierarchy_id = h.id
        ), JSON_ARRAY()) AS custom_fields
    FROM
        hierarchies h
    LEFT JOIN
        picklistitems uom
        ON JSON_UNQUOTE(JSON_EXTRACT(h.unit_of_measure, '$[0].id')) = uom.id
    WHERE
        h.id = :hierarchy_id
    LIMIT 0, 1000;
`;


export const getExpenseByHierarchy = (hierarchy_ids: string[]) => {
  const hierarchyCondition = hierarchy_ids.length > 0
    ? `AND eth.hierarchy IN (${hierarchy_ids.map(() => '?').join(',')})`
    : '';

  return `
   SELECT DISTINCT
    eic.*
   FROM
    expense_type_hierarchies eth
   LEFT JOIN
    expense_type_mapping etm ON eth.expense_config_id = etm.expense_config_id
   INNER JOIN
    expense_item_type_config eic ON etm.expense_type_id = eic.id
   WHERE
    eic.program_id =?
     ${hierarchyCondition}
    `;
};

export const getWorklocation = `
SELECT
    wl.program_id,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', c.id,
            'name', c.name
        )
    ) AS countries
FROM (
    SELECT DISTINCT
        work_locations.program_id,
        work_locations.country_id
    FROM work_locations
    WHERE work_locations.program_id = :program_id
) AS wl
LEFT JOIN countries c ON wl.country_id = c.id
GROUP BY wl.program_id;`


export const userQuery = (
  first_name?: string,
  email?: string,
  tenant_id?: string,
  role_id?: string,
  is_activated?: string,
  user_type?: string,
  status?: string,
  user_id?: string,
  hierarchy_id?: string[]
) => `
WITH user_data AS (
  SELECT u.id,
         u.user_id,
         u.username,
         u.last_name,
         u.middle_name,
         u.first_name,
         u.name_suffix,
         u.program_id,
         u.email,
         u.created_on,
         u.modified_on,
         u.avatar,
         u.language_id,
         u.is_enabled,
         u.is_deleted,
         u.is_activated,
         u.user_type,
         u.is_associated,
         u.supervisor,
         MAX(CASE
             WHEN JSON_LENGTH(u.contacts) > 0 THEN u.contacts
             ELSE JSON_ARRAY(
               JSON_OBJECT(
                 'label', '',
                 'number', '',
                 'isd_code', '',
                 'max_phone_length', 0,
                 'min_phone_length', 0,
                 'phoneFormatCountry', ''
               )
             )
         END) AS contacts,
         MAX(CASE
             WHEN JSON_LENGTH(u.applications) > 0 THEN u.applications
             ELSE JSON_ARRAY()
         END) AS applications,
         u.name_prefix,
         u.role_id,
         u.title,
         u.sso_id,
         MAX(CASE WHEN JSON_LENGTH(u.addresses) > 0 THEN u.addresses ELSE JSON_ARRAY() END) AS addresses,
         u.time_zone_id,
         MAX(CASE WHEN u.is_allow_unlimited_authority = 1 THEN true ELSE false END) AS is_allow_unlimited_authority,
         MAX(CASE WHEN u.is_all_work_location_associate = 1 THEN true ELSE false END) AS is_all_work_location_associate,
         MAX(CASE WHEN u.is_all_hierarchy_associate = 1 THEN true ELSE false END) AS is_all_hierarchy_associate,
         MAX(um.id) as user_mapping_id,  -- Aggregate um.id
         MAX(u.status) AS status,
         JSON_OBJECT(
             'id', u.user_id,
             'first_name', u.first_name,
             'last_name', u.last_name
         ) AS supervisor_id,
         (
             SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', h.id, 'name', h.name)
             )
             FROM hierarchies h
             WHERE JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(h.id))
         ) AS associate_hierarchy_ids,
         (
             SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', wl.id, 'name', wl.name)
             )
             FROM work_locations wl
             WHERE JSON_CONTAINS(u.work_location_ids, JSON_QUOTE(wl.id))
         ) AS work_location_ids,
         COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', custom_fields.id,
                    'name', custom_fields.name,
                    'value', JSON_UNQUOTE(JSON_EXTRACT(user_custom_fields.value, '$'))
                )
            )
            FROM user_custom_fields
            LEFT JOIN custom_fields ON user_custom_fields.customfield_id = custom_fields.id
            WHERE user_custom_fields.user_id = u.id
        ), JSON_ARRAY()) AS custom_fields,
         JSON_OBJECT('id', dh.id, 'name', dh.name) AS default_hierarchy_id,
         JSON_OBJECT('id', dwl.id, 'name', dwl.name) AS default_work_location_id,
         JSON_OBJECT('id', c.id, 'name', c.name) AS countries,
         JSON_OBJECT('id', t.id, 'name', t.name) AS tenant_id
  FROM user u
  LEFT JOIN hierarchies dh ON u.default_hierarchy_id = dh.id
  LEFT JOIN work_locations dwl ON u.default_work_location_id = dwl.id
  LEFT JOIN countries c ON u.country_id = c.id
  LEFT JOIN tenant t ON u.tenant_id = t.id
  LEFT JOIN user_mappings um ON u.user_id = um.user_id
  WHERE u.is_deleted = false AND u.program_id = :program_id
    ${user_id ? 'AND u.user_id = :user_id' : ''} 
    ${user_type ? 'AND u.user_type = :user_type' : ''} 
    ${status ? 'AND u.status = :status' : ''} 
    ${typeof is_activated === 'string' ? 'AND u.is_activated = :is_activated' : ''} 
    ${role_id ? 'AND u.role_id = :role_id' : ''} 
    ${tenant_id ? 'AND u.tenant_id = :tenant_id' : ''} 
    ${email ? 'AND u.email = :email' : ''} 
    ${first_name ? 'AND u.first_name = :first_name' : ''} 
    ${hierarchy_id && hierarchy_id.length > 0
    ? `AND (${hierarchy_id
      .map((_, index) => `JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(:hierarchy_id_${index}))`)
      .join(' OR ')})`
    : ''}
  GROUP BY u.id, dh.id, dwl.id, c.id, t.id
)
SELECT *, (SELECT COUNT(*) FROM user_data) AS total_count
FROM user_data
ORDER BY modified_on DESC
LIMIT :limit OFFSET :offset;

`;

export const userHierarchiesQuery = (user_id?: string, hierarchy_id?: string[]) => `
WITH user_data AS (
  SELECT u.id,
         u.username,
         u.first_name,
         u.last_name,
         u.email,
         u.program_id,
         u.is_activated,
         u.created_on,
         u.modified_on,
         (
             SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', h.id, 'name', h.name)
             )
             FROM hierarchies h
             WHERE JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(h.id))
         ) AS associate_hierarchy_ids
  FROM user u
  WHERE u.is_deleted = false AND u.program_id = :program_id
    ${user_id ? 'AND u.user_id = :user_id' : ''}
    ${hierarchy_id && hierarchy_id.length > 0
    ? `AND (${hierarchy_id
      .map((_, index) => `JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(:hierarchy_id_${index}))`)
      .join(' OR ')})`
    : ''
  }
  GROUP BY u.id
)
SELECT *
FROM user_data
ORDER BY modified_on DESC;
`;

export const getPendingUserQuery = `
  SELECT
    invitation.*,
    invitation.user_email AS email,
    invitation.is_allow_unlimited_autherity AS is_allow_unlimited_authority,
    invitation.updated_at AS created_on,
    invitation.created_at AS created_at,
    user_group_mapping.user_type AS user_type,
    user_group_mapping.last_name,
    user_group_mapping.first_name,
    user_group_mapping.middle_name,
    'pending' AS status,
    JSON_OBJECT(
      'id', tenant.id,
      'name', tenant.name
    ) AS tenant_id,
    JSON_OBJECT(
      'id', countries.id,
      'name', countries.name
    ) AS countries,
    JSON_OBJECT(
      'id', hierarchies.id,
      'name', hierarchies.name
    ) AS default_hierarchy_id,
    JSON_OBJECT(
      'id', work_locations.id,
      'name', work_locations.name
    ) AS default_work_location_id,
    JSON_OBJECT(
      'id', user.user_id,
      'first_name', user.first_name,
      'last_name',user.last_name
    ) AS supervisor_id,
    IF(
      invitation.avatar IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.url')) IS NULL,
      JSON_OBJECT(),
      JSON_OBJECT(
        'url', JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.url')),
        'text', JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.color.text')),
        'color', JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.color.color'))
      )
    ) AS avatar,
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', hierarchies.id,
          'name', hierarchies.name
        )
      )
      FROM hierarchies
      WHERE JSON_CONTAINS(invitation.associate_hierarchy_ids, JSON_QUOTE(hierarchies.id))
    ), JSON_ARRAY()) AS associate_hierarchy_ids,
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', work_locations.id,
          'name', work_locations.name
        )
      )
      FROM work_locations
      WHERE JSON_CONTAINS(invitation.work_location_ids, JSON_QUOTE(work_locations.id))
    ), JSON_ARRAY()) AS work_location_ids,
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'master_data', JSON_OBJECT(
            'id', JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.master_data')),
            'name', mdt.name,
            'configuration', mdt.configuration
          ),
  'is_all_associated', JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.is_all_associated')) = 'true',

          'default_master_data', JSON_OBJECT(
            'id', JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.default_master_data')),
            'name', default_mdt.name
          ),
          'associated_master_data', (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', associated_mdt.id,
                'name', associated_mdt.name
              )
            )
            FROM master_data AS associated_mdt
            WHERE JSON_CONTAINS(JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.associated_master_data')), JSON_QUOTE(associated_mdt.id))
          )
        )
      )
      FROM (
        SELECT JSON_UNQUOTE(JSON_EXTRACT(invitation.foundational_data, '$[0]')) AS value
        UNION ALL
        SELECT JSON_UNQUOTE(JSON_EXTRACT(invitation.foundational_data, '$[1]')) AS value
        UNION ALL
        SELECT JSON_UNQUOTE(JSON_EXTRACT(invitation.foundational_data, '$[2]')) AS value
        -- Add more UNION ALL statements if you expect more entries
      ) AS fd
      JOIN master_data_type AS mdt ON JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.master_data')) = mdt.id
      JOIN master_data AS default_mdt ON JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.default_master_data')) = default_mdt.id
    ), JSON_ARRAY()) AS foundational_data
FROM ${auth_db}.invitation
JOIN ${auth_db}.user_group_mapping ON user_group_mapping.id = invitation.user_mapping_id
LEFT JOIN tenant ON invitation.tenant_id = tenant.id
LEFT JOIN countries ON invitation.country_id = countries.id
LEFT JOIN hierarchies ON invitation.default_hierarchy_id = hierarchies.id
LEFT JOIN work_locations ON invitation.default_work_location_id = work_locations.id
LEFT JOIN ${auth_db}.user ON invitation.supervisor = user.user_id
WHERE invitation.program_id = :program_id
AND (:user_mapping_id IS NULL OR invitation.user_mapping_id = :user_mapping_id)
GROUP BY invitation.id
LIMIT 0, 1000;
`;


export const vendorMarkup = `
  SELECT
        vmc.markups,
        vmc.rate_model
    FROM
        vendor_markup_config vmc
    WHERE
        vmc.program_id = :program_id
        AND vmc.program_vendor_id = :vendor_id
        AND (
            (:rateModel LIKE CONCAT(vmc.rate_model, '%') AND vmc.program_industry = :labour_category_id AND vmc.hierarchy = :hierarchy_id)
            OR
            (:rateModel LIKE CONCAT(vmc.rate_model, '%') AND vmc.program_industry = :labour_category_id AND vmc.is_all_hierarchy = 1)
            OR
            (:rateModel LIKE CONCAT(vmc.rate_model, '%') AND vmc.hierarchy = :hierarchy_id AND vmc.is_all_labor_category = 1)
            OR
            (:rateModel LIKE CONCAT(vmc.rate_model, '%') AND vmc.is_all_labor_category = 1 AND vmc.is_all_work_locations = 1 AND vmc.is_all_hierarchy = 1)
        )
    ORDER BY
        -- Prioritize by exact industry and location matches
        CASE
          WHEN vmc.program_industry = :labour_category_id AND vmc.hierarchy = :hierarchy_id THEN 1
          ELSE 2
        END,
        -- Fallback: Prioritize rows where all categories, locations, and hierarchy are set to 1
        CASE
          WHEN vmc.is_all_labor_category = 1 AND vmc.is_all_work_locations = 1 AND vmc.is_all_hierarchy = 1 THEN 3
          ELSE 1
        END,
        -- Additional sorting logic if needed
        CASE
          WHEN vmc.program_industry = :labour_category_id THEN 1
          ELSE 2
        END,
        CASE
          WHEN vmc.hierarchy = :hierarchy_id THEN 1
          ELSE 2
        END
    LIMIT 1;
`;

export const fetchTimesheetExpenseRuleGroups = async (
  programId: string,
  ruleCategory?: string,
  ruleGroupName?: string,
  ruleType?: string,
  isEnabled?: string,
  limit: number = 10,
  offset: number = 0,
  order: string = 'created_on DESC'
) => {
  const searchConditions: string[] = ['tsg.is_deleted = FALSE'];

  if (programId) {
    searchConditions.push(`tsg.program_id = "${programId}"`);
  }

  if (ruleCategory) {
    searchConditions.push(`tsg.rule_category = "${ruleCategory}"`);
  }

  if (ruleGroupName) {
    searchConditions.push(`tsg.rule_group_name LIKE "%${ruleGroupName}%"`);
  }

  if (isEnabled !== undefined) {
    searchConditions.push(`tsg.is_enabled = ${isEnabled === 'true'}`);
  }

  if (ruleType) {
    const ruleTypeNames = ruleType.split(',').map((type) => type.trim());
    const ruleTypeCondition = ruleTypeNames
      .map((type) => `FIND_IN_SET("${type}", (
          SELECT GROUP_CONCAT(DISTINCT ter.rule_type SEPARATOR ', ')
          FROM timesheet_expense_rules ter
          JOIN timesheet_expense_rule_mapping erm ON erm.expense_rule_id = ter.id
          WHERE erm.expense_rule_group_id = tsg.id
      ))`)
      .join(' OR ');
    searchConditions.push(`(${ruleTypeCondition})`);
  }

  const whereClause = searchConditions.length ? `WHERE ${searchConditions.join(' AND ')}` : '';

  const query = `
  SELECT
      tsg.*,
      COALESCE(
          (
              SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                      'id', ter.id,
                      'rule_name', ter.rule_name
                  )
              )
              FROM timesheet_expense_rules ter
              JOIN timesheet_expense_rule_mapping erm ON erm.expense_rule_id = ter.id
              WHERE erm.expense_rule_group_id = tsg.id
          ),
          JSON_ARRAY()
      ) AS timesheet_expense_rules,
      COALESCE(
          (
              SELECT GROUP_CONCAT(DISTINCT ter.rule_type SEPARATOR ', ')
              FROM timesheet_expense_rules ter
              JOIN timesheet_expense_rule_mapping erm ON erm.expense_rule_id = ter.id
              WHERE erm.expense_rule_group_id = tsg.id
          ),
          ''
      ) AS rule_type,
      COUNT(*) OVER() AS total_count
  FROM timesheet_expense_rule_groups tsg
  ${whereClause}
  ORDER BY ${order}
  LIMIT ${limit}
  OFFSET ${offset};
  `;

  const [ruleGroups] = await sequelize.query(query) as any[];
  const totalRecords = ruleGroups.length > 0 ? ruleGroups[0].total_count : 0;

  return { ruleGroups, totalRecords };
};

export const rateCardMinRateMaxRate = `
  WITH rate_card_matches AS (
    SELECT
      rc.id AS rate_card_id
    FROM
      rate_card rc
    WHERE
      rc.labor_category_id = :labor_category_id
      AND rc.program_id = :program_id
  ),
  primary_matches AS (
    SELECT
      d.id,
      d.rate_card_id,
      d.rate_type_id,
      d.min_rate,
      d.max_rate,
      d.hierarchy_id,
      d.job_template_id,
      d.unit_of_measure,
      d.currency
    FROM
      rate_card_decision_table d
    JOIN
      rate_card_matches rcm ON d.rate_card_id = rcm.rate_card_id
    WHERE
      (d.hierarchy_id IN (:hierarchyIds) OR d.hierarchy_id IS NULL)
      AND (d.job_template_id IN (:jobTemplateIds) OR d.job_template_id IS NULL)
      AND (d.unit_of_measure = :unit_of_measure OR d.unit_of_measure IS NULL)
      AND (d.currency = :currency_id OR d.currency IS NULL)
  ),
  fallback_matches AS (
    SELECT
      d.id,
      d.rate_card_id,
      d.rate_type_id,
      d.min_rate,
      d.max_rate,
      NULL AS hierarchy_id,
      d.job_template_id,
      d.unit_of_measure,
      d.currency
    FROM
      rate_card_decision_table d
    WHERE
      d.hierarchy_id IS NULL
      AND d.job_template_id IN (:jobTemplateIds)
      AND d.unit_of_measure = :unit_of_measure
      AND d.currency = :currency_id
  )
  SELECT *
  FROM primary_matches
  UNION ALL
  SELECT *
  FROM fallback_matches
  WHERE NOT EXISTS (SELECT 1 FROM primary_matches);
`;

export const allNullRate = `
WITH rate_card_matches AS (
  SELECT
      rc.id AS rate_card_id
  FROM
      rate_card rc
  WHERE
      rc.labor_category_id = :labor_category_id
      AND rc.program_id = :program_id
)
SELECT
  rcdt.min_rate,
  rcdt.max_rate
FROM
  rate_card_decision_table rcdt
INNER JOIN
  rate_card_matches rcm
ON
  rcdt.rate_card_id = rcm.rate_card_id
WHERE
  rcdt.hierarchy_id IS NULL
  AND rcdt.job_template_id IS NULL
  AND rcdt.unit_of_measure IS NULL
  AND rcdt.rate_type_id IS NULL
  AND rcdt.currency IS NULL`;

export const getInvoiceConfigByHierarchyId = `
    SELECT *
    FROM invoice_config
    WHERE program_id = :program_id
      AND JSON_CONTAINS(hierarchy_ids, :hierarchy_ids);
`;

export const getActiveUsers = `
SELECT
    user.id,
    user.user_id,
    user.first_name,
    user.last_name,
    user.associate_hierarchy_ids,
    user.program_id,
    user.is_enabled,
    user.user_type,
    user.status
FROM
    user
WHERE
    user.program_id = :program_id
    AND (:user_id IS NULL OR user.id = :user_id)
    AND user.is_enabled = true
    AND user.user_type = 'client'
    AND LOWER(user.status) = 'active'
    AND (:hierarchy_id IS NULL OR
        JSON_CONTAINS(user.associate_hierarchy_ids, :hierarchy_id)
    )
`;

export const getUserContacts = `
SELECT
    user.id,
    user.user_id,
    user.first_name,
    user.last_name,
    user.tenant_id,
    tenant.name AS tenant_name,
    user.email
FROM
    user
LEFT JOIN tenant ON user.tenant_id = tenant.id
WHERE
    (:tenant_id IS NULL OR user.tenant_id = :tenant_id)
`;

export async function getUserPrograms(replacements: any) {
  const userProgramsQuery = `
    SELECT DISTINCT
      programs.id,
      programs.industries,
      programs.unique_id,
      programs.name,
      programs.type,
      programs.config,
      programs.msp_id,
      programs.start_date,
      programs.is_activated,
      programs.display_name,
      programs.client_id,
      tenant.id AS client_id,
      tenant.name AS client_name,
      tenant.logo AS logo
    FROM
      user_mappings
    LEFT JOIN programs ON user_mappings.program_id = programs.id
    LEFT JOIN tenant tenant ON programs.client_id = tenant.id  -- Join with Tenant table
    WHERE
      user_mappings.user_id = :user_id
      ${replacements.search ? `AND (programs.name LIKE :search OR tenant.name LIKE :search)` : ''}
  `;

  try {
    const data = await sequelize.query(userProgramsQuery, {
      replacements,
      type: QueryTypes.SELECT,
    });
    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export const sameFeesConfig = `
    SELECT fees.id
    FROM fees
    WHERE fees.program_id = :program_id
    AND JSON_CONTAINS(fees.hierarchy_levels, :hierarchies)
    AND JSON_CONTAINS(fees.labor_category, :labor_category)
`;

export const sameHierarchieRateConfiguration = `
    SELECT rc.id
    FROM rate_configurations rc
    JOIN rate_configuration_hierarchies rh ON rc.id = rh.rate_configuration_id
    JOIN rate_configuration_job_templates rjt ON rc.id = rjt.rate_configuration_id
    WHERE rc.program_id = :program_id
    AND rc.id <> :id
    AND rh.hierarchy_id IN (:hierarchies)
    AND rjt.job_template_id IN (:job_templates)
    `;
