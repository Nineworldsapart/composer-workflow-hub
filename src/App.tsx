import { CWLogo } from './components/CWLogo';
import React, { useState, useRef, Component, type ErrorInfo, type ReactNode } from 'react';
import { 
  Music, HardDrive, SlidersHorizontal, Inbox, BookOpen, Database, 
  FolderKanban, Activity, ChevronDown, ChevronRight, Building2, Folder, 
  Plus, ListMusic, Compass, FileText, Sparkles, Tag, ArrowRight, 
  RotateCcw, X, HelpCircle, FileAudio, UploadCloud, FileCheck, 
  Loader2, Trash2, Clock, Settings
} from 'lucide-react';

import type { 
  Track, ProjectBrief, LibraryItem, Playlist, PublisherContact,
  NavSection, MixChecklist, FeedbackNote, EditableCheatSheet,
  AudioExportSettings
, DynamicDeliverableItem } from './types';

import { 
  INITIAL_PUBLISHERS, INITIAL_PROJECTS, INITIAL_LIBRARY, INITIAL_PLAYLISTS 
} from './initialData';

import { LibraryView } from './components/views/LibraryView';
import { ProjectsView } from './components/views/ProjectsView';
import { DatabaseView } from './components/views/DatabaseView';
import { AnalyserView } from './components/views/AnalyserView';
import { ResourcesView } from './components/views/ResourcesView';
import { SettingsView, type ComposerProfile } from './components/views/SettingsView';
import { AudioWaveformPlayer } from './components/AudioWaveformPlayer';
import { OnboardingModal } from './components/OnboardingModal';
import { getBriefBasePath, getTrackBasePath, getGenericLibraryTrackPath } from './utils/pathUtils';

