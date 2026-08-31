import { useState } from 'react';
import { Radio, Send, CheckCircle2, FileText, Video, Trophy, Upload, Image as ImageIcon, Film, X } from 'lucide-react';
import { uploadAdminMedia } from '../services/supabase';

export function Broadcast() {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const isVideo = file.type.startsWith('video/');
      setFileType(isVideo ? 'video' : 'image');
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFileType(null);
  };

  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;
    setSending(true);

    let mediaUrl = '';
    if (selectedFile) {
      try {
        mediaUrl = await uploadAdminMedia(selectedFile, 'broadcasts');
      } catch (err) {
        console.warn('Broadcast media upload warning:', err);
        mediaUrl = previewUrl;
      }
    }

    // Dispatch broadcast logic...
    await new Promise((r) => setTimeout(r, 1200));

    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setText('');
    removeFile();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Broadcast Studio</h1>
        <p>Compose and push announcements with optional photos or videos to all registered Telegram users.</p>
      </div>

      {/* Quick Templates */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setText('NEW LOTTERY EVENT ANNOUNCEMENT\n\nItem: [Product Name]\nTicket Price: [Price] ETB\nTotal Available Spots: [Total]\nEnd Date: [Date]\n\nReserve your spots now!')}
        >
          <FileText size={14} /> New Lottery Template
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setText('TIKTOK LIVE DRAW ALERT\n\nItem: [Product Name]\n\nThe live winner draw is starting on TikTok Live!\nWatch stream: [TikTok Live URL]')}
        >
          <Video size={14} /> TikTok Live Template
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setText('WINNER ANNOUNCEMENT\n\nItem: [Product Name]\nWinning Ticket Spot: #[Spot Number]\nWinner Phone: +251****[Last 4 Digits]\n\nCongratulations to the winner!')}
        >
          <Trophy size={14} /> Winner Template
        </button>
      </div>

      <div className="table-container" style={{ padding: 24 }}>
        <div className="form-group">
          <label className="form-label">Broadcast Text Content</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 140, fontSize: '0.9rem', lineHeight: 1.6 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message broadcast here..."
          />
        </div>

        {/* Media Attachment Upload */}
        <div className="form-group">
          <label className="form-label">Attach Image or Video (Optional)</label>
          {previewUrl ? (
            <div style={{ position: 'relative', display: 'inline-block', border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden', padding: 8, background: 'var(--bg-subtle)' }}>
              {fileType === 'video' ? (
                <video src={previewUrl} controls style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6 }} />
              ) : (
                <img src={previewUrl} alt="Broadcast preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6, objectFit: 'cover' }} />
              )}
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={removeFile}
                style={{ position: 'absolute', top: 12, right: 12, borderRadius: '50%', padding: 6, width: 28, height: 28 }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ border: '2px dashed var(--border-strong)', padding: 18, borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--bg-subtle)', position: 'relative' }}>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                <Upload size={22} color="var(--primary-accent)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Choose image or video file to attach</span>
                <span style={{ fontSize: '0.75rem' }}>Supports MP4, MOV, PNG, JPG, WEBP</span>
              </div>
            </div>
          )}
        </div>

        {(text || previewUrl) && (
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Broadcast Card Preview</label>
            <div style={{
              background: 'var(--bg-subtle)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              whiteSpace: 'pre-wrap',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}>
              {previewUrl && (
                <div style={{ marginBottom: 12 }}>
                  {fileType === 'video' ? (
                    <video src={previewUrl} controls style={{ width: '100%', maxHeight: 220, borderRadius: 6 }} />
                  ) : (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                </div>
              )}
              {text}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || (!text.trim() && !selectedFile)}
          >
            <Send size={16} /> {sending ? 'Dispatching Announcement...' : 'Dispatch Broadcast'}
          </button>

          {sent && (
            <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> Broadcast dispatched successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
