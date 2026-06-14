export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl: string;
}

export type MatchStatus = 'pending' | 'live' | 'finished';
export type BetStatus = 'pending' | 'win' | 'loss';
export type EventType = 'goal' | 'card';
export type CardType = 'yellow' | 'red';

export interface User {
  id: number;
  username: string;
  email?: string;
  points: number;
  avatar: string;
  rank?: number;
  token?: string;
  bio?: string;
  favoriteTeam?: string | null;
  isPrivate?: boolean;
  showBets?: boolean;
  showStats?: boolean;
  seasonPoints?: number;
}

export interface MatchEvent {
  type: EventType;
  minute: number;
  team: string;
  player: string;
  playerId?: number;
  playerAvatar?: string;
  score?: string;
  cardType?: CardType;
  text?: string;
  isSecondYellow?: boolean;
}

export type MatchDetail = Match;

export interface Match {
  id: number;
  jornada: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  time: string;
  league: string;
  events: MatchEvent[];
}

export interface Bet {
  id: number;
  userId: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
}

export interface EnrichedBet extends Bet {
  match: Match | null;
  status: BetStatus;
}

export interface TeamStanding {
  name: string;
  strength: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  pts: number;
}

export interface Player {
  id: number;
  name: string;
  team_name: string;
  avatar_url: string;
  goals: number;
  yellow_cards?: number;
  red_cards?: number;
}

export interface ChatMessage {
  id?: number;
  matchId: number;
  username: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface SimulationState {
  currentJornada: number;
  leagueStarted: boolean;
  lastJornadaStart: number | null;
  jornadas?: any[];
  offSeason?: boolean;
  nextSeasonStart?: number | null;
  season?: number;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  createdAt: string;
}

export interface UserStats {
  totalPoints: number;
  winRate: number;
  totalBets: number;
}

export interface Prediction {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  predictedScore: { home: number; away: number };
  actualScore: { home: number; away: number } | null;
  status: 'pending' | 'correct' | 'incorrect';
  pointsEarned: number;
  date: string;
  league: string;
}

// DTOs de Servicio e Interfaces
export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserRanking {
  id: number;
  username: string;
  points: number;
  avatar: string;
  favoriteTeam?: string | null;
  trend?: number | null;
}

export interface Conversation {
  id: number;
  otherUser: {
    id: number;
    username: string;
    avatar: string;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
    isMe: boolean;
  } | null;
  unreadCount: number;
}

export interface PrivateMessage {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
  readAt: string | null;
  isMe: boolean;
}

export interface UpdateProfileDto {
  username?: string;
  bio?: string;
  favoriteTeam?: string;
  isPrivate?: boolean;
  showBets?: boolean;
  showStats?: boolean;
}

export interface UserStats {
  totalBets: number;
  exactHits: number;
  winnerHits: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  pointsByJornada: { jornada: number; points: number; cumulative: number }[];
  resultDistribution: { exact: number; winner: number; miss: number };
}

export interface SeasonState {
  currentJornada: number;
  leagueStarted: boolean;
  offSeason?: boolean;
  nextSeasonStart?: number | null;
  season?: number;
  lastSeason?: number;
}

export interface ChatMessageDto {
  matchId: number;
  username: string;
  text: string;
}

export interface BetDto {
  userId: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
}

export interface UserProfile {
  name: string;
  avatar: string;
  points: number;
  rank: number;
  totalBets: number;
  winRate: number;
  bio?: string;
  favoriteTeam?: string | null;
  isPrivate?: boolean;
  showBets?: boolean;
  showStats?: boolean;
  seasonPoints?: number;
}

export interface DisplayMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  score?: {
    home: number;
    away: number;
  };
  matchTime?: string;
  league: string;
  dateTime?: Date;
}

export interface Standing {
  pos: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  gc: number;
  pts: number;
}

export interface ClassificationTeamStats {
  position: number;
  team: string;
  logo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchdayMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  date: Date;
}

export interface BetData {
  homeScore: number;
  awayScore: number;
}

export interface Alert {
  id?: string;
  type: 'success' | 'error' | 'info';
  message: string;
  icon?: string;
}

export interface TeamDetailStats {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  winPercentage: number;
}
