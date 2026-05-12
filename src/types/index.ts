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

export type InstitutionApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'INSTITUTION' | 'INTERPRETER';
  interpreter?: { id: string; isAvailable: boolean; community?: string; state?: string; mustChangePassword?: boolean };
  institution?: { id: string; name: string; type?: string; city?: string; approvalStatus?: InstitutionApprovalStatus; rejectionReason?: string };
}

export interface IndigenousLanguage {
  id: string;
  name: string;
  alsoKnownAs?: string | null;
  isoCode?: string | null;
  family?: string | null;
  _count?: { variants: number };
}

export interface LanguageVariant {
  id: string;
  name: string;
  region?: string | null;
  inaliCode?: string | null;
  inaliVariantNumber?: number | null;
  autoDenominations?: string[];
  ipaTranscriptions?: string[];
  languageId?: string;
  language?: { id: string; name: string; alsoKnownAs?: string | null };
  _count?: {
    interpreters: number;
    communities: number;
    requests: number;
  };
}

/** Catalogo geografico ─────────────────────────────────────────────────── */

export interface State {
  id: string;
  name: string;
  inegiCode?: string | null;
  _count?: { municipalities: number };
}

export interface Municipality {
  id: string;
  name: string;
  inegiCode?: string | null;
  state?: { id: string; name: string };
  _count?: { communities: number };
}

export interface Community {
  id: string;
  name: string;
  altName?: string | null;
  municipality?: {
    id: string;
    name: string;
    state: { id: string; name: string };
  };
  _count?: { variantCommunities: number };
}

export interface CommunityDetail extends Community {
  variantCommunities: {
    id: string;
    variant: {
      id: string;
      name: string;
      language: { id: string; name: string };
    };
  }[];
}

export interface VariantCommunityRow {
  linkId: string;
  id: string;
  name: string;
  altName?: string | null;
  municipality: {
    id: string;
    name: string;
    state: { id: string; name: string };
  };
}

/** Compat con codigo viejo */
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
  hourlyRate?: number | string;
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
  approvalStatus?: InstitutionApprovalStatus;
  approvalNotes?: string;
  rejectionReason?: string;
  contractNumber?: string;
  approvedAt?: string;
  approvedBy?: string;
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
  | 'INTERRUPTED'
  | 'NO_INTERPRETERS_AVAILABLE';

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
  billedHours?: number;
  hourlyRate?: number | string;
  breakdown?: string;
  adjustedAmount?: number | string;
  adjustmentReason?: string;
  adminNotes?: string;
  institutionPaymentStatus?: 'PENDING' | 'INVOICED' | 'COLLECTED';
  institutionInvoicedAt?: string;
  institutionCollectedAt?: string;
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
  pendingInstitutions?: number;
  pendingPaymentReviews?: number;
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
  pendingReview: { count: number; total: number };
  approved: { count: number; total: number };
  paidThisMonth: { count: number; total: number };
  pendingCollection: { count: number; total: number };
  collectedThisMonth: { count: number; total: number };
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

export interface PaymentReview {
  payment: {
    id: string;
    amount: number;
    billedHours?: number;
    hourlyRate?: number;
    breakdown?: string;
    status: string;
    adjustedAmount?: number;
    adjustmentReason?: string;
    adminNotes?: string;
    institutionPaymentStatus: string;
    createdAt: string;
  };
  service: {
    requestId: string;
    type: string;
    context?: string;
    description?: string;
    createdAt: string;
    acceptedAt?: string;
    startedAt?: string;
    endedAt?: string;
    durationMinutes?: number;
    billingMinutes?: number;
    language: string;
    variant: string;
  };
  interpreter: {
    name: string;
    email: string;
    phone?: string;
    hourlyRate: number;
    bankName?: string;
    bankClabe?: string;
    bankHolder?: string;
  };
  institution: {
    name: string;
    type?: string;
    city?: string;
  };
  timeline: Array<{ event: string; timestamp: string; detail?: string }>;
  disconnections: Array<{
    participant: string;
    leftAt: string;
    rejoinedAt?: string;
    durationSeconds: number;
    withinGrace: boolean;
  }>;
}

export interface MeetingInfo {
  zoomJoinUrl: string | null;
  zoomPassword: string | null;
  zoomMeetingId: string | null;
  status: RequestStatus;
  billingStartedAt: string | null;
  startedAt: string | null;
  billingMinutes: number | null;
  currentBillableSeconds: number;
  totalSeconds: number;
  bothConnected: boolean;
  participants: {
    interpreterConnected: boolean;
    institutionConnected: boolean;
  };
  grace: {
    active: boolean;
    remainingSeconds: number | null;
    expired: boolean;
    disconnectedParticipant: string | null;
  };
}
