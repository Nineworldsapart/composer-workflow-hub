import React, { useState, useRef } from 'react';
import { 
  Search, Play, Pause, Plus, Trash2, 
  ListMusic, Music, Volume2, VolumeX, UploadCloud,
  FileCheck, ArrowRight, X
} from 'lucide-react';
import type { LibraryItem, Playlist, Track } from '../../types';

interface LibraryViewProps {
  library: LibraryItem[];
  playlists: Playlist[];
  selectedTrack: Track | null;
  isPlaying: boolean;
  isMuted: boolean;
  currentTimeSec: number;
  totalLengthSec: number;
  selectedPlaylistId: string | null;
  isRecentlyAddedView: boolean;
  librarySearchQuery: string;
  activePlaylistMenuTrackId: string | null;
  onSelectAllTracks: () => void;
  onSelectRecentlyAdded: () => void;
  onSetSelectedPlaylistId: (id: string | null) => void;
  onSetLibrarySearchQuery: (query: string) => void;
  onPlayTrackItem: (trackId: string) => void;
  onTogglePlayPause: () => void;
  onSeek: (timeSec: number) => void;
  onToggleMute: () => void;
  onToggleTrackInPlaylist: (playlistId: string, trackId: string) => void;
  onOpenNewPlaylistModal: () => void;
  onSetActivePlaylistMenuTrackId: (trackId: string | null) => void;
  onRequestDeleteTrack: (track: LibraryItem) => void;
  onAddLibraryTrack?: (track: {
    title: string;
    fileName: string;
    fileSize: string;
    bpm: number;
    key: string;
    version: string;
    publisher: string;
    albumTitle: string;
  }) => void;
}

