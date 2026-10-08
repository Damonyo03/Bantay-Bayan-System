import React, { useState, useEffect } from 'react';
import { LogAttachment } from '../../types';
import { attachmentService } from '../../services/attachmentService';
import { Image as ImageIcon, X, ExternalLink, Download, Eye, Loader2 } from 'lucide-react';

interface AttachmentGalleryProps {
  entryId?: string;
  tripId?: string;
  initialAttachments?: LogAttachment[];
}

interface LoadedPhoto {
  attachment: LogAttachment;
  signedUrl: string;
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  entryId,
  tripId,
  initialAttachments,
}) => {
  const [photos, setPhotos] = useState<LoadedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<LoadedPhoto | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSignedUrls = async () => {
      setLoading(true);
      try {
        let records = initialAttachments;
        if (!records || records.length === 0) {
          if (entryId) {
            records = await attachmentService.getAttachmentsForEntry(entryId);
          } else if (tripId) {
            records = await attachmentService.getAttachmentsForTrip(tripId);
          }
        }

        if (!records || records.length === 0) {
          if (isMounted) setPhotos([]);
          return;
        }

        const loaded: LoadedPhoto[] = [];
        for (const item of records) {
          const signedUrl = await attachmentService.getSignedUrl(item.storage_path, 3600);
          if (signedUrl) {
            loaded.push({ attachment: item, signedUrl });
          }
        }

        if (isMounted) {
          setPhotos(loaded);
        }
      } catch (err) {
        console.warn('Failed to load attachment signed URLs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (entryId || tripId || (initialAttachments && initialAttachments.length > 0)) {
      loadSignedUrls();
    }

    return () => {
      isMounted = false;
    };
  }, [entryId, tripId, initialAttachments]);

  if (loading) {
    return (
      <div className="py-2 flex items-center space-x-2 text-xs text-slate-400">
        <Loader2 size={13} className="animate-spin text-taguig-blue" />
        <span>Loading photo attachments...</span>
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Photo Attachments ({photos.length})
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {photos.map((p, idx) => (
          <div
            key={p.attachment.id || idx}
            onClick={() => setSelectedPhoto(p)}
            className="group relative cursor-pointer rounded-2xl overflow-hidden aspect-square w-16 sm:w-20 border border-slate-200 dark:border-white/10 shadow-xs hover:shadow-md transition-all hover:scale-105"
            title={p.attachment.file_name || 'View Photo'}
          >
            <img
              src={p.signedUrl}
              alt={p.attachment.file_name || 'Attachment'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-900/80">
              <div className="flex items-center space-x-2 text-white">
                <ImageIcon size={18} className="text-taguig-gold" />
                <span className="text-xs font-black uppercase tracking-tight truncate max-w-xs">
                  {selectedPhoto.attachment.file_name || 'Attached Photo'}
                </span>
                {selectedPhoto.attachment.file_size && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({(selectedPhoto.attachment.file_size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={selectedPhoto.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={selectedPhoto.attachment.file_name || 'photo.jpg'}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  title="Open Full Image"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image display */}
            <div className="p-4 flex items-center justify-center bg-black/60 max-h-[75vh] overflow-hidden">
              <img
                src={selectedPhoto.signedUrl}
                alt="Full preview"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
