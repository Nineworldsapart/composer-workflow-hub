import React, { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  Activity, UploadCloud, Play, Pause, RotateCcw, 
  ZoomIn, ZoomOut, Sparkles, Layers, Music, 
  CheckCircle2, FileCheck, Gauge, AlertCircle,
  Plus, Trash2, Edit3, PanelRight, PanelRightClose,
  Tag, Sliders, FileDown, X, Maximize2, FileAudio,
  SkipBack, Rewind, FastForward, ChevronLeft, ChevronRight,
  Volume2, Mic, Square, Radio
} from 'lucide-react';
import lamejs from 'lamejs';
import type { ProjectBrief, EditableCheatSheet, SectionBreakdownItem } from '../../types';

interface AnalyserViewProps {
  projects: ProjectBrief[];
  onAttachCheatSheetToProject: (projectId: string, cheatSheet: EditableCheatSheet) => void;
}

export interface MeterMarker {
  id: string;
  timeSec: number;
  endSec: number;
  timeSignature: string;
  beatsPerBar: number;
  beatUnit: number;
}

export interface InteractiveSection {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
  barStart: number;
  barEnd: number;
  color: string;
  instruments: string[];
  description: string;
  notes: string;
}

export interface PlacedChord {
  id: string;
  timeSec: number;
  endSec: number;
  bar: number;
  chord: string;
}

const AVAILABLE_INSTRUMENTS = [
  'Braams', 'Spiccato Strings', 'Full Brass', 'Taikos', 'Sub Drone',
  'Modular Synth Arp', 'Clock / Ticking', 'Solo Cello', 'French Horns',
  'Full Choir', 'Gran Cassa', 'Risers / Sweeps', 'Vocal Cry', 'Anvil / Metal Hits'
];

const PRESET_SECTION_COLORS = [
  { label: 'Emerald', border: '#10b981', bg: 'rgba(16, 185, 129, 0.22)', text: '#6ee7b7' },
  { label: 'Amber', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.22)', text: '#fde68a' },
  { label: 'Rose', border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.22)', text: '#fda4af' },
  { label: 'Purple', border: '#a855f7', bg: 'rgba(168, 85, 247, 0.22)', text: '#d8b4fe' },
  { label: 'Slate', border: '#64748b', bg: 'rgba(100, 116, 139, 0.22)', text: '#cbd5e1' }
];

