import React, { useState } from 'react';
import { 
  Database, Search, HardDrive, Folder, Disc
} from 'lucide-react';
import type { ProjectBrief, ProjectTrack } from '../../types';

export interface DatabaseViewProps {
  projects?: ProjectBrief[];
  databaseBriefsList?: ProjectBrief[];
  databasePublishers?: string[];
  selectedDatabasePublisher?: string | null;
  selectedTrack?: ProjectTrack | null;
  isPlaying?: boolean;
  onToggleMute?: () => void;
  [key: string]: any;
}

export function DatabaseView(props: DatabaseViewProps): React.JSX.Element {
  const projectsList = props.projects || props.databaseBriefsList || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState<string>(
    props.selectedDatabasePublisher || 'All'
  );
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectsList[0]?.id || '');

  // Extract unique publishers
  const publishers = [
    'All',
    ...(props.databasePublishers && props.databasePublishers.length > 0
      ? props.databasePublishers
      : Array.from(new Set(projectsList.map(p => p.publisher).filter(Boolean))))
  ];
  
  // Extract unique states/statuses
  const states = ['All', 'In Progress', 'Delivered', 'Pending Review'];

  // Filter projects based on search and dropdowns
  const filteredProjects = projectsList.filter(brief => {
    const matchesSearch = 
      (brief.albumTitle && brief.albumTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (brief.publisher && brief.publisher.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (brief.code && brief.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (brief.tracks ?? []).some(t => t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPublisher = selectedPublisher === 'All' || brief.publisher === selectedPublisher;
    const projectState = brief.state || brief.status || 'In Progress';
    const matchesState = selectedState === 'All' || projectState === selectedState;

    return matchesSearch && matchesPublisher && matchesState;
  });

  const activeProject = projectsList.find(p => p.id === selectedProjectId) || filteredProjects[0] || null;

  return (
    <div className="flex-1 flex flex-col bg-[#070708] overflow-hidden text-zinc-300 select-none">
      
      {/* Top Header */}
      <div className="p-5 border-b border-zinc-800/80 bg-[#0c0c0e] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Publisher Master Database</h1>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                ARCHIVE ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Browse delivered album catalogues, cue registries, and production drive storage mappings.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search albums, cues, publishers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#141419] border border-zinc-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none w-56 focus:border-emerald-500 transition"
            />
          </div>

          {/* Publisher Select */}
          <select
            value={selectedPublisher}
            onChange={(e) => setSelectedPublisher(e.target.value)}
            className="bg-[#141419] border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer"
          >
            {publishers.map(pub => (
              <option key={pub} value={pub} className="bg-[#181820]">
                {pub === 'All' ? 'All Publishers' : pub}
              </option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-[#141419] border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer"
          >
            {states.map(st => (
              <option key={st} value={st} className="bg-[#181820]">
                {st === 'All' ? 'All Statuses' : st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Area: Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Catalogue Roster */}
        <div className="w-1/3 min-w-[340px] max-w-[420px] border-r border-zinc-800/80 flex flex-col bg-[#09090c] overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Catalogues ({filteredProjects.length})</span>
            </span>
          </div>

          <div className="space-y-2">
            {filteredProjects.map((brief) => {
              const isSelected = activeProject?.id === brief.id;
              const projectTracks = brief.tracks ?? [];
              const projectState = brief.state || brief.status || 'In Progress';
              const isDelivered = String(projectState).toLowerCase().includes('delivered');

              return (
                <div
                  key={brief.id}
                  onClick={() => setSelectedProjectId(brief.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-[#15151e] border-emerald-500/60 shadow-lg shadow-emerald-950/10'
                      : 'bg-[#101015] border-zinc-800/90 hover:border-zinc-700 hover:bg-[#131319]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-zinc-100 truncate">{brief.albumTitle}</h4>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      isDelivered 
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                    }`}>
                      {projectState}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">{brief.publisher}</span>
                    {brief.code && <span>• {brief.code}</span>}
                    {brief.deliveryYear && <span>• {brief.deliveryYear}</span>}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/50">
                    <span>{projectTracks.length} tracks registered</span>
                    {brief.deadline && <span>Deadline: {brief.deadline}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Catalogue Details & Cues Breakdown */}
        <div className="flex-1 flex flex-col bg-[#070708] overflow-y-auto p-6 space-y-6">
          {activeProject ? (
            <div className="space-y-6 max-w-4xl">
              
              {/* Project Card */}
              <div className="p-6 bg-[#0f0f14] border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                      {activeProject.publisher} {activeProject.code ? `• ${activeProject.code}` : ''}
                    </span>
                    <h2 className="text-2xl font-bold text-zinc-100">{activeProject.albumTitle}</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      {activeProject.description || 'Production music trailer album release.'}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block text-xs font-mono px-3 py-1 rounded-full font-bold border ${
                      String(activeProject.state || activeProject.status || '').toLowerCase().includes('delivered')
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                    }`}>
                      {activeProject.state || activeProject.status}
                    </span>
                    {activeProject.targetTracksCount && (
                      <span className="text-[10px] text-zinc-500 block font-mono">
                        Target: {activeProject.targetTracksCount} Tracks
                      </span>
                    )}
                  </div>
                </div>

                {/* Storage / SSD Path Card */}
                {activeProject.ssdPath && (
                  <div className="p-3 bg-[#14141b] border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-zinc-400">Master Drive Archive:</span>
                      <code className="text-emerald-300 font-mono truncate">{activeProject.ssdPath}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Registered Cues Table */}
              <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70">
                  <div className="flex items-center gap-2">
                    <Disc className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Registered Album Cue List ({(activeProject.tracks ?? []).length})
                    </h3>
                  </div>
                </div>

                {(activeProject.tracks ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {(activeProject.tracks ?? []).map((track: ProjectTrack, idx: number) => (
                      <div
                        key={track.id}
                        className="p-3.5 bg-[#131319] hover:bg-[#161620] border border-zinc-800/80 rounded-xl flex items-center justify-between gap-4 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-mono text-zinc-500 w-5 text-right">{idx + 1}.</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-zinc-100 truncate">{track.title}</h4>
                              <span className="text-[9px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                                {track.version || 'v1.0'}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                              {track.bpm ? `${track.bpm} BPM • ` : ''}{track.key ? `${track.key} • ` : ''}{track.style || ''} {track.duration ? `• ${track.duration}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* File Readout */}
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 block truncate max-w-xs">
                            {track.fileName || track.audioFileName || 'Master Stored in Archive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-zinc-800/60 rounded-xl bg-[#111116]">
                    No cues currently registered under this catalogue entry.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-500">
              <Database className="w-10 h-10 mb-3 text-zinc-700" />
              <p className="text-sm font-semibold">No catalogue selected</p>
              <p className="text-xs mt-1">Select an album or publisher from the left list to view registry details.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}