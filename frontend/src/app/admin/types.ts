export type Entry = {
  _id: string;
  name: string;
  city: string;
  email?: string | null;
  phone?: string | null;
  contactType: 'email' | 'phone';
  contactValue: string;
  story: string;
  status: 'approved' | 'rejected' | 'pending_review';
  category?: string | null;
  caption?: string | null;
  rejectionReason?: string | null;
  aiDecision?: 'approved' | 'rejected' | null;
  aiReason?: string | null;
  aiCategory?: string | null;
  aiCaption?: string | null;
  aiRaw?: string | null;
  aiError?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiAttempts?: number;
  aiLatencyMs?: number;
  consent?: boolean;
  consentAt?: string;
  ipHash?: string | null;
  overriddenAt?: string | null;
  overrideNote?: string | null;
  updatedAt?: string;
  publicId?: string;
  createdAt: string;
};

export type Stats = {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  today: number;
  fallback: number;
  trends: { _id: string; count: number }[];
};

export type Listing = { items: Entry[]; total: number };
