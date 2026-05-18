/**
 * src/lib/systemLogs.ts
 *
 * Real-time admin system log management.
 * Writes logs to Firestore for the simulated interactive admin terminal
 * and prints directly to the developer's local terminal console.
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type LogType = 'info' | 'success' | 'warn' | 'error';

export const addSystemLog = async (
  message: string,
  type: LogType = 'info'
) => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

  // Log to standard developer terminal (console)
  const colors = {
    info: 'color: #3b82f6;',
    success: 'color: #10b981; font-weight: bold;',
    warn: 'color: #f59e0b; font-weight: bold;',
    error: 'color: #ef4444; font-weight: bold; background-color: #1e1b4b;'
  };
  console.log(`%c[ADMIN TERMINAL] ${logMessage}`, colors[type]);

  try {
    await addDoc(collection(db, 'systemLogs'), {
      message,
      type,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to write to systemLogs collection in Firestore", err);
  }
};
