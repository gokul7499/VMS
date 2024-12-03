import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programsModel';

class VendorComplianceReqDocMappingModel extends Model {
    file_name: any;
    url: any;
    status: any;
    complied_by: any;
    next_expiry_on: any;
    expiry_on: any;
    compliance_note: any;
    user_id: any;
    required_document_id: any;
}
VendorComplianceReqDocMappingModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    required_document_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    is_compliant: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    complied_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    next_expiry_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
    },
    expiry_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
    },
    compliance_note: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    uploaded_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
    },
    complied_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
    },
    created_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: Date.now(),
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: Date.now(),
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    modified_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
}, {
    sequelize,
    modelName: 'vendor_compliance_req_doc_mapping',
});
sequelize.sync();

VendorComplianceReqDocMappingModel.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});
export default VendorComplianceReqDocMappingModel;
