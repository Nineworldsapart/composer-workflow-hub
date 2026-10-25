import React, { useRef } from 'react';
import { 
  Play, Trash2, UploadCloud, FileCheck 
} from 'lucide-react';

import type { 
  Track, 
  MixChecklist, 
  DeliverableFileItem 
} from '../../types';

interface DeliverableSlotConfig {
  key: keyof MixChecklist;
  label: string;
  category: 'Masters' | 'Mix' | 'Alt Mix' | 'Stems' | 'Cuts';
  subFolder: string;
  description: string;
}

interface DeliverableFileManagerProps {
  track: Track;
  ssdBasePath: string;
  fullMixHeadroomDb?: string;
  onToggleChecklist: (key: keyof MixChecklist) => void;
  onAssignDeliverableFile: (
    trackId: string, 
    slotKey: keyof MixChecklist, 
    file: { name: string; size: string; path: string }
  ) => void;
  onRemoveDeliverableFile: (trackId: string, slotKey: keyof MixChecklist) => void;
  onPlaySpecificFile?: (trackId: string, fileName: string, label: string) => void;
}

export function DeliverableFileManager({
  track,
  ssdBasePath,
  fullMixHeadroomDb = '-3.0 dB',
  onToggleChecklist,
  onAssignDeliverableFile,
  onRemoveDeliverableFile,
  onPlaySpecificFile
}: DeliverableFileManagerProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeSlotKeyRef = useRef<keyof MixChecklist | null>(null);

  const slotConfigs: DeliverableSlotConfig[] = [
    {
      key: 'master',
      label: '01. MASTER WAV',
      category: 'Masters',
      subFolder: '01_Masters',
      description: 'Full mix master uncompressed 24-bit/48kHz'
    },
    {
      key: 'fullMix',
      label: '02. FULL MIX (UNMASTERED)',
      category: 'Mix',
      subFolder: '01_Masters',
      description: `Mix bus output calibrated to target headroom (${fullMixHeadroomDb})`
    },
    {
      key: 'altMix1',
      label: '03. NO LEAD / INSTRUMENTAL',
      category: 'Alt Mix',
      subFolder: '02_AltMixes',
      description: 'Full cue minus lead melodies or primary motifs'
    },
    {
      key: 'altMix2',
      label: '04. UNDERSCORE MIX',
      category: 'Alt Mix',
      subFolder: '02_AltMixes',
      description: 'Stripped low dynamics mix for dialogue beds'
    },
    {
      key: 'drumsSfx',
      label: '05. DRUMS & HITS ONLY',
      category: 'Alt Mix',
      subFolder: '02_AltMixes',
      description: 'Isolated percussion, braams, and trailer sound design'
    },
    {
      key: 'stems',
      label: '06. STEMS ZIP PACKAGE',
      category: 'Stems',
      subFolder: '03_Stems',
      description: 'Separated audio stems archive (Strings, Brass, Synths, FX, Percussion)'
    },
    {
      key: 'cut60',
      label: '07. 60-SEC CUTDOWN',
      category: 'Cuts',
      subFolder: '04_Cuts',
      description: 'Dedicated 60-second broadcast commercial edit'
    },
    {
      key: 'cut30',
      label: '08. 30-SEC CUTDOWN',
      category: 'Cuts',
      subFolder: '04_Cuts',
      description: 'Fast 30-second TV / Social promo edit'
    },
    {
      key: 'cut15',
      label: '09. 15-SEC STINGER',
      category: 'Cuts',
      subFolder: '04_Cuts',
      description: 'Short ident bumper / logo sting'
    }
  ];

  const handleTriggerUpload = (slotKey: keyof MixChecklist) => {
    activeSlotKeyRef.current = slotKey;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slotKey = activeSlotKeyRef.current;
    if (!slotKey || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    
    const config = slotConfigs.find(s => s.key === slotKey);
    const subFolder = config?.subFolder || '01_Masters';
    const destinationPath = `${ssdBasePath}/${track.trackNumber}_${track.title}/${subFolder}/${file.name}`;

    onAssignDeliverableFile(track.id, slotKey, {
      name: file.name,
      size: sizeMb,
      path: destinationPath
    });

    activeSlotKeyRef.current = null;
  };

  return (
    <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Mix & Stems Delivery Package</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Check off requirements manually or attach audio files directly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 pt-2">
        {slotConfigs.map(config => {
          const isChecked = track.checklist?.[config.key] ?? false;
          const deliverable: DeliverableFileItem | undefined = track.deliverableFiles?.[config.key];

          return (
            <div
              key={String(config.key)}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                isChecked 
                  ? 'bg-[#121614] border-emerald-500/40' 
                  : 'bg-[#121217] border-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleChecklist(config.key)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200 block truncate">
                      {config.label}
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-zinc-800/80 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-700/50">
                      {config.category}
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    {config.description}
                  </span>

                  {deliverable && (
                    <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-emerald-400">
                      <FileCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[280px]">{deliverable.fileName}</span>
                      <span className="text-zinc-500">({deliverable.fileSize})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {deliverable ? (
                  <>
                    {onPlaySpecificFile && (
                      <button
                        type="button"
                        onClick={() => onPlaySpecificFile(track.id, deliverable.fileName, config.label)}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveDeliverableFile(track.id, config.key)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                      title="Remove file from slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload(config.key)}
                    className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <UploadCloud className="w-3 h-3 text-emerald-400" />
                    <span>Attach File</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".wav,.aif,.aiff,.zip,.mp3"
        className="hidden"
      />
    </div>
  );
}