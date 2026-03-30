import { supabase } from '../lib/supabaseClient';
import { PublicReport, IncidentType } from '../types';

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
      submitted_by: userId
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
      submitter_name: d.profiles?.full_name || 'Unknown'
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
