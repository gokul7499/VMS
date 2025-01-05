import schedule from 'node-schedule';
import Delegation from '../models/delegation.model';

const checkDelegationStatuses = async () => {
    const traceId = `trace_${new Date().toISOString()}`;
    try {
        console.log(`[${traceId}] Starting cron job to check delegation statuses...`);

        const currentDate = new Date();
        console.log(`[${traceId}] Current Date: ${currentDate}`);

        const startedCount = await Delegation.count({
            where: {
                start_date: { $lte: currentDate },
                end_date: { $gte: currentDate },
                is_deleted: false,
            },
        });
        console.log(`[${traceId}] Delegations currently active (started): ${startedCount}`);

        const startedOnlyCount = await Delegation.count({
            where: {
                start_date: { $lte: currentDate },
                is_deleted: false,
            },
        });

        const expiredCount = await Delegation.count({
            where: {
                end_date: { $lte: currentDate },
                is_deleted: false,
            },
        });
        console.log(`[${traceId}] Delegations expired: ${expiredCount}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`[${traceId}] Error while checking delegation statuses: ${error.message}`);
        } else {
            console.error(`[${traceId}] Unknown error while checking delegation statuses: ${error}`);
        }
    }
};

const scheduleDailyDelegationJob = () => {
    schedule.scheduleJob('0 0 * * *', async () => {
        console.log('Cron job triggered at 12:00 PM');
        await checkDelegationStatuses();
    });
    console.log('Cron job scheduled to run daily at 12:00 PM');
};

export default scheduleDailyDelegationJob;
