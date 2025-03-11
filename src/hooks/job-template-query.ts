import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { databaseConfig } from "../config/db";

const config_db = databaseConfig.config.database;

class JobTempletRepository {
  async getJobTemplateByHierarchies(program_id: string, hierarchy_ids: string[]) {
    const query = `
      SELECT
          ji.id,
          ji.template_name,
          ji.job_id,
          ji.program_id,
          ji.created_on,
          GROUP_CONCAT(jc.hierarchy SEPARATOR ',') AS hierarchy -- concatenate hierarchies
      FROM job_templates AS ji
      INNER JOIN job_template_hierarchies AS jc ON jc.job_temp_id = ji.id
      WHERE ji.is_deleted = false
        AND ji.program_id = :program_id
      GROUP BY ji.id, ji.template_name, ji.job_id, ji.program_id, ji.created_on
      ORDER BY ji.created_on DESC;
    `;

    const data = await sequelize.query(query, {
      replacements: {
        program_id,
        hierarchy_ids,
      },
      type: QueryTypes.SELECT,
    });
    return data;
  }

  async deleteJobTemplateHierarchy(program_id: string, job_temp_id: string) {
    const deleteQuery = `
      DELETE FROM job_template_hierarchies
      WHERE program_id = :program_id AND job_temp_id = :job_temp_id
    `;
    await sequelize.query(deleteQuery, {
      replacements: { program_id, job_temp_id },
    });
  }

  async getMostUsedJobTemplatesByProgram(
    program_id: string,
    hierarchy_ids: string[],
    job_type?: string,
    limit?: number,
    offset?: number,
    is_enabled?:boolean
  ) {
    const hierarchyCondition = hierarchy_ids.length > 0
      ? `AND job_template_hierarchies.hierarchy IN (${hierarchy_ids.map(() => '?').join(',')})`
      : '';
    const jobTypeCondition = job_type ? `AND job_templates.job_type = ?` : '';
    const paginationCondition = limit !== undefined && offset !== undefined
      ? `LIMIT ? OFFSET ?`
      : '';
      const isEnabledCondition = is_enabled !== undefined ? `AND job_templates.is_enabled = ?` : '';

    const query = `
      SELECT
        job_templates.template_name,
        MIN(job_templates.id) AS id,
        MIN(job_templates.program_id) AS program_id,
        MIN(job_templates.job_type) AS job_type,
        MIN(job_templates.description) AS description,
        MIN(job_templates.template_code) AS template_code,
        MIN(job_category.title) AS job_category,
        MIN(labour_category.name) AS labour_category_name,
        MIN(hierarchies.name) AS hierarchy,
        MAX(job_templates.job_submitted_count) AS job_submitted_count
      FROM job_templates
      INNER JOIN job_template_hierarchies
        ON job_templates.id = job_template_hierarchies.job_temp_id
      INNER JOIN hierarchies
        ON job_template_hierarchies.hierarchy = hierarchies.id
      LEFT JOIN job_category ON job_templates.category = job_category.id
      LEFT JOIN labour_category ON job_templates.labour_category = labour_category.id
      WHERE job_templates.program_id = ?
      ${hierarchyCondition}
      ${jobTypeCondition}
      ${isEnabledCondition}
      AND job_templates.job_submitted_count >=1
      GROUP BY job_templates.template_name
      ORDER BY job_submitted_count DESC
      ${paginationCondition};
    `;
    const replacements: (string | number)[] = [program_id, ...hierarchy_ids];
    if (job_type) {
      replacements.push(job_type);
    }
    if (limit !== undefined && offset !== undefined) {
      replacements.push(limit, offset);
    }

    if (is_enabled !== undefined) {
      replacements.push(is_enabled ? 1 : 0); 
    }

    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return data;
  }

