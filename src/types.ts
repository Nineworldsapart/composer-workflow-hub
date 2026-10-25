export type ViewMode = 
  | 'projects' 
  | 'analyser' 
  | 'cheatSheets' 
  | 'delivery' 
  | 'metadata' 
  | 'contacts'
  | 'database'
  | 'settings'
  | 'resources'
  | 'inbox'
  | 'library';

export type NavSection = ViewMode;

export interface TrackNote {
  id?: string;
  text?: string;
  timestamp?: string;
  author?: string;
  isRevisionRequest?: boolean;
  [key: string]: any;
}

export type FeedbackNote = TrackNote;

export interface MixChecklist {
  [key: string]: boolean | string | undefined | any;
}

export interface DeliverableFile {
  name?: string;
  size?: string;
  blobUrl?: string;
  uploadedAt?: string;
  key?: string | number;
  label?: string | number;
  category?: string;
  subFolder?: string;
  fileName?: string;
  fileSize?: string;
  ssdFilePath?: string;
  isDelivered?: boolean;
  uploadedDate?: string;
  [key: string]: any;
}

export interface DynamicDeliverableItem {
  id: string;
  name: string;
  category?: any;
  status?: any;
  file?: DeliverableFile;
  [key: string]: any;
}

export interface ReferenceItem {
  id?: string;
  title?: string;
  artist?: string;
  artistOrSource?: string;
  link?: string;
  url?: string;
  timecodeNotes?: string;
  notes?: string;
  [key: string]: any;
}

export interface WrittenBrief {
  creativeSummary?: string;
  storyAndPacing?: string;
  moodKeywords: string[];
  structureNotes?: string;
  instrumentation?: string;
  targetPlacements?: string;
  referenceList?: ReferenceItem[];
  referenceTracks?: any[];
  state?: string;
  [key: string]: any;
}

export interface ProjectTrack {
  id: string;
  trackNumber?: string | number;
  title: string;
  version?: string;
  bpm?: number;
  key?: string;
  style?: string;
  duration?: string;
  durationSec?: number;
  deadline?: string;
  delivered?: boolean;
  notes?: string | TrackNote[] | any;
  audioBlobUrl?: string;
  audioFileName?: string;
  audioFileSize?: string;
  fileSize?: string;
  fileName?: string;
  status?: string;
  checklist: MixChecklist;
  deliverables?: DynamicDeliverableItem[];
  deliverableFiles?: Record<string, DeliverableFile | any>;
  [key: string]: any;
}

export type Track = ProjectTrack;

export interface EditableCheatSheet {
  id: string;
  genre: string;
  associatedProjectId?: string;
  projectAlbumTitle?: string;
  bpmRange?: string;
  avgBpm?: number;
  commonKeys?: string;
  harmonyTypes?: string;
  trackFeel?: string;
  targetLufs?: number;
  truePeakTargetDb?: number;
  chordFormula?: string[];
  overallInstrumentation?: string[];
  sectionsBreakdown?: SectionBreakdownItem[];
  productionMixTips?: string;
  referenceTrackCount?: number;
  lastUpdated?: string;
  [key: string]: any;
}

export interface ProjectBrief {
  dynamicDeliverables?: DynamicDeliverableItem[];
  id: string;
  albumTitle: string;
  publisher: string;
  deadline?: string;
  status?: 'In Progress' | 'Delivered' | 'Pending Review' | string;
  state: string;
  code?: string;
  deliveryYear?: string | number;
  ssdPath?: string;
  targetTracksCount?: number;
  completedTracksCount?: number;
  tracks: ProjectTrack[];
  writtenBrief?: WrittenBrief;
  cheatSheets?: EditableCheatSheet[];
  description?: string;
  [key: string]: any;
}

export interface SectionBreakdownItem {
  sectionName: string;
  timeWindow: string;
  durationSec: number;
  barCount: number;
  instrumentsUsed: string[];
  instrumentActions: string;
  feelAndArrangement: string;
  [key: string]: any;
}

export interface PublisherContact {
  id: string;
  name: string;
  country?: string;
  repName?: string;
  contactEmail?: string;
  activeStatus?: string;
  notes?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  preferredFormats?: string[];
  lastContactDate?: string;
  [key: string]: any;
}

export interface LibraryItem {
  id: string;
  title: string;
  trackId: string;
  name?: string;
  category?: string;
  tags?: string[];
  path?: string;
  format?: string;
  bpm?: number;
  key?: string;
  description?: string;
  publisher?: string;
  albumTitle?: string;
  fileName?: string;
  fileSize?: string;
  version?: string;
  durationSec?: number;
  ssdPath?: string;
  importedDate?: string;
  [key: string]: any;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  tracksCount?: number;
  description?: string;
  createdAt?: string;
  [key: string]: any;
}
export type AudioFileFormat = 'WAV' | 'AIFF' | 'MP3' | 'FLAC';
export type AudioSampleRate = '44.1 kHz' | '48.0 kHz' | '88.2 kHz' | '96.0 kHz' | '192.0 kHz';
export type AudioBitDepth = '16-bit' | '24-bit' | '32-bit float';
export type Mp3Bitrate = '128 kbps' | '192 kbps' | '256 kbps' | '320 kbps (CBR)';

export interface AudioExportSettings {
  format: AudioFileFormat;
  sampleRate: AudioSampleRate;
  bitDepth: AudioBitDepth;
  mp3Bitrate: Mp3Bitrate;
}

// Backward compatibility / alias exports
export type DeliverableFileItem = DeliverableFile;
export type SectionBlueprint = SectionBreakdownItem;
