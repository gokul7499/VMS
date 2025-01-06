import { sequelize } from '../config/instance';
import { DataTypes } from 'sequelize';
import { Model } from 'sequelize';
import { Programs } from '../models/programs.model';

class Checklist extends Model {
    version_id: any;
    entity_id: any;
    name: any;
    description: any;
    tenant_id: any;
    latest: any;
    version: any;
    previous_version_id: any;
    pre_checklist_entity_id: any;
    pre_checklist_version: any;
    associations: any;
    is_enabled: any;
    is_deleted: any;
    created_on: any;
    updated_on: any;
    created_by: any;
    updated_by: any;
    id: unknown;
}

Checklist.init(
    {
        version_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        entity_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        latest: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        previous_version_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'checklist',
                key: 'version_id',
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Programs,
                key: 'id'
            }
        },
        pre_checklist_entity_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        pre_checklist_version: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        associations: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_on: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_on: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        created_by: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        updated_by: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'checklist',
        timestamps: false,
        // indexes: [
        //     {
        //         fields: ['version_id'],
        //     },
        //     {
        //         fields: ['entity_id'],
        //     },
        //     // {
        //     //     fields: ['tenant_id'],
        //     // },
        // ],
       
    }
);

sequelize.sync();

Checklist.belongsTo(Checklist, { foreignKey: 'previous_version_id', as: 'previousVersion' });
Checklist.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });

export default Checklist;
