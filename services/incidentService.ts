
import { supabase } from '../lib/supabaseClient';
import { Incident, IncidentParty, IncidentWithDetails } from '../types';
import { logbookService } from './logbookService';

export const incidentService = {
    getIncidents: async (): Promise<IncidentWithDetails[]> => {
        const { data, error } = await supabase
            .from('incidents')
            .select(`*, profiles:officer_id (full_name), dispatch_logs (*), incident_parties (*)`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((inc: any) => ({
            ...inc,
            officer_name: inc.profiles?.full_name || 'Unknown Officer',
            dispatch_logs: inc.dispatch_logs || [],
            parties: inc.incident_parties || []
        }));
    },

    getIncidentsByStatus: async (statuses: string[]): Promise<IncidentWithDetails[]> => {
        const { data, error } = await supabase
            .from('incidents')
            .select(`*, profiles:officer_id (full_name), dispatch_logs (*), incident_parties (*)`)
            .in('status', statuses)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data.map((inc: any) => ({
            ...inc,
            officer_name: inc.profiles?.full_name || 'Unknown Officer',
            dispatch_logs: inc.dispatch_logs || [],
            parties: inc.incident_parties || []
        }));
    },

    updateIncident: async (id: string, updates: Partial<Incident>) => {
        const { error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
    },

    createIncidentReport: async (incidentData: Omit<Incident, 'id' | 'created_at' | 'case_number'>, partiesData: Omit<IncidentParty, 'id' | 'incident_id'>[]) => {
        const caseNum = `BB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: incident, error: incError } = await supabase.from('incidents').insert({ ...incidentData, case_number: caseNum }).select().single();

        if (incError) throw incError;

        let savedParties: IncidentParty[] = [];
        if (partiesData.length > 0) {
            const parties = partiesData.map(p => ({ ...p, incident_id: incident.id }));
            const { data: insertedParties, error: partyError } = await supabase.from('incident_parties').insert(parties).select();
            if (partyError) throw partyError;
            savedParties = insertedParties || [];
        }

        if (incidentData.status === 'Dispatched') {
            await supabase.from('dispatch_logs').insert({
                incident_id: incident.id,
                unit_name: 'Pending Assignment',
                status: 'En Route',
                updated_at: new Date().toISOString()
            });
        }

        // Auto-mirror new blotter entry to logbook
        logbookService.logEvent({
            category: incident.type === 'Logistics' ? 'vehicle' : 'blotter',
            action: 'created',
            title: `New ${incident.type || 'Incident'} Blotter Logged: ${caseNum}`,
            description: `Location: ${incident.location || 'Not specified'}. Initial Status: ${incident.status || 'Pending'}`,
            reference_type: 'incident',
            reference_id: caseNum,
            metadata: { incident_id: incident.id, type: incident.type, location: incident.location }
        }).catch((err) => console.warn('Logbook incident auto-sync notification:', err));

        return {
            ...incident,
            parties: savedParties
        };
    },

    getRestrictedPersons: async () => {
        const { data, error } = await supabase
            .from('incident_parties')
            .select(`*, incidents!inner (case_number, is_restricted_entry, created_at, type, narrative)`)
            .eq('incidents.is_restricted_entry', true)
            .in('role', ['Respondent', 'Suspect'])
            .order('created_at', { foreignTable: 'incidents', ascending: false });

        if (error) throw error;
        return data;
    },

    clearRestrictedStatus: async (incidentId: string) => {
        const { error } = await supabase
            .from('incidents')
            .update({
                is_restricted_entry: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', incidentId);

        if (error) throw new Error(error.message);

        return { success: true };
    }
};
