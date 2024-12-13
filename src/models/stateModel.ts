import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import CountryModel from "./countries.model";
class StateModel extends Model {
    id: any;
}
StateModel.init({
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
    code: {
        type: DataTypes.STRING,
        allowNull: true
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
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    created_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
    },
    country_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: CountryModel,
            key: 'id',
        },
    },
},
    {
        sequelize,
        modelName: 'state',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    });

sequelize.sync();
StateModel.belongsTo(CountryModel, { foreignKey: 'country_id', as: 'countries' });
export default StateModel;
