import React, { useState, useRef } from 'react';
import {
  FolderKanban, Plus, Trash2, Edit3, UploadCloud,
  Clock, FileAudio, GripVertical,
  X, Check, Layers, Disc, Sliders
} from 'lucide-react';
import type { ProjectBrief, ProjectTrack, DynamicDeliverableItem } from '../../types';

export interface ProjectsViewProps {
  projects?: ProjectBrief[];
  activeProjectsList?: ProjectBrief[];
  onSelectProject?: (id: any) => void;
  onSelectTrack?: (id: any) => void;
  onDeleteTrack?: (id: any) => void;
  onApplyPreset?: (preset: any) => void;
  onSelectPreset?: (preset: any) => void;
  [key: string]: any;
}

const DEFAULT_DELIVERABLES: DynamicDeliverableItem[] = [
  { id: 'del-1', name: 'Main Full Mix', category: 'mix', status: 'pending' },
  { id: 'del-2', name: 'Instrumental Mix', category: 'mix', status: 'pending' },
  { id: 'del-3', name: 'Underscore Mix', category: 'mix', status: 'pending' },
  { id: 'del-4', name: '24-bit / 48k Master WAV', category: 'master', status: 'pending' },
  { id: 'del-5', name: '320kbps MP3 Reference', category: 'master', status: 'pending' },
  { id: 'del-6', name: '60s TV Cutdown', category: 'alt', status: 'pending' },
  { id: 'del-7', name: '30s Promo Cutdown', category: 'alt', status: 'pending' },
  { id: 'del-8', name: 'Strings Stem', category: 'stem', status: 'pending' },
  { id: 'del-9', name: 'Brass Stem', category: 'stem', status: 'pending' },
  { id: 'del-10', name: 'Percussion / Hits Stem', category: 'stem', status: 'pending' },
  { id: 'del-11', name: 'Synth & Sound Design Stem', category: 'stem', status: 'pending' },
  { id: 'del-12', name: 'Choir / Vocal Stem', category: 'stem', status: 'pending' }
];

