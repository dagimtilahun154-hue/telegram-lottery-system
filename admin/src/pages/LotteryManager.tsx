import { useState, useEffect } from 'react';
import { Plus, Ticket, Play, Pause, X, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { supabase, uploadAdminMedia } from '../services/supabase';

interface LotteryItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  ticket_price: number;
  total_spots: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export function LotteryManager() {
  const [items, setItems] = useState<LotteryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    ticket_price: '',
    total_spots: '',
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('lottery_items')
      .select('*')
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let finalImageUrl = form.image_url;

    // Upload selected file if available
    if (selectedFile) {
      setUploading(true);
      try {
        finalImageUrl = await uploadAdminMedia(selectedFile, 'public-media');
      } catch (err: any) {
        console.warn('Media upload error, using local preview URL:', err);
        // Fallback to object URL or empty string if storage error
        finalImageUrl = previewUrl || '';
      } finally {
        setUploading(false);
      }
    }

    const { data: item, error: itemError } = await supabase
      .from('lottery_items')
      .insert({
        title: form.title,
        description: form.description,
        image_url: finalImageUrl,
        ticket_price: parseFloat(form.ticket_price),
        total_spots: parseInt(form.total_spots),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (itemError) {
      alert('Error creating lottery item: ' + itemError.message);
      setSaving(false);
      return;
    }

    const { data: round, error: roundError } = await supabase
      .from('lottery_rounds')
      .insert({
        item_id: item.id,
        round_number: 1,
        status: 'OPEN',
        draw_date: new Date(form.end_date).toISOString(),
      })
      .select()
      .single();

    if (roundError) {
      alert('Error creating round: ' + roundError.message);
      setSaving(false);
      return;
    }

    const totalSpots = parseInt(form.total_spots);
    const tickets = Array.from({ length: totalSpots }, (_, i) => ({
      round_id: round.id,
      item_id: item.id,
      spot_number: i + 1,
      status: 'AVAILABLE',
    }));

    for (let i = 0; i < tickets.length; i += 500) {
      const batch = tickets.slice(i, i + 500);
      const { error: ticketError } = await supabase.from('tickets').insert(batch);
      if (ticketError) {
        alert(`Error creating tickets (batch ${i}): ${ticketError.message}`);
        break;
      }
    }

    setShowModal(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setForm({ title: '', description: '', image_url: '', ticket_price: '', total_spots: '', start_date: '', end_date: '' });
    setSaving(false);
    fetchItems();
  };

  const toggleStatus = async (item: LotteryItem) => {
    const newStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await supabase.from('lottery_items').update({ status: newStatus }).eq('id', item.id);
    fetchItems();
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Lottery Manager</h1>
          <p>Configure product lotteries, ticket supply, pricing, and timelines.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Lottery
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Price</th>
              <th>Total Spots</th>
              <th>Timeline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border-light)' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                      <ImageIcon size={18} />
                    </div>
                  )}
                </td>
                <td><strong>{item.title}</strong></td>
                <td>{Number(item.ticket_price).toLocaleString()} ETB</td>
                <td>{item.total_spots.toLocaleString()}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(item.start_date).toLocaleDateString('en-GB')} —{' '}
                  {new Date(item.end_date).toLocaleDateString('en-GB')}
                </td>
                <td>
                  <span className={`badge ${item.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${item.status === 'ACTIVE' ? 'btn-outline' : 'btn-primary'}`}
                    onClick={() => toggleStatus(item)}
                  >
                    {item.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                    {item.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No lottery items created yet. Click "+ New Lottery" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>Create New Lottery Event</h2>
              <button type="button" className="btn btn-outline" style={{ padding: 4 }} onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Item Title *</label>
              <input className="form-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Samsung TV 65-inch" />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed product specifications..." />
            </div>

            {/* Direct Image File Upload */}
            <div className="form-group">
              <label className="form-label">Product Image File *</label>
              <div style={{ border: '2px dashed var(--border-strong)', padding: 16, borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--bg-subtle)', position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
                {previewUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <img src={previewUrl} alt="Preview" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-light)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Ready to upload</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                    <Upload size={24} color="var(--primary-accent)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Click or drag image file here</span>
                    <span style={{ fontSize: '0.75rem' }}>Supports PNG, JPG, WEBP</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Ticket Price (ETB) *</label>
                <input className="form-input" type="number" required min="1" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Spot Supply *</label>
                <input className="form-input" type="number" required min="1" value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: e.target.value })} placeholder="e.g. 3000" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="datetime-local" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input className="form-input" type="datetime-local" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                {saving || uploading ? 'Uploading & Creating...' : 'Publish Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
