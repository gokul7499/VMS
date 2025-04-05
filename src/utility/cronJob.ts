import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import cron from 'node-cron';
import { Op } from "sequelize";

cron.schedule('0 0 * * *', async () => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfToday.getTime();

    await VendorComplianceReqDocMappingModel.update(
      { status: 'Expired' },
      {
        where: {
          expiry_on: {
            [Op.lt]: todayTimestamp,
          },
          status: {
            [Op.ne]: 'Expired',
          },
        },
      }
    );
  } catch (error) {
    console.error('[CronJob] Error updating expired vendor documents:', error);
  }
});