// Error Boundary to prevent any child audio/widget error from blanking the screen
class SafeBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Handled component notice:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default function App(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<NavSection>('projects');

  // Audio Export Format Settings State
  const [audioSettings, setAudioSettings] = useState<AudioExportSettings>(() => {
    const saved = localStorage.getItem('composer_audio_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* fallback to defaults */
      }
    }
    return {
      format: 'WAV',
      sampleRate: '48.0 kHz',
      bitDepth: '24-bit',
      mp3Bitrate: '320 kbps (CBR)',
    };
  });

  const updateAudioSetting = <K extends keyof AudioExportSettings>(
    key: K,
    value: AudioExportSettings[K]
  ) => {
    setAudioSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('composer_audio_settings', JSON.stringify(next));
      return next;
    });
  };

  
  const [isProjectsExpanded, setIsProjectsExpanded] = useState<boolean>(true);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState<boolean>(true);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState<boolean>(true);
  const [isResourcesExpanded, setIsResourcesExpanded] = useState<boolean>(true);

  // Composer Profile & Storage Settings State
  const [profile, setProfile] = useState<ComposerProfile>(() => {
    const defaultProfile: ComposerProfile = {
      fullName: 'Studio Composer',
      artistName: 'Apex Production Music',
      email: 'composer@studio.com',
      website: '',
      proAffiliation: 'PRS',
      ipiNumber: '',
      publisherEntity: '',
      publisherIpi: '',
      defaultFileFormat: 'WAV',
    defaultSampleRate: '48 kHz',
      defaultBitDepth: '24-bit PCM',
      storageRootPath: '/Volumes/T7_Shield',
      audioOutputDeviceId: 'default',
      audioOutputDeviceName: 'Default System Output'
    };

    try {
      const saved = localStorage.getItem('composer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultProfile,
          ...parsed,
          storageRootPath: parsed.storageRootPath || defaultProfile.storageRootPath
        };
      }
    } catch {}

    return defaultProfile;
  });

  // First-Run Studio Onboarding Intercept
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('studio_onboarding_completed');
  });

  const handleCompleteOnboarding = (completedProfile: ComposerProfile) => {
    const validated = {
      ...completedProfile,
      storageRootPath: completedProfile.storageRootPath || '/Volumes/T7_Shield'
    };
    setProfile(validated);
    localStorage.setItem('composer_profile', JSON.stringify(validated));
    localStorage.setItem('studio_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleSaveProfile = (newProfile: ComposerProfile) => {
    const validated = {
      ...newProfile,
      storageRootPath: newProfile.storageRootPath || '/Volumes/T7_Shield'
    };
    setProfile(validated);
    localStorage.setItem('composer_profile', JSON.stringify(validated));
  };

  // Global Synchronized Production Recipes State
  const [cheatSheets, setCheatSheets] = useState<EditableCheatSheet[]>([]);

  // Library Navigation State
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isRecentlyAddedView, setIsRecentlyAddedView] = useState<boolean>(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [activePlaylistMenuTrackId, setActivePlaylistMenuTrackId] = useState<string | null>(null);

  const [expandedProjectsPublishers, setExpandedProjectsPublishers] = useState<Record<string, boolean>>({
    
    'Trailer Tension Lab': true,
    '2 Red Jokers': false
  });

  const [expandedDatabasePublishers, setExpandedDatabasePublishers] = useState<Record<string, boolean>>({
    
    'Trailer Tension Lab': true,
    '2 Red Jokers': false
  });

  const [selectedProjectPublisher, setSelectedProjectPublisher] = useState<string | null>(null);
  const [selectedDatabasePublisher, setSelectedDatabasePublisher] = useState<string | null>(null);

  const [activeWrittenBrief, setActiveWrittenBrief] = useState<ProjectBrief | null>(null);
  const [pendingArchiveBrief, setPendingArchiveBrief] = useState<ProjectBrief | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<{ projectId: string; trackId: string; trackTitle: string } | null>(null);

  const [isNewPublisherModalOpen, setIsNewPublisherModalOpen] = useState<boolean>(false);
  const [publisherForm, setPublisherForm] = useState<{ name: string; country: string; repName: string; contactEmail: string; notes: string }>({
    name: '', country: '', repName: '', contactEmail: '', notes: ''
  });

  const [isNewBriefModalOpen, setIsNewBriefModalOpen] = useState<boolean>(false);
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const [briefForm, setBriefForm] = useState<{
    publisher: string;
    albumTitle: string;
    code: string;
    deadline: string;
    deliveryYear: number;
    ssdPath: string;
    targetState: 'active' | 'prospective';
    creativeSummary: string;
    storyAndPacing: string;
    structureNotes: string;
    targetPlacements: string;
    moodKeywords: string;
    instrumentation: string;
    referenceList: { id: string; title: string; artistOrSource: string; url: string; timecodeNotes: string }[];
  }>({
    publisher: '',
    albumTitle: '',
    code: '',
    deadline: '15 Dec 2026',
    deliveryYear: 2026,
    ssdPath: '',
    targetState: 'active',
    creativeSummary: '',
    storyAndPacing: '',
    structureNotes: 'Act 1: Sparse atmospheric setup (0:00 - 0:30)\nAct 2: Relentless driving rhythm & build (0:30 - 1:15)\nDrop / Silence: Tension pause\nAct 3: Massive wall-of-sound climax (1:18 - 1:55)\nStinger: Resonant sub decay',
    targetPlacements: 'Theatrical Trailers, Sci-Fi Blockbusters & Game Promos',
    moodKeywords: 'Cinematic, Hybrid, Aggressive, Dark',
    instrumentation: 'Massive Braams, Solo Cello, Low Distorted Synths, Heavy Taikos, Aggressive Brass',
    referenceList: [
      {
        id: 'ref-1',
        title: '',
        artistOrSource: 'Audiomachine / Paul Dinletir',
        url: 'https://youtube.com',
        timecodeNotes: 'Reference the punchy low-end brass braams and string ostinato interplay.'
      }
    ]
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<'upload' | 'metadata'>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stagedFile, setStagedFile] = useState<{ name: string; size: string; blobUrl?: string } | null>(null);
  const [trackForm, setTrackForm] = useState<{
    title: string; version: string; bpm: number; key: string; status: Track['status'];
  }>({
    title: '', version: 'v1.0', bpm: 120, key: 'D min', status: 'In Progress'
  });

  const [publishersList, setPublishersList] = useState<PublisherContact[]>(INITIAL_PUBLISHERS);
  const [projects, setProjects] = useState<ProjectBrief[]>(INITIAL_PROJECTS);

  // Handler to amend project-specific required deliverables per publisher
  const handleUpdateDeliverables = (projectId: string, updatedDeliverables: DynamicDeliverableItem[]) => {
    setProjects(prevProjects =>
      prevProjects.map(proj =>
        proj.id === projectId
          ? { ...proj, dynamicDeliverables: updatedDeliverables }
          : proj
      )
    );
  };

  
  const [library, setLibrary] = useState<LibraryItem[]>(() => {
    return INITIAL_LIBRARY.map(item => {
      if (item.publisher && item.publisher !== 'Independent' && item.albumTitle) {
        const bp = getBriefBasePath(item.publisher, 2026, item.albumTitle);
        const tp = getTrackBasePath(bp, 'TR-01', item.title);
        return { ...item, ssdPath: `${tp}/01_Masters/${item.fileName}` };
      }
      return { ...item, ssdPath: getGenericLibraryTrackPath(item.fileName, 2026) };
    });
  });

  const [activeProjectId, setActiveProjectId] = useState<string>('nt-01');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(45);
  const [totalLengthSec, setTotalLengthSec] = useState<number>(154);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || {
    id: 'default',
    code: 'DEF-01',
    albumTitle: 'Default Project',
    publisher: '',
    deadline: '2026',
    deliveryYear: 2026,
    state: 'active' as const,
    ssdPath: '/Volumes/T7_Shield',
    tracks: []
  };

  const undeliveredTracks = activeProject?.tracks?.filter(t => !t.delivered) || [];
  const activeProjectsList = projects.filter(p => p.state === 'active');
  const databaseBriefsList = projects.filter(p => p.state === 'prospective' || p.state === 'completed');

  const activePublishers = Array.from(new Set(activeProjectsList.map(p => p.publisher)));
  const databasePublishers = Array.from(new Set(databaseBriefsList.map(p => p.publisher)));

  const allPublisherNames = Array.from(new Set([
    ...publishersList.map(p => p.name),
    ...projects.map(p => p.publisher)
  ]));

  const safeStorageRoot = profile?.storageRootPath || '/Volumes/T7_Shield';

  const toggleProjectsPublisher = (pub: string) => {
    setExpandedProjectsPublishers(prev => ({ ...prev, [pub]: !prev[pub] }));
  };

  const toggleDatabasePublisher = (pub: string) => {
    setExpandedDatabasePublishers(prev => ({ ...prev, [pub]: !prev[pub] }));
  };

  const playTrackItem = (trackId: string) => {
    for (const proj of projects) {
      const match = proj.tracks.find(t => t.id === trackId);
      if (match) {
        if (selectedTrack?.id === match.id) {
          setIsPlaying(!isPlaying);
        } else {
          setSelectedTrack(match);
          setTotalLengthSec(match.durationSec || 160);
          setCurrentTimeSec(0);
          setIsPlaying(true);
        }
        return;
      }
    }

    const libItem = library.find(item => item.trackId === trackId);
    if (libItem) {
      const constructedTrack: Track = {
        id: libItem.trackId,
        trackNumber: 'LIB',
        title: libItem.title,
        version: libItem.version,
        status: 'Approved',
        deadline: 'N/A',
        bpm: libItem.bpm,
        key: libItem.key,
        durationSec: libItem.durationSec,
        fileName: libItem.fileName,
        fileSize: libItem.fileSize,
        checklist: {
          master: true, fullMix: true, altMix1: false, altMix2: false,
          drumsSfx: false, stems: false, cut60: false, cut30: false, cut15: false
        },
        deliverableFiles: {
          master: {
            key: 'master',
            label: '01. MASTER WAV',
            category: 'Masters',
            subFolder: '01_Masters',
            fileName: libItem.fileName,
            fileSize: libItem.fileSize,
            ssdFilePath: libItem.ssdPath,
            isDelivered: true,
            uploadedDate: libItem.importedDate
          }
        },
        notes: []
      };
      setSelectedTrack(constructedTrack);
      setTotalLengthSec(libItem.durationSec || 160);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }
  };

  const handlePlaySpecificFile = (trackId: string, fileName: string, fileLabel: string) => {
    for (const proj of projects) {
      const match = proj.tracks.find(t => t.id === trackId);
      if (match) {
        setSelectedTrack({
          ...match,
          title: `${match.title} (${fileLabel.replace(/^\d+\.\s*/, '')})`,
          fileName
        });
        setTotalLengthSec(match.durationSec || 160);
        setCurrentTimeSec(0);
        setIsPlaying(true);
        return;
      }
    }
  };

  const handleToggleTrackInPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      const exists = pl.trackIds.includes(trackId);
      return {
        ...pl,
        trackIds: exists ? pl.trackIds.filter(id => id !== trackId) : [...pl.trackIds, trackId]
      };
    }));
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      trackIds: []
    };
    setPlaylists(prev => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    setIsRecentlyAddedView(false);
    setNewPlaylistName('');
    setIsNewPlaylistModalOpen(false);
  };

  const handleExtractFromPdf = async (file: File) => {
    setIsParsingPdf(true);
    setPdfFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('utf-8');
      const textChunk = decoder.decode(bytes);

      const sanitizedLines = textChunk
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(l => l.length > 3);

      const extractedText = sanitizedLines.join('\n');

      let detectedPublisher = briefForm.publisher || allPublisherNames[0] || '';
      for (const pub of allPublisherNames) {
        if (new RegExp(pub, 'i').test(extractedText)) {
          detectedPublisher = pub;
          break;
        }
      }

      let detectedTitle = '';
      const titleMatch = extractedText.match(/(?:title|album|project|campaign|brief for)\s*[:\-–]\s*([^\n\r.]+)/i);
      if (titleMatch && titleMatch[1]) {
        detectedTitle = titleMatch[1].trim();
      } else {
        detectedTitle = file.name
          .replace(/\.pdf$/i, '')
          .replace(/brief|trailer|project/gi, '')
          .replace(/[_-]+/g, ' ')
          .trim();
        detectedTitle = detectedTitle ? detectedTitle.charAt(0).toUpperCase() + detectedTitle.slice(1) : 'Untitled Brief';
      }

      let detectedCode = '';
      const codeMatch = extractedText.match(/(?:code|cat(?:alog)?|ref)\s*[:\-–]?\s*([A-Z0-9\-_]{3,12})/i);
      if (codeMatch && codeMatch[1]) {
        detectedCode = codeMatch[1].toUpperCase().trim();
      } else {
        const prefix = detectedPublisher.substring(0, 3).toUpperCase();
        detectedCode = `${prefix}-${Math.floor(10 + Math.random() * 89)}`;
      }

      let detectedDeadline = '15 Dec 2026';
      const deadlineMatch = extractedText.match(/(?:deadline|delivery|due(?: date)?)\s*[:\-–]\s*([^\n\r.]+)/i);
      if (deadlineMatch && deadlineMatch[1]) {
        detectedDeadline = deadlineMatch[1].trim();
      }

      let detectedSummary = '';
      const summaryMatch = extractedText.match(/(?:summary|description|creative direction|synopsis|concept)\s*[:\-–]\s*([\s\S]{20,300}?)(?=(?:target|instrumentation|mood|reference|$))/i);
      if (summaryMatch && summaryMatch[1]) {
        detectedSummary = summaryMatch[1].replace(/\s+/g, ' ').trim();
      } else {
        detectedSummary = `High-impact cinematic trailer cues requested by ${detectedPublisher}. Modern sound design with escalating 3-act structures.`;
      }

      const canonicalPath = getBriefBasePath(detectedPublisher, 2026, detectedTitle);

      setBriefForm(prev => ({
        ...prev,
        publisher: detectedPublisher,
        albumTitle: detectedTitle,
        code: detectedCode,
        deadline: detectedDeadline,
        deliveryYear: 2026,
        ssdPath: canonicalPath,
        creativeSummary: detectedSummary
      }));

    } catch (err) {
      console.error('PDF extraction notice:', err);
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleCreatePublisher = () => {
    if (!publisherForm.name.trim()) return;
    const newPub: PublisherContact = {
      id: `pub-${Date.now()}`,
      name: publisherForm.name.trim(),
      country: publisherForm.country.trim() || 'Worldwide',
      repName: publisherForm.repName.trim() || 'Creative Executive',
      contactEmail: publisherForm.contactEmail.trim() || 'briefs@publisher.com',
      activeStatus: 'Active',
      notes: publisherForm.notes.trim() || 'Registered publisher partner.'
    };
    setPublishersList(prev => [...prev, newPub]);
    setIsNewPublisherModalOpen(false);
    setPublisherForm({ name: '', country: '', repName: '', contactEmail: '', notes: '' });
  };

  const handleOpenNewBriefModal = (presetPublisher?: string, defaultState: 'active' | 'prospective' = 'active') => {
    const pub = presetPublisher || allPublisherNames[0] || '';
    setPdfFileName(null);
    const initialTitle = 'New Album';
    const computedPath = getBriefBasePath(pub, 2026, initialTitle);

    setBriefForm({
      publisher: pub,
      albumTitle: '',
      code: `${pub.substring(0, 3).toUpperCase()}-26`,
      deadline: '15 Dec 2026',
      deliveryYear: 2026,
      ssdPath: computedPath,
      targetState: defaultState,
      creativeSummary: '',
      storyAndPacing: '',
      structureNotes: 'Act 1: Sparse atmospheric setup (0:00 - 0:30)\nAct 2: Relentless driving rhythm & build (0:30 - 1:15)\nDrop / Silence: Tension pause\nAct 3: Massive wall-of-sound climax (1:18 - 1:55)\nStinger: Resonant sub decay',
      targetPlacements: 'Theatrical Trailers, Sci-Fi Blockbusters & Game Promos',
      moodKeywords: 'Cinematic, Hybrid, Aggressive, Dark',
      instrumentation: 'Massive Braams, Solo Cello, Low Distorted Synths, Heavy Taikos, Aggressive Brass',
      referenceList: [
        {
          id: 'ref-1',
          title: '',
          artistOrSource: 'Audiomachine / Paul Dinletir',
          url: 'https://youtube.com',
          timecodeNotes: 'Reference the punchy low-end brass braams and string ostinato interplay.'
        }
      ]
    });
    setIsNewBriefModalOpen(true);
  };

  const handleCreateBrief = () => {
    if (!briefForm.albumTitle.trim() || !briefForm.publisher) return;
    const newBriefId = `brief-${Date.now()}`;
    const moodTags = briefForm.moodKeywords
      ? briefForm.moodKeywords.split(/[,;#]+/).map(s => s.trim()).filter(Boolean)
      : ['Trailer', 'Cinematic'];

    const canonicalPath = getBriefBasePath(briefForm.publisher, briefForm.deliveryYear || 2026, briefForm.albumTitle);

    const newBrief: ProjectBrief = {
      id: newBriefId,
      code: briefForm.code.trim() || 'NEW-26',
      albumTitle: briefForm.albumTitle.trim(),
      publisher: briefForm.publisher,
      deadline: briefForm.deadline.trim() || '2026',
      deliveryYear: briefForm.deliveryYear || 2026,
      state: briefForm.targetState,
      ssdPath: canonicalPath,
      writtenBrief: {
        creativeSummary: briefForm.creativeSummary.trim() || 'High-impact cinematic media cues.',
        storyAndPacing: briefForm.storyAndPacing.trim(),
        structureNotes: briefForm.structureNotes.trim(),
        targetPlacements: briefForm.targetPlacements.trim() || 'Theatrical Trailers & TV Promos',
        moodKeywords: moodTags,
        instrumentation: briefForm.instrumentation.trim() || 'Hybrid Orchestra, Modern Sound Design',
        referenceList: briefForm.referenceList
      },
      tracks: []
    };

    setProjects(prev => [...prev, newBrief]);

    if (briefForm.targetState === 'active') {
      setActiveProjectId(newBriefId);
      setSelectedProjectPublisher(briefForm.publisher);
      setActiveSection('projects');
    } else {
      setSelectedDatabasePublisher(briefForm.publisher);
      setActiveSection('database');
    }

    setIsNewBriefModalOpen(false);
  };

  const handlePromoteToActive = (briefId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === briefId) {
        return { ...p, state: 'active' };
      }
      return p;
    }));
    setActiveProjectId(briefId);
    const brief = projects.find(p => p.id === briefId);
    if (brief) {
      setSelectedProjectPublisher(brief.publisher);
    }
    setActiveSection('projects');
  };

  const handleExecuteDeleteTrack = () => {
    if (!trackToDelete) return;
    const { projectId, trackId } = trackToDelete;

    if (projectId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          tracks: p.tracks.filter(t => t.id !== trackId)
        };
      }));
    } else {
      setProjects(prev => prev.map(p => ({
        ...p,
        tracks: p.tracks.filter(t => t.id !== trackId)
      })));
    }

    setLibrary(prev => prev.filter(item => item.trackId !== trackId && item.id !== trackId));

    setPlaylists(prev => prev.map(pl => ({
      ...pl,
      trackIds: pl.trackIds.filter(id => id !== trackId)
    })));

    if (selectedTrack?.id === trackId) {
      setSelectedTrack(null);
      setIsPlaying(false);
    }
    setTrackToDelete(null);
  };

  const handleAddDirectLibraryTrack = (data: {
    title: string;
    fileName: string;
    fileSize: string;
    bpm: number;
    key: string;
    version: string;
    publisher: string;
    albumTitle: string;
  }) => {
    const newTrackId = `lib-track-${Date.now()}`;
    const storageRoot = safeStorageRoot;
    const canonicalPath = `${storageRoot}/Library/${data.publisher}/${data.albumTitle}/${data.fileName}`;

    const newLibItem: LibraryItem = {
      id: `lib-${Date.now()}`,
      trackId: newTrackId,
      title: data.title,
      fileName: data.fileName,
      fileSize: data.fileSize,
      durationSec: 155,
      bpm: data.bpm,
      key: data.key,
      version: data.version,
      publisher: data.publisher,
      albumTitle: data.albumTitle,
      importedDate: '25 Oct 2026',
      ssdPath: canonicalPath
    };

    setLibrary(prev => [newLibItem, ...prev]);
  };

  const handleOpenImportModal = () => {
    setStagedFile(null);
    setImportStep('upload');
    setTrackForm({
      title: '', version: 'v1.0', bpm: 120, key: 'D min', status: 'In Progress'
    });
    setIsImportModalOpen(true);
  };

  const handleProcessFile = (fileName: string, fileSize: string, fileBlob?: File) => {
    const cleanedTitle = fileName
      .replace(/\.(wav|aif|aiff|mp3|m4a|flac)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    let blobUrl = '';
    if (fileBlob) {
      blobUrl = URL.createObjectURL(fileBlob);
    }

    setStagedFile({ name: fileName, size: fileSize, blobUrl });
    setTrackForm(prev => ({ ...prev, title: cleanedTitle || 'Untitled Cue' }));
    setImportStep('metadata');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const mb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      handleProcessFile(file.name, mb, file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const mb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      handleProcessFile(file.name, mb, file);
    }
  };

  const handleSaveImportedTrack = () => {
    if (!stagedFile || !trackForm.title.trim()) return;

    const nextNumber = activeProject.tracks.length + 1;
    const trackNumber = `TR-${String(nextNumber).padStart(2, '0')}`;
    const newTrackId = `tr-${Date.now()}`;

    const briefPath = getBriefBasePath(activeProject.publisher, activeProject.deliveryYear || 2026, activeProject.albumTitle);
    const trackPath = getTrackBasePath(briefPath, trackNumber, trackForm.title.trim());
    const fullMasterPath = `${trackPath}/01_Masters/${stagedFile.name}`;

    const newTrack: Track = {
      id: newTrackId,
      trackNumber: trackNumber,
      title: trackForm.title.trim(),
      version: trackForm.version.trim() || 'v1.0',
      status: trackForm.status,
      deadline: activeProject.deadline,
      delivered: false,
      bpm: Number(trackForm.bpm) || 120,
      key: trackForm.key.trim() || 'D min',
      durationSec: 155,
      fileName: stagedFile.name,
      fileSize: stagedFile.size,
      checklist: {
        master: true, fullMix: false, altMix1: false, altMix2: false,
        drumsSfx: false, stems: false, cut60: false, cut30: false, cut15: false
      },
      deliverableFiles: {
        master: {
          key: 'master',
          label: '01. MASTER WAV',
          category: 'Masters',
          subFolder: '01_Masters',
          fileName: stagedFile.name,
          fileSize: stagedFile.size,
          ssdFilePath: fullMasterPath,
          isDelivered: true,
          uploadedDate: '25 Oct 2026'
        }
      },
      notes: []
    };

    if (stagedFile.blobUrl) {
      (newTrack as any).blobUrl = stagedFile.blobUrl;
    }

    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return { ...p, tracks: [...p.tracks, newTrack] };
    }));

    const newLibraryItem: LibraryItem = {
      id: `lib-${Date.now()}`,
      trackId: newTrackId,
      title: newTrack.title,
      fileName: stagedFile.name,
      fileSize: stagedFile.size,
      durationSec: 155,
      bpm: newTrack.bpm,
      key: newTrack.key,
      version: newTrack.version,
      publisher: activeProject.publisher,
      albumTitle: activeProject.albumTitle,
      importedDate: '25 Oct 2026',
      ssdPath: fullMasterPath
    };

    setLibrary(prev => [newLibraryItem, ...prev]);
    setSelectedTrack(newTrack);
    setIsImportModalOpen(false);
  };

  const handleDeliverTrack = (trackId: string) => {
    const today = '25 Oct 2026';
    const remainingAfterThis = undeliveredTracks.filter(t => t.id !== trackId);

    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;

      const updatedTracks = p.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            delivered: true,
            status: 'Approved' as const,
            deliveredDate: today
          };
        }
        return t;
      });

      return { ...p, tracks: updatedTracks };
    }));

    setSelectedTrack(null);

    if (remainingAfterThis.length === 0) {
      setPendingArchiveBrief(activeProject);
    }
  };

  const handleConfirmArchive = (projectId: string) => {
    const today = new Date().toISOString().split('T')[0];

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const pub = p.publisher || 'Publisher';
      const year = p.deliveryYear || 2026;
      const album = p.albumTitle || p.title || 'Untitled_Project';
      const projectBasePath = getBriefBasePath(pub, year, album);

      // Category to standardized studio delivery subfolder map
      const categorySubfolders: Record<string, string> = {
        mix: '01_Mixes',
        master: '02_Masters',
        alt: '03_Alt_Cuts',
        stem: '04_Stems',
        docs: '05_Docs_Metadata',
        audio: '01_Mixes'
      };

      // Stamp every track with its exact canonical folder tree and naming conventions
      const structuredTracks = p.tracks.map((t, idx) => {
        const trackNum = t.trackNumber || ('TR-' + String(idx + 1).padStart(2, '0'));
        const cleanTrackTitle = (t.title || 'Untitled_Cue').replace(/[^a-zA-Z0-9_-]/g, '_');
        const trackBasePath = getTrackBasePath(projectBasePath, trackNum, t.title);

        const deliverableItems = (t.deliverables && t.deliverables.length > 0)
          ? t.deliverables
          : (p.dynamicDeliverables || []);

        const canonicalDeliverables = deliverableItems.map(item => {
          const cat = item.category || 'audio';
          const subfolder = categorySubfolders[cat] || '01_Mixes';
          const folderPath = trackBasePath + '/' + subfolder;

          const sanitizedName = item.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const ext = item.name.toLowerCase().includes('mp3') ? '.mp3'
                    : item.name.toLowerCase().includes('zip') ? '.zip'
                    : item.name.toLowerCase().includes('pdf') ? '.pdf' : '.wav';

          const attachedFile = (item as any).file;
          const fileName = attachedFile && attachedFile.name
            ? attachedFile.name.replace(/\s+/g, '_')
            : pub.replace(/\s+/g, '_') + '_' + cleanTrackTitle + '_' + sanitizedName + ext;

          return {
            id: item.id,
            name: item.name,
            category: cat,
            fileName: fileName,
            folderPath: folderPath,
            fullPath: folderPath + '/' + fileName
          };
        });

        return {
          ...t,
          delivered: true,
          status: 'Delivered' as const,
          deliveredDate: today,
          deliverables: deliverableItems,
          canonicalDeliverables: canonicalDeliverables
        };
      });

      return {
        ...p,
        state: 'completed',
        deliveredDate: today,
        deliveryYear: year,
        tracks: structuredTracks
      };
    }));

    setPendingArchiveBrief(null);
    const remaining = activeProjectsList.filter(p => p.id !== projectId);
    if (remaining.length > 0) {
      setActiveProjectId(remaining[0].id);
    } else {
      setActiveSection('database');
    }
  };

  const handleRestoreProject = (projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        state: 'active',
        tracks: p.tracks.map(t => ({ ...t, delivered: false, status: 'In Progress' }))
      };
    }));
    setActiveProjectId(projectId);
    setSelectedProjectPublisher(projects.find(p => p.id === projectId)?.publisher || null);
    setActiveSection('projects');
  };

  const handleRestoreTrack = (projectId: string, trackId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        state: 'active',
        tracks: p.tracks.map(t => {
          if (t.id === trackId) {
            return { ...t, delivered: false, status: 'In Progress' };
          }
          return t;
        })
      };
    }));
    setActiveProjectId(projectId);
    setSelectedProjectPublisher(projects.find(p => p.id === projectId)?.publisher || null);
    setActiveSection('projects');
  };

  const handleSelectTrack = (track: Track | null) => {
    if (!track) {
      setSelectedTrack(null);
      return;
    }
    setSelectedTrack(track);
    setTotalLengthSec(track.durationSec || 160);
  };

  const toggleChecklist = (itemKey: keyof MixChecklist): void => {
    if (!selectedTrack) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        tracks: p.tracks.map(t => {
          if (t.id === selectedTrack.id) {
            const updated: Track = {
              ...t,
              checklist: { ...t.checklist, [itemKey]: !t.checklist[itemKey] }
            };
            setSelectedTrack(updated);
            return updated;
          }
          return t;
        })
      };
    }));
  };

  const handleAssignDeliverableFile = (
    trackId: string, 
    slotKey: keyof MixChecklist, 
    file: { name: string; size: string; path: string }
  ) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        tracks: p.tracks.map(t => {
          if (t.id === trackId) {
            const updatedChecklist = { ...t.checklist, [slotKey]: true };
            const existingFiles = t.deliverableFiles || {};
            const updatedDeliverableFiles = {
              ...existingFiles,
              [slotKey]: {
                key: slotKey,
                label: slotKey,
                category: 'Masters' as const,
                subFolder: '01_Masters',
                fileName: file.name,
                fileSize: file.size,
                ssdFilePath: file.path,
                isDelivered: true,
                uploadedDate: '25 Oct 2026'
              }
            };
            const updatedTrack: Track = {
              ...t,
              checklist: updatedChecklist,
              deliverableFiles: updatedDeliverableFiles
            };
            if (selectedTrack?.id === trackId) {
              setSelectedTrack(updatedTrack);
            }
            return updatedTrack;
          }
          return t;
        })
      };
    }));
  };

  const handleRemoveDeliverableFile = (trackId: string, slotKey: keyof MixChecklist) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        tracks: p.tracks.map(t => {
          if (t.id === trackId) {
            const updatedChecklist = { ...t.checklist, [slotKey]: false };
            const updatedFiles = { ...(t.deliverableFiles || {}) };
            delete updatedFiles[slotKey];
            const updatedTrack: Track = {
              ...t,
              checklist: updatedChecklist,
              deliverableFiles: updatedFiles
            };
            if (selectedTrack?.id === trackId) {
              setSelectedTrack(updatedTrack);
            }
            return updatedTrack;
          }
          return t;
        })
      };
    }));
  };

  const handleUpdateTrackNotes = (trackId: string, notes: FeedbackNote[]) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        tracks: p.tracks.map(t => {
          if (t.id === trackId) {
            return { ...t, notes };
          }
          return t;
        })
      };
    }));
    if (selectedTrack && selectedTrack.id === trackId) {
      setSelectedTrack(prev => prev ? ({ ...prev, notes }) : null);
    }
  };

  const handleUpdateTrackStatus = (trackId: string, status: Track['status']) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        tracks: p.tracks.map(t => {
          if (t.id === trackId) {
            return { ...t, status };
          }
          return t;
        })
      };
    }));
    if (selectedTrack && selectedTrack.id === trackId) {
      setSelectedTrack(prev => prev ? ({ ...prev, status }) : null);
    }
  };

  const handleSaveCheatSheet = (sheet: EditableCheatSheet) => {
    setCheatSheets(prev => {
      const exists = prev.some(s => s.id === sheet.id);
      if (exists) {
        return prev.map(s => s.id === sheet.id ? sheet : s);
      }
      return [sheet, ...prev];
    });

    if (sheet.associatedProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== sheet.associatedProjectId) return p;
        const existing = p.cheatSheets || [];
        const filtered = existing.filter(cs => cs.id !== sheet.id);
        return {
          ...p,
          cheatSheets: [sheet, ...filtered]
        };
      }));
    }
  };

  const handleAttachCheatSheetFromAnalyser = (projectId: string, cheatSheet: EditableCheatSheet) => {
    handleSaveCheatSheet(cheatSheet);
    if (projectId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        const existing = p.cheatSheets || [];
        const filtered = existing.filter(cs => cs.id !== cheatSheet.id);
        return {
          ...p,
          cheatSheets: [cheatSheet, ...filtered]
        };
      }));
    }
  };

  const handleDeleteCheatSheet = (id: string) => {
    setCheatSheets(prev => prev.filter(s => s.id !== id));
    setProjects(prev => prev.map(p => {
      if (!p.cheatSheets) return p;
      return {
        ...p,
        cheatSheets: p.cheatSheets.filter(s => s.id !== id)
      };
    }));
  };

  
  // Global bridge for Analyser live recordings to register in the Library
  React.useEffect(() => {
    (window as any).__onAddLibraryItem = (newItem: any) => {
      const id = `rec-${Date.now()}`;
      setLibrary(prev => [
        {
          id: id,
          trackId: id,
          title: newItem.title,
          artist: newItem.artist,
          album: newItem.album,
          bpm: newItem.bpm,
          key: newItem.key,
          duration: newItem.duration,
          durationSec: newItem.durationSec,
          fileName: newItem.fileName,
          ssdPath: `SSD/Library/Captures/${newItem.fileName}`,
          isDelivered: false
        },
        ...prev
      ]);
    };
    return () => {
      delete (window as any).__onAddLibraryItem;
    };
  }, []);

