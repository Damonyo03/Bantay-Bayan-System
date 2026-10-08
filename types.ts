
export type IncidentType = 'Theft' | 'Physical Injury' | 'Noise Complaint' | 'Domestic Dispute' | 'Public Intoxication' | 'Traffic Obstruction' | 'Suspicious Activity' | 'Medical' | 'Fire' | 'Disturbance' | 'Logistics' | 'Other';
export type IncidentStatus = 'Pending' | 'Dispatched' | 'Resolved' | 'Closed';
export type UserRole = 'developer' | 'barangay_captain' | 'barangay_secretary' | 'barangay_kagawad' | 'supervisor' | 'bantay_bayan' | 'resident' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'rejected' | 'deactivated';
export type AssetStatus = 'Pending' | 'Approved' | 'Released' | 'Returned' | 'Rejected';

// NEW TYPES FOR SCHEDULE
export type ShiftType = '1st' | '2nd' | '3rd';
export type DutyStatus = 'On Duty' | 'Day Off' | 'Leave' | 'Road Clearing';

export interface CalendarActivity {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  shift: '1st' | '2nd' | '3rd' | 'All Day';
  created_by: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string; // Added username field
  full_name: string;
  role: UserRole;
  status: UserStatus;
  badge_number: string;
  avatar_url?: string; // New field for profile picture
  valid_id_url?: string; // Field for verification document
  preferred_shift?: ShiftType;
  preferred_day_off?: string; // "Monday", "Tuesday", etc.
  area?: string;
  address?: string;
  contact_info?: string;
  last_active_at: string;
  created_at: string;
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
  release_photo_url?: string;
  return_photo_url?: string;
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

export interface PublicReport {
  id: string;
  reference_number: string;
  type: IncidentType;
  narrative: string;
  location: string;
  status: 'Pending Review' | 'Acknowledged' | 'Converted to Incident' | 'Rejected';
  submitted_by: string;
  submitter_name?: string; // Joined field
  converted_incident_id?: string;
  updated_at: string;
  created_at: string;
}

// LOGBOOK TYPES
export type LogbookCategory = 
  | 'cctv_request' 
  | 'blotter' 
  | 'vehicle' 
  | 'asset' 
  | 'queue' 
  | 'incident' 
  | 'handover' 
  | 'correction' 
  | 'other';

export interface LogAttachment {
  id: string;
  entry_id?: string | null;
  trip_id?: string | null;
  storage_path: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  signed_url?: string | null;
}

export interface LogbookEntry {
  id: string;
  created_at: string;
  reported_by: string;
  reporter_name: string;
  reporter_role: string;
  category: LogbookCategory;
  action: string;
  title: string;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  metadata?: Record<string, any>;
  corrects_entry_id?: string | null;
  // UI joined / helper properties
  referenced_correction?: LogbookEntry | null;
  attachments?: LogAttachment[];
}

export interface LogEventParams {
  category: LogbookCategory;
  action: string;
  title: string;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  metadata?: Record<string, any>;
  corrects_entry_id?: string | null;
}

// VEHICLE TRIP MONITORING TYPES
export type VehicleStatus = 'available' | 'on_trip' | 'maintenance' | 'decommissioned';
export type TripStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  type?: string;
  status: VehicleStatus;
  qr_code_token?: string;
  created_at: string;
  // Joined live status
  active_trip?: VehicleTrip | null;
}

export interface TripPassenger {
  id: string;
  trip_id: string;
  person_id?: string | null;
  passenger_name: string;
  created_at?: string;
}

export interface TripStop {
  id: string;
  trip_id: string;
  place: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  manual_time_reason?: string | null;
  created_at?: string;
}

export interface VehicleTrip {
  id: string;
  vehicle_id: string;
  driver_id?: string | null;
  driver_name: string;
  purpose: string;
  status: TripStatus;
  odometer_start?: number | null;
  odometer_end?: number | null;
  remarks?: string | null;
  logged_by: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  // Joined fields
  vehicle?: Vehicle;
  passengers?: TripPassenger[];
  stops?: TripStop[];
  attachments?: LogAttachment[];
}

// SHIFT HANDOVER TYPES
export interface ShiftHandover {
  id: string;
  outgoing_user?: string | null;
  outgoing_name: string;
  incoming_user?: string | null;
  incoming_name?: string | null;
  shift_name: string;
  notes: string;
  pending_items?: string | null;
  created_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  acknowledged_by_name?: string | null;
}

// SENSITIVE DATA ACCESS AUDIT TRAIL TYPES
export type AuditAccessAction = 'viewed' | 'exported' | 'printed';

export interface AuditAccessLog {
  id: string;
  user_id?: string | null;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: AuditAccessAction;
  record_type: string;
  record_id: string;
  timestamp: string;
  user_agent?: string | null;
}

// GLOBAL SEARCH TYPES
export interface GlobalSearchResult {
  id: string;
  type: 'blotter' | 'logbook' | 'cctv_request' | 'vehicle' | 'vehicle_trip' | string;
  title: string;
  subtitle: string;
  details?: string;
  status?: string;
  created_at?: string;
  url_path: string;
}

export interface GroupedSearchResults {
  blotters: GlobalSearchResult[];
  logbook: GlobalSearchResult[];
  cctv: GlobalSearchResult[];
  vehicles: GlobalSearchResult[];
  totalCount: number;
}

// DAILY SUMMARY TYPES
export interface DailySummaryData {
  date: string;
  today_counts: {
    blotters: number;
    cctv_requests: number;
    vehicle_trips: number;
    logbook_entries: number;
  };
  pending_items: {
    pending_blotters: number;
    pending_cctv: number;
    ongoing_trips: number;
    pending_reports: number;
    pending_handovers: number;
  };
}

// OPERATIONAL REMINDERS & ALERTS
export interface OperationalReminder {
  id: string;
  category: 'cctv' | 'vehicle' | 'blotter' | string;
  severity: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  record_id?: string;
  url_path: string;
  created_at: string;
}

export interface SystemAlertSetting {
  id: string;
  key: string;
  label: string;
  value_numeric: number;
  unit: string;
  description?: string;
  updated_at?: string;
}

