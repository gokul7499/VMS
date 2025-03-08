import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';

class SowTemplateModel extends Model {
    id: any;
    created_on!: string;
    updated_on!: Date;
    custom_fields: any;
    master_date_type: any;
    hierarchy: any;
    masterData: any;
    code: any;
    program_id: any;
}

SowTemplateModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            // autoIncrement: true
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Programs,
                key: 'id'
            }
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        template_title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_sow_assignment: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_expense: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_milestones: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_payment_req: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_schedule_payments: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_desc_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        upload_description: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_update_sow_desc: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_req_doc_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        created_on: {

            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
           
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'sow_templates',
        timestamps: false,
        hooks: {
            beforeValidate: async (instance) => {
                if (!instance.code && instance.program_id) {
                    const program = await Programs.findByPk(instance.program_id);
                    if (program?.display_name) {
                        const programPrefix = program.display_name.substring(0, 3).toUpperCase();
                        const lastSowTemplate = await SowTemplateModel.findOne({
                            where: { program_id: instance.program_id },
                            order: [['created_on', 'DESC']],
                            attributes: ['code'],
                        });

                        let nextSequence = '001';

                        if (lastSowTemplate?.code && lastSowTemplate.code.includes('-SOW-')) {
                            const codeParts = lastSowTemplate.code.split('-SOW-');
                            const lastSequence = parseInt(codeParts[1], 10);

                            if (!isNaN(lastSequence)) {
                                nextSequence = (lastSequence + 1).toString().padStart(3, '0');
                            }
                        }

                        instance.code = `${programPrefix}-SOW-${nextSequence}`;
                    }
                }
            },
            beforeUpdate: (instance) => {
                instance.updated_on = new Date();
            },
        }

    });

sequelize.sync();
export default SowTemplateModel;
