import { runNotifications } from './notifications.mjs';
try { await runNotifications(); console.log('Notification worker completed.'); }
catch { console.error('Notification worker failed. Check the canonical URL, authentication and private hosting logs.'); process.exitCode = 1; }
