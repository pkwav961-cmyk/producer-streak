export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface UserStats {
  totalBeats: number;
  beatsFinished: number;
  totalHours: number;
  songsRecorded: number;
  mixesCompleted: number;
  uploadsCount: number;
  collabsCount: number;
  revenueEarned: number;
  followersCount?: number;
  followingCount?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  xp: number;
  level: number;
  streakCount: number;
  lastActivityDate: string;
  streakShields: number;
  stats: UserStats;
  bio?: string;
  location?: string;
  createdAt: string;
  // Onboarding fields
  onboardingComplete?: boolean;
  country?: string;
  roles?: ('producer' | 'artist' | 'engineer')[];
  socials?: {
    discord?: string;
    instagram?: string;
    tiktok?: string;
  };
  // Matcher fields
  role?: 'producer' | 'artist' | 'engineer';
  matcherRoles?: ('producer' | 'artist' | 'engineer')[];
  genres?: string[];
  bpmRange?: { min: number; max: number };
  daw?: string[];
  matcherDaw?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  lookingFor?: string[];
  matcherEnabled?: boolean;
  matcherMusicLink?: string;
  matcherAudioUrl?: string;
  matcherOnboardComplete?: boolean;
  city?: string;
  
  // Levels and Leaderboards
  prestigeLevel?: number;
  seasonRank?: number;
  rankTitle?: string;
  
  // Analytics & Verification
  analytics?: UserAnalytics;
  linkedAccounts?: LinkedAccount[];
  verifiedBadges?: string[];
  plan?: 'free' | 'pro';
}

export interface MatcherProfile extends UserProfile {
  role: 'producer' | 'artist' | 'engineer';
  matcherRoles?: ('producer' | 'artist' | 'engineer')[];
  genres: string[];
  matcherDaw?: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  location?: string;
  city?: string;
  country?: string;
  bio?: string;
  lastActivityDate: string;
}

export interface MatchSuggestion {
  user: MatcherProfile;
  compatibilityScore: number;
  sharedGenres: string[];
  matchReason: string;
}

export interface SwipeAction {
  id: string;
  swiperId: string;
  targetId: string;
  action: 'like' | 'pass';
  mode: 'producer' | 'artist' | 'engineer';
  createdAt: string;
}

export interface Match {
  id: string;
  users: string[];
  mode: 'producer' | 'artist' | 'engineer';
  createdAt: string;
}

export interface ProductionSession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  notes: string;
  type: 'production' | 'mixing' | 'recording' | 'arrangement';
  verified: boolean;
  status: 'completed' | 'partial';
}

export interface UserGoal {
  id: string;
  userId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  metric: 'beats' | 'hours' | 'uploads' | 'songs';
  period: 'daily' | 'weekly' | 'monthly';
  deadline: string;
  completed: boolean;
}

export interface Beat {
  id: string;
  userId: string;
  title: string;
  audioUrl?: string;
  previewUrl?: string;
  coverArtUrl?: string;
  fileName?: string;
  status: 'sketch' | 'finished' | 'mixed' | 'mastered';
  genre: string;
  bpm?: number;
  key?: string;
  mood?: string;
  createdAt: string;
  verified: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'community';
  rewardXP: number;
  targetValue: number;
  currentGlobalValue?: number;
  participantsCount: number;
  expiresAt: string;
  badgeId?: string;
  iconName?: string;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Friendship {
  id: string;
  users: string[];
  status: 'pending' | 'accepted' | 'declined';
  requestedBy: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: string;
  type: 'direct' | 'group';
  name?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface FollowRelationship {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

// Verified Credits & Analytics Types
export interface VerifiedCredit {
  id: string;
  userId: string;
  songTitle: string;
  artistName: string;
  releaseDate: string;
  platform: 'spotify' | 'genius' | 'apple' | 'soundcloud' | 'youtube';
  roles: string[]; // e.g. ['Producer', 'Writer', 'Engineer']
  streams?: number;
  artworkUrl?: string;
  verifiedAt: string;
  trackId?: string;
}

export interface UserAnalytics {
  monthlyListeners: number;
  totalStreams: number;
  totalPlacements: number;
  creditedSongs: number;
  topCollabs: string[];
  averageBpm: number;
  topGenres: string[];
  engagementGrowth?: number;
  streamGrowth?: number;
}

export interface LinkedAccount {
  platform: 'spotify' | 'genius' | 'apple' | 'soundcloud' | 'youtube' | 'instagram' | 'tiktok';
  accountId: string;
  username: string;
  profileUrl?: string;
  verifiedAt: string;
  accessToken?: string;
}

export interface Achievement {
  id: string;
  userId: string;
  type: 'placement' | 'streams' | 'level' | 'streak';
  title: string;
  description: string;
  unlockedAt: string;
  iconName?: string;
}
