
export type IncidentType = 'Medical' | 'Fire' | 'Theft' | 'Disturbance' | 'Traffic' | 'Logistics' | 'Other';
export type IncidentStatus = 'Pending' | 'Dispatched' | 'Resolved' | 'Closed';
export type UserRole = 'supervisor' | 'field_operator';
export type UserStatus = 'active' | 'inactive' | 'rejected';
export type AssetStatus = 'Pending' | 'Approved' | 'Released' | 'Returned' | 'Rejected';

// NEW TYPES FOR SCHEDULE
export type ShiftType = '1st' | '2nd' | '3rd';
export type DutyStatus = 'On Duty' | 'Day Off' | 'Leave' | 'Road Clearing';

export interface UserProfile {
  id: string;
  email: string;
  username?: string; // Added username field
  full_name: string;
  role: UserRole;
  status: UserStatus;
  badge_number: string;
  avatar_url?: string; // New field for profile picture
  preferred_shift?: ShiftType;
  preferred_day_off?: string; // "Monday", "Tuesday", etc.
  last_active_at: string;
}

export interface Incident {
  id: string;
  case_number: string;
  type: IncidentType;
  narrative: string;
  status: IncidentStatus;
  officer_id: string;
  officer_name?: string; // Joined field
  created_at: string;
  location: string;
  is_restricted_entry: boolean; // For "Restricted from Entry" flag
}

export interface IncidentParty {
  id: string;
  incident_id: string;
  name: string;
  age: number;
  role: 'Complainant' | 'Respondent' | 'Witness' | 'Victim' | 'Suspect';
  statement: string;
  contact_info?: string;
}

export interface DispatchLog {
  id: string;
  incident_id: string;
  unit_name: string;
  status: 'En Route' | 'On Scene' | 'Clear' | 'Returning';
  updated_at: string;
  created_at: string;
}

export interface AssetItem {
  item: string;
  quantity: number;
}

export interface AssetRequest {
  id: string;
  borrower_name: string;
  contact_number: string;
  address: string;
  items_requested: AssetItem[];
  purpose: string;
  pickup_date: string;
  return_date: string;
  status: AssetStatus;
  logged_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  logger_name?: string;
}

export interface CCTVRequest {
  id: string;
  request_number: string;
  requester_name: string;
  contact_info?: string;
  incident_type: string;
  incident_date: string;
  incident_time: string;
  location: string;
  purpose: string;
  created_at: string;
}

export interface PersonnelSchedule {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  status: DutyStatus;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  performed_by: string;
  performer_name?: string; // Joined field
  created_at: string;
}

// Combine type for UI display
export interface IncidentWithDetails extends Incident {
  dispatch_logs?: DispatchLog[];
  parties?: IncidentParty[];
}

export interface VehicleUsageData {
  id?: string;
  request_number?: string;
  time_of_departure: string;
  time_of_arrival: string;
  driver: string;
  passenger: string;
  purpose: string;
  created_at?: string;
}
