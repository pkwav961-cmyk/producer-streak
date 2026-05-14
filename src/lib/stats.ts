import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export async function updateUserStatsAfterActivity(userId: string, xpEarned: number, totalHoursIncrement: number = 0) {
  const userRef = doc(db, 'users', userId);
  const profileSnap = await getDoc(userRef);
  
  if (!profileSnap.exists()) return null;
  
  const profile = profileSnap.data();
  const currentXP = profile.xp || 0;
  const totalXP = currentXP + xpEarned;
  const newLevel = Math.floor(Math.sqrt(totalXP / 10)) + 1;

  const lastActivityDate = profile.lastActivityDate;
  const today = new Date();
  const todayStr = today.toDateString();
  const lastActivityStr = lastActivityDate ? new Date(lastActivityDate).toDateString() : null;
  
  let newStreak = profile.streakCount || 0;

  if (lastActivityStr !== todayStr) {
    if (!lastActivityStr || newStreak === 0) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastActivityDate);
      lastDate.setHours(0, 0, 0, 0);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const diffInMs = todayDate.getTime() - lastDate.getTime();
      const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 1) {
        newStreak += 1;
      } else if (diffInDays > 1) {
        newStreak = 1;
      }
    }
  } else if (newStreak === 0) {
    newStreak = 1;
  }

  const statsUpdate: any = {
    streakCount: newStreak,
    xp: totalXP,
    level: newLevel,
    lastActivityDate: new Date().toISOString()
  };

  if (totalHoursIncrement > 0) {
    statsUpdate['stats.totalHours'] = increment(totalHoursIncrement);
  }

  await updateDoc(userRef, statsUpdate);
  return { newStreak, xpEarned, newLevel };
}
