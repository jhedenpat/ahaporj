import { useState, useEffect } from 'react';
import { useSettings, useAdmins } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Edit2, Check, X, Shield, Plus, Trash2, Settings, Facebook, Send } from 'lucide-react';
import { toast } from 'sonner';

export function AdminAccount() {
  const { settings, updateSetting } = useSettings();
  const { admins, addAdmin, updateAdmin, deleteAdmin } = useAdmins();

  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState('');
  const [editPass, setEditPass] = useState('');

  const [tgBotName, setTgBotName] = useState('');
  const [fbUrl, setFbUrl] = useState('');
  const [fbName, setFbName] = useState('');
  const [teleBotToken, setTeleBotToken] = useState('');
  const [adminTeleId, setAdminTeleId] = useState('');

  // Sync local state when settings are loaded from Supabase
  useEffect(() => {
    if (settings['telegram_bot_name']) setTgBotName(settings['telegram_bot_name']);
    if (settings['facebook_url']) setFbUrl(settings['facebook_url']);
    if (settings['facebook_name']) setFbName(settings['facebook_name']);
    if (settings['tele_bot_token']) setTeleBotToken(settings['tele_bot_token']);
    if (settings['admin_tele_id']) setAdminTeleId(settings['admin_tele_id']);
  }, [settings]);

  const handleAddAdmin = async () => {
    const success = await addAdmin(newAdminUser, newAdminPass);
    if (success) {
      setNewAdminUser('');
      setNewAdminPass('');
    }
  };

  const startEdit = (admin: any) => {
    setEditingId(admin.id);
    setEditUser(admin.username);
    setEditPass('');
  };

  const handleSaveEdit = async (id: string) => {
    const success = await updateAdmin(id, editUser, editPass);
    if (success) {
      setEditingId(null);
    }
  };

  const handleSaveSettings = () => {
    if (tgBotName !== settings['telegram_bot_name']) updateSetting('telegram_bot_name', tgBotName);
    if (fbUrl !== settings['facebook_url']) updateSetting('facebook_url', fbUrl);
    if (fbName !== settings['facebook_name']) updateSetting('facebook_name', fbName);
    if (teleBotToken !== settings['tele_bot_token']) updateSetting('tele_bot_token', teleBotToken);
    if (adminTeleId !== settings['admin_tele_id']) updateSetting('admin_tele_id', adminTeleId);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      
      {/* ── Settings Section (Social Links) ── */}
      <div className="bakery-card rounded-2xl p-6">
        <h2 className="font-display text-2xl pink-text mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Store Settings
        </h2>
        
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1">
              <Send className="w-3.5 h-3.5" /> Telegram Username
            </label>
            <Input 
              value={tgBotName} 
              onChange={e => setTgBotName(e.target.value)}
              placeholder="e.g. patrenggs_"
              className="bg-white/50 dark:bg-zinc-900/50"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1">
              <Facebook className="w-3.5 h-3.5" /> Facebook Page Name
            </label>
            <Input 
              value={fbName} 
              onChange={e => setFbName(e.target.value)}
              placeholder="e.g. Patricia Bakeshop"
              className="bg-white/50 dark:bg-zinc-900/50"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1">
              <Facebook className="w-3.5 h-3.5" /> Facebook Page URL
            </label>
            <Input 
              value={fbUrl} 
              onChange={e => setFbUrl(e.target.value)}
              placeholder="https://facebook.com/..."
              className="bg-white/50 dark:bg-zinc-900/50"
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-500" /> Admin Notifications
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Telegram Bot Token</label>
                <Input 
                  type="password"
                  value={teleBotToken} 
                  onChange={e => setTeleBotToken(e.target.value)}
                  placeholder="Paste your bot token here..."
                  className="bg-white dark:bg-zinc-900 h-10"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Admin Chat ID</label>
                <Input 
                  value={adminTeleId} 
                  onChange={e => setAdminTeleId(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="bg-white dark:bg-zinc-900 h-10"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Get your ID from @userinfobot</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveSettings} className="w-full pink-gradient shadow-lg">
            Save All Settings
          </Button>
        </div>
      </div>

      {/* ── Admins Section ── */}
      <div className="bakery-card rounded-2xl p-6">
        <h2 className="font-display text-2xl pink-text mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" /> Admin Accounts
        </h2>

        {/* Add New Admin */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 bg-blush/30 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <Input 
            placeholder="New Username" 
            value={newAdminUser} 
            onChange={e => setNewAdminUser(e.target.value)}
            className="bg-white dark:bg-zinc-900"
          />
          <Input 
            type="password" 
            placeholder="New Password" 
            value={newAdminPass} 
            onChange={e => setNewAdminPass(e.target.value)}
            className="bg-white dark:bg-zinc-900"
          />
          <Button onClick={handleAddAdmin} disabled={!newAdminUser || !newAdminPass} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
            <Plus className="w-4 h-4 mr-1" /> Add Admin
          </Button>
        </div>

        {/* List Admins */}
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              
              {editingId === admin.id ? (
                // Edit Mode
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <Input 
                    value={editUser}
                    onChange={e => setEditUser(e.target.value)}
                    placeholder="Username"
                    className="flex-1"
                  />
                  <Input 
                    type="password"
                    value={editPass}
                    onChange={e => setEditPass(e.target.value)}
                    placeholder="New Password (or blank to keep)"
                    className="flex-1"
                  />
                </div>
              ) : (
                // View Mode
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-zinc-100">{admin.username}</p>
                    <p className="text-xs text-zinc-400">Added: {new Date(admin.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {editingId === admin.id ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleSaveEdit(admin.id)} className="bg-green-500 hover:bg-green-600 text-white">
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => startEdit(admin)}>
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    {admins.length > 1 && (
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm(`Are you sure you want to delete admin "${admin.username}"?`)) deleteAdmin(admin.id);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
