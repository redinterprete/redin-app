// ── Respuestas base ──────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Entidades ────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'INSTITUTION' | 'INTERPRETER';
  isActive?: boolean;
  createdAt?: string;
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'INSTITUTION' | 'INTERPRETER';
  interpreter?: { id: string; isAvailable: boolean; community?: string; state?: string; mustChangePassword?: boolean };
  institution?: { id: string; name: string; type?: string; city?: string };
}

export interface IndigenousLanguage {
  id: string;
  name: string;
  isoCode?: string;
  family?: string;
}

export interface LanguageVariant {
  id: string;
  name: string;
  region?: string;
  inaliCode?: string;
}

export interface LanguageWithVariants extends IndigenousLanguage {
  variants: (LanguageVariant & { _count: { interpreters: number } })[];
}

export interface InterpreterLanguageInfo {
  id: string;
  proficiency: string;
  variant: LanguageVariant & { language: IndigenousLanguage };
}

export interface Interpreter {
  id: string;
  userId: string;
  isAvailable: boolean;
  community?: string;
  state?: string;
  bio?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
  firstLoginAt?: string | null;
  user: User;
  languages: InterpreterLanguageInfo[];
}

export interface InterpreterDetail extends Interpreter {
  bankName?: string;
  bankClabe?: string;
  bankHolder?: string;
  acceptedRequests?: ServiceRequest[];
  payments?: Payment[];
}

export interface Institution {
  id: string;
  name: string;
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  user: User;
  _count?: { requests: number };
}

export type RequestStatus =
  | 'PENDING'
  | 'NOTIFIED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_SHOW'
  | 'INTERRUPTED';

export interface ServiceRequest {
  id: string;
  type: 'IMMEDIATE' | 'SCHEDULED';
  status: RequestStatus;
  description?: string;
  context?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  zoomJoinUrl?: string;
  zoomPassword?: string;
  zoomMeetingId?: string;
  billingStartedAt?: string;
  billingMinutes?: number;
  acceptedAt?: string;
  createdAt: string;
  institution: { name: string; user: { name: string; email?: string } };
  variant: LanguageVariant & { language: IndigenousLanguage };
  interpreter?: { user: { name: string; email?: string } };
  payment?: Payment;
}

export interface Payment {
  id: string;
  amount: number | string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  paidAt?: string;
  confirmedByInterpreter: boolean;
  bankClabe?: string;
  bankHolder?: string;
  bankName?: string;
  createdAt: string;
  interpreter: { user: { name: string; email?: string } };
  request: ServiceRequest;
}

// ── Dashboard ────────────────────────────────────────────────────
export interface DashboardStats {
  totalInterpreters: number;
  totalInstitutions: number;
  requestsThisMonth: number;
  pendingRequests: number;
  completedToday: number;
  totalLanguages: number;
  totalVariants: number;
  avgResponseTimeMinutes: number | null;
}

export interface WeeklyData {
  week: string;
  count: number;
}

export interface TopLanguage {
  languageId: string;
  name: string;
  count: number;
}

export interface PaymentSummary {
  totalPending: number | string;
  totalPaidThisMonth: number | string;
  countPending: number;
  countPaidThisMonth: number;
}

// ── Fase 2: Perfiles y estadísticas ─────────────────────────────

export interface InstitutionProfile {
  id: string;
  name: string;
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  user: User;
  _count?: { requests: number };
}

export interface InstitutionStats {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  cancelledRequests: number;
  avgResponseTimeMinutes: number | null;
  mostRequestedLanguage?: { name: string; count: number } | null;
  requestsThisMonth: number;
}

export interface InterpreterProfile {
  id: string;
  isAvailable: boolean;
  community?: string;
  state?: string;
  bio?: string;
  bankName?: string;
  bankClabe?: string;
  bankHolder?: string;
  user: User;
  languages: InterpreterLanguageInfo[];
}

export interface InterpreterStats {
  totalServices: number;
  totalEarnings: number | string;
  servicesThisMonth: number;
  earningsThisMonth: number | string;
  pendingPayments: number;
  pendingAmount: number | string;
  avgDurationMinutes: number | null;
  nextScheduled?: ServiceRequest | null;
}

export interface PaymentSummaryInterpreter {
  totalEarnings: number | string;
  countCompleted: number;
  pendingAmount: number | string;
  countPending: number;
  earningsThisMonth: number | string;
  countPaidThisMonth: number;
}

export interface CreateRequestPayload {
  variantId: string;
  type: 'IMMEDIATE' | 'SCHEDULED';
  description?: string;
  context?: string;
  scheduledAt?: string;
}

// ── Fase 3: Tiempo real ────────────────────────────────────────

export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_STARTED'
  | 'REQUEST_COMPLETED'
  | 'REQUEST_CANCELLED'
  | 'REMINDER_24H'
  | 'REMINDER_10MIN'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_COMPLETED'
  | 'INTERPRETER_ASSIGNED'
  | 'GENERAL';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ── Fase 4: Zoom ───────────────────────────────────────────────

export interface MeetingInfo {
  zoomJoinUrl: string | null;
  zoomPassword: string | null;
  zoomMeetingId: string | null;
  status: RequestStatus;
  billingStartedAt: string | null;
  billingMinutes: number | null;
  participants: {
    interpreterConnected: boolean;
    institutionConnected: boolean;
  };
}
