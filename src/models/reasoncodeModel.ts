import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programsModel';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Module } from './moduleModel';
import Event from './eventModel';

class reasoncodeModel extends Model {
    id: any;
    program_id: any;
    module_id: any;
    event_id: any;
}

reasoncodeModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        reasons_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        created_by: {
            type: DataTypes.JSON,
            allowNull: true,

        },
        modified_by: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        reason_code_limit: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
        },
        modified_on: {
            type: DataTypes.DOUBLE,
        },
        ref_id: {
            type: DataTypes.UUID,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
        event_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'event',
                key: 'id',
            },
        },
        module_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references:
            {
                model: 'module',
                key: 'id',
            },
        },
        reason: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'reason_codes',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    }
);

sequelize.sync();
reasoncodeModel.belongsTo(Programs, { foreignKey: 'program_id' });
reasoncodeModel.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
reasoncodeModel.belongsTo(Event, { foreignKey: 'event_id', as: 'supporting_text_event' });

export default reasoncodeModel;
