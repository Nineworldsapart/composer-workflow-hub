import type { AudioExportSettings } from '../../types';
import React, { useState, useEffect } from 'react';
import { 
  User, HardDrive, ShieldCheck, Save, CheckCircle2, 
  FolderOpen, Music, Mail, Globe, Hash, Info, Speaker, RefreshCw
} from 'lucide-react';

export interface ComposerProfile {
  fullName: string;
  artistName: string;
  email: string;
  website: string;
  proAffiliation: 'PRS' | 'ASCAP' | 'BMI' | 'SESAC' | 'GEMA' | 'SACEM' | 'Other';
  ipiNumber: string;
  publisherEntity: string;
  publisherIpi: string;
  defaultFileFormat?: string;
  defaultSampleRate: string;
  defaultBitDepth: string;
  storageRootPath: string;
  audioOutputDeviceId?: string;
  audioOutputDeviceName?: string;
}

interface SettingsViewProps {
  audioSettings?: AudioExportSettings;
  onUpdateAudioSetting?: <K extends keyof AudioExportSettings>(key: K, value: AudioExportSettings[K]) => void;
  profile: ComposerProfile;
  onSaveProfile: (profile: ComposerProfile) => void;
}

export function SettingsView({ profile, onSaveProfile }: SettingsViewProps): React.JSX.Element {
  const [formData, setFormData] = useState<ComposerProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isScanningDevices, setIsScanningDevices] = useState(false);

  const fetchAudioOutputs = async () => {
    setIsScanningDevices(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        // Enumerate all system devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        setAudioDevices(outputs);
      }
    } catch (err) {
      console.error('Failed to list audio output devices:', err);
    } finally {
      setIsScanningDevices(false);
    }
  };

  useEffect(() => {
    fetchAudioOutputs();
    // Listen for devices connected/disconnected (e.g. plugging in headphones or turning on interface)
    navigator.mediaDevices?.addEventListener('devicechange', fetchAudioOutputs);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', fetchAudioOutputs);
    };
  }, []);

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectStorageFolder) {
      const selectedPath = await window.electronAPI.selectStorageFolder();
      if (selectedPath) {
        setFormData(prev => ({ ...prev, storageRootPath: selectedPath }));
      }
    } else {
      const manualPath = prompt('Enter studio drive / folder path:', formData.storageRootPath);
      if (manualPath) {
        setFormData(prev => ({ ...prev, storageRootPath: manualPath }));
      }
    }
  };

  const handleAudioDeviceChange = (deviceId: string) => {
    const selected = audioDevices.find(d => d.deviceId === deviceId);
    setFormData(prev => ({
      ...prev,
      audioOutputDeviceId: deviceId,
      audioOutputDeviceName: selected?.label || 'Default Output Device'
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#070708] p-8 text-zinc-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Studio Settings</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your master cue metadata, storage paths, and audio monitoring device.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-950/20 active:scale-95"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Audio Monitoring Output Card */}
          <section className="bg-[#0e0e12] border border-zinc-800/90 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
                  <Speaker className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Audio Output Device</h2>
                  <p className="text-xs text-zinc-400">
                    Select your hardware audio interface or monitoring headphones for in-app playback.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchAudioOutputs}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
                title="Refresh hardware audio devices"
              >
                <RefreshCw className={`w-4 h-4 ${isScanningDevices ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            <div className="bg-[#121217] border border-zinc-800 rounded-xl p-4">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Active Hardware Output
              </label>
              <select
                value={formData.audioOutputDeviceId || 'default'}
                onChange={(e) => handleAudioDeviceChange(e.target.value)}
                className="w-full bg-[#18181f] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 outline-none font-medium"
              >
                <option value="default">Default System Audio Output</option>
                {audioDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Audio Output Device ${idx + 1}`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 mt-2">
                Auto-switches media playback to the designated interface when previewing masters, stems, or analyser reference tracks.
              </p>
            </div>
          </section>

          {/* Storage Location Card */}
          <section className="bg-[#0e0e12] border border-zinc-800/90 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Studio Storage Location</h2>
                <p className="text-xs text-zinc-400">
                  The root folder where all project briefs, audio masters, stems, and cheatsheets are stored.
                </p>
              </div>
            </div>

            <div className="bg-[#121217] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Current Storage Path</span>
                <span className="text-sm font-mono text-emerald-400 font-medium truncate block mt-0.5">
                  {formData.storageRootPath || '/Volumes/T7_Shield'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectFolder}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition shrink-0"
              >
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                <span>Browse Folder...</span>
              </button>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-zinc-500 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                All new brief deliveries, track folders (e.g. <code>/01_Masters</code>, <code>/03_Stems</code>), and recipes reference this root directory dynamically.
              </span>
            </div>
          </section>

          {/* Composer Profile & Sync Identity */}
          <section className="bg-[#0e0e12] border border-zinc-800/90 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Composer Profile & Sync Identity</h2>
                <p className="text-xs text-zinc-400">
                  Legal writer names and society affiliation for cue sheets and publisher delivery tags.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Legal Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Artist / Project Moniker</label>
                <input
                  type="text"
                  value={formData.artistName}
                  onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
                  placeholder="e.g. Apex Music"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Contact Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="composer@studio.com"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Portfolio / Website</span>
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://composer.com"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>
            </div>
          </section>

          {/* PRO / Royalty Metadata */}
          <section className="bg-[#0e0e12] border border-zinc-800/90 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">PRO Registration & Cue Sheet Data</h2>
                <p className="text-xs text-zinc-400">
                  Performance Rights Organization details inserted into cue deliverables.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">PRO Affiliation</label>
                <select
                  value={formData.proAffiliation}
                  onChange={(e) => setFormData(prev => ({ ...prev, proAffiliation: e.target.value as any }))}
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="PRS">PRS (UK)</option>
                  <option value="ASCAP">ASCAP (USA)</option>
                  <option value="BMI">BMI (USA)</option>
                  <option value="SESAC">SESAC (USA)</option>
                  <option value="GEMA">GEMA (Germany)</option>
                  <option value="SACEM">SACEM (France)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Composer IPI / CAE #</span>
                </label>
                <input
                  type="text"
                  value={formData.ipiNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, ipiNumber: e.target.value }))}
                  placeholder="e.g. 00812345678"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Publishing Entity (Self-Published or Admin)</label>
                <input
                  type="text"
                  value={formData.publisherEntity}
                  onChange={(e) => setFormData(prev => ({ ...prev, publisherEntity: e.target.value }))}
                  placeholder="e.g. Apex Music Publishing"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Publisher IPI / CAE #</span>
                </label>
                <input
                  type="text"
                  value={formData.publisherIpi}
                  onChange={(e) => setFormData(prev => ({ ...prev, publisherIpi: e.target.value }))}
                  placeholder="e.g. 00987654321"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                />
              </div>
            </div>
          </section>

          {/* Delivery Defaults */}
          <section className="bg-[#0e0e12] border border-zinc-800/90 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300">
                <Music className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Audio Delivery Defaults</h2>
                <p className="text-xs text-zinc-400">Industry standard delivery format expectations.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Default File Format</label>
                <select
                  value={formData.defaultFileFormat || 'WAV'}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultFileFormat: e.target.value }))}
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                >
                  <option value="WAV">WAV (.wav)</option>
                  <option value="AIFF">AIFF (.aif / .aiff)</option>
                  <option value="FLAC">FLAC (.flac)</option>
                  <option value="MP3">MP3 (320 kbps)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Default Sample Rate</label>
                <input
                  type="text"
                  value={formData.defaultSampleRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultSampleRate: e.target.value }))}
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                  placeholder="48 kHz"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Default Bit Depth</label>
                <input
                  type="text"
                  value={formData.defaultBitDepth}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultBitDepth: e.target.value }))}
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                  placeholder="24-bit"
                />
              </div>
            </div>
          </section>

        </form>
      </div>
    </div>
  );
}