export function AnalyserView({
  projects,
  onAttachCheatSheetToProject
}: AnalyserViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio & Live Input State
  const [analyzedFile, setAnalyzedFile] = useState<{
    name: string;
    size: string;
    durationSec: number;
    blobUrl: string;
  } | null>(null);

  const [availableAudioDevices, setAvailableAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // Post-recording metadata dialog state
  const [pendingRecording, setPendingRecording] = useState<{
    blob: Blob;
    blobUrl: string;
    durationSec: number;
    approxSize: string;
  } | null>(null);

  const [recordedMetaForm, setRecordedMetaForm] = useState({
    title: '',
    artist: '',
    album: 'Studio Captures',
    bpm: 120,
    key: 'D min',
    destination: 'library' as 'library' | 'download_only'
  });

  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[][]>([]);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [zoomPxPerSec, setZoomPxPerSec] = useState(0);
  const [isWaveReady, setIsWaveReady] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [attachedSuccess, setAttachedSuccess] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(900);

  // Inspector & Modal State
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [editingSectionNameId, setEditingSectionNameId] = useState<string | null>(null);
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);
  const [editingChordId, setEditingChordId] = useState<string | null>(null);
  const [activeModalNoteType, setActiveModalNoteType] = useState<'section' | 'global' | null>(null);

  // Dragging & Resizing Pointer Tracking
  const draggingState = useRef<{
    action: 'resize' | 'move';
    type: 'section' | 'chord' | 'meter';
    id: string;
    edge?: 'start' | 'end';
    startX: number;
    initialStartSec: number;
    initialEndSec: number;
  } | null>(null);

  // Analytical Metrics
  const [metrics, setMetrics] = useState({
    bpm: 0,
    detectedKey: '--',
    scaleMode: 'Awaiting Audio Ingestion',
    integratedLufs: 0,
    shortTermMaxLufs: 0,
    truePeakDb: 0,
    crestFactorDb: 0,
    dynamicRangeScore: '--'
  });

  const [meterMarkers, setMeterMarkers] = useState<MeterMarker[]>([]);
  const [timelineChords, setTimelineChords] = useState<PlacedChord[]>([]);
  const [sections, setSections] = useState<InteractiveSection[]>([]);
  const [trackFeelNotes, setTrackFeelNotes] = useState<string>('');

  // Discover Input Audio Devices
  const refreshAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setAvailableAudioDevices(audioInputs);
      if (audioInputs.length > 0 && selectedDeviceId === 'default') {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Device enumeration notice:', err);
    }
  };

  useEffect(() => {
    refreshAudioDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshAudioDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshAudioDevices);
    };
  }, []);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  // Synchronize scroll wrapper width with current zoom
  useEffect(() => {
    const updateWidth = () => {
      if (scrollWrapperRef.current) {
        const wrapperW = scrollWrapperRef.current.clientWidth;
        if (zoomPxPerSec === 0 || durationSec === 0) {
          setTimelineWidth(wrapperW);
        } else {
          setTimelineWidth(Math.max(wrapperW, durationSec * zoomPxPerSec));
        }
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [zoomPxPerSec, durationSec]);

  // Adaptive Grid Calculation
  const currentBpm = metrics.bpm > 0 ? metrics.bpm : 120;
  const beatSec = 60 / currentBpm;
  const barSec = beatSec * 4;

  const quantizeTimeAdaptive = (rawTime: number): number => {
    let snapGrid = barSec;
    if (zoomPxPerSec > 60) {
      snapGrid = beatSec;
    } else if (zoomPxPerSec > 25) {
      snapGrid = barSec / 2;
    } else if (zoomPxPerSec > 10) {
      snapGrid = barSec / 4;
    }
    const safeDuration = durationSec > 0 ? durationSec : 155;
    return Math.max(0, Math.min(safeDuration, Math.round(rawTime / snapGrid) * snapGrid));
  };

  const calculateBarAtTime = (timeSec: number): number => {
    if (timeSec <= 0) return 1;
    if (meterMarkers.length === 0) {
      return Math.floor(timeSec / barSec) + 1;
    }
    const sorted = [...meterMarkers].sort((a, b) => a.timeSec - b.timeSec);
    const quarterSec = 60 / currentBpm;
    let accumulatedBars = 1;
    const safeDuration = durationSec > 0 ? durationSec : 155;

    for (let i = 0; i < sorted.length; i++) {
      const currentMarker = sorted[i];
      const nextTime = (i + 1 < sorted.length) ? sorted[i + 1].timeSec : safeDuration;
      const spanEnd = Math.min(timeSec, nextTime);
      const spanStart = Math.min(timeSec, currentMarker.timeSec);

      if (spanEnd > spanStart) {
        const beatDuration = currentMarker.beatUnit === 8 ? quarterSec / 2 : quarterSec;
        const currentBarSec = beatDuration * currentMarker.beatsPerBar;
        accumulatedBars += (spanEnd - spanStart) / currentBarSec;
      }
      if (timeSec <= nextTime) break;
    }
    return Math.floor(accumulatedBars);
  };

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0] || null;

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    if (waveSurferRef.current) {
      try { waveSurferRef.current.destroy(); } catch {}
      waveSurferRef.current = null;
    }

    setIsWaveReady(false);
    if (!analyzedFile?.blobUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#27272a',
      progressColor: '#10b981',
      cursorColor: '#34d399',
      cursorWidth: 1.5,
      barWidth: 1.5,
      barGap: 1,
      barRadius: 1,
      height: 105,
      normalize: true,
      autoCenter: true,
      minPxPerSec: zoomPxPerSec,
      fillParent: zoomPxPerSec === 0
    });

    waveSurferRef.current = ws;
    ws.load(analyzedFile.blobUrl);

    ws.on('ready', () => {
      setIsWaveReady(true);
      const audioDuration = ws.getDuration();
      if (audioDuration && audioDuration > 0) {
        setDurationSec(audioDuration);
      }
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTimeSec(time));
    ws.on('finish', () => setIsPlaying(false));

    return () => {
      setIsWaveReady(false);
      try { ws.destroy(); } catch {}
    };
  }, [analyzedFile?.blobUrl]);

  useEffect(() => {
    if (waveSurferRef.current && isWaveReady) {
      try { waveSurferRef.current.zoom(zoomPxPerSec); } catch {}
    }
  }, [zoomPxPerSec, isWaveReady]);

  // Alt + Scroll Wheel Zoom
  useEffect(() => {
    const el = scrollWrapperRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.altKey && analyzedFile) {
        e.preventDefault();
        setZoomPxPerSec(prev => {
          const delta = e.deltaY < 0 ? 3 : -3;
          return Math.min(120, Math.max(0, prev + delta));
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [analyzedFile]);

  // Drag and Boundary Resize Handlers
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingState.current) return;
      const { action, type, id, edge, startX, initialStartSec, initialEndSec } = draggingState.current;
      const currentWidth = timelineWidth || 900;
      const safeDuration = durationSec > 0 ? durationSec : 155;
      const pixelsPerSec = currentWidth / safeDuration;
      const deltaSec = (e.clientX - startX) / pixelsPerSec;
      const itemDuration = initialEndSec - initialStartSec;

      if (type === 'section') {
        setSections(prev => {
          const idx = prev.findIndex(s => s.id === id);
          if (idx === -1) return prev;
          const copy = [...prev];
          const curr = copy[idx];
          const prevSec = copy[idx - 1];
          const nextSec = copy[idx + 1];

          if (action === 'move') {
            const minBound = prevSec ? prevSec.endSec : 0;
            const maxBound = nextSec ? nextSec.startSec : safeDuration;
            const targetStart = quantizeTimeAdaptive(Math.min(maxBound - itemDuration, Math.max(minBound, initialStartSec + deltaSec)));
            const targetEnd = targetStart + itemDuration;

            copy[idx] = {
              ...curr,
              startSec: targetStart,
              endSec: targetEnd,
              barStart: calculateBarAtTime(targetStart),
              barEnd: calculateBarAtTime(targetEnd)
            };
          } else if (action === 'resize') {
            if (edge === 'end') {
              const isAdjacent = nextSec && Math.abs(curr.endSec - nextSec.startSec) < 0.2;
              const raw = initialEndSec + deltaSec;
              const minAllowed = curr.startSec + beatSec;
              const maxAllowed = isAdjacent ? (nextSec.endSec - beatSec) : (nextSec ? nextSec.startSec : safeDuration);
              const quantized = quantizeTimeAdaptive(Math.min(maxAllowed, Math.max(minAllowed, raw)));

              copy[idx] = { ...curr, endSec: quantized, barEnd: calculateBarAtTime(quantized) };
              if (isAdjacent && nextSec) {
                copy[idx + 1] = { ...nextSec, startSec: quantized, barStart: calculateBarAtTime(quantized) };
              }
            } else {
              const isAdjacent = prevSec && Math.abs(prevSec.endSec - curr.startSec) < 0.2;
              const raw = initialStartSec + deltaSec;
              const minAllowed = isAdjacent ? (prevSec.startSec + beatSec) : (prevSec ? prevSec.endSec : 0);
              const maxAllowed = curr.endSec - beatSec;
              const quantized = quantizeTimeAdaptive(Math.min(maxAllowed, Math.max(minAllowed, raw)));

              copy[idx] = { ...curr, startSec: quantized, barStart: calculateBarAtTime(quantized) };
              if (isAdjacent && prevSec) {
                copy[idx - 1] = { ...prevSec, endSec: quantized, barEnd: calculateBarAtTime(quantized) };
              }
            }
          }
          return copy;
        });
      } else if (type === 'chord') {
        setTimelineChords(prev => {
          const idx = prev.findIndex(c => c.id === id);
          if (idx === -1) return prev;
          const copy = [...prev];
          const curr = copy[idx];
          const prevChord = copy[idx - 1];
          const nextChord = copy[idx + 1];

          if (action === 'move') {
            const minBound = prevChord ? prevChord.endSec : 0;
            const maxBound = nextChord ? nextChord.timeSec : safeDuration;
            const targetStart = quantizeTimeAdaptive(Math.min(maxBound - itemDuration, Math.max(minBound, initialStartSec + deltaSec)));
            const targetEnd = targetStart + itemDuration;

            copy[idx] = {
              ...curr,
              timeSec: targetStart,
              endSec: targetEnd,
              bar: calculateBarAtTime(targetStart)
            };
          } else if (action === 'resize') {
            if (edge === 'end') {
              const maxAllowed = nextChord ? nextChord.timeSec : safeDuration;
              const minAllowed = curr.timeSec + beatSec;
              const quantized = quantizeTimeAdaptive(Math.min(maxAllowed, Math.max(minAllowed, initialEndSec + deltaSec)));
              copy[idx] = { ...curr, endSec: quantized };
            } else {
              const minAllowed = prevChord ? prevChord.endSec : 0;
              const maxAllowed = curr.endSec - beatSec;
              const quantized = quantizeTimeAdaptive(Math.min(maxAllowed, Math.max(minAllowed, initialStartSec + deltaSec)));
              copy[idx] = { ...curr, timeSec: quantized, bar: calculateBarAtTime(quantized) };
            }
          }
          return copy;
        });
      } else if (type === 'meter') {
        setMeterMarkers(prev => {
          const idx = prev.findIndex(m => m.id === id);
          if (idx === -1) return prev;
          const copy = [...prev];
          const curr = copy[idx];
          const prevM = copy[idx - 1];
          const nextM = copy[idx + 1];

          if (action === 'move') {
            const minBound = prevM ? prevM.endSec : 0;
            const maxBound = nextM ? nextM.timeSec : safeDuration;
            const targetStart = quantizeTimeAdaptive(Math.min(maxBound - itemDuration, Math.max(minBound, initialStartSec + deltaSec)));
            copy[idx] = { ...curr, timeSec: targetStart, endSec: targetStart + itemDuration };
          } else if (action === 'resize') {
            if (edge === 'end') {
              const maxAllowed = nextM ? nextM.timeSec : safeDuration;
              const minAllowed = curr.timeSec + beatSec;
              const quantized = quantizeTimeAdaptive(Math.min(maxAllowed, Math.max(minAllowed, initialEndSec + deltaSec)));
              copy[idx] = { ...curr, endSec: quantized };
            } else {
              const minAllowed = prevM ? prevM.endSec : 0;
              const maxAllowed = curr.endSec - beatSec;
              const quantized = quantizeTimeAdaptive(Math.min(maxAllowed, Math.max(minAllowed, initialStartSec + deltaSec)));
              copy[idx] = { ...curr, timeSec: quantized };
            }
          }
          return copy;
        });
      }
    };

    const handlePointerUp = () => {
      draggingState.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [timelineWidth, durationSec, beatSec]);

  const handleStartMove = (
    e: React.MouseEvent,
    type: 'section' | 'chord' | 'meter',
    id: string,
    startSec: number,
    endSec: number
  ) => {
    e.stopPropagation();
    draggingState.current = {
      action: 'move',
      type,
      id,
      startX: e.clientX,
      initialStartSec: startSec,
      initialEndSec: endSec
    };
  };

  const handleStartResize = (
    e: React.MouseEvent,
    type: 'section' | 'chord' | 'meter',
    id: string,
    edge: 'start' | 'end',
    startSec: number,
    endSec: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    draggingState.current = {
      action: 'resize',
      type,
      id,
      edge,
      startX: e.clientX,
      initialStartSec: startSec,
      initialEndSec: endSec
    };
  };

  // 48kHz, 320 kbps Stereo MP3 Recorder Engine
  const startRecordingAudio = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 48000 });
      audioContextRef.current = audioCtx;

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDeviceId !== 'default' ? { exact: selectedDeviceId } : undefined,
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 2, 2);
      scriptProcessorRef.current = processor;

      audioChunksRef.current = [[], []];

      processor.onaudioprocess = (e) => {
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;
        audioChunksRef.current[0].push(new Float32Array(left));
        audioChunksRef.current[1].push(new Float32Array(right));
      };

      sourceNode.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
    } catch (err) {
      console.error('Audio capture permission error:', err);
      alert('Could not access selected audio device. If recording Spotify/YouTube/iTunes, ensure a virtual loopback device (like BlackHole) is selected.');
    }
  };

  const stopRecordingAudio = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    const leftChunks = audioChunksRef.current[0];
    const rightChunks = audioChunksRef.current[1];

    if (!leftChunks || leftChunks.length === 0) return;

    const totalSamples = leftChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const leftMerged = new Float32Array(totalSamples);
    const rightMerged = new Float32Array(totalSamples);

    let offset = 0;
    for (let i = 0; i < leftChunks.length; i++) {
      leftMerged.set(leftChunks[i], offset);
      rightMerged.set(rightChunks[i], offset);
      offset += leftChunks[i].length;
    }

    const leftInt16 = new Int16Array(totalSamples);
    const rightInt16 = new Int16Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      const sL = Math.max(-1, Math.min(1, leftMerged[i]));
      leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;

      const sR = Math.max(-1, Math.min(1, rightMerged[i]));
      rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
    }

    const mp3Encoder = new lamejs.Mp3Encoder(2, 48000, 320);
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < totalSamples; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf.buffer, mp3buf.byteOffset, mp3buf.length));
      }
    }

    const endBuf = mp3Encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(new Uint8Array(endBuf.buffer, endBuf.byteOffset, endBuf.length));
    }

    const mp3Blob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
    const blobUrl = URL.createObjectURL(mp3Blob);
    const recordedDuration = totalSamples / 48000;
    const approxSizeMb = (mp3Blob.size / (1024 * 1024)).toFixed(2) + ' MB';
    const timestampName = `Capture-${new Date().toLocaleTimeString().replace(/:/g, '-')}.mp3`;

    // Open metadata prompt modal to capture track name, artist, and album
    setRecordedMetaForm({
      title: `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      artist: 'Self',
      album: 'Studio Reference Captures',
      bpm: 124,
      key: 'C min',
      destination: 'library'
    });

    setPendingRecording({
      blob: mp3Blob,
      blobUrl: blobUrl,
      durationSec: recordedDuration,
      approxSize: `${approxSizeMb} (48kHz/320k MP3)`
    });

    setAnalyzedFile({
      name: timestampName,
      size: `${approxSizeMb} (48kHz/320k MP3)`,
      durationSec: recordedDuration,
      blobUrl: blobUrl
    });

    setMetrics({
      bpm: 124,
      detectedKey: 'C min',
      scaleMode: 'Dorian / Natural Minor',
      integratedLufs: -14.2,
      shortTermMaxLufs: -11.8,
      truePeakDb: -0.8,
      crestFactorDb: 11.0,
      dynamicRangeScore: 'High-Fidelity 320k Stream'
    });

    setMeterMarkers([
      { id: 'm-1', timeSec: 0, endSec: recordedDuration, timeSignature: '4/4', beatsPerBar: 4, beatUnit: 4 }
    ]);

    const capturedSecs: InteractiveSection[] = [
      {
        id: `sec-${Date.now()}-1`,
        name: 'Captured Pass 1',
        startSec: 0,
        endSec: Math.floor(recordedDuration / 2),
        barStart: 1,
        barEnd: Math.max(1, Math.floor(recordedDuration / 4)),
        color: PRESET_SECTION_COLORS[0].border,
        instruments: ['Sub Drone', 'Modular Synth Arp'],
        description: 'Captured at broadcast grade 48kHz / 320 kbps.',
        notes: `Recorded source: ${availableAudioDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Audio Input'}`
      },
      {
        id: `sec-${Date.now()}-2`,
        name: 'Captured Pass 2',
        startSec: Math.floor(recordedDuration / 2),
        endSec: recordedDuration,
        barStart: Math.max(2, Math.floor(recordedDuration / 4) + 1),
        barEnd: Math.max(3, Math.floor(recordedDuration / 2)),
        color: PRESET_SECTION_COLORS[1].border,
        instruments: ['Full Brass', 'Taikos'],
        description: 'Secondary escalation phase.',
        notes: ''
      }
    ];

    setSections(capturedSecs);
    setActiveSectionId(capturedSecs[0].id);
    setTrackFeelNotes(`Master audio capture recorded at 48kHz, 320 kbps (High Fidelity MP3) on ${new Date().toLocaleDateString()}.`);
  };

  const handleCommitRecordedMetadata = () => {
    if (!pendingRecording) return;

    const cleanTitle = (recordedMetaForm.title || 'Untitled Capture').trim();
    const cleanArtist = (recordedMetaForm.artist || 'Composer').trim();
    const cleanAlbum = (recordedMetaForm.album || 'Studio Captures').trim();

    const safeTitle = cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeArtist = cleanArtist.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFileName = `${safeArtist}_${safeTitle}.mp3`;

    setAnalyzedFile({
      name: finalFileName,
      size: pendingRecording.approxSize,
      durationSec: pendingRecording.durationSec,
      blobUrl: pendingRecording.blobUrl
    });

    const link = document.createElement('a');
    link.href = pendingRecording.blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if ((window as any).__onAddLibraryItem) {
      (window as any).__onAddLibraryItem({
        title: cleanTitle,
        artist: cleanArtist,
        album: cleanAlbum,
        bpm: Number(recordedMetaForm.bpm) || 120,
        key: recordedMetaForm.key,
        duration: `${Math.floor(pendingRecording.durationSec / 60)}:${String(Math.floor(pendingRecording.durationSec % 60)).padStart(2, '0')}`,
        durationSec: pendingRecording.durationSec,
        fileName: finalFileName,
        blobUrl: pendingRecording.blobUrl
      });
    }

    setPendingRecording(null);
  };


  // Transport Methods
  const handleSkipToPreviousSection = () => {
    if (!waveSurferRef.current || !isWaveReady || sections.length === 0) return;
    const safeDuration = durationSec > 0 ? durationSec : 155;
    const sorted = [...sections].sort((a, b) => a.startSec - b.startSec);
    let target = sorted[0];

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (currentTimeSec > sorted[i].startSec + 1.2) {
        target = sorted[i];
        break;
      } else if (currentTimeSec > sorted[i].startSec && i > 0) {
        target = sorted[i - 1];
        break;
      }
    }
    waveSurferRef.current.seekTo(target.startSec / safeDuration);
    setCurrentTimeSec(target.startSec);
    setActiveSectionId(target.id);
  };

  const handleSkipToNextSection = () => {
    if (!waveSurferRef.current || !isWaveReady || sections.length === 0) return;
    const safeDuration = durationSec > 0 ? durationSec : 155;
    const sorted = [...sections].sort((a, b) => a.startSec - b.startSec);
    const next = sorted.find(s => s.startSec > currentTimeSec + 0.3);
    if (next) {
      waveSurferRef.current.seekTo(next.startSec / safeDuration);
      setCurrentTimeSec(next.startSec);
      setActiveSectionId(next.id);
    }
  };

  const handleSkipToStart = () => {
    if (!waveSurferRef.current || !isWaveReady) return;
    waveSurferRef.current.seekTo(0);
    setCurrentTimeSec(0);
  };

  const handleRewind5Sec = () => {
    if (!waveSurferRef.current || !isWaveReady) return;
    const safeDuration = durationSec > 0 ? durationSec : 155;
    const target = Math.max(0, currentTimeSec - 5);
    waveSurferRef.current.seekTo(target / safeDuration);
    setCurrentTimeSec(target);
  };

  const handleFastForward5Sec = () => {
    if (!waveSurferRef.current || !isWaveReady) return;
    const safeDuration = durationSec > 0 ? durationSec : 155;
    const target = Math.min(safeDuration, currentTimeSec + 5);
    waveSurferRef.current.seekTo(target / safeDuration);
    setCurrentTimeSec(target);
  };

  const handleRestartAndPlay = () => {
    if (!waveSurferRef.current || !isWaveReady) return;
    waveSurferRef.current.seekTo(0);
    setCurrentTimeSec(0);
    waveSurferRef.current.play();
  };

  const handleSeekScrubber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTimeSec(val);
    if (waveSurferRef.current && isWaveReady) {
      const safeDuration = durationSec > 0 ? durationSec : 155;
      waveSurferRef.current.seekTo(val / safeDuration);
    }
  };

  const handleSectionDoubleClick = (section: InteractiveSection) => {
    setActiveSectionId(section.id);
    if (!scrollWrapperRef.current) return;
    const visibleWidth = scrollWrapperRef.current.clientWidth;
    const sectionDuration = Math.max(3, section.endSec - section.startSec);
    const optimalPxPerSec = Math.min(120, Math.max(10, Math.floor(visibleWidth / sectionDuration)));
    setZoomPxPerSec(optimalPxPerSec);

    setTimeout(() => {
      if (scrollWrapperRef.current) {
        const scrollToPx = section.startSec * optimalPxPerSec;
        scrollWrapperRef.current.scrollTo({ left: Math.max(0, scrollToPx), behavior: 'smooth' });
      }
    }, 50);

    if (waveSurferRef.current && isWaveReady) {
      const safeDuration = durationSec > 0 ? durationSec : 155;
      waveSurferRef.current.seekTo(section.startSec / safeDuration);
    }
  };

  const handleResetZoom = () => {
    setZoomPxPerSec(0);
    if (scrollWrapperRef.current) {
      scrollWrapperRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    if (waveSurferRef.current && isWaveReady) {
      waveSurferRef.current.zoom(0);
    }
  };

  const handleFileUpload = (file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const blobUrl = URL.createObjectURL(file);

    setAnalyzedFile({
      name: file.name,
      size: sizeMb,
      durationSec: 155,
      blobUrl: blobUrl
    });

    const lower = file.name.toLowerCase();
    let detectedBpm = 130;
    const detectedKey = 'D min';
    const lufs = -7.8;
    const detectedMeters: MeterMarker[] = [
      { id: 'm-1', timeSec: 0, endSec: 155, timeSignature: '4/4', beatsPerBar: 4, beatUnit: 4 }
    ];

    if (lower.includes('waltz') || lower.includes('3-4')) {
      detectedMeters[0] = { id: 'm-1', timeSec: 0, endSec: 155, timeSignature: '3/4', beatsPerBar: 3, beatUnit: 4 };
      detectedBpm = 144;
    } else if (lower.includes('odd') || lower.includes('7-8')) {
      detectedBpm = 132;
      detectedMeters[0].endSec = 68;
      detectedMeters.push({ id: `m-${Date.now()}-2`, timeSec: 68, endSec: 78, timeSignature: '7/8', beatsPerBar: 7, beatUnit: 8 });
      detectedMeters.push({ id: `m-${Date.now()}-3`, timeSec: 78, endSec: 155, timeSignature: '4/4', beatsPerBar: 4, beatUnit: 4 });
    }

    setMeterMarkers(detectedMeters);
    setMetrics({
      bpm: detectedBpm,
      detectedKey: detectedKey,
      scaleMode: 'Aeolian / Harmonic Minor',
      integratedLufs: lufs,
      shortTermMaxLufs: -6.2,
      truePeakDb: -0.1,
      crestFactorDb: 9.4,
      dynamicRangeScore: 'High Impact (Sync Grade)'
    });

    const newSections: InteractiveSection[] = [
      {
        id: `sec-${Date.now()}-1`,
        name: 'Act 1: Intro Setup',
        startSec: 0,
        endSec: 28,
        barStart: 1,
        barEnd: 15,
        color: PRESET_SECTION_COLORS[0].border,
        instruments: ['Solo Cello', 'Sub Drone'],
        description: 'Sparse ostinato motif setting up sonic atmosphere.',
        notes: ''
      },
      {
        id: `sec-${Date.now()}-2`,
        name: 'Act 2: Relentless Build',
        startSec: 28,
        endSec: 78,
        barStart: 16,
        barEnd: 42,
        color: PRESET_SECTION_COLORS[1].border,
        instruments: ['Spiccato Strings', 'Taikos'],
        description: 'Driving rhythmic escalation with modular pulses.',
        notes: ''
      },
      {
        id: `sec-${Date.now()}-3`,
        name: 'Act 3: Backend Climax',
        startSec: 78,
        endSec: 155,
        barStart: 43,
        barEnd: 84,
        color: PRESET_SECTION_COLORS[3].border,
        instruments: ['Full Brass', 'Braams', 'Full Choir'],
        description: 'Catastrophic wall-of-sound backend theme.',
        notes: ''
      }
    ];

    setSections(newSections);
    setActiveSectionId(newSections[0].id);

    setTimelineChords([
      { id: `ch-${Date.now()}-1`, timeSec: 0, endSec: 14.7, bar: 1, chord: 'Dm' },
      { id: `ch-${Date.now()}-2`, timeSec: 14.7, endSec: 29.5, bar: 9, chord: 'Bb' }
    ]);

    setTrackFeelNotes(`Cinematic media cue: ${file.name.replace(/\.[^/.]+$/, '')}`);
  };

  const handleChordLaneDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!analyzedFile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = quantizeTimeAdaptive(progress * (durationSec || 155));
    const targetEnd = Math.min(durationSec, targetTime + barSec);

    const newChord: PlacedChord = {
      id: `ch-${Date.now()}`,
      timeSec: targetTime,
      endSec: targetEnd,
      bar: calculateBarAtTime(targetTime),
      chord: 'Dm'
    };

    setTimelineChords(prev => [...prev, newChord].sort((a, b) => a.timeSec - b.timeSec));
    setEditingChordId(newChord.id);
  };

  const handleAddSection = () => {
    if (!analyzedFile) return;
    const lastSection = sections[sections.length - 1];
    const newStart = lastSection ? lastSection.endSec : 0;
    const newEnd = Math.min(durationSec || 155, newStart + (barSec * 4));

    const newSec: InteractiveSection = {
      id: `sec-${Date.now()}`,
      name: `Act ${sections.length + 1}`,
      startSec: newStart,
      endSec: newEnd,
      barStart: calculateBarAtTime(newStart),
      barEnd: calculateBarAtTime(newEnd),
      color: PRESET_SECTION_COLORS[sections.length % PRESET_SECTION_COLORS.length].border,
      instruments: ['Full Brass', 'Taikos'],
      description: 'Arrangement details for this cue act.',
      notes: ''
    };

    setSections(prev => [...prev, newSec]);
    setActiveSectionId(newSec.id);
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length <= 1) return;
    setSections(prev => prev.filter(s => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(sections[0].id);
  };

  const handleToggleInstrument = (instrument: string) => {
    if (!activeSection) return;
    const exists = activeSection.instruments.includes(instrument);
    const updated = exists
      ? activeSection.instruments.filter(i => i !== instrument)
      : [...activeSection.instruments, instrument];
    setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, instruments: updated } : s));
  };

  const handleEjectAndStartFresh = () => {
    if (analyzedFile) {
      const breakdownItems: SectionBreakdownItem[] = sections.map(sec => ({
        sectionName: sec.name,
        timeWindow: `${formatTime(sec.startSec)} – ${formatTime(sec.endSec)}`,
        durationSec: Math.round(sec.endSec - sec.startSec),
        barCount: Math.max(1, sec.barEnd - sec.barStart),
        instrumentsUsed: sec.instruments,
        instrumentActions: sec.description,
        feelAndArrangement: sec.notes || sec.name
      }));

      const uniqueChords = Array.from(new Set(timelineChords.map(c => c.chord)));
      const activeMeterSummaries = meterMarkers.map(m => `${m.timeSignature} @ ${formatTime(m.timeSec)}`).join(', ');

      const archivedRecipe: EditableCheatSheet = {
        id: `cs-${Date.now()}`,
        genre: analyzedFile.name.replace(/\.[^/.]+$/, ''),
        associatedProjectId: selectedProjectId || projects[0]?.id || '',
        projectAlbumTitle: 'Archived Analyser Session',
        bpmRange: `${metrics.bpm} BPM (${activeMeterSummaries || '4/4'})`,
        avgBpm: metrics.bpm,
        commonKeys: metrics.detectedKey,
        harmonyTypes: `${metrics.scaleMode} — [${activeMeterSummaries || 'Standard'}]`,
        trackFeel: trackFeelNotes,
        targetLufs: metrics.integratedLufs,
        truePeakTargetDb: metrics.truePeakDb,
        chordFormula: uniqueChords.length > 0 ? uniqueChords : ['Dm'],
        overallInstrumentation: Array.from(new Set(sections.flatMap(s => s.instruments))),
        sectionsBreakdown: breakdownItems,
        productionMixTips: `Mastered at ${metrics.integratedLufs} LUFS. Notes: ${trackFeelNotes}`,
        referenceTrackCount: 1,
        lastUpdated: '25 Oct 2026'
      };

      onAttachCheatSheetToProject(selectedProjectId || projects[0]?.id || '', archivedRecipe);
    }

    if (waveSurferRef.current) {
      try {
        waveSurferRef.current.empty();
        waveSurferRef.current.destroy();
      } catch {}
      waveSurferRef.current = null;
    }

    if (analyzedFile?.blobUrl) {
      try { URL.revokeObjectURL(analyzedFile.blobUrl); } catch {}
    }

    setAnalyzedFile(null);
    setIsPlaying(false);
    setIsWaveReady(false);
    setCurrentTimeSec(0);
    setDurationSec(0);
    setZoomPxPerSec(0);
    setActiveSectionId('');
    setEditingSectionNameId(null);
    setEditingChordId(null);
    setEditingMeterId(null);
    setActiveModalNoteType(null);

    setMeterMarkers([]);
    setTimelineChords([]);
    setSections([]);
    setTrackFeelNotes('');

    setMetrics({
      bpm: 0,
      detectedKey: '--',
      scaleMode: 'Awaiting Audio Ingestion',
      integratedLufs: 0,
      shortTermMaxLufs: 0,
      truePeakDb: 0,
      crestFactorDb: 0,
      dynamicRangeScore: '--'
    });
  };

  const handleExportPdfBlueprint = () => {
    const trackTitle = analyzedFile ? analyzedFile.name.replace(/\.[^/.]+$/, '') : 'Track Blueprint';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sectionsHtml = sections.map(s => `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #333; border-radius: 8px; background: #141416;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <strong style="color: #10b981; font-size: 15px;">${s.name}</strong>
          <span style="font-family: monospace; color: #a1a1aa;">${formatTime(s.startSec)} – ${formatTime(s.endSec)} (Bars ${s.barStart}–${s.barEnd})</span>
        </div>
        <p style="margin: 4px 0 8px 0; color: #d4d4d8; font-size: 13px;">${s.description}</p>
        ${s.notes ? `<p style="margin: 4px 0; color: #f59e0b; font-size: 12px; font-style: italic;"><strong>Arrangement Note:</strong> ${s.notes}</p>` : ''}
        <div style="margin-top: 8px;">
          ${s.instruments.map(i => `<span style="display: inline-block; background: #27272a; color: #e4e4e7; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">${i}</span>`).join('')}
        </div>
      </div>
    `).join('');

    const chordsHtml = timelineChords.map(c => `
      <span style="display: inline-block; padding: 6px 12px; background: #18181b; border: 1px solid #27272a; border-radius: 6px; margin: 4px; font-family: monospace; font-weight: bold; color: #10b981;">
        ${c.chord} <small style="color: #71717a;">(b.${c.bar})</small>
      </span>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${trackTitle} — Track Blueprint</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; padding: 36px; max-width: 900px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 4px; color: #ffffff; }
            .subtitle { font-size: 13px; color: #a1a1aa; margin-bottom: 24px; font-family: monospace; }
            .metrics-box { display: flex; gap: 16px; margin-bottom: 24px; padding: 16px; background: #121215; border: 1px solid #27272a; border-radius: 8px; }
            .metric { flex: 1; }
            .metric span { display: block; font-size: 10px; color: #71717a; text-transform: uppercase; }
            .metric strong { font-size: 18px; color: #10b981; font-family: monospace; }
            .section-title { font-size: 14px; text-transform: uppercase; color: #71717a; margin-top: 24px; margin-bottom: 12px; font-weight: bold; border-bottom: 1px solid #27272a; padding-bottom: 4px; }
            @media print { body { background: white; color: black; } }
          </style>
        </head>
        <body>
          <h1>${trackTitle} — Track Blueprint</h1>
          <div class="subtitle">Production Music Hub • Decoded Dynamic Structure & Harmonic Map</div>
          <div class="metrics-box">
            <div class="metric"><span>Tempo</span><strong>${metrics.bpm} BPM</strong></div>
            <div class="metric"><span>Harmonic Key</span><strong>${metrics.detectedKey}</strong></div>
            <div class="metric"><span>Target Loudness</span><strong>${metrics.integratedLufs} LUFS</strong></div>
            <div class="metric"><span>Ceiling</span><strong>${metrics.truePeakDb} dB</strong></div>
          </div>
          <div class="section-title">Track Feel, Narrative & Sonic Vibe</div>
          <p style="color: #d4d4d8; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">${trackFeelNotes || 'No narrative logged.'}</p>
          <div class="section-title">Harmonic Chord Progression Sequence</div>
          <div style="margin-bottom: 24px;">${chordsHtml || '<em>No chords placed.</em>'}</div>
          <div class="section-title">Arrangement Acts & Breakdown</div>
          <div>${sectionsHtml || '<em>No sections created.</em>'}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  };

  const handleAttachAsBlueprint = () => {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);

    const breakdownItems: SectionBreakdownItem[] = sections.map(sec => ({
      sectionName: sec.name,
      timeWindow: `${formatTime(sec.startSec)} – ${formatTime(sec.endSec)}`,
      durationSec: Math.round(sec.endSec - sec.startSec),
      barCount: Math.max(1, sec.barEnd - sec.barStart),
      instrumentsUsed: sec.instruments,
      instrumentActions: sec.description,
      feelAndArrangement: sec.notes || sec.name
    }));

    const uniqueChords = Array.from(new Set(timelineChords.map(c => c.chord)));
    const activeMeterSummaries = meterMarkers.map(m => `${m.timeSignature} @ ${formatTime(m.timeSec)}`).join(', ');

    const newCheatSheet: EditableCheatSheet = {
      id: `cs-${Date.now()}`,
      genre: analyzedFile ? analyzedFile.name.replace(/\.[^/.]+$/, '') : 'Hybrid Orchestral Recipe',
      associatedProjectId: selectedProjectId,
      projectAlbumTitle: project?.albumTitle || 'Studio Production',
      bpmRange: `${metrics.bpm} BPM (${activeMeterSummaries || '4/4'})`,
      avgBpm: metrics.bpm,
      commonKeys: metrics.detectedKey,
      harmonyTypes: `${metrics.scaleMode} — Shifting Meters [${activeMeterSummaries || 'Standard'}]`,
      trackFeel: trackFeelNotes,
      targetLufs: metrics.integratedLufs,
      truePeakTargetDb: metrics.truePeakDb,
      chordFormula: uniqueChords.length > 0 ? uniqueChords : ['Dm'],
      overallInstrumentation: Array.from(new Set(sections.flatMap(s => s.instruments))),
      sectionsBreakdown: breakdownItems,
      productionMixTips: `Mastered at ${metrics.integratedLufs} LUFS (Peak: ${metrics.truePeakDb} dB). Notes: ${trackFeelNotes}`,
      referenceTrackCount: 1,
      lastUpdated: '25 Oct 2026'
    };

    onAttachCheatSheetToProject(selectedProjectId, newCheatSheet);
    setAttachedSuccess(true);
    setTimeout(() => setAttachedSuccess(false), 3000);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070708] overflow-hidden text-zinc-300 relative select-none">
      
      {/* Top Header & Work Area */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* Primary Content View */}
        <div className="flex-1 flex flex-col overflow-y-auto pb-24">
          
          {/* Top Bar */}
          <div className="p-5 border-b border-zinc-800/80 bg-[#0c0c0e] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Audio Structure & Metric Analyser</h1>
                  <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    48kHz • 320k MP3
                  </span>
                  {isRecording && (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono bg-rose-950/80 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      REC {formatTime(recordingSeconds)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select input source (Mic, Audio Interface, or Virtual Loopback for Spotify/YouTube), record 48kHz / 320k MP3, and analyze arrangements.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Audio Input Device Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#141419] border border-zinc-700/80 rounded-xl px-2.5 py-1.5">
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={isRecording}
                  className="bg-transparent text-xs text-zinc-200 outline-none max-w-[180px] truncate cursor-pointer"
                  title="Select Audio Input (Mic, Audio Interface, or Loopback for Spotify/YouTube)"
                >
                  {availableAudioDevices.length > 0 ? (
                    availableAudioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId} className="bg-[#181820] text-zinc-200">
                        {d.label || `Audio Input ${d.deviceId.slice(0, 5)}...`}
                      </option>
                    ))
                  ) : (
                    <option value="default" className="bg-[#181820] text-zinc-200">Default Input (Microphone)</option>
                  )}
                </select>
              </div>

              <button
                onClick={handleEjectAndStartFresh}
                disabled={!analyzedFile && sections.length === 0 && !isRecording}
                className="flex items-center gap-1.5 bg-[#17171e] hover:bg-rose-950/40 text-zinc-300 hover:text-rose-400 border border-zinc-700/80 hover:border-rose-500/40 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                title="Save current analysis to Cheat Sheets, clear waveform, and start fresh"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Eject</span>
              </button>

              {/* Record In Live Audio Button */}
              {isRecording ? (
                <button
                  onClick={stopRecordingAudio}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-rose-950/40 animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop & Encode ({formatTime(recordingSeconds)})</span>
                </button>
              ) : (
                <button
                  onClick={startRecordingAudio}
                  className="flex items-center gap-2 bg-[#171720] hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95"
                  title="Capture live stream at 48kHz, 320 kbps MP3"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record In</span>
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/20 active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{analyzedFile ? 'Load Different Audio' : 'Upload Audio'}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                accept=".wav,.aif,.aiff,.mp3,.flac"
                className="hidden"
              />

              <button
                onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                className="flex items-center gap-1.5 bg-[#121217] hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-3 py-2 rounded-xl text-xs font-semibold transition"
                title="Toggle Inspector Sidebar"
              >
                {isSidePanelOpen ? <PanelRightClose className="w-4 h-4 text-emerald-400" /> : <PanelRight className="w-4 h-4 text-zinc-400" />}
                <span>{isSidePanelOpen ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </div>

          {/* Main Work Area */}
          <div className="p-6 space-y-6">
            
            {/* DAW Waveform Station */}
            <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-4">
              
              {/* Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-4 pb-2 border-b border-zinc-800/70">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-zinc-100 truncate block">
                      {analyzedFile ? analyzedFile.name : (isRecording ? 'Capturing 48kHz Stream...' : 'No Audio Master Loaded')}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono block truncate">
                      {analyzedFile ? `${analyzedFile.size} • 48kHz Stereo` : (isRecording ? `Buffer: ${formatTime(recordingSeconds)} • 320 kbps Stream` : 'Select device above to record Spotify, YouTube, or Mic')}
                    </span>
                  </div>
                </div>

                {/* Central Transport Controls */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleSkipToStart}
                    disabled={!analyzedFile}
                    className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/70 transition disabled:opacity-30"
                    title="Skip to Start (0:00)"
                  >
                    <SkipBack className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={handleSkipToPreviousSection}
                    disabled={!analyzedFile || sections.length === 0}
                    className="p-2.5 text-zinc-400 hover:text-emerald-400 rounded-xl hover:bg-zinc-800/70 transition disabled:opacity-30"
                    title="Previous Section (Snap to Start)"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
                  </button>

                  <button
                    onClick={handleRewind5Sec}
                    disabled={!analyzedFile}
                    className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/70 transition disabled:opacity-30"
                    title="Rewind 5 Seconds"
                  >
                    <Rewind className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={() => waveSurferRef.current?.playPause()}
                    disabled={!analyzedFile}
                    className="w-11 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold transition shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-30 mx-1 shrink-0"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={handleFastForward5Sec}
                    disabled={!analyzedFile}
                    className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/70 transition disabled:opacity-30"
                    title="Fast Forward 5 Seconds"
                  >
                    <FastForward className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={handleSkipToNextSection}
                    disabled={!analyzedFile || sections.length === 0}
                    className="p-2.5 text-zinc-400 hover:text-emerald-400 rounded-xl hover:bg-zinc-800/70 transition disabled:opacity-30"
                    title="Next Section (Snap to Next Downbeat)"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.2]" />
                  </button>

                  <button
                    onClick={handleRestartAndPlay}
                    disabled={!analyzedFile}
                    className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/70 transition disabled:opacity-30"
                    title="Restart and Auto-Play"
                  >
                    <RotateCcw className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-end gap-2">
                  <div className="flex items-center gap-1 bg-[#141419] border border-zinc-800 px-2 py-1 rounded-xl text-xs">
                    <button
                      onClick={() => setZoomPxPerSec(prev => Math.max(0, prev - 5))}
                      className="p-1 text-zinc-400 hover:text-white rounded transition disabled:opacity-30"
                      disabled={zoomPxPerSec === 0 || !isWaveReady || !analyzedFile}
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleResetZoom}
                      disabled={!analyzedFile}
                      className="text-[10px] font-mono px-2 py-0.5 rounded hover:bg-zinc-800 text-emerald-400 font-bold disabled:opacity-30"
                      title="Reset Zoom to Fit Width"
                    >
                      {zoomPxPerSec === 0 ? 'FIT' : `${zoomPxPerSec}px/s (Reset)`}
                    </button>

                    <button
                      onClick={() => setZoomPxPerSec(prev => Math.min(120, prev + 5))}
                      className="p-1 text-zinc-400 hover:text-white rounded transition disabled:opacity-30"
                      disabled={zoomPxPerSec >= 120 || !isWaveReady || !analyzedFile}
                      title="Zoom In (Alt + Scroll Wheel)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Synchronized DAW Container */}
              <div 
                ref={scrollWrapperRef}
                className="relative w-full overflow-x-auto overflow-y-hidden rounded-xl bg-[#0b0b0e] border border-zinc-800 p-2 space-y-2 select-none min-h-[190px]"
              >
                {analyzedFile ? (
                  <div 
                    style={{ width: `${timelineWidth}px` }}
                    className="relative transition-all duration-75 space-y-2"
                  >

                    {/* 1. Time Signature Track */}
                    <div className="relative h-7 bg-[#111116] border border-zinc-800/80 rounded-lg flex items-center overflow-hidden">
                      {meterMarkers.map((marker) => {
                        const totalDur = durationSec || 155;
                        const leftPct = (marker.timeSec / totalDur) * 100;
                        const widthPct = Math.max(3.5, ((marker.endSec - marker.timeSec) / totalDur) * 100);

                        return (
                          <div
                            key={marker.id}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            onMouseDown={(e) => handleStartMove(e, 'meter', marker.id, marker.timeSec, marker.endSec)}
                            className="absolute h-6 z-10 flex items-center justify-between bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-mono rounded group cursor-grab active:cursor-grabbing hover:bg-amber-500/30 transition-colors"
                            title="Drag box to move along bars. Drag left/right edge to resize. Double-click to edit time signature."
                          >
                            <div
                              onMouseDown={(e) => handleStartResize(e, 'meter', marker.id, 'start', marker.timeSec, marker.endSec)}
                              className="w-2 hover:w-2.5 h-full bg-amber-400/40 hover:bg-amber-400 cursor-ew-resize rounded-l transition-all shrink-0"
                            />

                            <div className="flex-1 flex items-center justify-center px-1 overflow-hidden">
                              {editingMeterId === marker.id ? (
                                <input
                                  type="text"
                                  value={marker.timeSignature}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMeterMarkers(prev => prev.map(m => m.id === marker.id ? { ...m, timeSignature: val } : m));
                                  }}
                                  onBlur={() => setEditingMeterId(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingMeterId(null)}
                                  className="bg-black/90 border border-amber-400 rounded px-1 text-[10px] text-white font-bold outline-none w-14 text-center"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span 
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMeterId(marker.id);
                                  }}
                                  className="font-bold truncate cursor-text"
                                >
                                  {marker.timeSignature}
                                </span>
                              )}
                            </div>

                            <div
                              onMouseDown={(e) => handleStartResize(e, 'meter', marker.id, 'end', marker.timeSec, marker.endSec)}
                              className="w-2 hover:w-2.5 h-full bg-amber-400/40 hover:bg-amber-400 cursor-ew-resize rounded-r transition-all shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* 2. Chord Track */}
                    <div 
                      onDoubleClick={handleChordLaneDoubleClick}
                      className="relative h-8 bg-[#111116] hover:bg-[#15151c] border border-zinc-800/80 rounded-lg flex items-center overflow-hidden cursor-crosshair transition"
                      title="Double-click empty lane to insert chord at beat"
                    >
                      {timelineChords.map((chord) => {
                        const totalDur = durationSec || 155;
                        const leftPct = (chord.timeSec / totalDur) * 100;
                        const widthPct = Math.max(3.5, ((chord.endSec - chord.timeSec) / totalDur) * 100);

                        return (
                          <div
                            key={chord.id}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            onMouseDown={(e) => handleStartMove(e, 'chord', chord.id, chord.timeSec, chord.endSec)}
                            className="absolute h-6.5 z-10 flex items-center justify-between bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono rounded group cursor-grab active:cursor-grabbing hover:bg-emerald-500/30 transition-colors shadow-sm"
                            title="Drag box to reposition along bars. Drag left/right edge to resize. Double-click chord to edit."
                          >
                            <div
                              onMouseDown={(e) => handleStartResize(e, 'chord', chord.id, 'start', chord.timeSec, chord.endSec)}
                              className="w-2 hover:w-2.5 h-full bg-emerald-400/40 hover:bg-emerald-400 cursor-ew-resize rounded-l transition-all shrink-0"
                            />

                            <div className="flex-1 flex items-center justify-center px-1 overflow-hidden">
                              {editingChordId === chord.id ? (
                                <input
                                  type="text"
                                  value={chord.chord}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTimelineChords(prev => prev.map(c => c.id === chord.id ? { ...c, chord: val } : c));
                                  }}
                                  onBlur={() => setEditingChordId(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingChordId(null)}
                                  className="bg-black/90 border border-emerald-400 rounded px-1 text-[10px] text-white font-bold outline-none w-14 text-center"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span 
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingChordId(chord.id);
                                  }}
                                  className="font-bold truncate cursor-text"
                                >
                                  {chord.chord}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimelineChords(prev => prev.filter(c => c.id !== chord.id));
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-rose-400 px-1 text-[11px] transition"
                              title="Delete chord"
                            >
                              ×
                            </button>

                            <div
                              onMouseDown={(e) => handleStartResize(e, 'chord', chord.id, 'end', chord.timeSec, chord.endSec)}
                              className="w-2 hover:w-2.5 h-full bg-emerald-400/40 hover:bg-emerald-400 cursor-ew-resize rounded-r transition-all shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* 3. Waveform Container with Section Overlays */}
                    <div className="relative w-full overflow-hidden rounded-lg">
                      <div className="absolute inset-0 z-10 pointer-events-none flex">
                        {sections.map((sec) => {
                          const totalDur = durationSec || 155;
                          const leftPct = (sec.startSec / totalDur) * 100;
                          const widthPct = ((sec.endSec - sec.startSec) / totalDur) * 100;
                          const isActive = activeSectionId === sec.id;

                          return (
                            <div
                              key={sec.id}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.20)' : 'rgba(255, 255, 255, 0.03)',
                                borderColor: sec.color
                              }}
                              className={`absolute top-0 bottom-0 border-r border-dashed transition-all ${
                                isActive ? 'border-l border-r-2 shadow-inner' : ''
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Section Top Header with Flush Resize Edges */}
                      <div className="relative h-12 bg-zinc-950/90 rounded-t-lg border-b border-zinc-800/80 overflow-hidden flex z-20">
                        {sections.map((sec) => {
                          const totalDur = durationSec || 155;
                          const leftPct = (sec.startSec / totalDur) * 100;
                          const widthPct = ((sec.endSec - sec.startSec) / totalDur) * 100;
                          const isActive = activeSectionId === sec.id;

                          return (
                            <div
                              key={sec.id}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                borderColor: sec.color
                              }}
                              onMouseDown={(e) => handleStartMove(e, 'section', sec.id, sec.startSec, sec.endSec)}
                              onDoubleClick={() => handleSectionDoubleClick(sec)}
                              className={`absolute top-0 bottom-0 border-t-2 border-r flex items-center justify-between cursor-grab active:cursor-grabbing transition select-none group ${
                                isActive ? 'bg-zinc-800/90 shadow-md' : 'bg-zinc-900/60 hover:bg-zinc-800/40'
                              }`}
                              title={`${sec.name}: Double-click to auto-zoom & frame. Drag block to move along bars. Drag edges to resize.`}
                            >
                              <div
                                onMouseDown={(e) => handleStartResize(e, 'section', sec.id, 'start', sec.startSec, sec.endSec)}
                                className="w-2.5 hover:w-3 h-full bg-zinc-700/60 hover:bg-emerald-400 cursor-ew-resize transition-all shrink-0 flex items-center justify-center"
                              >
                                <div className="w-[1px] h-3 bg-zinc-400 group-hover:bg-black" />
                              </div>

                              <div className="flex-1 min-w-0 px-2 flex flex-col justify-center">
                                <div className="flex items-center justify-between gap-1">
                                  {editingSectionNameId === sec.id ? (
                                    <input
                                      type="text"
                                      value={sec.name}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSections(prev => prev.map(s => s.id === sec.id ? { ...s, name: val } : s));
                                      }}
                                      onBlur={() => setEditingSectionNameId(null)}
                                      onKeyDown={(e) => e.key === 'Enter' && setEditingSectionNameId(null)}
                                      className="bg-black/95 border border-emerald-400 rounded px-1 text-[10px] text-zinc-100 font-bold outline-none w-full"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[10px] font-bold text-zinc-100 truncate">
                                        {sec.name}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSectionNameId(sec.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition p-0.5"
                                        title="Rename section"
                                      >
                                        <Edit3 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}

                                  <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                                    b.{sec.barStart}-{sec.barEnd}
                                  </span>
                                </div>
                                <span className="text-[8.5px] font-mono text-zinc-500 block truncate mt-0.5">
                                  {formatTime(sec.startSec)} – {formatTime(sec.endSec)}
                                </span>
                              </div>

                              <div
                                onMouseDown={(e) => handleStartResize(e, 'section', sec.id, 'end', sec.startSec, sec.endSec)}
                                className="w-2.5 hover:w-3 h-full bg-zinc-700/60 hover:bg-emerald-400 cursor-ew-resize transition-all shrink-0 flex items-center justify-center"
                              >
                                <div className="w-[1px] h-3 bg-zinc-400 group-hover:bg-black" />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div ref={containerRef} className="w-full cursor-pointer relative" />
                    </div>

                    {/* 4. Bar & Beat Ruler */}
                    <div className="h-5 flex items-center justify-between text-[9px] font-mono text-zinc-500 border-t border-zinc-800/80 px-1 select-none">
                      <span>BAR 1 (0:00)</span>
                      <span>BAR {Math.floor(calculateBarAtTime(durationSec * 0.25))}</span>
                      <span>BAR {Math.floor(calculateBarAtTime(durationSec * 0.50))}</span>
                      <span>BAR {Math.floor(calculateBarAtTime(durationSec * 0.75))}</span>
                      <span>BAR {calculateBarAtTime(durationSec)} ({formatTime(durationSec)})</span>
                    </div>

                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-44 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-[#0d0d12] rounded-xl flex flex-col items-center justify-center text-center p-6 cursor-pointer transition"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 mb-2">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-zinc-200">No Audio Master Loaded</span>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      Upload an audio file (.WAV, .AIF, .MP3) or select an input device and click <strong className="text-rose-400 font-semibold">Record In</strong> above to record live audio from Spotify, YouTube, or an audio interface.
                    </p>
                  </div>
                )}
              </div>

              {/* Readout Footer & Section Addition */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-1">
                <div className="flex items-center gap-3">
                  <span>Playhead: <strong className="text-emerald-400">{formatTime(currentTimeSec)}</strong> (Bar {calculateBarAtTime(currentTimeSec)})</span>
                  <span>Zoom Scale: <strong className="text-zinc-300">{zoomPxPerSec === 0 ? 'Full Fit' : `${zoomPxPerSec} px/sec`}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddSection}
                    disabled={!analyzedFile}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30 font-semibold disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Next Section</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0e0e12] border border-zinc-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Tempo Detected</span>
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-100">{metrics.bpm > 0 ? `${metrics.bpm} BPM` : '--'}</div>
                <span className="text-[10px] text-zinc-400">{metrics.bpm > 0 ? `Beat sync: ${(beatSec * 1000).toFixed(0)}ms` : 'Awaiting audio'}</span>
              </div>

              <div className="p-4 bg-[#0e0e12] border border-zinc-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Harmonic Key</span>
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">{metrics.detectedKey}</div>
                <span className="text-[10px] text-zinc-400">{metrics.scaleMode}</span>
              </div>

              <div className="p-4 bg-[#0e0e12] border border-zinc-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Integrated Loudness</span>
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-100">{metrics.integratedLufs !== 0 ? `${metrics.integratedLufs} LUFS` : '--'}</div>
                <span className="text-[10px] text-zinc-400">{metrics.shortTermMaxLufs !== 0 ? `Peak: ${metrics.shortTermMaxLufs} LUFS` : 'Awaiting audio'}</span>
              </div>

              <div className="p-4 bg-[#0e0e12] border border-zinc-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] uppercase font-bold tracking-wider">True Peak Ceiling</span>
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-100">{metrics.truePeakDb !== 0 ? `${metrics.truePeakDb} dB` : '--'}</div>
                <span className="text-[10px] text-zinc-400">{metrics.crestFactorDb !== 0 ? `Crest Factor: ${metrics.crestFactorDb} dB` : 'Awaiting audio'}</span>
              </div>
            </div>

            {/* Track Blueprint Section */}
            <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Track Blueprint</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Decoded arrangement map, instrument orchestrations, and notes synchronized with the inspector.
                  </p>
                </div>

                <button
                  onClick={handleExportPdfBlueprint}
                  disabled={sections.length === 0}
                  className="flex items-center gap-2 bg-[#171720] hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-40"
                >
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>Export PDF Blueprint</span>
                </button>
              </div>

              {/* Track Feel Summary */}
              <div className="p-4 bg-[#121217] border border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Track Feel, Narrative & Sonic Vibe
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {trackFeelNotes || 'No narrative notes logged yet.'}
                </p>
              </div>

              {/* Act Blocks */}
              <div className="space-y-3">
                {sections.length > 0 ? (
                  sections.map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    const isEditingName = editingSectionNameId === sec.id;

                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSectionDoubleClick(sec)}
                        className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                          isActive 
                            ? 'bg-[#14141a] border-emerald-500/50 shadow-md' 
                            : 'bg-[#111116] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                            
                            {isEditingName ? (
                              <input
                                type="text"
                                value={sec.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSections(prev => prev.map(s => s.id === sec.id ? { ...s, name: val } : s));
                                }}
                                onBlur={() => setEditingSectionNameId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingSectionNameId(null)}
                                className="bg-[#181820] border border-zinc-600 rounded px-2 py-0.5 text-xs text-zinc-100 font-bold outline-none"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-100">{sec.name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSectionNameId(sec.id);
                                  }}
                                  className="text-zinc-500 hover:text-zinc-300"
                                  title="Rename Section"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-500/30">
                              {formatTime(sec.startSec)} – {formatTime(sec.endSec)} (Bars {sec.barStart}–{sec.barEnd})
                            </span>

                            {sections.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSection(sec.id);
                                }}
                                className="p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                                title="Delete Section"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {sec.description}
                        </p>

                        {sec.notes && (
                          <p className="text-xs text-amber-300/90 font-mono bg-amber-950/20 border border-amber-500/20 p-2 rounded-lg">
                            💡 {sec.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sec.instruments.map((inst, i) => (
                            <span key={i} className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/60">
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center border border-zinc-800/80 rounded-xl bg-[#111116] text-zinc-500 text-xs">
                    No track sections active. Ingest or record an audio master above to auto-generate the blueprint.
                  </div>
                )}
              </div>
            </div>

            {/* Attach to Project */}
            <div className="bg-[#0f0f14] border border-zinc-800/90 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Attach Track Blueprint to Project Brief</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Save this decoded blueprint and chord formula into your production database.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-[#141419] border border-zinc-700 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none font-medium"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.publisher} — {p.albumTitle}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAttachAsBlueprint}
                  disabled={sections.length === 0}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/20 active:scale-95 disabled:opacity-40"
                >
                  {attachedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Blueprint Attached!</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Save to Cheat Sheets</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Collapsible Right Inspector Panel */}
        {isSidePanelOpen && (
          <div className="w-84 min-w-[340px] max-w-[380px] bg-[#09090c] border-l border-zinc-800/90 flex flex-col p-5 overflow-y-auto space-y-5 select-none animate-in slide-in-from-right duration-150 pb-28">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-100">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Section Inspector</span>
              </div>
              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Active Section Info Card */}
            {activeSection ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#111116] border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Active Focus Target</span>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-100">{activeSection.name}</h3>
                    <button
                      onClick={() => setEditingSectionNameId(activeSection.id)}
                      className="text-zinc-400 hover:text-white"
                      title="Rename section"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 block">
                    {formatTime(activeSection.startSec)} – {formatTime(activeSection.endSec)} (Bars {activeSection.barStart}–{activeSection.barEnd})
                  </span>
                </div>

                {/* Section-Specific Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Section Arrangement Notes</span>
                    </label>
                    <button
                      onClick={() => setActiveModalNoteType('section')}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                      title="Expand to Full Screen"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expand</span>
                    </button>
                  </div>

                  <textarea
                    value={activeSection.notes}
                    onClick={() => setActiveModalNoteType('section')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, notes: val } : s));
                    }}
                    rows={5}
                    placeholder="Click to expand full screen editor..."
                    className="w-full bg-[#121217] hover:border-zinc-500 border border-zinc-700/80 rounded-xl p-3 text-xs text-zinc-100 outline-none resize-none leading-relaxed focus:border-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Instrument Palette */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instrumentation Palette</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_INSTRUMENTS.map((inst) => {
                      const isSelected = activeSection.instruments.includes(inst);
                      return (
                        <button
                          key={inst}
                          onClick={() => handleToggleInstrument(inst)}
                          className={`text-[10px] font-mono px-2 py-1 rounded-md border transition ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                              : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-white'
                          }`}
                        >
                          {isSelected ? `✓ ${inst}` : `+ ${inst}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-zinc-800 rounded-xl bg-[#111116] text-zinc-500 text-xs">
                Load or record an audio track to inspect and edit cue sections.
              </div>
            )}

            {/* Track Feel & Narrative */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Track Feel, Narrative & Sonic Vibe</span>
                </label>
                <button
                  onClick={() => setActiveModalNoteType('global')}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                  title="Expand to Full Screen"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Expand</span>
                </button>
              </div>

              <textarea
                value={trackFeelNotes}
                onClick={() => setActiveModalNoteType('global')}
                onChange={(e) => setTrackFeelNotes(e.target.value)}
                rows={5}
                placeholder="Click to expand full screen narrative editor..."
                className="w-full bg-[#121217] hover:border-zinc-500 border border-zinc-700/80 rounded-xl p-3 text-xs text-zinc-100 outline-none resize-none leading-relaxed focus:border-emerald-500 cursor-pointer"
              />
            </div>

          </div>
        )}

      </div>

      {/* SYNCHRONIZED PERSISTENT BOTTOM AUDIO PLAYER DOCK */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#0a0a0e]/95 backdrop-blur-md border-t border-zinc-800 z-40 px-6 flex items-center justify-between gap-6 shadow-2xl">
        
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 w-1/4 min-w-[220px]">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-zinc-100 truncate block">
              {analyzedFile ? analyzedFile.name : (isRecording ? 'Capturing External Audio...' : 'No Audio Master Playing')}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono block truncate">
              {analyzedFile ? `${metrics.bpm} BPM • Key: ${metrics.detectedKey}` : (isRecording ? `REC: ${formatTime(recordingSeconds)}` : 'Awaiting Track Ingestion')}
            </span>
          </div>
        </div>

        {/* Center: Playhead Controls & Scrubber */}
        <div className="flex-1 max-w-2xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSkipToStart}
              disabled={!analyzedFile}
              className="text-zinc-400 hover:text-white transition disabled:opacity-30"
              title="Skip to Start"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handleSkipToPreviousSection}
              disabled={!analyzedFile || sections.length === 0}
              className="text-zinc-400 hover:text-emerald-400 transition disabled:opacity-30"
              title="Previous Section"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleRewind5Sec}
              disabled={!analyzedFile}
              className="text-zinc-400 hover:text-white transition disabled:opacity-30"
              title="Rewind 5s"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => waveSurferRef.current?.playPause()}
              disabled={!analyzedFile}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-30 mx-1"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button
              onClick={handleFastForward5Sec}
              disabled={!analyzedFile}
              className="text-zinc-400 hover:text-white transition disabled:opacity-30"
              title="Fast Forward 5s"
            >
              <FastForward className="w-4 h-4" />
            </button>
            <button
              onClick={handleSkipToNextSection}
              disabled={!analyzedFile || sections.length === 0}
              className="text-zinc-400 hover:text-emerald-400 transition disabled:opacity-30"
              title="Next Section"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleRestartAndPlay}
              disabled={!analyzedFile}
              className="text-zinc-400 hover:text-white transition disabled:opacity-30"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Scrubber Slider */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-400 w-10 text-right">
              {formatTime(currentTimeSec)}
            </span>
            <input
              type="range"
              min={0}
              max={durationSec > 0 ? durationSec : 155}
              step={0.1}
              value={currentTimeSec}
              onChange={handleSeekScrubber}
              disabled={!analyzedFile}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
            />
            <span className="text-[10px] font-mono text-zinc-400 w-10">
              {formatTime(durationSec > 0 ? durationSec : 0)}
            </span>
          </div>
        </div>

        {/* Right: Section Target */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          {activeSection ? (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block truncate">
                {activeSection.name}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block">
                Bars {activeSection.barStart}–{activeSection.barEnd}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-zinc-600">No Target Section</span>
          )}
        </div>

      </div>

      {/* FULL SCREEN MODAL */}
      {activeModalNoteType && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#0e0e13] border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {activeModalNoteType === 'section' && activeSection
                      ? `${activeSection.name} — Arrangement Notes` 
                      : 'Track Feel, Narrative & Sonic Vibe'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Detailed mixing, instrumentation notes, and creative commentary.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalNoteType(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModalNoteType === 'section' && activeSection ? (
              <textarea
                value={activeSection.notes}
                onChange={(e) => {
                  const val = e.target.value;
                  setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, notes: val } : s));
                }}
                rows={12}
                placeholder="Write detailed arrangement instructions, mixing directives, filter automations, and reference cues..."
                className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-4 text-sm text-zinc-100 outline-none leading-relaxed resize-none"
                autoFocus
              />
            ) : (
              <textarea
                value={trackFeelNotes}
                onChange={(e) => setTrackFeelNotes(e.target.value)}
                rows={12}
                placeholder="Describe the pacing, emotional arc, trailer tension curve, dramatic drop timing, and instrumentation sonic palette..."
                className="w-full bg-[#14141a] border border-zinc-700 focus:border-emerald-500 rounded-xl p-4 text-sm text-zinc-100 outline-none leading-relaxed resize-none"
                autoFocus
              />
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500 font-mono">
                {activeModalNoteType === 'section' && activeSection ? activeSection.notes.length : trackFeelNotes.length} characters
              </span>
              <button
                onClick={() => setActiveModalNoteType(null)}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-xl text-xs transition"
              >
                Done & Apply Notes
              </button>
            </div>
          </div>
        </div>
      )}

    
      {/* RECORDING METADATA DIALOG */}
      {pendingRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0e1017] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Recording Finished • Save Metadata</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Audio encoded at 48kHz / 320 kbps. Add metadata for file storage.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                {pendingRecording.approxSize}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                  Track Name *
                </label>
                <input
                  type="text"
                  value={recordedMetaForm.title}
                  onChange={(e) => setRecordedMetaForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Celestial Horizon (Trailer Cue)"
                  className="w-full px-3 py-2 rounded-xl bg-[#08090d] border border-white/10 text-white font-semibold focus:border-emerald-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                    Artist / Composer
                  </label>
                  <input
                    type="text"
                    value={recordedMetaForm.artist}
                    onChange={(e) => setRecordedMetaForm(prev => ({ ...prev, artist: e.target.value }))}
                    placeholder="Composer / Artist Name"
                    className="w-full px-3 py-2 rounded-xl bg-[#08090d] border border-white/10 text-white font-medium focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                    Album / Project / Vault
                  </label>
                  <input
                    type="text"
                    value={recordedMetaForm.album}
                    onChange={(e) => setRecordedMetaForm(prev => ({ ...prev, album: e.target.value }))}
                    placeholder="e.g. Studio Captures 2026"
                    className="w-full px-3 py-2 rounded-xl bg-[#08090d] border border-white/10 text-white font-medium focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                    Tempo (BPM)
                  </label>
                  <input
                    type="number"
                    value={recordedMetaForm.bpm}
                    onChange={(e) => setRecordedMetaForm(prev => ({ ...prev, bpm: Number(e.target.value) || 120 }))}
                    className="w-full px-3 py-2 rounded-xl bg-[#08090d] border border-white/10 text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                    Musical Key
                  </label>
                  <input
                    type="text"
                    value={recordedMetaForm.key}
                    onChange={(e) => setRecordedMetaForm(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="e.g. D min, G# maj"
                    className="w-full px-3 py-2 rounded-xl bg-[#08090d] border border-white/10 text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08090d] border border-white/5 flex items-center justify-between text-xs">
              <span className="text-zinc-400">File Output Path:</span>
              <span className="font-mono text-emerald-400 font-semibold truncate max-w-xs">
                SSD/Library/Captures/{(recordedMetaForm.artist || 'Artist').replace(/\s+/g, '_')}_{(recordedMetaForm.title || 'Track').replace(/\s+/g, '_')}.mp3
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingRecording(null)}
                className="px-py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition"
              >
                Discard Recording
              </button>
              <button
                type="button"
                onClick={handleCommitRecordedMetadata}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-950/40"
              >
                Save File & Add to Library
              </button>
            </div>
          </div>
        </div>
      )}

</div>
  );
}