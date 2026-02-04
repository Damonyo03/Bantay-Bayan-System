
export type IncidentType = 'Medical' | 'Fire' | 'Theft' | 'Disturbance' | 'Traffic' | 'Other';
export type IncidentStatus = 'Pending' | 'Dispatched' | 'Resolved' | 'Closed';
export type UserRole = 'supervisor' | 'field_operator';
export type UserStatus = 'active' | 'inactive';
export type AssetStatus = 'Pending' | 'Approved' | 'Released' | 'Returned' | 'Rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  badge_number: string;
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
  role: 'Complainant' | 'Respondent' | 'Witness' | 'Victim';
  statement: string;
  contact_info?: string;
}

export interface DispatchLog {
  id: string;
  incident_id: string;
  unit_name: string;
  status: 'En Route' | 'On Scene' | 'Clear' | 'Returning';
  updated_at: string;
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

// Combined type for UI display
export interface IncidentWithDetails extends Incident {
  dispatch_logs?: DispatchLog[];
  parties?: IncidentParty[];
}