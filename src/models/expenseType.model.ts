import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "./programs.model";

class ExpenseTypeModel extends Model {
    id: any;
    name: any;
    code: any;
    program_id: any;
}

ExpenseTypeModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_mandatory_attachment: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_optional_attachment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_manadatory_notes: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_optional_notes: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    apply_msp_fee: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    appply_tax: {
        type: DataTypes.STRING,
        allowNull: true
    },
    allow_negative_expense: {
        type: DataTypes.STRING,
        allowNull: true
    },
    allow_unit_based: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit_based: {
        type: DataTypes.JSON,
        allowNull: true
    },
    expense_icon: {
        type: DataTypes.JSON,
        allowNull: true
    },
    program_id:{
        type: DataTypes.UUID,
        allowNull: false,
        references:{
           model:Programs,
            key:"id"
        } 
    },
    created_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
    },
    created_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: true,
    },
    modified_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: true,
    },
    ref_id: {
        type: DataTypes.UUID,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
},
    {
        sequelize,
        tableName: 'expense_type',
        timestamps: false,
        hooks: {
            beforeSave: (instance) => {
                beforeSave(instance);
            },
            beforeValidate: async (instance) => {
                convertEmptyStringsToNull(instance);
                if (!instance.code && instance.program_id) {
                    const program = await Programs.findByPk(instance.program_id);
                    if (program?.name) {
                        const programPrefix = program.name.substring(0, 3).toUpperCase();
                        const count = await ExpenseTypeModel.count();
                        const sequence = (count + 1).toString().padStart(5, '0');
                        instance.code = `${programPrefix}-EXP-${sequence}`;
                    }
                }
            },
        },
    });

sequelize.sync();

ExpenseTypeModel.belongsTo(Programs, { foreignKey: 'program_id' });


export default ExpenseTypeModel;