export function ProjectsView(props: ProjectsViewProps): React.JSX.Element {
  const projectsList: ProjectBrief[] = props.projects || props.activeProjectsList || [];
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectsList[0]?.id || '');

  const [tracks, setTracks] = useState<ProjectTrack[]>([
    {
      id: 'trk-1',
      title: 'Wrath of the Titans',
      version: 'v1.4',
      bpm: 130,
      key: 'D min',
      style: 'Dark Hybrid Trailer',
      duration: '2:35',
      notes: 'Needs punchier sub hit at bar 42 drop.',
      audioFileName: 'Wrath_v1.4_Master.wav',
      audioFileSize: '42.1 MB',
      checklist: {},
      deliverables: [...DEFAULT_DELIVERABLES]
    },
    {
      id: 'trk-2',
      title: 'Neon Horizon',
      version: 'v2.0',
      bpm: 118,
      key: 'F# min',
      style: 'Cyberpunk Action',
      duration: '3:10',
      notes: 'Approved by supervisor. Ready for final stem printing.',
      checklist: {},
      deliverables: [...DEFAULT_DELIVERABLES]
    },
    {
      id: 'trk-3',
      title: 'Requiem for Gods',
      version: 'v1.0',
      bpm: 90,
      key: 'A min',
      style: 'Epic Choral Drama',
      duration: '1:58',
      notes: 'Record live solo cello for the middle breakdown.',
      checklist: {},
      deliverables: [...DEFAULT_DELIVERABLES]
    }
  ]);

  const [activeTrackId, setActiveTrackId] = useState<string>(tracks[0]?.id || '');
  const [editingTrackModal, setEditingTrackModal] = useState<ProjectTrack | null>(null);
  const [editingItemNameId, setEditingItemNameId] = useState<string | null>(null);

  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const trackAudioInputRef = useRef<HTMLInputElement | null>(null);
  const stemFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetDeliverableIdForUpload, setTargetDeliverableIdForUpload] = useState<string | null>(null);

  const activeTrack = tracks.find(t => t.id === activeTrackId) || tracks[0] || null;

  const handleDragStart = (index: number) => {
    dragItemIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItemIndex.current = index;
  };

  const handleDragEnd = () => {
    if (dragItemIndex.current === null || dragOverItemIndex.current === null) return;
    if (dragItemIndex.current === dragOverItemIndex.current) return;

    const updated = [...tracks];
    const [draggedItem] = updated.splice(dragItemIndex.current, 1);
    updated.splice(dragOverItemIndex.current, 0, draggedItem);

    setTracks(updated);
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleAddNewTrack = () => {
    const newTrk: ProjectTrack = {
      id: `trk-${Date.now()}`,
      title: `Cue ${tracks.length + 1} - Untitled`,
      version: 'v1.0',
      bpm: 120,
      key: 'D min',
      style: 'Hybrid Trailer',
      duration: '2:15',
      notes: '',
      checklist: {},
      deliverables: DEFAULT_DELIVERABLES.map(d => ({ ...d, id: `del-${Date.now()}-${Math.random()}` }))
    };
    setTracks(prev => [...prev, newTrk]);
    setActiveTrackId(newTrk.id);
  };

  const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tracks.length <= 1) return;
    setTracks(prev => prev.filter(t => t.id !== id));
    if (activeTrackId === id) {
      const remaining = tracks.filter(t => t.id !== id);
      if (remaining.length > 0) setActiveTrackId(remaining[0].id);
    }
  };

  const handleAddDeliverableItem = (category: 'mix' | 'master' | 'alt' | 'stem') => {
    if (!activeTrack) return;
    const categoryTitles = {
      mix: 'Custom Mix Pass',
      master: 'Custom Master Delivery',
      alt: 'Custom Alt Cutdown',
      stem: 'Custom Audio Stem'
    };

    const newItem: DynamicDeliverableItem = {
      id: `del-${Date.now()}`,
      name: categoryTitles[category],
      category,
      status: 'pending'
    };

    setTracks(prev => prev.map(t => {
      if (t.id === activeTrack.id) {
        return {
          ...t,
          deliverables: [...(t.deliverables ?? []), newItem]
        };
      }
      return t;
    }));
  };

  const handleDeleteDeliverable = (itemId: string) => {
    if (!activeTrack) return;
    setTracks(prev => prev.map(t => {
      if (t.id === activeTrack.id) {
        return {
          ...t,
          deliverables: (t.deliverables ?? []).filter(d => d.id !== itemId)
        };
      }
      return t;
    }));
  };

  const handleToggleStatus = (itemId: string) => {
    if (!activeTrack) return;
    setTracks(prev => prev.map(t => {
      if (t.id === activeTrack.id) {
        return {
          ...t,
          deliverables: (t.deliverables ?? []).map(d => {
            if (d.id === itemId) {
              const nextStatus: Record<DynamicDeliverableItem['status'], DynamicDeliverableItem['status']> = {
                pending: 'in_progress',
                in_progress: 'complete',
                complete: 'pending'
              };
              return { ...d, status: nextStatus[d.status] };
            }
            return d;
          })
        };
      }
      return t;
    }));
  };

  const handleTriggerUpload = (deliverableId: string) => {
    setTargetDeliverableIdForUpload(deliverableId);
    stemFileInputRef.current?.click();
  };

  const handleDeliverableFileSelected = (file: File) => {
    if (!activeTrack || !targetDeliverableIdForUpload) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const blobUrl = URL.createObjectURL(file);

    setTracks(prev => prev.map(t => {
      if (t.id === activeTrack.id) {
        return {
          ...t,
          deliverables: (t.deliverables ?? []).map(d => {
            if (d.id === targetDeliverableIdForUpload) {
              return {
                ...d,
                status: 'complete',
                file: {
                  name: file.name,
                  size: sizeMb,
                  blobUrl,
                  uploadedAt: 'Just now'
                }
              };
            }
            return d;
          })
        };
      }
      return t;
    }));
    setTargetDeliverableIdForUpload(null);
  };

  const handleTrackMasterAudioUpload = (file: File) => {
    if (!editingTrackModal) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const blobUrl = URL.createObjectURL(file);

    const updated: ProjectTrack = {
      ...editingTrackModal,
      audioFileName: file.name,
      audioFileSize: sizeMb,
      audioBlobUrl: blobUrl
    };

    setEditingTrackModal(updated);
    setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDeleteTrackMasterAudio = () => {
    if (!editingTrackModal) return;
    const updated: ProjectTrack = {
      ...editingTrackModal,
      audioFileName: undefined,
      audioFileSize: undefined,
      audioBlobUrl: undefined
    };
    setEditingTrackModal(updated);
    setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleSaveModal = () => {
    if (!editingTrackModal) return;
    setTracks(prev => prev.map(t => t.id === editingTrackModal.id ? editingTrackModal : t));
    setEditingTrackModal(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070708] overflow-hidden text-zinc-300 select-none">
      
      {/* Top Header */}
      <div className="p-5 border-b border-zinc-800/80 bg-[#0c0c0e] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Project Cue Roster & Deliverables</h1>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                DRAG REORDER ACTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Drag track handles to reorder cues. Double-click any track to edit metadata & master audio. Manage flexible deliverables below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {projectsList.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#141419] border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer"
            >
              {projectsList.map(p => (
                <option key={p.id} value={p.id} className="bg-[#181820]">
                  {p.albumTitle}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleAddNewTrack}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Cue</span>
          </button>
        </div>
      </div>

      {/* Main Center Stage */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left / Center: Reorderable Track Roster */}
        <div className="w-1/3 min-w-[340px] max-w-[420px] border-r border-zinc-800/80 flex flex-col bg-[#09090c] overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-emerald-400" />
              <span>Project Cues ({tracks.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Double-click to edit</span>
          </div>

          <div className="space-y-2">
            {tracks.map((track, index) => {
              const isSelected = activeTrackId === track.id;

              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => setActiveTrackId(track.id)}
                  onDoubleClick={() => setEditingTrackModal(track)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative group flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#15151e] border-emerald-500/60 shadow-lg shadow-emerald-950/10'
                      : 'bg-[#101015] border-zinc-800/90 hover:border-zinc-700 hover:bg-[#131319]'
                  }`}
                  title="Drag handle to reorder. Double-click to open metadata & audio manager."
                >
                  <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-300 pt-0.5">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-mono text-zinc-500 font-semibold">{index + 1}.</span>
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{track.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-bold">
                        {track.version}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                      <span>{track.bpm} BPM</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">{track.key}</span>
                      <span>•</span>
                      <span className="truncate">{track.style}</span>
                    </div>

                    {track.audioFileName ? (
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 w-fit mt-1">
                        <FileAudio className="w-3 h-3" />
                        <span className="truncate max-w-[170px]">{track.audioFileName}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-zinc-600 italic block mt-0.5">No reference master loaded</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTrackModal(track);
                      }}
                      className="p-1 text-zinc-400 hover:text-white rounded"
                      title="Edit Track"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {tracks.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteTrack(track.id, e)}
                        className="p-1 text-zinc-400 hover:text-rose-400 rounded"
                        title="Delete Track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dynamic Deliverables & Stem Checklist */}
        <div className="flex-1 flex flex-col bg-[#070708] overflow-y-auto p-6 space-y-6">
          {activeTrack ? (
            <div className="space-y-6 max-w-4xl">
              
              {/* Cue Summary Header */}
              <div className="p-5 bg-[#0f0f14] border border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-zinc-100">{activeTrack.title}</h2>
                    <span className="text-xs font-mono bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-bold">
                      {activeTrack.version}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    {activeTrack.bpm} BPM • Key of {activeTrack.key} • {activeTrack.style} {activeTrack.duration && `• ${activeTrack.duration}`}
                  </p>
                </div>

                <button
                  onClick={() => setEditingTrackModal(activeTrack)}
                  className="flex items-center gap-1.5 bg-[#171720] hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Edit Track Details</span>
                </button>
              </div>

              {/* Deliverable Sections: Mixes, Masters, Alt Mixes, Stems */}
              {(['mix', 'master', 'alt', 'stem'] as const).map((category) => {
                const categoryLabels = {
                  mix: '1. Mix Passes (Full, Instrumental, Underscore)',
                  master: '2. Masters & Reference Files (24-bit / 48k WAV, MP3)',
                  alt: '3. Cutdowns & Broadcast Versions (60s, 30s, Stingers)',
                  stem: '4. Audio Stems (Strings, Brass, Perc, Synth, Choir)'
                };

                const items = (activeTrack.deliverables ?? []).filter(d => d.category === category);

                return (
                  <div key={category} className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                          {categoryLabels[category]}
                        </h3>
                      </div>

                      <button
                        onClick={() => handleAddDeliverableItem(category)}
                        className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add {category === 'stem' ? 'Stem' : 'Version'}</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {items.map((item) => {
                        const isEditing = editingItemNameId === item.id;

                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-[#131319] hover:bg-[#161620] border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 group transition"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                onClick={() => handleToggleStatus(item.id)}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                                  item.status === 'complete'
                                    ? 'bg-emerald-500 border-emerald-400 text-black'
                                    : item.status === 'in_progress'
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                    : 'border-zinc-700 bg-zinc-800/60 text-transparent hover:border-zinc-500'
                                }`}
                                title="Click to cycle status"
                              >
                                {item.status === 'complete' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                {item.status === 'in_progress' && <Clock className="w-3 h-3" />}
                              </button>

                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTracks(prev => prev.map(t => t.id === activeTrack.id ? {
                                        ...t,
                                        deliverables: (t.deliverables ?? []).map(d => d.id === item.id ? { ...d, name: val } : d)
                                      } : t));
                                    }}
                                    onBlur={() => setEditingItemNameId(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingItemNameId(null)}
                                    className="bg-black/90 border border-emerald-400 rounded px-2 py-0.5 text-xs text-white font-bold outline-none w-full"
                                    autoFocus
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span 
                                      onDoubleClick={() => setEditingItemNameId(item.id)}
                                      className={`text-xs font-semibold truncate cursor-pointer hover:text-white ${
                                        item.status === 'complete' ? 'text-zinc-300' : 'text-zinc-200'
                                      }`}
                                    >
                                      {item.name}
                                    </span>
    <button
                                      onClick={() => setEditingItemNameId(item.id)}
                                      className="text-zinc-400 hover:text-emerald-400 p-1 rounded hover:bg-zinc-800 transition"
                                      title="Rename deliverable"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {item.file && (
                                  <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 mt-0.5">
                                    <FileAudio className="w-3 h-3" />
                                    <span className="truncate max-w-sm">{item.file.name} ({item.file.size})</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTriggerUpload(item.id)}
                                className="flex items-center gap-1.5 bg-[#1a1a24] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                                title="Upload or replace audio file for this deliverable"
                              >
                                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{item.file ? 'Replace' : 'Upload'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteDeliverable(item.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                                title="Delete this deliverable requirement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-500">
              <Disc className="w-10 h-10 mb-3 text-zinc-700" />
              <p className="text-sm font-semibold">No track selected</p>
              <p className="text-xs mt-1">Select or add a track in the left roster to view deliverables and stems.</p>
            </div>
          )}
        </div>

      </div>

      <input
        type="file"
        ref={stemFileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleDeliverableFileSelected(e.target.files[0]);
          }
        }}
        accept=".wav,.aif,.aiff,.mp3,.flac,.zip"
        className="hidden"
      />

      <input
        type="file"
        ref={trackAudioInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleTrackMasterAudioUpload(e.target.files[0]);
          }
        }}
        accept=".wav,.aif,.aiff,.mp3,.flac"
        className="hidden"
      />

      {/* DOUBLE-CLICK TRACK METADATA & AUDIO MANAGER MODAL */}
      {editingTrackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0e0e13] border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Cue Metadata & Audio Manager</h3>
                  <p className="text-xs text-zinc-400">Edit track attributes, replace audio versions, or remove tracks.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTrackModal(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Track Title</label>
                <input
                  type="text"
                  value={editingTrackModal.title}
                  onChange={(e) => setEditingTrackModal({ ...editingTrackModal, title: e.target.value })}
                  className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-2.5 text-zinc-100 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Version</label>
                  <input
                    type="text"
                    value={editingTrackModal.version || 'v1.0'}
                    onChange={(e) => setEditingTrackModal({ ...editingTrackModal, version: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-2 text-zinc-100 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={editingTrackModal.bpm || 120}
                    onChange={(e) => setEditingTrackModal({ ...editingTrackModal, bpm: parseInt(e.target.value) || 120 })}
                    className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-2 text-zinc-100 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Key</label>
                  <input
                    type="text"
                    value={editingTrackModal.key || 'D min'}
                    onChange={(e) => setEditingTrackModal({ ...editingTrackModal, key: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-2 text-zinc-100 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Style / Genre Tag</label>
                <input
                  type="text"
                  value={editingTrackModal.style || ''}
                  onChange={(e) => setEditingTrackModal({ ...editingTrackModal, style: e.target.value })}
                  className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-2.5 text-zinc-100 outline-none"
                />
              </div>

              <div className="p-4 bg-[#14141b] border border-zinc-800 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Current Master Audio Version
                </span>

                {editingTrackModal.audioFileName ? (
                  <div className="flex items-center justify-between gap-3 bg-[#0d0d12] p-2.5 rounded-lg border border-zinc-700/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-100 truncate block">
                          {editingTrackModal.audioFileName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {editingTrackModal.audioFileSize}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => trackAudioInputRef.current?.click()}
                        className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-md font-semibold transition"
                      >
                        Upload New Version
                      </button>
                      <button
                        onClick={handleDeleteTrackMasterAudio}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
                        title="Delete current audio reference"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500 italic">No audio master attached.</span>
                    <button
                      onClick={() => trackAudioInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Master Audio</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Production Notes & Directives</label>
                <textarea
                  value={
                    Array.isArray(editingTrackModal.notes)
                      ? editingTrackModal.notes.map((n: any) => n.text || '').join('\n')
                      : (editingTrackModal.notes || '')
                  }
                  onChange={(e) => setEditingTrackModal({ ...editingTrackModal, notes: e.target.value })}
                  rows={3}
                  placeholder="Mix adjustments, drop timestamps, client feedback..."
                  className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-2.5 text-zinc-100 outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setEditingTrackModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-2 rounded-xl text-xs transition shadow-md shadow-emerald-950/20"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/* --- Interactive Publisher Deliverables Manager --- */
interface DeliverablesEditorProps {
  deliverables?: DynamicDeliverableItem[];
  onChange: (items: DynamicDeliverableItem[]) => void;
}

export function DeliverablesManager({ deliverables = [], onChange }: DeliverablesEditorProps): React.JSX.Element {
  const [newTag, setNewTag] = React.useState('');

  const defaultPresets = [
    'Master 48k/24b WAV',
    'Full Mix (MP3 320k)',
    'Instrumental / Underscore',
    '60s Broadcast Cut',
    '30s Promo Cut',
    '15s Sting / Bumper',
    'Drums & Percussion Stem',
    'Melodic / Lead Stem',
    'Bass & Sub Stem',
    'Sound Design / FX Stem',
    'Mastered Cue Sheet (PDF)'
  ];

  const currentItems: DynamicDeliverableItem[] = (deliverables && deliverables.length > 0) ? deliverables : [
    { id: '1', name: 'Master 48k/24b WAV', required: true, received: true, category: 'audio', status: 'ready' },
    { id: '2', name: 'Instrumental', required: true, received: false, category: 'audio', status: 'pending' },
    { id: '3', name: 'Full Stems (ZIP)', required: true, received: false, category: 'audio', status: 'pending' },
    { id: '4', name: 'Metadata & Cue Sheet', required: true, received: false, category: 'docs', status: 'pending' }
  ];

  const handleToggle = (id: string) => {
    const updated: DynamicDeliverableItem[] = currentItems.map(item => item.id === id ? { ...item, received: !item.received, status: !item.received ? 'ready' : 'pending' } : item);
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    const updated: DynamicDeliverableItem[] = currentItems.filter(item => item.id !== id);
    onChange(updated);
  };

  const handleAdd = (nameToAdd?: string) => {
    const text = (nameToAdd || newTag).trim();
    if (!text) return;
    if (currentItems.some(item => item.name.toLowerCase() === text.toLowerCase())) {
      setNewTag('');
      return;
    }
    const updated = [...currentItems, { id: 'deliv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4), name: text, required: true, received: false }];
    onChange(updated);
    setNewTag('');
  };

  return (
    <div className="p-5 rounded-2xl bg-[#0e1017] border border-white/10 shadow-xl space-y-4 text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div>
          <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <span>Required Publisher Deliverables</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {currentItems.filter(i => i.received).length}/{currentItems.length} Ready
            </span>
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Customize the specific audio masters, cuts, and stem formats requested by this publisher.
          </p>
        </div>
      </div>

      {/* Preset Quick-Add Badges */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Quick-Add Publisher Presets</label>
        <div className="flex flex-wrap gap-1.5">
          {defaultPresets.map(preset => {
            const exists = currentItems.some(i => i.name.toLowerCase() === preset.toLowerCase());
            return (
              <button
                key={preset}
                type="button"
                disabled={exists}
                onClick={() => handleAdd(preset)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                  exists
                    ? 'opacity-40 cursor-not-allowed bg-zinc-900 border-zinc-800 text-zinc-500'
                    : 'bg-[#161922] border-white/10 text-zinc-300 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-950/20'
                }`}
              >
                + {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tag Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="Add custom required file (e.g. 5.1 Surround Sub-mix, Atmos stem, Pro Tools Session)..."
          className="flex-1 px-3 py-2 rounded-xl text-xs bg-[#090a0f] border border-white/10 text-zinc-100 focus:border-emerald-500 outline-none"
        />
        <button
          type="button"
          onClick={() => handleAdd()}
          className="px-4 py-2 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black text-xs transition shadow-lg shadow-emerald-950/40"
        >
          Add File Requirement
        </button>
      </div>

      {/* Dynamic Deliverables List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
        {currentItems.map(item => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
              item.received
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-[#141620] border-white/5 text-zinc-300'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2 select-none">
              <input
                type="checkbox"
                checked={!!item.received}
                onChange={() => handleToggle(item.id)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span className={`text-xs ${item.received ? 'line-through text-zinc-400 font-medium' : 'font-semibold text-zinc-200'}`}>
                {item.name}
              </span>
            </label>
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="text-zinc-500 hover:text-red-400 p-1 rounded transition text-xs"
              title="Remove deliverable requirement"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
