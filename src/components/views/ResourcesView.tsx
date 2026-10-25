import React, { useState } from 'react';
import { 
  FileText, Plus, Trash2, Edit3, Check, Sparkles, 
  Layers, Music, ArrowRight, Copy, CheckCircle2 
} from 'lucide-react';
import type { EditableCheatSheet, SectionBlueprint, ProjectBrief } from '../../types';

interface ResourcesViewProps {
  cheatSheets: EditableCheatSheet[];
  projects: ProjectBrief[];
  onSaveCheatSheet: (sheet: EditableCheatSheet) => void;
  onDeleteCheatSheet: (id: string) => void;
}

export function ResourcesView({
  cheatSheets,
  projects,
  onSaveCheatSheet,
  onDeleteCheatSheet
}: ResourcesViewProps): React.JSX.Element {
  const [selectedSheetId, setSelectedSheetId] = useState<string>(
    cheatSheets[0]?.id || ''
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeSheet = cheatSheets.find(s => s.id === selectedSheetId) || cheatSheets[0];

  const [editForm, setEditForm] = useState<EditableCheatSheet | null>(activeSheet || null);

  const handleSelectSheet = (sheet: EditableCheatSheet) => {
    setSelectedSheetId(sheet.id);
    setEditForm(sheet);
    setIsEditing(false);
  };

  const handleStartCreate = () => {
    const newSheet: EditableCheatSheet = {
      id: `cs-${Date.now()}`,
      genre: 'New Trailer Hybrid Blueprint',
      associatedProjectId: projects[0]?.id || '',
      projectAlbumTitle: projects[0]?.albumTitle || 'Studio Catalog',
      bpmRange: '130 – 134 BPM',
      avgBpm: 132,
      commonKeys: 'D min, F min',
      harmonyTypes: 'Minor Aeolian modal shifts, chromatic mediants, sub tonic drones.',
      trackFeel: 'Relentless driving escalation toward an earth-shattering climax.',
      targetLufs: -8.0,
      truePeakTargetDb: -0.1,
      chordFormula: ['Dm', 'Bb', 'Gm', 'A7'],
      overallInstrumentation: ['Massive Braams', 'Spiccato Cellos', 'Full Brass', 'Taikos', 'Distorted Sub'],
      sectionsBreakdown: [
        {
          sectionName: 'Act 1: Intro Setup',
          timeWindow: '0:00 – 0:30',
          durationSec: 30,
          barCount: 16,
          instrumentsUsed: ['Solo Cello', 'Ticking Clock', 'Sub Drone'],
          instrumentActions: 'Atmospheric anticipation, sparse ostinato motif.',
          feelAndArrangement: 'Grim, mysterious setup.'
        },
        {
          sectionName: 'Act 2: Driving Build',
          timeWindow: '0:30 – 1:15',
          durationSec: 45,
          barCount: 24,
          instrumentsUsed: ['Full Strings', 'Modular Bass Arp', 'Low Taikos'],
          instrumentActions: '16th-note spiccato acceleration with driving bassline.',
          feelAndArrangement: 'Accelerating momentum.'
        },
        {
          sectionName: 'Act 3: Backend Climax',
          timeWindow: '1:15 – 1:55',
          durationSec: 40,
          barCount: 22,
          instrumentsUsed: ['Full Brass', 'Braams', 'Choir', 'Gran Cassa'],
          instrumentActions: 'Full wall of sound, massive distorted braams every 2 bars.',
          feelAndArrangement: 'Maximum dynamic impact.'
        }
      ],
      productionMixTips: 'Sidechain low brass braams to sub impacts. High-pass strings at 140Hz.',
      referenceTrackCount: 2,
      lastUpdated: '25 Oct 2026'
    };

    onSaveCheatSheet(newSheet);
    setSelectedSheetId(newSheet.id);
    setEditForm(newSheet);
    setIsEditing(true);
  };

  const handleSaveCurrent = () => {
    if (!editForm) return;
    onSaveCheatSheet(editForm);
    setIsEditing(false);
  };

  const handleCopySummary = (sheet: EditableCheatSheet) => {
    const summary = `${sheet.genre} (${sheet.avgBpm} BPM | ${sheet.commonKeys})\nTarget: ${sheet.targetLufs} LUFS\nChords: ${sheet.chordFormula.join(' - ')}`;
    navigator.clipboard.writeText(summary);
    setCopiedId(sheet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070708] overflow-hidden text-zinc-300">
      
      {/* Top Header */}
      <div className="p-6 border-b border-zinc-800/80 bg-[#0c0c0e] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Production Resources & Cheat Sheets</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Stylistic blueprints, harmonic recipes, structure maps, and mix targets.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Cheat Sheet</span>
        </button>
      </div>

      {/* Main Dual-Pane Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Recipe List */}
        <div className="w-80 min-w-80 border-r border-zinc-800/80 bg-[#09090c] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/30">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Stored Recipes ({cheatSheets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cheatSheets.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                No blueprints saved yet.
              </div>
            ) : (
              cheatSheets.map(sheet => {
                const isSelected = activeSheet?.id === sheet.id;
                return (
                  <div
                    key={sheet.id}
                    onClick={() => handleSelectSheet(sheet)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer select-none space-y-1.5 ${
                      isSelected
                        ? 'bg-[#15151c] border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-[#0f0f14] hover:bg-[#131318] border-zinc-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {sheet.genre}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCheatSheet(sheet.id);
                        }}
                        className="text-zinc-600 hover:text-rose-400 p-0.5 rounded transition"
                        title="Delete Recipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>{sheet.bpmRange}</span>
                      <span>{sheet.commonKeys}</span>
                    </div>

                    <div className="text-[10px] text-zinc-400 truncate">
                      Target: {sheet.targetLufs} LUFS • {sheet.sectionsBreakdown.length} Acts
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Blueprint Inspector & Editor */}
        <div className="flex-1 bg-[#0b0b0e] overflow-y-auto p-8 space-y-6">
          {activeSheet ? (
            <div className="max-w-4xl space-y-6">
              
              {/* Header Box */}
              <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm?.genre || ''}
                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, genre: e.target.value }) : null)}
                        className="bg-[#141419] border border-emerald-500 text-lg font-bold text-white px-3 py-1.5 rounded-xl outline-none"
                      />
                    ) : (
                      <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                        <span>{activeSheet.genre}</span>
                        <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                          RECIPE
                        </span>
                      </h2>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Associated Project: <span className="text-zinc-200 font-medium">{activeSheet.projectAlbumTitle || 'Unassigned'}</span> • Updated: <span className="font-mono text-zinc-400">{activeSheet.lastUpdated}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySummary(activeSheet)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {copiedId === activeSheet.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Summary</span>
                        </>
                      )}
                    </button>

                    {isEditing ? (
                      <button
                        onClick={handleSaveCurrent}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Recipe</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit Recipe</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quantitative Targets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-[#131318] border border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Tempo Profile</span>
                    <div className="text-sm font-bold font-mono text-zinc-100">{activeSheet.bpmRange}</div>
                  </div>
                  <div className="p-3 bg-[#131318] border border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Common Keys</span>
                    <div className="text-sm font-bold font-mono text-emerald-400">{activeSheet.commonKeys}</div>
                  </div>
                  <div className="p-3 bg-[#131318] border border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Target Loudness</span>
                    <div className="text-sm font-bold font-mono text-zinc-100">{activeSheet.targetLufs} LUFS</div>
                  </div>
                  <div className="p-3 bg-[#131318] border border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">True Peak Ceiling</span>
                    <div className="text-sm font-bold font-mono text-zinc-100">{activeSheet.truePeakTargetDb} dB</div>
                  </div>
                </div>
              </div>

              {/* Harmony & Progression Formula */}
              <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  <Music className="w-4 h-4 text-emerald-400" />
                  <span>Harmonic Formula & Chord Sequence</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeSheet.chordFormula.map((chord, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-[#141419] border border-zinc-700 font-mono font-bold text-xs text-emerald-400 rounded-lg">
                        {chord}
                      </span>
                      {idx < activeSheet.chordFormula.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-400 pt-1 leading-relaxed">
                  {activeSheet.harmonyTypes}
                </p>
              </div>

              {/* 3-Act Structure Blueprints */}
              <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Arrangement & Structural Blueprint</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {activeSheet.sectionsBreakdown.length} Defined Acts
                  </span>
                </div>

                <div className="space-y-3">
                  {activeSheet.sectionsBreakdown.map((section: SectionBlueprint, idx: number) => (
                    <div key={idx} className="p-4 bg-[#121217] border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{section.sectionName}</span>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-500/30">
                          {section.timeWindow} ({section.barCount} bars)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {section.instrumentActions}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {section.instrumentsUsed.map((inst, i) => (
                          <span key={i} className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                            {inst}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mix & Production Guidelines */}
              <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Production & Mix Instructions</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-[#121217] p-3 rounded-xl border border-zinc-800">
                  {activeSheet.productionMixTips}
                </p>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Select or create a cheat sheet recipe.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}