  async getJobTempletByHierarchies(program_id: string, hierarchy_ids: string[], job_type?: string,is_enabled?: boolean|undefined) {
    let hierarchyCondition = '';

    if (hierarchy_ids.length > 0) {
      hierarchyCondition = `AND job_template_hierarchies.hierarchy IN (${hierarchy_ids.map(() => '?').join(',')})`;
    }
    const jobTypeCondition = job_type ? `AND job_templates.job_type = ?` : '';
    const isEnabledCondition = is_enabled !== undefined ? `AND job_templates.is_enabled = ?` : '';
    const query = `
      SELECT
        job_templates.template_name,
        MIN(job_templates.id) AS id,
        MIN(job_templates.program_id) AS program_id,
        MIN(job_templates.job_type) AS job_type,
        MIN(job_templates.description) AS description,
        MIN(job_templates.template_code) AS template_code,
        MIN(job_category.title) AS job_category,
        MIN(labour_category.name) AS labour_category_name,
        MIN(hierarchies.name) AS hierarchy,
        MIN(job_templates.created_on) AS created_on
      FROM job_templates
      INNER JOIN job_template_hierarchies
        ON job_templates.id = job_template_hierarchies.job_temp_id
      INNER JOIN hierarchies
        ON job_template_hierarchies.hierarchy = hierarchies.id
      LEFT JOIN job_category ON job_templates.category = job_category.id
      LEFT JOIN labour_category ON job_templates.labour_category = labour_category.id
      WHERE job_templates.program_id = ?
      ${hierarchyCondition}
      ${jobTypeCondition}
      ${isEnabledCondition}
      GROUP BY job_templates.template_name
      ORDER BY created_on DESC;
    `;
    const replacements: (string | number)[] = [program_id, ...hierarchy_ids];
    if (job_type) {
      replacements.push(job_type);
    }
    if (is_enabled !== undefined) {
      replacements.push(is_enabled ? 1 : 0); 
    }

    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return data;
  }

async getAllJobTemplateByHierarchy(
  program_id: string,
  hierarchyIdsArray: string[],
  laborCategoryIdsArray: string[],
  qualificationIdsArray: string[],
  limit?: number,
  offset?: number,
  job_type?: string,
  name?: string,
  labour_category_id?: string,
  is_enabled?: boolean,
  is_shift_rate?: boolean
) {
  const hierarchyCondition = hierarchyIdsArray.length > 0
  ? `job_templates.id IN (
      SELECT job_temp_id
      FROM job_template_hierarchies
      WHERE hierarchy IN (${hierarchyIdsArray.map(() => '?').join(',')})
      GROUP BY job_temp_id
      HAVING COUNT(DISTINCT hierarchy) = ?
    )`
  : "";
  const conditions = [
    hierarchyCondition,
    laborCategoryIdsArray.length > 0 && `job_templates.labour_category IN (${laborCategoryIdsArray.map(() => '?').join(',')})`,
    qualificationIdsArray.length > 0 && `qualifications.id IN (${qualificationIdsArray.map(() => '?').join(',')})`,
    job_type && `job_templates.job_type = ?`,
    name && `job_templates.template_name LIKE ?`,
    labour_category_id && `labour_category.id = ?`, 
    is_enabled !== undefined && `job_templates.is_enabled
    ${is_enabled ? '=1' : '=0'}`,
    is_shift_rate !== undefined && `job_templates.is_shift_rate
    ${is_shift_rate ? '=1' : '=0'}`
  ].filter(Boolean).join(' AND ');

  const pagination = (limit && offset) ? 'LIMIT ? OFFSET ?' : '';

  const query = `
    SELECT
      job_templates.template_name,
      MIN(job_templates.id) AS id,
      MIN(job_templates.job_id) AS job_id,
      MIN(job_templates.is_shift_rate) AS is_shift_rate,
      MIN(job_templates.program_id) AS program_id,
      MIN(job_templates.job_type) AS job_type,
      MIN(job_templates.description) AS description,
      MIN(job_templates.checklist_version) AS checklist_version,
      MIN(job_templates.checklist_entity_id) AS checklist_entity_id,
      MIN(job_templates.template_code) AS template_code,
      MIN(job_category.title) AS job_category,
      MIN(labour_category.name) AS labour_category_name,
      MIN(labour_category.id) AS labour_category_id,
      JSON_OBJECT(
        'id', ph.id,
        'name', ph.name
      ) AS primary_hierarchy,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', unique_hierarchies.id,
          'name', unique_hierarchies.name
        )
      ) AS hierarchy,
      MIN(qualifications.name) AS qualification_name,
      MIN(qualifications.id) AS qualification_id
    FROM job_templates
    INNER JOIN job_template_hierarchies
      ON job_templates.id = job_template_hierarchies.job_temp_id
    INNER JOIN (
      SELECT DISTINCT id, name
      FROM hierarchies
    ) unique_hierarchies
      ON job_template_hierarchies.hierarchy = unique_hierarchies.id
    LEFT JOIN job_category
      ON job_templates.category = job_category.id
    LEFT JOIN labour_category
      ON job_templates.labour_category = labour_category.id
    LEFT JOIN job_template_qualification
      ON job_templates.id = job_template_qualification.job_temp_id
    LEFT JOIN hierarchies AS ph
      ON job_templates.primary_hierarchy = ph.id  
    LEFT JOIN qualifications
      ON JSON_CONTAINS(
          JSON_EXTRACT(job_template_qualification.qualifications, '$[*].qualification_id'),
          JSON_QUOTE(qualifications.id)
      )
    WHERE job_templates.program_id = ?
    ${conditions ? `AND ${conditions}` : ''}
    GROUP BY job_templates.template_name, ph.id, ph.name
    ORDER BY job_templates.template_name
    ${pagination};
  `;

  const replacements: (string | number)[] = [program_id];
  if (hierarchyIdsArray.length > 0) replacements.push(...hierarchyIdsArray, hierarchyIdsArray.length);  if (laborCategoryIdsArray.length > 0) replacements.push(...laborCategoryIdsArray);
  if (qualificationIdsArray.length > 0) replacements.push(...qualificationIdsArray);
  if (job_type) replacements.push(job_type);
  if (name) replacements.push(`%${name}%`);
  if (labour_category_id) replacements.push(labour_category_id);
  if (is_enabled !== undefined) {
    replacements.push(is_enabled ? 1 : 0); 
  }
  if(is_shift_rate !== undefined) {
    replacements.push(is_shift_rate ? 1 : 0);
  }
  if (limit && offset) replacements.push(limit, offset);

  const data = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });

  return data;
}


  async programQuery(program_id: string): Promise<{ name: string }[]> {
    const query = `
            SELECT
                programs.name
            FROM programs
            WHERE programs.id = :program_id;
        `;

    const data = await sequelize.query<{ name: string }>(query, {
      replacements: { program_id },
      type: QueryTypes.SELECT,
    });

    return data;
  }

  async getAllJobTemplets(
    program_id: string,
    dynamicConditions: string,
    replacements: any,
    limit: number,
    offset: number
  ) {
    const query = `
      SELECT
        job_templates.program_id,
        job_templates.id,
        job_templates.job_id,
        job_templates.is_enabled,
        job_templates.template_name,
        job_templates.job_submitted_count,
        job_templates.is_shift_rate,
        job_templates.is_checklist_enable,
        job_templates.ot_exempt,
        job_templates.created_on,
        job_templates.updated_on,
        job_templates.checklist_entity_id,
        JSON_OBJECT(
          'id', job_category.id,
          'title', job_category.title
        ) AS job_category,
        JSON_OBJECT(
          'id', labour_category.id,
          'name', labour_category.name
        ) AS industries,
        JSON_OBJECT(
          'id', primary_hierarchy.id,
          'name', primary_hierarchy.name
        ) AS primary_hierarchy, -- Added for primary hierarchy
        COUNT(*) OVER() AS total_count -- Add total_count using window function
      FROM
        job_templates
      LEFT JOIN
        job_category ON job_templates.category = job_category.id
      LEFT JOIN
        labour_category ON job_templates.labour_category = labour_category.id
      LEFT JOIN
        hierarchies AS primary_hierarchy ON job_templates.primary_hierarchy = primary_hierarchy.id
      WHERE
        job_templates.program_id = :program_id
        AND job_templates.is_deleted = false
        ${dynamicConditions}
      ORDER BY
        job_templates.created_on DESC,
        job_templates.job_id DESC
      LIMIT :limit OFFSET :offset;
    `;

    return sequelize.query(query, {
      replacements: { ...replacements, limit, offset },
      type: QueryTypes.SELECT,
    });
  }

  async getJobTempletById(program_id: string, id: string) {
    const query = `
        SELECT
            job_templates.*,
            JSON_OBJECT(
                'id', job_category.id,
                'title', job_category.title
            ) AS job_category,
            JSON_OBJECT(
              'id',checklist.entity_id,
              'name',checklist.name
          )AS checklist_entity_id	,
            JSON_OBJECT(
                'id', labour_category.id,
                'name', labour_category.name
            ) AS industries,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', hierarchies.id,
                        'name', hierarchies.name
                    )
                )
                FROM job_template_hierarchies
                JOIN hierarchies ON job_template_hierarchies.hierarchy = hierarchies.id
                WHERE job_template_hierarchies.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS hierarchies,
            JSON_OBJECT(
                'id', primary_hierarchy.id,
                'name', primary_hierarchy.name,
                'default_date_format', primary_hierarchy.default_date_format,
                'default_time_format', primary_hierarchy.default_time_format,
                'default_timezone', primary_hierarchy.default_timezone
            ) AS primary_hierarchy,
            COALESCE((
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'custom_field_id', job_template_custom_field.custom_field_id,
            'value', JSON_UNQUOTE(job_template_custom_field.value)
        )
    )
    FROM job_template_custom_field
    WHERE job_template_custom_field.job_temp_id = job_templates.id
), JSON_ARRAY()) AS job_template_custom_fields,

            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'qualification_type_id', qualification_types.id,
                        'name', qualification_types.name,
                        'code', qualification_types.code,
                        'is_required', job_template_qualification.is_required = 1,
                        'qualifications', COALESCE((
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'qualification_id', qualifications.id,
                                    'name', qualifications.name,
                                    'code', qualification_types.code,
                                    'is_locked', jq.is_locked,
                                    'is_required', jq.is_required=1,
                                    'level', jq.level
                                )
                            )
                            FROM qualifications
                            JOIN JSON_TABLE(
                                CASE
                                    WHEN JSON_VALID(job_template_qualification.qualifications) THEN job_template_qualification.qualifications
                                    ELSE '[]'
                                END,
                                '$[*]' COLUMNS(
                                    qualification_id CHAR(36) PATH '$.qualification_id',
                                    is_locked BOOLEAN PATH '$.is_locked',
                                    is_required BOOLEAN PATH '$.is_required',
                                    level JSON PATH '$.level'
                                )
                            ) AS jq ON qualifications.id = jq.qualification_id
                        ), JSON_ARRAY())
                    )
                )
                FROM job_template_qualification
                LEFT JOIN qualification_types ON job_template_qualification.qualification_type_id = qualification_types.id
                WHERE job_template_qualification.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS job_template_qualifications,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', job_template_rate_type.id,
                        'abbreviation', job_template_rate_type.abbreviation,
                        'billable', job_template_rate_type.billable,
                        'name', job_template_rate_type.name,
                        'bill_rate', job_template_rate_type.bill_rate,
                        'pay_rate', job_template_rate_type.pay_rate
                    )
                )
                FROM job_template_rate_type
                JOIN rate_type ON job_template_rate_type.rate_type_id = rate_type.id
                WHERE job_template_rate_type.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS job_template_rate_types,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', job_template_dist_schedules.id,
                        'dist_shedule_id', job_template_dist_schedules.dist_shedule_id,
                        'schedule_value', job_template_dist_schedules.schedule_value,
                        'schedule_unit', job_template_dist_schedules.schedule_unit,
                        'vendors', job_template_dist_schedules.vendors
                    )
                )
                FROM job_template_dist_schedules
                WHERE job_template_dist_schedules.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS job_template_distribution_schedules,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', job_template_master_data.id,
                        'foundation_data_type_id', job_template_master_data.foundation_data_type_id,
                        'foundation_data_type_name', master_data_type.name,
                        'foundation_data_id', JSON_EXTRACT(job_template_master_data.foundation_data_id, '$'),
                        'is_read_only', job_template_master_data.is_read_only
                    )
                )
                FROM job_template_master_data
                LEFT JOIN master_data_type ON job_template_master_data.foundation_data_type_id = master_data_type.id
                WHERE job_template_master_data.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS job_master_data
        FROM
            job_templates
        LEFT JOIN
            job_category ON job_templates.category = job_category.id
        LEFT JOIN
            labour_category ON job_templates.labour_category = labour_category.id
        LEFT JOIN
            hierarchies AS primary_hierarchy ON job_templates.primary_hierarchy = primary_hierarchy.id
        LEFT join checklist on job_templates.checklist_entity_id =checklist.entity_id
        WHERE
            job_templates.program_id = :program_id
            AND job_templates.id = :id
        GROUP BY
    job_templates.id,
    job_category.id,
    job_category.title,
    checklist.entity_id,
    checklist.name,
    labour_category.id,
    labour_category.name,
    primary_hierarchy.id,
    primary_hierarchy.name;

    `;
    const jobTemplate = await sequelize.query(query, {
      replacements: { program_id, id },
      type: QueryTypes.SELECT,
    });
    return jobTemplate;
  }

  async managerQuery(job_manager_id: string) {
    const managerData = await sequelize.query<{
      associate_hierarchy_ids: string[];
    }>(`SELECT associate_hierarchy_ids FROM user WHERE id = :job_manager_id`, {
      replacements: { job_manager_id },
      type: QueryTypes.SELECT,
    });

    return managerData;
  }

  async templateQuery(job_template_id: string) {
    const templateData = await sequelize.query<{ hierarchy: string }>(
      `SELECT hierarchy FROM job_template_hierarchies WHERE job_temp_id = :job_template_id`,
      {
        replacements: { job_template_id },
        type: QueryTypes.SELECT,
      }
    );

    return templateData;
  }

  async hierarchyDetailsQuery(commonHierarchyIds: string[]) {
    const hierarchyDetails = await sequelize.query(
      `SELECT * FROM hierarchies WHERE id IN (:commonHierarchyIds);`,
      {
        replacements: { commonHierarchyIds },
        type: QueryTypes.SELECT,
      }
    );

    return hierarchyDetails;
  }
}

export default JobTempletRepository;