export function LibraryView({
  library,
  playlists,
  selectedTrack,
  isPlaying,
  isMuted,
  currentTimeSec,
  totalLengthSec,
  selectedPlaylistId,
  isRecentlyAddedView,
  librarySearchQuery,
  activePlaylistMenuTrackId,
  onSetLibrarySearchQuery,
  onPlayTrackItem,
  onTogglePlayPause,
  onSeek,
  onToggleMute,
  onToggleTrackInPlaylist,
  onOpenNewPlaylistModal,
  onSetActivePlaylistMenuTrackId,
  onRequestDeleteTrack,
  onAddLibraryTrack
}: LibraryViewProps): React.JSX.Element {
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    title: '',
    fileName: '',
    fileSize: '',
    bpm: 128,
    key: 'D min',
    version: 'v1.0',
    publisher: 'Independent',
    albumTitle: 'Singles Catalog'
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePlaylist = playlists.find(p => p.id === selectedPlaylistId);

  const filteredLibrary = library.filter(item => {
    if (selectedPlaylistId) {
      if (!activePlaylist?.trackIds.includes(item.trackId)) {
        return false;
      }
    }

    if (librarySearchQuery.trim()) {
      const q = librarySearchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchFile = item.fileName.toLowerCase().includes(q);
      const matchKey = item.key.toLowerCase().includes(q);
      const matchPub = item.publisher.toLowerCase().includes(q);
      const matchAlbum = item.albumTitle.toLowerCase().includes(q);
      return matchTitle || matchFile || matchKey || matchPub || matchAlbum;
    }

    return true;
  });

  const displayList = isRecentlyAddedView
    ? [...filteredLibrary].reverse()
    : filteredLibrary;

  const handleFileChosen = (file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const cleanedTitle = file.name
      .replace(/\.(wav|aif|aiff|mp3|m4a|flac)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    setImportForm(prev => ({
      ...prev,
      fileName: file.name,
      fileSize: sizeMb,
      title: cleanedTitle || 'Untitled Cue'
    }));
  };

  const handleSaveImport = () => {
    if (!importForm.title.trim() || !importForm.fileName) return;
    if (onAddLibraryTrack) {
      onAddLibraryTrack(importForm);
    }
    setIsImportModalOpen(false);
    setImportForm({
      title: '',
      fileName: '',
      fileSize: '',
      bpm: 128,
      key: 'D min',
      version: 'v1.0',
      publisher: 'Independent',
      albumTitle: 'Singles Catalog'
    });
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070708] overflow-hidden text-zinc-300">
      
      {/* Top Header */}
      <div className="p-6 border-b border-zinc-800/80 bg-[#0c0c0e] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                {selectedPlaylistId 
                  ? activePlaylist?.name 
                  : isRecentlyAddedView 
                  ? 'Recently Added Tracks' 
                  : 'Complete Audio Master Library'}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {displayList.length} master files indexed across all publisher catalogues.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={librarySearchQuery}
              onChange={(e) => onSetLibrarySearchQuery(e.target.value)}
              placeholder="Search library, keys, BPM..."
              className="w-full bg-[#121217] border border-zinc-800 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 outline-none"
            />
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Audio Master</span>
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#0a0a0d] text-zinc-400 uppercase font-mono text-[10px] tracking-wider select-none">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Title / Cue</th>
              <th className="py-3 px-4">Publisher / Album</th>
              <th className="py-3 px-4 w-24">BPM</th>
              <th className="py-3 px-4 w-28">Key</th>
              <th className="py-3 px-4 w-24">Length</th>
              <th className="py-3 px-4 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-zinc-500 text-xs">
                  No matching tracks found in library.
                </td>
              </tr>
            ) : (
              displayList.map((item) => {
                const isSelected = selectedTrack?.id === item.trackId;
                const isTrackPlaying = isSelected && isPlaying;
                const isMenuOpen = activePlaylistMenuTrackId === item.trackId;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onPlayTrackItem(item.trackId)}
                    className={`group transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#15151c] text-zinc-100'
                        : 'hover:bg-[#111115] text-zinc-300'
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-zinc-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrackItem(item.trackId);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition mx-auto ${
                          isSelected
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-800 text-zinc-300 group-hover:bg-emerald-500 group-hover:text-black'
                        }`}
                      >
                        {isTrackPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-100 text-xs truncate max-w-xs">{item.title}</div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate max-w-xs">{item.fileName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-200 truncate">{item.publisher}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{item.albumTitle}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {item.bpm} BPM
                    </td>

                    <td className="py-3 px-4 font-mono text-emerald-400">
                      {item.key}
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {formatTime(item.durationSec || 155)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {/* Add to Playlist button */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetActivePlaylistMenuTrackId(isMenuOpen ? null : item.trackId);
                            }}
                            className={`p-1.5 rounded-lg border transition ${
                              isMenuOpen 
                                ? 'bg-zinc-700 text-white border-zinc-600'
                                : 'text-zinc-400 hover:text-white bg-zinc-800/80 border-zinc-700'
                            }`}
                            title="Add to Playlist"
                          >
                            <ListMusic className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-2 w-48 bg-[#141419] border border-zinc-700 rounded-xl shadow-2xl p-2 z-50 space-y-1 text-left"
                            >
                              <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">
                                Add to Playlist
                              </div>
                              {playlists.map(pl => {
                                const inPlaylist = pl.trackIds.includes(item.trackId);
                                return (
                                  <button
                                    key={pl.id}
                                    onClick={() => onToggleTrackInPlaylist(pl.id, item.trackId)}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                                      inPlaylist
                                        ? 'bg-emerald-950/40 text-emerald-300 font-bold'
                                        : 'text-zinc-300 hover:bg-zinc-800'
                                    }`}
                                  >
                                    <span className="truncate">{pl.name}</span>
                                    {inPlaylist && <span className="text-[10px] font-mono text-emerald-400">✓</span>}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => {
                                  onSetActivePlaylistMenuTrackId(null);
                                  onOpenNewPlaylistModal();
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-zinc-800 transition border-t border-zinc-800 mt-1"
                              >
                                + New Playlist...
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete from library */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDeleteTrack(item);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition"
                          title="Delete from Library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Persistent Audio Player Bar */}
      {selectedTrack && (
        <div className="p-4 bg-[#0d0d10] border-t border-zinc-800/90 flex flex-wrap items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3 min-w-[200px]">
            <button
              onClick={onTogglePlayPause}
              className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold transition shadow-md active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-100 block truncate">{selectedTrack.title}</span>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {selectedTrack.bpm} BPM • {selectedTrack.key} • {selectedTrack.version}
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-xl flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-500 w-10 text-right">{formatTime(currentTimeSec)}</span>
            <input
              type="range"
              min={0}
              max={totalLengthSec || 160}
              value={currentTimeSec}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-zinc-500 w-10">{formatTime(totalLengthSec || 160)}</span>
          </div>

          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg border transition ${
              isMuted ? 'bg-rose-950/40 text-rose-400 border-rose-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Manual Track Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e0e12] border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Add Audio Master to Library</h3>
                  <p className="text-xs text-zinc-400">Directly catalog an existing mix or track.</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer bg-[#121217] transition"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChosen(e.target.files[0]);
                  }
                }}
                accept=".wav,.aif,.aiff,.mp3,.flac"
                className="hidden"
              />
              {importForm.fileName ? (
                <div className="flex items-center justify-center gap-2 font-mono text-xs text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                  <span>{importForm.fileName} ({importForm.fileSize})</span>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Click to select audio file (.wav, .aif, .mp3)
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Track Title *</label>
                <input
                  type="text"
                  value={importForm.title}
                  onChange={(e) => setImportForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Relentless Pursuits"
                  className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={importForm.bpm}
                    onChange={(e) => setImportForm(prev => ({ ...prev, bpm: Number(e.target.value) || 120 }))}
                    className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Key</label>
                  <input
                    type="text"
                    value={importForm.key}
                    onChange={(e) => setImportForm(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="e.g. D min"
                    className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Publisher</label>
                  <input
                    type="text"
                    value={importForm.publisher}
                    onChange={(e) => setImportForm(prev => ({ ...prev, publisher: e.target.value }))}
                    placeholder="Independent"
                    className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Album / Collection</label>
                  <input
                    type="text"
                    value={importForm.albumTitle}
                    onChange={(e) => setImportForm(prev => ({ ...prev, albumTitle: e.target.value }))}
                    placeholder="Singles Catalog"
                    className="w-full bg-[#121217] border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImport}
                disabled={!importForm.title.trim() || !importForm.fileName}
                className="bg-emerald-500 disabled:opacity-40 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition shadow-md active:scale-95"
              >
                <span>Add to Library</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}