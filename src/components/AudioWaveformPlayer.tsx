import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, 
  ZoomIn, ZoomOut 
} from 'lucide-react';
import type { Track } from '../types';

interface AudioWaveformPlayerProps {
  track: Track | null;
  audioOutputDeviceId?: string;
}

// Generates a valid 1-second silent WAV blob so WaveSurfer always has valid decodedData
function createSilentAudioBlob(): string {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function AudioWaveformPlayer({ track, audioOutputDeviceId }: AudioWaveformPlayerProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Generate synthetic high-density transient peaks
  const generateFineDetailPeaks = (length: number = 800): number[] => {
    const peaks: number[] = [];
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      let envelope = 0.15;
      if (progress > 0.25 && progress < 0.65) envelope = 0.45;
      if (progress >= 0.65 && progress < 0.72) envelope = 0.08;
      if (progress >= 0.72) envelope = 0.95;

      const spike = Math.random() > 0.92 ? 0.35 : 0;
      const microDetail = Math.sin(i * 0.4) * 0.15 + (Math.random() * 0.2);
      peaks.push(Math.min(1.0, Math.max(0.04, (envelope * 0.7) + microDetail + spike)));
    }
    return peaks;
  };

  useEffect(() => {
    if (!containerRef.current || !track) {
      if (waveSurferRef.current) {
        try { waveSurferRef.current.destroy(); } catch {}
        waveSurferRef.current = null;
      }
      setIsPlaying(false);
      setIsReady(false);
      setCurrentTimeSec(0);
      return;
    }

    if (waveSurferRef.current) {
      try { waveSurferRef.current.destroy(); } catch {}
    }

    setIsReady(false);

    let ws: WaveSurfer;
    try {
      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#27272a',
        progressColor: '#10b981',
        cursorColor: '#34d399',
        cursorWidth: 1.5,
        barWidth: 1.5,
        barGap: 1,
        barRadius: 1,
        height: 48,
        normalize: true,
        autoCenter: true,
        minPxPerSec: 0,
        fillParent: true
      });
      waveSurferRef.current = ws;
    } catch (err) {
      console.warn('WaveSurfer init notice:', err);
      return;
    }

    const fileUrl = (track as any).blobUrl || (track as any).audioUrl;
    const fallbackUrl = createSilentAudioBlob();
    const samplePeaks = generateFineDetailPeaks(800);

    try {
      if (fileUrl) {
        ws.load(fileUrl);
      } else {
        ws.load(fallbackUrl, [samplePeaks], track.durationSec || 155);
      }
    } catch (err) {
      console.warn('WaveSurfer load notice:', err);
    }

    ws.on('ready', () => {
      setIsReady(true);
      setDurationSec(ws.getDuration() || track.durationSec || 155);
      try {
        ws.setVolume(isMuted ? 0 : volume);
        if (audioOutputDeviceId && (ws as any).setSinkId) {
          (ws as any).setSinkId(audioOutputDeviceId).catch(() => {});
        }
      } catch {}
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTimeSec(time));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', (err) => console.warn('WaveSurfer audio notice:', err));

    return () => {
      setIsReady(false);
      try {
        ws.destroy();
      } catch {}
      URL.revokeObjectURL(fallbackUrl);
    };
  }, [track?.id, (track as any)?.fileName]);

  // Safe Zoom Handling: only zoom when audio is fully ready
  useEffect(() => {
    if (waveSurferRef.current && isReady) {
      try {
        waveSurferRef.current.zoom(zoomLevel);
      } catch (err) {
        console.warn('WaveSurfer zoom notice:', err);
      }
    }
  }, [zoomLevel, isReady]);

  // Safe Audio Routing
  useEffect(() => {
    if (waveSurferRef.current && isReady && audioOutputDeviceId && (waveSurferRef.current as any).setSinkId) {
      try {
        (waveSurferRef.current as any).setSinkId(audioOutputDeviceId).catch(() => {});
      } catch {}
    }
  }, [audioOutputDeviceId, isReady]);

  // Volume & Mute
  useEffect(() => {
    if (waveSurferRef.current && isReady) {
      try {
        waveSurferRef.current.setVolume(isMuted ? 0 : volume);
      } catch {}
    }
  }, [volume, isMuted, isReady]);

  if (!track) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTogglePlay = () => {
    if (!waveSurferRef.current || !isReady) return;
    try {
      waveSurferRef.current.playPause();
    } catch {}
  };

  const handleRestart = () => {
    if (!waveSurferRef.current || !isReady) return;
    try {
      waveSurferRef.current.seekTo(0);
      waveSurferRef.current.play();
    } catch {}
  };

  return (
    <div className="bg-[#0b0b0e] border-t border-zinc-800/90 p-3.5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none shadow-2xl relative z-40">
      
      {/* Track Identity & Main Transport */}
      <div className="flex items-center gap-3.5 min-w-[240px] max-w-[280px]">
        <button
          onClick={handleTogglePlay}
          className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold transition shadow-md shadow-emerald-950/40 active:scale-95 shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={handleRestart}
          className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition shrink-0"
          title="Restart from beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <span className="text-xs font-bold text-zinc-100 truncate block">{track.title}</span>
          <span className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5">
            {track.bpm} BPM • {track.key} • {track.version}
          </span>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="flex-1 flex items-center gap-3 w-full">
        <span className="text-[11px] font-mono text-zinc-400 w-10 text-right shrink-0">
          {formatTime(currentTimeSec)}
        </span>

        <div className="flex-1 relative overflow-x-auto overflow-y-hidden rounded-lg bg-[#0e0e13] border border-zinc-800/70 p-1">
          <div ref={containerRef} className="w-full cursor-pointer" />
        </div>

        <span className="text-[11px] font-mono text-zinc-500 w-10 shrink-0">
          {formatTime(durationSec || track.durationSec || 155)}
        </span>
      </div>

      {/* Right Controls: Detail Zoom & Volume */}
      <div className="flex items-center gap-4 shrink-0">
        
        <div className="flex items-center gap-1.5 bg-[#121217] border border-zinc-800 px-2 py-1 rounded-xl text-xs">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0, prev - 15))}
            className="p-1 text-zinc-400 hover:text-white rounded transition disabled:opacity-30"
            disabled={zoomLevel === 0 || !isReady}
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-zinc-400 min-w-[34px] text-center">
            {zoomLevel === 0 ? 'FIT' : `${zoomLevel}px`}
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(120, prev + 15))}
            className="p-1 text-zinc-400 hover:text-white rounded transition disabled:opacity-30"
            disabled={zoomLevel >= 120 || !isReady}
            title="Zoom in (view micro-transients)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-lg border transition ${
              isMuted 
                ? 'bg-rose-950/40 text-rose-400 border-rose-500/30' 
                : 'text-zinc-400 hover:text-white bg-[#121217] border-zinc-800'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-16 accent-emerald-500 h-1 bg-zinc-800 rounded cursor-pointer"
            title={`Monitoring Volume: ${Math.round(volume * 100)}%`}
          />
        </div>

      </div>

    </div>
  );
}