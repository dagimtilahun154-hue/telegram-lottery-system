import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  DollarSign, 
  UserCheck, 
  Building2, 
  Hash, 
  FileText 
} from 'lucide-react';
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
  const [rejectReason, setRejectReason] = useState(purchase?.rejectionReason || '');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!purchase) return null;

  // 1. Account Comparison (Cleaned)
  const cleanExpAcc = (purchase.expectedAccount || '').replace(/\s+/g, '');
  const cleanDetAcc = (purchase.detectedAccount || '').replace(/\s+/g, '');
  const isAccountMatch = cleanDetAcc ? (cleanExpAcc === cleanDetAcc || cleanExpAcc.includes(cleanDetAcc) || cleanDetAcc.includes(cleanExpAcc)) : false;

  // 2. Name Comparison (Cleaned)
  const cleanExpName = (purchase.expectedName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDetName = (purchase.detectedName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isNameMatch = cleanDetName ? (cleanExpName === cleanDetName || cleanDetName.includes(cleanExpName) || cleanExpName.includes(cleanDetName)) : false;

  // 3. Amount Comparison
  const expAmount = Number(purchase.expectedAmount || purchase.amount || 0);
  const detAmount = purchase.detectedAmount !== undefined && purchase.detectedAmount !== null ? Number(purchase.detectedAmount) : null;
  const isAmountMatch = detAmount !== null ? detAmount >= expAmount : true;

  const hasAnyMismatch = !isAccountMatch || !isNameMatch || (detAmount !== null && !isAmountMatch);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl shadow-premium overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1 rounded-xl bg-slate-900 text-white font-black text-xs font-mono shadow-sm tracking-wider">
              #{purchase.ticketNumber}
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">{purchase.eventTitle}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Buyer: <span className="font-bold text-slate-700">{purchase.customerName}</span> • <span className="font-mono">{purchase.phoneNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          
          {/* Left Column: Uploaded Receipt / Bank Proof (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Submitted Bank Receipt
              </span>
              {purchase.receiptUrl && (
                <a
                  href={purchase.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold"
                >
                  Full View <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 aspect-[3/4] flex items-center justify-center overflow-hidden shadow-inner relative">
              {purchase.receiptUrl ? (
                <img
                  src={purchase.receiptUrl}
                  alt="Receipt"
                  className="object-contain w-full h-full p-1"
                />
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Clock className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Digital / API Verification</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                    Verified directly with bank network or reference SMS text.
                  </p>
                </div>
              )}
            </div>

            {/* Provider & Timestamp Meta */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Rail / Provider:</span>
              <span className="font-bold text-slate-900 uppercase px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                {purchase.provider}
              </span>
            </div>
          </div>

          {/* Right Column: 4-Way Automated Match & Audit Discrepancies (7 Cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            
            {/* Prominent Audit Flag Banner */}
            {purchase.rejectionReason || hasAnyMismatch ? (
              <div className="p-4 rounded-2xl bg-rose-50/90 border-2 border-rose-300 text-rose-950 text-xs shadow-sm space-y-1">
                <div className="flex items-center gap-2 font-black text-rose-800 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Audit Alert: Discrepancy Flagged</span>
                </div>
                <p className="text-xs text-rose-900 font-medium pl-6">
                  {purchase.rejectionReason || 'Receipt details do not match the required event parameters.'}
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900">All Verification Criteria Passed</div>
                  <div className="text-[11px] text-emerald-700">Receiver name, account number, and ticket price match 100%.</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Live Bank Extraction vs Event Requirements
              </h4>
            </div>

            {/* Check 1: Receiver Account Number */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isAccountMatch ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/60 border-rose-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    1. Receiver Account Number
                  </div>
                  <div className="text-xs text-slate-700 flex items-center justify-between pr-2">
                    <span>Expected Account:</span>
                    <span className="font-mono font-bold text-slate-900">{purchase.expectedAccount || 'Not Specified'}</span>
                  </div>
                  <div className="text-xs flex items-center justify-between pr-2">
                    <span className="text-slate-700">Bank Reported:</span>
                    <span className={`font-mono font-bold ${isAccountMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {purchase.detectedAccount || 'Unextracted'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  {isAccountMatch ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> MATCH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-300">
                      <ShieldAlert className="w-3 h-3 text-rose-600" /> MISMATCH
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Check 2: Actual Receiver Name */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isNameMatch ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/60 border-rose-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <UserCheck className="w-3 h-3 text-slate-400" />
                    2. Actual Receiver Name
                  </div>
                  <div className="text-xs text-slate-700 flex items-center justify-between pr-2">
                    <span>Expected Name:</span>
                    <span className="font-bold text-slate-900">{purchase.expectedName || 'Official Ekup'}</span>
                  </div>
                  <div className="text-xs flex items-center justify-between pr-2">
                    <span className="text-slate-700">Bank Reported:</span>
                    <span className={`font-bold ${isNameMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {purchase.detectedName || 'Unextracted'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  {isNameMatch ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> MATCH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-300">
                      <ShieldAlert className="w-3 h-3 text-rose-600" /> WRONG RECEIVER
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Check 3: Amount Paid vs Ticket Price */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isAmountMatch ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/60 border-rose-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    3. Ticket Price vs Amount Paid
                  </div>
                  <div className="text-xs text-slate-700 flex items-center justify-between pr-2">
                    <span>Required Price:</span>
                    <span className="font-bold text-slate-900">{expAmount.toLocaleString()} ETB</span>
                  </div>
                  <div className="text-xs flex items-center justify-between pr-2">
                    <span className="text-slate-700">Bank Reported Amount:</span>
                    <span className={`font-bold ${isAmountMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {detAmount !== null ? `${detAmount.toLocaleString()} ETB` : `${expAmount.toLocaleString()} ETB (Default)`}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  {isAmountMatch ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PAID IN FULL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-300">
                      <ShieldAlert className="w-3 h-3 text-rose-600" /> UNDERPAID
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Check 4: Transaction Reference ID */}
            <div className="p-3.5 rounded-2xl border bg-slate-50/90 border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <Hash className="w-3 h-3 text-slate-400" />
                    4. Verified Transaction Reference
                  </div>
                  <div className="text-xs text-slate-700 flex items-center justify-between pr-2">
                    <span>Reference ID:</span>
                    <span className="font-mono font-bold text-slate-900">{purchase.reference || 'None (Unextracted)'}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full">
                  {purchase.provider}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Status: <span className="font-bold uppercase text-slate-900">{purchase.status}</span>
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
                      className="input-clean min-w-[240px]"
                    />
                    <button
                      onClick={() => onReject(purchase.id, rejectReason || 'Receipt details mismatch')}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer shadow-sm transition-all"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 cursor-pointer font-bold"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setRejectReason(purchase.rejectionReason || 'Receipt details mismatch');
                      setIsRejecting(true);
                    }}
                    className="btn-secondary text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 font-bold cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> {t.reject}
                  </button>
                )}

                <button
                  onClick={() => onApprove(purchase.id)}
                  className="btn-primary font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t.approve} #{purchase.ticketNumber}
                </button>
              </>
            )}

            {purchase.status === 'ISSUED' && (
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ticket Verified & Issued
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
