import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, ExternalLink, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface ReceiptModalProps {
  purchase: any;
  onClose: () => void;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, reason: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  purchase,
  onClose,
  onApprove,
  onReject
}) => {
  const { t } = useI18n();
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!purchase) return null;

  const isAccountMatch = purchase.detectedAccount === purchase.expectedAccount;
  const isNameMatch = purchase.detectedName?.toLowerCase().includes(purchase.expectedName.toLowerCase());
  const isAmountMatch = Number(purchase.amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-premium overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-[#0a1727] text-white font-black text-xs font-mono shadow-sm">
              #{purchase.ticketNumber}
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">{purchase.eventTitle}</h3>
              <p className="text-xs text-slate-500">{purchase.customerName} • <span className="font-mono">{purchase.phoneNumber}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
          {/* Left: Uploaded Receipt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Receipt Image</span>
              {purchase.receiptUrl && (
                <a
                  href={purchase.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-700 hover:underline font-bold"
                >
                  Full Image <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 aspect-[3/4] flex items-center justify-center overflow-hidden shadow-inner">
              {purchase.receiptUrl ? (
                <img
                  src={purchase.receiptUrl}
                  alt="Receipt"
                  className="object-contain w-full h-full"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Pending Upload</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">User inside 15-min reservation</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Veritas 4-Way Matching */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Automated Verification Audit
              </h4>
            </div>

            {/* Check 1: Account */}
            <div className={`p-3.5 rounded-2xl border ${isAccountMatch ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">1. Receiver Account</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Expected: <span className="font-mono font-bold text-slate-900">{purchase.expectedAccount}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Detected: <span className={`font-mono font-bold ${isAccountMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {purchase.detectedAccount || 'Unextracted'}
                    </span>
                  </div>
                </div>
                {isAccountMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                )}
              </div>
            </div>

            {/* Check 2: Name */}
            <div className={`p-3.5 rounded-2xl border ${isNameMatch ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">2. Receiver Name</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Expected: <span className="font-bold text-slate-900">{purchase.expectedName}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Detected: <span className={`font-bold ${isNameMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {purchase.detectedName || 'Unextracted'}
                    </span>
                  </div>
                </div>
                {isNameMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                )}
              </div>
            </div>

            {/* Check 3: Amount */}
            <div className={`p-3.5 rounded-2xl border ${isAmountMatch ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">3. Ticket Price</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Amount: <span className="font-bold text-slate-900">{purchase.amount} ETB</span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            </div>

            {/* Check 4: Reference */}
            <div className="p-3.5 rounded-2xl border bg-slate-50/80 border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">4. Provider Reference</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Provider: <span className="font-bold text-slate-800">{purchase.provider}</span>
              </div>
              <div className="text-xs text-slate-600">
                Reference: <span className="font-mono font-bold text-slate-900">{purchase.reference || 'Pending'}</span>
              </div>
            </div>

            {purchase.rejectionReason && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <span className="font-bold">Flag:</span> {purchase.rejectionReason}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Status: <span className="font-bold uppercase text-slate-800">{purchase.status}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {purchase.status !== 'ISSUED' && (
              <>
                {isRejecting ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="input-clean"
                    />
                    <button
                      onClick={() => onReject(purchase.id, rejectReason || 'Receipt details mismatch')}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer shadow-sm"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="btn-secondary text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                  >
                    <XCircle className="w-3.5 h-3.5" /> {t.reject}
                  </button>
                )}

                <button
                  onClick={() => onApprove(purchase.id)}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t.approve} #{purchase.ticketNumber}
                </button>
              </>
            )}

            {purchase.status === 'ISSUED' && (
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ticket Verified & Issued
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
