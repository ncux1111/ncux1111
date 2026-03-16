import type {
  Admin,
  CurrentUser,
  Employee,
  PointsHistory,
  Team,
  TvAudioSettings,
  TvMemeSettings,
} from '../context/AppContext';
import type { WebsiteContent } from '../context/WebsiteContentContext';
import type { DocumentTemplateMeta, TemplateAccessMap, TemplateUsageLogEntry } from '../modules/templates';

export interface AuthLoginPayload {
  login: string;
  password: string;
  role: 'admin' | 'employee';
}

export interface AuthGateway {
  login(payload: AuthLoginPayload): Promise<CurrentUser | null>;
  logout(): Promise<void>;
  restoreSession(): Promise<CurrentUser | null>;
}

export interface DirectoryGateway {
  getEmployees(): Promise<Employee[]>;
  getAdmins(): Promise<Admin[]>;
  getTeams(): Promise<Team[]>;
  saveEmployees(employees: Employee[]): Promise<void>;
  saveAdmins(admins: Admin[]): Promise<void>;
  saveTeams(teams: Team[]): Promise<void>;
}

export interface RatingGateway {
  getPointsHistory(): Promise<PointsHistory[]>;
  savePointsHistory(history: PointsHistory[]): Promise<void>;
  savePrizePool(amount: number): Promise<void>;
}

export interface TemplatesGateway {
  getTemplates(): Promise<DocumentTemplateMeta[]>;
  getTemplateAccess(): Promise<TemplateAccessMap>;
  getTemplateUsageLog(): Promise<TemplateUsageLogEntry[]>;
}

export interface WebsiteContentGateway {
  getWebsiteContent(): Promise<WebsiteContent>;
  saveWebsiteContent(content: WebsiteContent): Promise<void>;
}

export interface TvMediaGateway {
  getTvAudioSettings(): Promise<TvAudioSettings>;
  getTvMemeSettings(): Promise<TvMemeSettings>;
  saveTvAudioSettings(settings: TvAudioSettings): Promise<void>;
  saveTvMemeSettings(settings: TvMemeSettings): Promise<void>;
}

export interface LocalAppServiceBoundaries {
  auth: AuthGateway;
  directory: DirectoryGateway;
  rating: RatingGateway;
  templates: TemplatesGateway;
  website: WebsiteContentGateway;
  tvMedia: TvMediaGateway;
}