return (
    <div className="min-h-screen bg-[#0a0b10] text-[#d4d4d8] flex flex-col font-sans text-sm antialiased selection:bg-zinc-800">
      
      {/* Top Application Bar */}
      <header 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="bg-[#0c0c0e] border-b border-zinc-800/80 pl-24 pr-8 py-3.5 flex flex-wrap items-center justify-between gap-6 shadow-md select-none cursor-move"
      >
        <div className="flex items-center gap-4">
          <div className="bg-zinc-800/80 p-2 rounded-xl text-zinc-100 border border-zinc-700/70 shadow-sm">
            <CWLogo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-zinc-100 uppercase">Composer Workflow</h1>
            <p className="text-[10px] text-zinc-400 font-medium">Trailer & Media Music Production Hub</p>
          </div>
        </div>

        <div 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} 
          className="flex items-center gap-3.5 cursor-default"
        >
          <div className="brushed-dark-chrome border border-zinc-800/90 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 text-zinc-300 shadow-sm">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-semibold">SSD Drive Mount</span>
              <span className="text-xs text-zinc-100 font-mono font-bold tracking-tight">
                {safeStorageRoot}
              </span>
            </div>
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded font-bold tracking-wide ml-1">ONLINE</span>
          </div>

          <div className="bg-[#121216] border border-zinc-800/90 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 text-zinc-300 shadow-sm">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-semibold">Studio Format</span>
              <span className="text-xs text-zinc-100 font-mono font-bold tracking-tight">
                {profile?.defaultSampleRate || '48kHz'} / {profile?.defaultBitDepth || '24-bit PCM'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <nav className="w-72 min-w-72 metal-surface border-b border-white/5 border-r border-zinc-800/80 flex flex-col p-4 select-none">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-3">
            Navigation
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto">
            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeSection === 'settings'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Studio Settings</span>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('analyser')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeSection === 'analyser'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Analyser</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                PRO
              </span>
            </button>

            <div>
              <button
                onClick={() => {
                  setActiveSection('resources');
                  setIsResourcesExpanded(!isResourcesExpanded);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeSection === 'resources'
                    ? 'bg-zinc-800 text-amber-300 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Resources</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                    {cheatSheets.length}
                  </span>
                  {isResourcesExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {isResourcesExpanded && (
                <div className="mt-2 ml-2 pl-2 border-l border-zinc-800/80 space-y-1">
                  <button
                    onClick={() => setActiveSection('resources')}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/30 flex items-center justify-between"
                  >
                    <span>Cheat Sheets</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-500/20">
                      {cheatSheets.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveSection('resources')}
                    className="w-full text-left px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create / Ingest</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 pb-1 border-t border-zinc-800/60 my-1"></div>

            <button
              onClick={() => setActiveSection('inbox')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeSection === 'inbox'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 text-zinc-400" />
                <span>Inbox</span>
              </div>
              <span className="text-xs bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                3
              </span>
            </button>

            <div>
              <button
                onClick={() => {
                  setActiveSection('library');
                  setSelectedPlaylistId(null);
                  setIsRecentlyAddedView(false);
                  setIsLibraryExpanded(!isLibraryExpanded);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeSection === 'library'
                    ? 'bg-zinc-800/80 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                  <span>Library</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                    {library.length}
                  </span>
                  {isLibraryExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {isLibraryExpanded && (
                <div className="mt-2 ml-2 pl-2 border-l border-zinc-800/80 space-y-1">
                  <button
                    onClick={() => {
                      setActiveSection('library');
                      setSelectedPlaylistId(null);
                      setIsRecentlyAddedView(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-between ${
                      activeSection === 'library' && selectedPlaylistId === null && !isRecentlyAddedView
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span>All Tracks</span>
                    <span className="text-[10px] font-mono text-zinc-500">{library.length}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('library');
                      setSelectedPlaylistId(null);
                      setIsRecentlyAddedView(true);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-between ${
                      activeSection === 'library' && isRecentlyAddedView
                        ? 'bg-zinc-800 text-amber-300 font-semibold'
                        : 'text-zinc-400 hover:text-amber-200 hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Recently Added</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-500/20">
                      Auto
                    </span>
                  </button>

                  <div className="pt-3 pb-1 px-2.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    <span>Playlists</span>
                    <button
                      onClick={() => setIsNewPlaylistModalOpen(true)}
                      className="text-zinc-400 hover:text-white"
                      title="Create New Playlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {playlists.map(pl => {
                    const isSelected = activeSection === 'library' && selectedPlaylistId === pl.id && !isRecentlyAddedView;
                    return (
                      <button
                        key={pl.id}
                        onClick={() => {
                          setActiveSection('library');
                          setSelectedPlaylistId(pl.id);
                          setIsRecentlyAddedView(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ListMusic className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{pl.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800/70 text-zinc-500'
                        }`}>
                          {pl.trackIds.length}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setIsNewPlaylistModalOpen(true)}
                    className="w-full text-left px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Playlist</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => {
                  setActiveSection('projects');
                  setSelectedProjectPublisher(null);
                  setIsProjectsExpanded(!isProjectsExpanded);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeSection === 'projects'
                    ? 'bg-zinc-800/80 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-4 h-4 text-zinc-400" />
                  <span>Projects</span>
                </div>
                {isProjectsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {isProjectsExpanded && (
                <div className="mt-2 ml-2 pl-2 border-l border-zinc-800/80 space-y-2">
                  <button
                    onClick={() => {
                      setActiveSection('projects');
                      setSelectedProjectPublisher(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-between ${
                      activeSection === 'projects' && selectedProjectPublisher === null
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span>All Active Publishers</span>
                    <span className="text-[10px] font-mono text-zinc-500">{activePublishers.length}</span>
                  </button>

                  {activePublishers.map(pubName => {
                    const isPubOpen = expandedProjectsPublishers[pubName] ?? true;
                    const pubBriefs = activeProjectsList.filter(p => p.publisher === pubName);
                    const isPubSelected = activeSection === 'projects' && selectedProjectPublisher === pubName;

                    return (
                      <div key={pubName} className="space-y-1">
                        <button
                          onClick={() => {
                            toggleProjectsPublisher(pubName);
                            setSelectedProjectPublisher(pubName);
                            setActiveSection('projects');
                            if (pubBriefs.length > 0) setActiveProjectId(pubBriefs[0].id);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                            isPubSelected
                              ? 'text-zinc-100 bg-zinc-800/50'
                              : 'text-zinc-300 hover:text-white hover:bg-zinc-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isPubOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            )}
                            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{pubName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                            {pubBriefs.length}
                          </span>
                        </button>

                        {isPubOpen && (
                          <div className="ml-5 pl-2 border-l border-zinc-800/60 space-y-1">
                            {pubBriefs.map(b => {
                              const isActiveBrief = activeSection === 'projects' && b.id === activeProjectId;
                              return (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    setActiveSection('projects');
                                    setSelectedProjectPublisher(pubName);
                                    setActiveProjectId(b.id);
                                    setSelectedTrack(null);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-between ${
                                    isActiveBrief
                                      ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Folder className="w-3 h-3 text-zinc-500 shrink-0" />
                                    <span className="truncate">{b.albumTitle}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {b.tracks.filter(t => !t.delivered).length}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-1 flex flex-col gap-1">
                    <button 
                      onClick={() => handleOpenNewBriefModal(undefined, 'active')}
                      className="w-full text-left px-2.5 py-1 text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-2 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>New Active Brief</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => {
                  setActiveSection('database');
                  setSelectedDatabasePublisher(null);
                  setIsDatabaseExpanded(!isDatabaseExpanded);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeSection === 'database'
                    ? 'bg-zinc-800/80 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span>Database</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                    {databaseBriefsList.length}
                  </span>
                  {isDatabaseExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {isDatabaseExpanded && (
                <div className="mt-2 ml-2 pl-2 border-l border-zinc-800/80 space-y-2">
                  <button
                    onClick={() => {
                      setActiveSection('database');
                      setSelectedDatabasePublisher(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-between ${
                      activeSection === 'database' && selectedDatabasePublisher === null
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span>All Database Publishers</span>
                    <span className="text-[10px] font-mono text-zinc-500">{databasePublishers.length}</span>
                  </button>

                  {databasePublishers.map(pubName => {
                    const isPubOpen = expandedDatabasePublishers[pubName] ?? true;
                    const pubBriefs = databaseBriefsList.filter(p => p.publisher === pubName);
                    const isPubSelected = activeSection === 'database' && selectedDatabasePublisher === pubName;

                    return (
                      <div key={pubName} className="space-y-1">
                        <button
                          onClick={() => {
                            toggleDatabasePublisher(pubName);
                            setSelectedDatabasePublisher(pubName);
                            setActiveSection('database');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                            isPubSelected
                              ? 'text-zinc-100 bg-zinc-800/50'
                              : 'text-zinc-300 hover:text-white hover:bg-zinc-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isPubOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            )}
                            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{pubName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                            {pubBriefs.length}
                          </span>
                        </button>

                        {isPubOpen && (
                          <div className="ml-5 pl-2 border-l border-zinc-800/60 space-y-1">
                            {pubBriefs.map(b => (
                              <button
                                key={b.id}
                                onClick={() => {
                                  setActiveSection('database');
                                  setSelectedDatabasePublisher(pubName);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {b.state === 'prospective' ? (
                                    <Compass className="w-3 h-3 text-amber-400 shrink-0" />
                                  ) : (
                                    <Folder className="w-3 h-3 text-emerald-400 shrink-0" />
                                  )}
                                  <span className="truncate">{b.albumTitle}</span>
                                </div>
                                <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                                  b.state === 'prospective' ? 'bg-amber-950/40 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {b.state === 'prospective' ? 'Lead' : 'Delivered'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-1 flex flex-col gap-1">
                    <button 
                      onClick={() => handleOpenNewBriefModal(undefined, 'prospective')}
                      className="w-full text-left px-2.5 py-1 text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-2 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Prospective Brief</span>
                    </button>
                    <button 
                      onClick={() => setIsNewPublisherModalOpen(true)}
                      className="w-full text-left px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>New Publisher</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
            <span className="truncate max-w-[140px]">
              {safeStorageRoot.split('/').filter(Boolean).pop() || 'T7 Shield'}
            </span>
            <span className="text-zinc-400 font-mono font-medium">1.2 TB Free</span>
          </div>
        </nav>

        {/* Center Main Work Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeSection === 'settings' ? (
            <SettingsView
              audioSettings={audioSettings}
              onUpdateAudioSetting={updateAudioSetting} 
              profile={profile} 
              onSaveProfile={handleSaveProfile} 
            />
          ) : activeSection === 'analyser' ? (
            <AnalyserView 
              projects={projects}
              onAttachCheatSheetToProject={handleAttachCheatSheetFromAnalyser}
            />
          ) : activeSection === 'resources' ? (
            <ResourcesView
              cheatSheets={cheatSheets}
              projects={projects}
              onSaveCheatSheet={handleSaveCheatSheet}
              onDeleteCheatSheet={handleDeleteCheatSheet}
            />
          ) : activeSection === 'library' ? (
            <LibraryView
              library={library}
              playlists={playlists}
              selectedTrack={selectedTrack}
              isPlaying={isPlaying}
              isMuted={isMuted}
              currentTimeSec={currentTimeSec}
              totalLengthSec={totalLengthSec}
              selectedPlaylistId={selectedPlaylistId}
              isRecentlyAddedView={isRecentlyAddedView}
              librarySearchQuery={librarySearchQuery}
              activePlaylistMenuTrackId={activePlaylistMenuTrackId}
              onSelectAllTracks={() => {
                setSelectedPlaylistId(null);
                setIsRecentlyAddedView(false);
              }}
              onSelectRecentlyAdded={() => {
                setSelectedPlaylistId(null);
                setIsRecentlyAddedView(true);
              }}
              onSetSelectedPlaylistId={(id) => {
                setSelectedPlaylistId(id);
                setIsRecentlyAddedView(false);
              }}
              onSetLibrarySearchQuery={setLibrarySearchQuery}
              onPlayTrackItem={playTrackItem}
              onTogglePlayPause={() => setIsPlaying(!isPlaying)}
              onSeek={setCurrentTimeSec}
              onToggleMute={() => setIsMuted(!isMuted)}
              onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
              onOpenNewPlaylistModal={() => setIsNewPlaylistModalOpen(true)}
              onSetActivePlaylistMenuTrackId={setActivePlaylistMenuTrackId}
              onRequestDeleteTrack={(item) => {
                const parentProj = projects.find(p => p.tracks.some(t => t.id === item.trackId));
                setTrackToDelete({
                  projectId: parentProj?.id || '',
                  trackId: item.trackId,
                  trackTitle: item.title
                });
              }}
              onAddLibraryTrack={handleAddDirectLibraryTrack}
            />
          ) : activeSection === 'projects' ? (
            <ProjectsView
            onUpdateDeliverables={handleUpdateDeliverables}
              activeProjectsList={activeProjectsList}
              activePublishers={activePublishers}
              selectedProjectPublisher={selectedProjectPublisher}
              activeProject={activeProject}
              undeliveredTracks={undeliveredTracks}
              selectedTrack={selectedTrack}
              isPlaying={isPlaying}
              isMuted={isMuted}
              currentTimeSec={currentTimeSec}
              totalLengthSec={totalLengthSec}
              onSelectPublisher={setSelectedProjectPublisher}
              onSelectProject={(id: any) => {
                setActiveProjectId(id);
                setSelectedTrack(null);
              }}
              onSelectTrack={handleSelectTrack}
              onOpenNewPublisherModal={() => setIsNewPublisherModalOpen(true)}
              onOpenNewBriefModal={(preset: any) => handleOpenNewBriefModal(preset, 'active')}
              onOpenImportModal={handleOpenImportModal}
              onOpenWrittenBrief={setActiveWrittenBrief}
              onRequestArchiveBrief={setPendingArchiveBrief}
              onRequestDeleteTrack={setTrackToDelete}
              onDeliverTrack={handleDeliverTrack}
              onToggleChecklist={toggleChecklist}
              onTogglePlayPause={() => setIsPlaying(!isPlaying)}
              onSeek={setCurrentTimeSec}
              onToggleMute={() => setIsMuted(!isMuted)}
              onPlay={() => setIsPlaying(true)}
              onPlaySpecificFile={handlePlaySpecificFile}
              onUpdateTrackNotes={handleUpdateTrackNotes}
              onUpdateTrackStatus={handleUpdateTrackStatus}
              onAssignDeliverableFile={handleAssignDeliverableFile}
              onRemoveDeliverableFile={handleRemoveDeliverableFile}
            />
          ) : activeSection === 'database' ? (
            <DatabaseView
              databaseBriefsList={databaseBriefsList}
              databasePublishers={databasePublishers}
              selectedDatabasePublisher={selectedDatabasePublisher}
              selectedTrack={selectedTrack}
              isPlaying={isPlaying}
              isMuted={isMuted}
              currentTimeSec={currentTimeSec}
              totalLengthSec={totalLengthSec}
              onSelectPublisher={setSelectedDatabasePublisher}
              onOpenNewBriefModal={handleOpenNewBriefModal}
              onOpenNewPublisherModal={() => setIsNewPublisherModalOpen(true)}
              onOpenWrittenBrief={setActiveWrittenBrief}
              onPromoteToActive={handlePromoteToActive}
              onRestoreProject={handleRestoreProject}
              onRestoreTrack={handleRestoreTrack}
              onRequestDeleteTrack={setTrackToDelete}
              onPlayTrackItem={playTrackItem}
              onPlaySpecificFile={handlePlaySpecificFile}
              onTogglePlayPause={() => setIsPlaying(!isPlaying)}
              onSeek={setCurrentTimeSec}
              onToggleMute={() => setIsMuted(!isMuted)}
            />
          ) : null}

          {/* PLAYLIST CREATION MODAL */}
          {isNewPlaylistModalOpen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm metal-surface border-r border-white/5 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">New Playlist</h3>
                      <p className="text-xs text-zinc-400">Group cues for pitching or reels.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNewPlaylistModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Playlist Name</label>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. Dark Action Showreel, Sci-Fi Pitches"
                    className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                    autoFocus
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
                  <button
                    onClick={() => setIsNewPlaylistModalOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={!newPlaylistName.trim()}
                    className="bg-emerald-500 disabled:opacity-40 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-lg text-xs transition shadow-md"
                  >
                    Create Playlist
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TRACK DELETE CONFIRMATION MODAL */}
          {trackToDelete && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md metal-surface border-r border-white/5 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">Delete Track?</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Are you sure you want to delete <span className="text-white font-semibold">{trackToDelete.trackTitle}</span>? This will remove the track from its brief and library.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setTrackToDelete(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-semibold border border-zinc-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDeleteTrack}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-md"
                  >
                    Delete Track
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD NEW PUBLISHER MODAL */}
          {isNewPublisherModalOpen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg metal-surface border-r border-white/5 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">Add New Publisher</h3>
                      <p className="text-xs text-zinc-400">Register a new publishing client or music house.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNewPublisherModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Publisher Name *</label>
                    <input
                      type="text"
                      value={publisherForm.name}
                      onChange={(e) => setPublisherForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Audiomachine, Position Music"
                      className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Headquarters / Country</label>
                      <input
                        type="text"
                        value={publisherForm.country}
                        onChange={(e) => setPublisherForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="e.g. Los Angeles, USA"
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Creative Contact / Rep</label>
                      <input
                        type="text"
                        value={publisherForm.repName}
                        onChange={(e) => setPublisherForm(prev => ({ ...prev, repName: e.target.value }))}
                        placeholder="e.g. John Doe (A&R)"
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={publisherForm.contactEmail}
                      onChange={(e) => setPublisherForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="e.g. briefs@publisher.com"
                      className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Brief Preferences & Notes</label>
                    <textarea
                      value={publisherForm.notes}
                      onChange={(e) => setPublisherForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Prefers fast 48-hour turnarounds on hybrid orchestral cues."
                      className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
                  <button
                    onClick={() => setIsNewPublisherModalOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePublisher}
                    disabled={!publisherForm.name.trim()}
                    className="bg-emerald-500 disabled:opacity-40 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-lg text-xs transition shadow-md"
                  >
                    Save Publisher
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD NEW BRIEF MODAL */}
          {isNewBriefModalOpen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl metal-surface border-r border-white/5 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">
                        {briefForm.targetState === 'active' ? 'Create Active Project Brief' : 'Log Prospective Brief in Database'}
                      </h3>
                      <p className="text-xs text-zinc-400">Upload a PDF brief or enter details manually.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNewBriefModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div
                  onClick={() => pdfInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const f = e.dataTransfer.files[0];
                      if (f.type.includes('pdf') || f.name.endsWith('.pdf')) {
                        handleExtractFromPdf(f);
                      }
                    }
                  }}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20 rounded-xl p-4 flex items-center justify-between cursor-pointer transition"
                >
                  <input
                    type="file"
                    ref={pdfInputRef}
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleExtractFromPdf(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      {isParsingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <span>Auto-Fill from PDF Brief</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded">Smart Parser</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {isParsingPdf
                          ? 'Extracting publisher, title, deadline & instrumentation from document...'
                          : pdfFileName
                          ? `Parsed: ${pdfFileName} (Fields filled below)`
                          : 'Drop a publisher brief PDF here or click to browse'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700 transition shrink-0"
                  >
                    Select PDF
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Destination Roster</label>
                      <select
                        value={briefForm.targetState}
                        onChange={(e) => setBriefForm(prev => ({ ...prev, targetState: e.target.value as 'active' | 'prospective' }))}
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                      >
                        <option value="active">Active Projects (Immediate Production)</option>
                        <option value="prospective">Database (Prospective / Lead)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Publisher *</label>
                      <select
                        value={briefForm.publisher}
                        onChange={(e) => setBriefForm(prev => ({ ...prev, publisher: e.target.value }))}
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                      >
                        {allPublisherNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Album / Campaign Title *</label>
                    <input
                      type="text"
                      value={briefForm.albumTitle}
                      onChange={(e) => setBriefForm(prev => ({ ...prev, albumTitle: e.target.value }))}
                      placeholder="e.g. Apex Predators, Cybernetic Tension"
                      className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Brief Code</label>
                      <input
                        type="text"
                        value={briefForm.code}
                        onChange={(e) => setBriefForm(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="NT-APEX"
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Release Year</label>
                      <input
                        type="number"
                        value={briefForm.deliveryYear}
                        onChange={(e) => setBriefForm(prev => ({ ...prev, deliveryYear: Number(e.target.value) || 2026 }))}
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Deadline</label>
                      <input
                        type="text"
                        value={briefForm.deadline}
                        onChange={(e) => setBriefForm(prev => ({ ...prev, deadline: e.target.value }))}
                        placeholder="15 Dec 2026"
                        className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-[#111115] p-3 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Structured SSD Target Folder:</span>
                    <span className="text-emerald-400 truncate block mt-0.5">
                      {getBriefBasePath(briefForm.publisher || 'Publisher', briefForm.deliveryYear || 2026, briefForm.albumTitle || 'Album')}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Creative Brief Summary</label>
                    <textarea
                      value={briefForm.creativeSummary}
                      onChange={(e) => setBriefForm(prev => ({ ...prev, creativeSummary: e.target.value }))}
                      rows={2}
                      placeholder="Publisher concept, mood descriptions, act structure..."
                      className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Narrative Context & Pacing</label>
                    <textarea
                      value={briefForm.storyAndPacing}
                      onChange={(e) => setBriefForm(prev => ({ ...prev, storyAndPacing: e.target.value }))}
                      rows={2}
                      placeholder="e.g. A dystopian pursuit through a rain-soaked industrial sprawl..."
                      className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-zinc-100 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2 border-t border-zinc-800 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-amber-400">Reference Tracks & Benchmarks</label>
                      <button
                        type="button"
                        onClick={() => {
                          setBriefForm(prev => ({
                            ...prev,
                            referenceList: [
                              ...prev.referenceList,
                              { id: `ref-${Date.now()}`, title: '', artistOrSource: '', url: '', timecodeNotes: '' }
                            ]
                          }));
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        + Add Reference Track
                      </button>
                    </div>

                    {briefForm.referenceList.map((refItem, index) => (
                      <div key={refItem.id} className="p-3 bg-[#111116] border border-zinc-800 rounded-xl space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Track Title (e.g. Superhuman)"
                            value={refItem.title}
                            onChange={(e) => {
                              const updated = [...briefForm.referenceList];
                              updated[index].title = e.target.value;
                              setBriefForm(prev => ({ ...prev, referenceList: updated }));
                            }}
                            className="bg-[#18181f] border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Artist / Composer / Publisher"
                            value={refItem.artistOrSource}
                            onChange={(e) => {
                              const updated = [...briefForm.referenceList];
                              updated[index].artistOrSource = e.target.value;
                              setBriefForm(prev => ({ ...prev, referenceList: updated }));
                            }}
                            className="bg-[#18181f] border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Link URL (YouTube, Spotify, etc.)"
                            value={refItem.url}
                            onChange={(e) => {
                              const updated = [...briefForm.referenceList];
                              updated[index].url = e.target.value;
                              setBriefForm(prev => ({ ...prev, referenceList: updated }));
                            }}
                            className="bg-[#18181f] border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Key takeaway (e.g. Listen to braam at 1:12)"
                            value={refItem.timecodeNotes}
                            onChange={(e) => {
                              const updated = [...briefForm.referenceList];
                              updated[index].timecodeNotes = e.target.value;
                              setBriefForm(prev => ({ ...prev, referenceList: updated }));
                            }}
                            className="bg-[#18181f] border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBriefForm(prev => ({
                              ...prev,
                              referenceList: prev.referenceList.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Remove Reference
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
                  <button
                    onClick={() => setIsNewBriefModalOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBrief}
                    disabled={!briefForm.albumTitle.trim() || !briefForm.publisher}
                    className="bg-emerald-500 disabled:opacity-40 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-lg text-xs transition shadow-md"
                  >
                    Save & Open Brief
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TWO-STAGE TRACK IMPORT MODAL */}
          {isImportModalOpen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg metal-surface border-r border-white/5 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">
                        {importStep === 'upload' ? 'Import Audio Track' : 'Track Details & Metadata'}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Assigning to: <span className="text-white font-medium">{activeProject.publisher} — {activeProject.albumTitle}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {importStep === 'upload' ? (
                  <div className="space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                        isDragging 
                          ? 'border-emerald-500 bg-emerald-950/20' 
                          : 'border-zinc-700 hover:border-zinc-500 metal-inset text-zinc-200'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileInputChange} 
                        accept=".wav,.aif,.aiff,.mp3,.flac" 
                        className="hidden" 
                      />
                      <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3 text-zinc-300">
                        <UploadCloud className="w-7 h-7 text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-200">
                        Drag and drop your audio master here
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        or <span className="text-emerald-400 underline underline-offset-2">browse files</span> on your drive (.WAV, .AIF, .MP3)
                      </p>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between px-1">
                      <span>Destination SSD Path:</span>
                      <span className="text-zinc-400 truncate max-w-[280px]">
                        {getBriefBasePath(activeProject.publisher, activeProject.deliveryYear || 2026, activeProject.albumTitle)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-zinc-200 truncate">{stagedFile?.name}</span>
                      </div>
                      <span className="text-zinc-500 shrink-0">{stagedFile?.size}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">Track Title</label>
                        <input
                          type="text"
                          value={trackForm.title}
                          onChange={(e) => setTrackForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Shadow Incursion"
                          className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-300 block mb-1">Version</label>
                          <input
                            type="text"
                            value={trackForm.version}
                            onChange={(e) => setTrackForm(prev => ({ ...prev, version: e.target.value }))}
                            placeholder="v1.0"
                            className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-zinc-300 block mb-1">Status / Stage</label>
                          <select
                            value={trackForm.status}
                            onChange={(e) => setTrackForm(prev => ({ ...prev, status: e.target.value as Track['status'] }))}
                            className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none"
                          >
                            <option value="Ideas">Ideas & Sketches</option>
                            <option value="In Progress">In Production</option>
                            <option value="Submitted">Submitted / Review</option>
                            <option value="Needs Revision">Needs Revision</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-300 block mb-1">Tempo (BPM)</label>
                          <input
                            type="number"
                            value={trackForm.bpm}
                            onChange={(e) => setTrackForm(prev => ({ ...prev, bpm: Number(e.target.value) }))}
                            className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-zinc-300 block mb-1">Musical Key</label>
                          <input
                            type="text"
                            value={trackForm.key}
                            onChange={(e) => setTrackForm(prev => ({ ...prev, key: e.target.value }))}
                            placeholder="e.g. D min, C# Maj"
                            className="w-full metal-inset text-zinc-200 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        onClick={() => setImportStep('upload')}
                        className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition"
                      >
                        ← Choose Different File
                      </button>

                      <button
                        onClick={handleSaveImportedTrack}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition shadow-md active:scale-95"
                      >
                        <span>Save to Structured Drive & Library</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONFIRMATION DIALOG */}
          {pendingArchiveBrief && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg metal-surface border-r border-white/5 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      Is this brief complete?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      All tracks in <span className="text-white font-semibold">{pendingArchiveBrief.publisher} — {pendingArchiveBrief.albumTitle}</span> have been marked delivered. Would you like to relocate this brief to the database catalog, or will you be composing additional cues?
                    </p>
                  </div>
                </div>

                <div className="metal-card border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400">
                  <span className="text-zinc-300 font-semibold">Note:</span> If you relocate it now, you can restore it back to active production anytime with one click in the Database.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setPendingArchiveBrief(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold border border-zinc-600 transition"
                  >
                    No, Keep Open (Adding More Tracks)
                  </button>
                  <button
                    onClick={() => handleConfirmArchive(pendingArchiveBrief.id)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg text-xs transition shadow-md"
                  >
                    Yes, Complete & Send to Database
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WRITTEN BRIEF SLIDING DRAWER */}
          {activeWrittenBrief && activeWrittenBrief.writtenBrief && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity">
              <div className="w-[580px] h-full bg-[#0d0d10] border-l border-zinc-800 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
                
                <div className="p-5 border-b border-zinc-800 bg-[#111115] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono uppercase tracking-wider">
                        {activeWrittenBrief.publisher} // Project Specification
                      </div>
                      <div className="text-lg font-bold text-zinc-100 mt-0.5">
                        {activeWrittenBrief.albumTitle}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveWrittenBrief(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-zinc-300">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="bg-zinc-800/90 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-700/60">
                      CODE: {activeWrittenBrief.code}
                    </span>
                    <span className="bg-zinc-800/90 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-700/60">
                      DEADLINE: {activeWrittenBrief.deadline}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md border font-semibold ${
                      activeWrittenBrief.state === 'active' 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                        : activeWrittenBrief.state === 'prospective'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      STATUS: {activeWrittenBrief.state.toUpperCase()}
                    </span>
                  </div>

                  <div className="border border-zinc-800 bg-[#121216] rounded-2xl p-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Creative Direction & Core Brief</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      {activeWrittenBrief.writtenBrief.creativeSummary}
                    </p>
                  </div>

                  {activeWrittenBrief.writtenBrief.storyAndPacing && (
                    <div className="border border-zinc-800 bg-[#121216] rounded-2xl p-5 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400" />
                        <span>Narrative Context & Dramatic Arc</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {activeWrittenBrief.writtenBrief.storyAndPacing}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Mood & Stylistic Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeWrittenBrief.writtenBrief.moodKeywords.map(tag => (
                        <span key={tag} className="text-xs font-mono bg-zinc-800/80 text-zinc-200 px-3 py-1 rounded-lg border border-zinc-700/60">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {activeWrittenBrief.writtenBrief.structureNotes && (
                    <div className="border border-zinc-800 bg-[#121216] rounded-2xl p-5 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-zinc-400" />
                        <span>Structural & Edit Requirements</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-line">
                        {activeWrittenBrief.writtenBrief.structureNotes}
                      </p>
                    </div>
                  )}

                  <div className="border border-zinc-800 bg-[#121216] rounded-2xl p-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Music className="w-4 h-4 text-emerald-400" />
                      <span>Instrumentation & Sound Design Palette</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {activeWrittenBrief.writtenBrief.instrumentation}
                    </p>
                  </div>

                  <div className="border border-zinc-800 bg-[#121216] rounded-2xl p-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Target Film, TV & Game Sync Placements
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                      {activeWrittenBrief.writtenBrief.targetPlacements}
                    </p>
                  </div>

                  <div className="border border-zinc-800 bg-[#121216] rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>Reference Tracks & Sonic Benchmarks</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {activeWrittenBrief.writtenBrief.referenceList?.length || 0} Listed
                      </span>
                    </div>

                    {activeWrittenBrief.writtenBrief.referenceList && activeWrittenBrief.writtenBrief.referenceList.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeWrittenBrief.writtenBrief.referenceList.map((ref, idx) => (
                          <div key={ref.id || idx} className="p-3 bg-[#18181f] border border-zinc-700/70 rounded-xl space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-zinc-100 truncate">
                                {ref.title}
                              </span>
                              {ref.url && (
                                <a
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono underline underline-offset-2 shrink-0"
                                >
                                  Open Link ↗
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-medium">
                              {ref.artistOrSource}
                            </div>
                            {ref.timecodeNotes && (
                              <p className="text-[11px] text-zinc-400/90 font-mono bg-black/30 p-2 rounded-lg mt-1 border border-zinc-800/80">
                                💡 {ref.timecodeNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : activeWrittenBrief.writtenBrief.referenceTracks ? (
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-[#18181f] p-3 rounded-xl border border-zinc-800">
                        {activeWrittenBrief.writtenBrief.referenceTracks}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No reference tracks attached.</p>
                    )}
                  </div>

                  {activeWrittenBrief.state === 'prospective' ? (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          handlePromoteToActive(activeWrittenBrief.id);
                          setActiveWrittenBrief(null);
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-md active:scale-95"
                      >
                        <span>Promote to Active Production</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : activeWrittenBrief.state === 'completed' ? (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          handleRestoreProject(activeWrittenBrief.id);
                          setActiveWrittenBrief(null);
                        }}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
                      >
                        <RotateCcw className="w-4 h-4 text-emerald-400" />
                        <span>Restore This Project to Active Board</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="p-4 border-t border-zinc-800 bg-[#111115] text-[11px] font-mono text-zinc-500 truncate">
                  SSD TARGET: {activeWrittenBrief.ssdPath}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* First-Launch Studio Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          initialProfile={profile}
          onComplete={handleCompleteOnboarding}
        />
      )}

      {/* Persistent Global WaveSurfer Player inside SafeBoundary */}
      <SafeBoundary>
        <AudioWaveformPlayer 
          track={selectedTrack} 
          audioOutputDeviceId={profile?.audioOutputDeviceId}
        />
      </SafeBoundary>
    </div>
  );
}