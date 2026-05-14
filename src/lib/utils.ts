import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXpProgress(xp: number): number {
  const level = calculateLevel(xp);
  const currentLevelXp = 100 * Math.pow(level - 1, 2);
  const nextLevelXp = 100 * Math.pow(level, 2);
  const progressXp = xp - currentLevelXp;
  const neededXp = nextLevelXp - currentLevelXp;
  return (progressXp / neededXp) * 100;
}
