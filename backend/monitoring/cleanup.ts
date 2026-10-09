import { query } from '../db/pool';
import { log } from '../logger';

// Логи и метрики растут каждую минуту. Info нужен для разбора по свежим следам,
// ошибки — подольше
export const cleanupMonitoringData = async (): Promise<void> => {
  try {
    await query(`DELETE FROM app_logs WHERE level = 'info' AND at < now() - INTERVAL '14 days'`);
    await query(`DELETE FROM app_logs WHERE at < now() - INTERVAL '60 days'`);
    await query(`DELETE FROM http_metrics WHERE minute < now() - INTERVAL '30 days'`);
    await query(`DELETE FROM genapi_balance WHERE at < now() - INTERVAL '365 days'`);
    // Срок записан в политике обработки персональных данных
    await query(`DELETE FROM contact_messages WHERE created_at < now() - INTERVAL '1 year'`);
  } catch (error: any) {
    log.error('Чистка данных мониторинга не удалась:', error.message);
  }
};
