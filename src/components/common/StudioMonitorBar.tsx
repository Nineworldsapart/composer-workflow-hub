import React, { useRef, useEffect } from 'react';
import { 
  Play, Pause, Rewind, FastForward, Volume2, VolumeX 
} from 'lucide-react';
import type { Track } from '../../types';

interface StudioMonitorBarProps {
  selectedTrack: Track | null;
  isPlaying: boolean;
  isMuted: boolean;
  currentTimeSec: number;
  totalLengthSec: number;
  onTogglePlayPause: () => void;
  onSeek: (seconds: number) => void;
  onToggleMute: () => void;
}

export const StudioMonitorBar: React.FC<StudioMonitorBarProps> = ({
  selectedTrack,
  isPlaying,
  isMuted,
  currentTimeSec,
  totalLengthSec,
  onTogglePlayPause,
  onSeek,
  onToggleMute
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formatMinutesSeconds = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${String(s).padStart(2, '0')}`;
  };

  const getDynamicLUFS = (): { integrated: string; shortTerm: string } => {
    if (!selectedTrack || !isPlaying) {
      return { integrated: '-8.5', shortTerm: '-inf' };
    }
    const progress = totalLengthSec > 0 ? currentTimeSec / totalLengthSec : 0;
    let currentLufs = -18.0 + (progress * 11.2);
    currentLufs += Math.sin(currentTimeSec * 2) * 0.4;
    
    return {
      integrated: '-8.4',
      shortTerm: currentLufs.toFixed(1)
    };
  };

  const lufsReadings = getDynamicLUFS();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Grid markers
    ctx.strokeStyle = '#181822';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Baseline center axis
    ctx.strokeStyle = '#272733';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    const slices = 440;
    const sliceWidth = width / slices;
    const progressRatio = totalLengthSec > 0 ? currentTimeSec / totalLengthSec : 0;
    const playheadX = progressRatio * width;
    const seed = selectedTrack ? selectedTrack.title.length * 11 : 55;

    for (let i = 0; i < slices; i++) {
      const pos = i / slices;
      const x = i * sliceWidth;

      const dynamicRamp = pos < 0.28 
        ? 0.35 + pos * 0.45 
        : pos < 0.68 
        ? 0.65 + Math.sin(pos * 18) * 0.2 
        : 0.9 + Math.cos(pos * 24) * 0.12;
      
      const microPattern = Math.abs(Math.sin((i + seed) * 0.38) * Math.cos((i * 1.6 + seed) * 0.22));
      const isTransient = (i % 6 === 0 || i % 11 === 0);
      const spike = isTransient ? 1.3 : 1.0;
      const amplitude = Math.min(1.0, microPattern * dynamicRamp * spike);
      
      const peakHeight = Math.max(5, amplitude * (midY - 10));
      const rmsHeight = peakHeight * 0.58;
      const isPlayed = x <= playheadX;

      // RMS Core
      ctx.fillStyle = isPlayed ? '#10b981' : '#3f3f46';
      ctx.fillRect(x, midY - rmsHeight, Math.max(1, sliceWidth - 1), rmsHeight * 2);

      // Transient Peaks
      ctx.fillStyle = isPlayed ? '#6ee7b7' : '#27272a';
      ctx.fillRect(x, midY - peakHeight, Math.max(1, sliceWidth - 1), peakHeight - rmsHeight);
      ctx.fillRect(x, midY + rmsHeight, Math.max(1, sliceWidth - 1), peakHeight - rmsHeight);
    }

    // Playhead with studio glow
    if (totalLengthSec > 0) {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [currentTimeSec, totalLengthSec, selectedTrack]);

  return (
    <div className="bg-[#0b0b0f] border-t border-zinc-800/80 px-8 py-4 shadow-2xl z-30 select-none">
      <div className="flex items-center justify-between gap-8">
        
        {/* 1. Track Info Pod */}
        <div className="min-w-[250px] max-w-[270px] shrink-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold tracking-wider">
              {selectedTrack ? `${selectedTrack.bpm} BPM • ${selectedTrack.key}` : 'IDLE'}
            </span>
            <span className="text-xs text-zinc-400 font-mono font-medium">
              {selectedTrack?.version || ''}
            </span>
          </div>
          <div className="text-base font-extrabold text-zinc-100 truncate mt-1.5 tracking-tight">
            {selectedTrack ? `${selectedTrack.trackNumber} — ${selectedTrack.title}` : 'Select a track to audition'}
          </div>
          <div className="text-xs text-zinc-400 truncate mt-0.5 flex items-center gap-2">
            <span className="text-zinc-300 font-medium">
              {selectedTrack ? 'Studio Master' : 'Waveform Standby'}
            </span>
            {selectedTrack?.fileName && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500 font-mono truncate">{selectedTrack.fileName}</span>
              </>
            )}
          </div>
        </div>

        {/* 2. Waveform Scrubber & Transport Controls */}
        <div className="flex-1 max-w-none flex flex-col items-center justify-center gap-2.5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onSeek(0)}
              className="p-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/60 transition"
              title="Rewind to Top (0:00)"
            >
              <Rewind className="w-4 h-4" />
            </button>
            
            <button 
              onClick={onTogglePlayPause}
              className={`px-7 py-2 rounded-xl border font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-md ${
                isPlaying
                  ? 'bg-zinc-700 text-zinc-100 border-zinc-500'
                  : 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span className="tracking-widest">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button 
              onClick={() => onSeek(Math.min(totalLengthSec, currentTimeSec + 10))}
              className="p-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/60 transition"
              title="Forward 10s"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full flex items-center gap-4">
            <span className="text-sm font-mono font-bold text-zinc-200 w-14 text-right shrink-0">
              {formatMinutesSeconds(currentTimeSec)}
            </span>

            <div className="flex-1 h-28 bg-[#08080c] rounded-2xl border border-zinc-800/90 relative overflow-hidden flex items-center px-1 shadow-inner group">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full block cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  onSeek(Math.floor(pos * totalLengthSec));
                }}
              />
            </div>

            <span className="text-sm font-mono text-zinc-500 w-14 shrink-0">
              -{formatMinutesSeconds(Math.max(0, totalLengthSec - currentTimeSec))}
            </span>
          </div>
        </div>

        {/* 3. Output Mute & Stacked Meter Pod */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onToggleMute}
            className={`p-3.5 rounded-xl border transition ${
              isMuted 
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-400' 
                : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:text-zinc-100'
            }`}
            title={isMuted ? 'Unmute Output' : 'Mute Output'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="bg-[#111116] border border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center min-w-[124px] shadow-lg select-none">
            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 font-bold tracking-wider font-mono">PEAK</span>
              <span className="text-sm font-mono font-bold text-emerald-400 tracking-tight">-0.1 <span className="text-[11px] font-normal text-emerald-500/80">dBTP</span></span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1.5">
              <span className="text-[10px] text-zinc-400 font-bold tracking-wider font-mono">LUFS</span>
              <span className={`text-sm font-mono font-bold tracking-tight transition-colors ${
                isPlaying ? 'text-amber-400' : 'text-zinc-300'
              }`}>
                {isPlaying ? `${lufsReadings.shortTerm}` : `${lufsReadings.integrated}`} <span className="text-[11px] font-normal text-zinc-500">LUFS</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};