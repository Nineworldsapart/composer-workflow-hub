import React, { useState, useEffect } from 'react';
import { 
  Music, User, HardDrive, Speaker, ArrowRight, 
  FolderOpen, RefreshCw
} from 'lucide-react';
import type { ComposerProfile } from './views/SettingsView';

interface OnboardingModalProps {
  initialProfile: ComposerProfile;
  onComplete: (completedProfile: ComposerProfile) => void;
}

export function OnboardingModal({ initialProfile, onComplete }: OnboardingModalProps): React.JSX.Element {
  const [formData, setFormData] = useState<ComposerProfile>(initialProfile);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isScanningDevices, setIsScanningDevices] = useState(false);

  const fetchAudioOutputs = async () => {
    setIsScanningDevices(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        setAudioDevices(outputs);
      }
    } catch (err) {
      console.error('Failed to list audio devices:', err);
    } finally {
      setIsScanningDevices(false);
    }
  };

  useEffect(() => {
    fetchAudioOutputs();
  }, []);

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectStorageFolder) {
      const selectedPath = await window.electronAPI.selectStorageFolder();
      if (selectedPath) {
        setFormData(prev => ({ ...prev, storageRootPath: selectedPath }));
      }
    } else {
      const manual = prompt('Enter studio storage path:', formData.storageRootPath || '/Volumes/T7_Shield');
      if (manual) {
        setFormData(prev => ({ ...prev, storageRootPath: manual }));
      }
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    const selected = audioDevices.find(d => d.deviceId === deviceId);
    setFormData(prev => ({
      ...prev,
      audioOutputDeviceId: deviceId,
      audioOutputDeviceName: selected?.label || 'Default Output Device'
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const isReady = formData.fullName.trim().length > 0 && formData.storageRootPath.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507]/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-[#0d0d11] border border-zinc-700/80 rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center shadow-lg">
            <Music className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-zinc-100 tracking-tight uppercase">
                Welcome to Composer Workflow
              </h1>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                SETUP
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your studio workspace identity, audio interface, and storage drive to get started.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Section 1: Composer Identity */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Composer Identity</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Legal Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Williams"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-[#131318] border border-zinc-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Artist / Project Moniker</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Music / Media Cues"
                  value={formData.artistName}
                  onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
                  className="w-full bg-[#131318] border border-zinc-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Storage Hard Drive Location */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Studio Storage Root (SSD / Local Drive)</span>
            </span>

            <div className="bg-[#131318] border border-zinc-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Current Target Folder:</span>
                <span className="text-xs font-mono text-emerald-400 truncate block mt-0.5">
                  {formData.storageRootPath || '/Volumes/T7_Shield'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectFolder}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* Section 3: Audio Hardware Output */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Speaker className="w-3.5 h-3.5 text-emerald-400" />
                <span>Monitoring Audio Output Device</span>
              </span>
              <button
                type="button"
                onClick={fetchAudioOutputs}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
                title="Refresh interfaces"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningDevices ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            <select
              value={formData.audioOutputDeviceId || 'default'}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full bg-[#131318] border border-zinc-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none font-medium cursor-pointer"
            >
              <option value="default">Default System Audio Output</option>
              {audioDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Audio Interface / Headphones ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Launch Button */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              * You can update any of these anytime in <b>Studio Settings</b>.
            </span>

            <button
              type="submit"
              disabled={!isReady}
              className="flex items-center gap-2 bg-emerald-500 disabled:opacity-30 hover:bg-emerald-400 text-black font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95"
            >
              <span>Initialize Studio & Launch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}