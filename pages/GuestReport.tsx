import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { publicReportService } from '../services/publicReportService';
import { attachmentService } from '../services/attachmentService';
import { IncidentType, PublicReport } from '../types';
import PageHeader from '../components/PageHeader';
import { PhotoUploader } from '../components/attachments/PhotoUploader';
import { 
  ShieldAlert, 
  Send, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Camera, 
  ArrowLeft, 
  RotateCcw, 
  Lock,
  Info
} from 'lucide-react';

const GuestReport: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<PublicReport | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<IncidentType>('Disturbance');
  const [location, setLocation] = useState('');
  const [narrative, setNarrative] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [hasConsented, setHasConsented] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validate Real Name
  const validateRealName = (first: string, last: string): boolean => {
    const cleanFirst = first.trim();
    const cleanLast = last.trim();
    if (cleanFirst.length < 2 || cleanLast.length < 2) return false;
    // Disallow single characters or numbers in names
    const namePattern = /^[a-zA-ZÀ-ÿ\s.\-ñÑ]+$/;
    return namePattern.test(cleanFirst) && namePattern.test(cleanLast);
  };

  // Validate Contact Number
  const validateContact = (contact: string): boolean => {
    const clean = contact.replace(/[\s\-()]/g, '');
    return clean.length >= 7 && /^[0-9+]+$/.test(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Real Name Verification
    if (!validateRealName(firstName, lastName)) {
      const err = "Please provide your REAL FIRST AND LAST NAME. Fake or made-up names are prohibited.";
      setFormError(err);
      showToast(err, "error");
      return;
    }

    // 2. Contact Number Verification
    if (!validateContact(contactNumber)) {
      const err = "Please enter a valid and reachable contact number for verification.";
      setFormError(err);
      showToast(err, "error");
      return;
    }

    // 3. Mandatory Photo Evidence Verification (Anti-Fraud requirement)
    if (!photos || photos.length === 0) {
      const err = "Photo evidence is MANDATORY for guest reports. Please take or attach at least 1 clear photo of the incident/location to prevent spam or fraudulent reports.";
      setFormError(err);
      showToast(err, "error");
      return;
    }

    // 4. Incident details
    if (!location.trim() || location.trim().length < 3) {
      const err = "Please provide a specific landmark or location.";
      setFormError(err);
      showToast(err, "error");
      return;
    }

    if (!narrative.trim() || narrative.trim().length < 10) {
      const err = "Please describe the situation in detail (at least 10 characters).";
      setFormError(err);
      showToast(err, "error");
      return;
    }

    // 5. Consent
    if (!hasConsented) {
      const err = "You must certify the truthfulness of this report and consent to Data Privacy terms.";
      setFormError(err);
      showToast(err, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const report = await publicReportService.createGuestReport({
        type,
        narrative: narrative.trim(),
        location: location.trim(),
        guestName: fullName,
        guestContact: contactNumber.trim(),
        guestEmail: email.trim() || undefined,
      });

      // Upload Mandatory Photos
      if (photos.length > 0 && report?.id) {
        await attachmentService.uploadAttachments({
          publicReportId: report.id,
          files: photos,
        }).catch((err) => console.warn('Guest report photo upload warning:', err));
      }

      showToast("Guest report submitted successfully with photo evidence.", "success");
      setSubmittedReport(report);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "Failed to submit report. Please try again.";
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setContactNumber('');
    setEmail('');
    setType('Disturbance');
    setLocation('');
    setNarrative('');
    setPhotos([]);
    setHasConsented(false);
    setFormError(null);
    setSubmittedReport(null);
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedReport) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-slate-100 dark:border-white/10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce">
            <CheckCircle size={44} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
              Report Filed Successfully
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">
              Your guest report and photo evidence have been officially logged in the Bantay Bayan dispatch queue.
            </p>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 text-left space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference Number</span>
              <span className="font-mono font-black text-taguig-navy dark:text-taguig-gold text-base">
                {submittedReport.reference_number}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400 uppercase">Reporter:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{firstName} {lastName} (Guest)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400 uppercase">Incident Type:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{submittedReport.type}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400 uppercase">Location:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{submittedReport.location}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400 uppercase">Photo Evidence:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{photos.length} Photo(s) Attached</span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-left text-xs text-amber-800 dark:text-amber-300 font-medium">
            <strong>Important Notice:</strong> Keep your reference number <code>{submittedReport.reference_number}</code> handy. If emergency personnel need to follow up, they will contact you at <strong>{contactNumber}</strong>.
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={handleReset}
              className="px-8 py-4 bg-taguig-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-taguig-navy transition-all shadow-xl shadow-taguig-blue/20"
            >
              Submit Another Report
            </button>
            <Link
              to="/"
              className="px-8 py-4 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all inline-flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Return to Public Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 animate-fade-in min-w-0">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-taguig-blue mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
        <PageHeader
          title="Guest Incident Report"
          subtitle="Direct community reporting for non-registered residents & emergency situations"
        />
      </div>

      {/* Anti-Fraud & Real Name Requirement Notice */}
      <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 dark:border-amber-400 rounded-r-3xl text-slate-800 dark:text-white space-y-2">
        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
          <ShieldAlert size={22} className="shrink-0" />
          <h3 className="font-black text-sm uppercase tracking-wider italic">
            Anti-Fraud & Verification Policy
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          To maintain system integrity and prevent false alarms, <strong className="text-slate-900 dark:text-white">Guest Reporters must provide their REAL NAME, reachable contact number, and MANDATORY PHOTO EVIDENCE</strong> of the situation. Reports submitted without valid photos or verifiable identities will be automatically filtered as spam or fraud.
        </p>
      </div>

      {formError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center space-x-2">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-slate-100 dark:border-white/5 space-y-8">
        
        {/* Section 1: Real Identity */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-white/5 pb-3">
            <User size={18} className="text-taguig-blue" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-taguig-gold/70">
              1. Reporter Real Identity (Required)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g., Juan"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g., Dela Cruz"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Contact Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Incident Details */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-white/5 pb-3">
            <FileText size={18} className="text-taguig-blue" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-taguig-gold/70">
              2. Incident Particulars
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Incident Nature <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IncidentType)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
              >
                <option value="Medical" className="dark:bg-slate-800">Medical Emergency</option>
                <option value="Fire" className="dark:bg-slate-800">Fire Incident</option>
                <option value="Theft" className="dark:bg-slate-800">Theft / Robbery / Crime</option>
                <option value="Disturbance" className="dark:bg-slate-800">Public Disturbance / Noise</option>
                <option value="Traffic" className="dark:bg-slate-800">Traffic / Road Incident</option>
                <option value="Logistics" className="dark:bg-slate-800">Barangay Assistance</option>
                <option value="Other" className="dark:bg-slate-800">Other Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Location / Specific Landmark <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Street name, corner, building or house no."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Narrative Details (Salaysay) <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="State clearly what happened, persons involved, vehicle plate numbers (if any), and immediate assistance required..."
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all resize-none placeholder:text-slate-400"
            />
          </div>
        </section>

        {/* Section 3: MANDATORY Photo Evidence */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <Camera size={18} className="text-taguig-blue" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-taguig-gold/70">
                3. Mandatory Photo Evidence (At Least 1 Photo Required)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider">
              Required
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Take a live photo with your camera or upload photo evidence (up to 5 images). Submissions without photos will be rejected.
          </p>

          <PhotoUploader
            onPhotosChange={setPhotos}
            maxPhotos={5}
            className={`p-4 rounded-2xl border transition-all ${
              photos.length === 0 
                ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-300 dark:border-amber-500/30' 
                : 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-500/30'
            }`}
          />

          {photos.length === 0 && (
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
              <Info size={14} className="shrink-0" />
              <span>Please add at least 1 photo to satisfy verification requirements.</span>
            </p>
          )}
        </section>

        {/* Section 4: Data Privacy & Anti-Fraud Consent */}
        <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-start space-x-3.5">
          <input
            type="checkbox"
            id="guest-consent"
            required
            checked={hasConsented}
            onChange={(e) => setHasConsented(e.target.checked)}
            className="w-5 h-5 text-taguig-blue rounded mt-0.5 border-slate-300 bg-white dark:bg-slate-800"
          />
          <label htmlFor="guest-consent" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer font-medium">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">
              Certification of Truthfulness & Privacy Consent
            </span>
            I hereby certify under penalty of law that the information and photo evidence provided above are true, accurate, and submitted in good faith. I understand that submitting false or malicious reports is punishable under Philippine law.
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto text-slate-400 hover:text-taguig-red text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 py-3 px-4"
          >
            <RotateCcw size={16} />
            <span>Clear Form</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting || photos.length === 0 || !hasConsented}
            className={`w-full sm:w-auto px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 transition-all shadow-xl ${
              photos.length > 0 && hasConsented && !isSubmitting
                ? 'bg-taguig-blue text-white hover:bg-taguig-navy shadow-taguig-blue/20 hover:scale-[1.02]'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying & Submitting...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Submit Guest Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuestReport;
