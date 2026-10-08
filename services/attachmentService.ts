import { supabase } from '../lib/supabaseClient';
import { LogAttachment } from '../types';
import { compressImage } from '../utils/imageCompressor';

export interface UploadAttachmentsParams {
  entryId?: string;
  tripId?: string;
  files: (File | Blob)[];
  fileNames?: string[];
}

export const attachmentService = {
  /**
   * Upload multiple photos in background / non-blocking mode
   */
  async uploadAttachments(params: UploadAttachmentsParams): Promise<LogAttachment[]> {
    const { entryId, tripId, files, fileNames } = params;
    if (!entryId && !tripId) {
      throw new Error('Either entryId or tripId must be provided for attachment upload.');
    }
    if (!files || files.length === 0) return [];

    const uploadedRecords: LogAttachment[] = [];
    const targetFolder = entryId ? `entries/${entryId}` : `trips/${tripId}`;

    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const rawFile = files[i];
      try {
        // 1. Compress image client-side (max 1600px, 0.7 quality)
        const compressed = await compressImage(rawFile, { maxDimension: 1600, quality: 0.7 });
        const name = (fileNames && fileNames[i]) || compressed.fileName || `photo_${Date.now()}_${i + 1}.jpg`;
        const storagePath = `${targetFolder}/${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.jpg`;

        // 2. Upload to private Supabase storage bucket
        const { error: storageError } = await supabase.storage
          .from('logbook-attachments')
          .upload(storagePath, compressed.blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (storageError) {
          console.warn('Storage upload warning:', storageError);
          continue;
        }

        // 3. Insert record into public.log_attachments table
        const { data: record, error: dbError } = await supabase
          .from('log_attachments')
          .insert({
            entry_id: entryId || null,
            trip_id: tripId || null,
            storage_path: storagePath,
            file_name: name,
            file_size: compressed.compressedSize,
            mime_type: 'image/jpeg',
          })
          .select()
          .single();

        if (dbError) {
          console.warn('DB attachment record error:', dbError);
        } else if (record) {
          uploadedRecords.push(record as LogAttachment);
        }
      } catch (err) {
        console.warn('Attachment processing error (skipped):', err);
      }
    }

    return uploadedRecords;
  },

  /**
   * Fetch attachments for a specific logbook entry
   */
  async getAttachmentsForEntry(entryId: string): Promise<LogAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('log_attachments')
        .select('*')
        .eq('entry_id', entryId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as LogAttachment[];
    } catch (err) {
      console.warn('Failed to fetch entry attachments:', err);
      return [];
    }
  },

  /**
   * Fetch attachments for a specific vehicle trip
   */
  async getAttachmentsForTrip(tripId: string): Promise<LogAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('log_attachments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as LogAttachment[];
    } catch (err) {
      console.warn('Failed to fetch trip attachments:', err);
      return [];
    }
  },

  /**
   * Generate a temporary signed URL for private image viewing
   */
  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('logbook-attachments')
        .createSignedUrl(storagePath, expiresIn);

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (err) {
      console.warn('Failed to generate signed URL:', err);
      return null;
    }
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string, storagePath: string): Promise<void> {
    try {
      await supabase.storage.from('logbook-attachments').remove([storagePath]);
      await supabase.from('log_attachments').delete().eq('id', attachmentId);
    } catch (err) {
      console.warn('Failed to delete attachment:', err);
    }
  },
};
