import { Model } from 'sequelize';

export const beforeSave = (record: Model) => {
    if (record.isNewRecord) {
        record.set('created_on', Date.now());
        record.set('updated_on', Date.now());
    } else {
        record.set('updated_on', Date.now());
    }
};