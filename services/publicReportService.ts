import { supabase } from '../lib/supabaseClient';
import { PublicReport, IncidentType } from '../types';

export interface CreateGuestReportParams {
  type: IncidentType;
  narrative: string;
  location: string;
  guestName: string;
  guestContact: string;
  guestEmail?: string;
}

export const publicReportService = {
  createReport: async (
    type: IncidentType,
    narrative: string,
    location: string,
    userId: string
  ): Promise<PublicReport> => {
    // Generate a reference number PR-XXXXXX-XXX
    const refNum = `PR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const { data, error } = await supabase.from('public_reports').insert({
      reference_number: refNum,
      type,
      narrative,
      location,
      submitted_by: userId,
      is_guest: false
    }).select().single();

    if (error) throw error;
    return data as PublicReport;
  },

  createGuestReport: async (params: CreateGuestReportParams): Promise<PublicReport> => {
    // Generate a reference number GUEST-XXXXXX-XXX
    const refNum = `GUEST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const { data, error } = await supabase.from('public_reports').insert({
      reference_number: refNum,
      type: params.type,
      narrative: params.narrative,
      location: params.location,
      is_guest: true,
      guest_name: params.guestName.trim(),
      guest_contact: params.guestContact.trim(),
      guest_email: params.guestEmail?.trim() || null,
      submitted_by: null
    }).select().single();

    if (error) throw error;
    return data as PublicReport;
  },

  getMyReports: async (userId: string): Promise<PublicReport[]> => {
    const { data, error } = await supabase
      .from('public_reports')
      .select('*')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PublicReport[];
  },

  getAllReports: async (): Promise<PublicReport[]> => {
    const { data, error } = await supabase
      .from('public_reports')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map((d: any) => ({
      ...d,
      submitter_name: d.is_guest 
        ? `${d.guest_name || 'Guest Citizen'}`
        : (d.profiles?.full_name || 'Registered Citizen')
    })) as PublicReport[];
  },

  updateReportStatus: async (
    id: string,
    status: 'Pending Review' | 'Acknowledged' | 'Converted to Incident' | 'Rejected',
    convertedIncidentId?: string
  ): Promise<PublicReport> => {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (convertedIncidentId) {
      updateData.converted_incident_id = convertedIncidentId;
    }

    const { data, error } = await supabase
      .from('public_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PublicReport;
  }
};
