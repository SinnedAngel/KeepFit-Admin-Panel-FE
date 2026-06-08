export type BeltLevel = string;

export interface BeltLevelInfo {
  id: string;
  nameEN: string;
  nameID: string;
  color: string;
  order_index: number;
}

export const BELT_LEVELS: BeltLevelInfo[] = [
  { id: 'sabuk putih', nameEN: 'White Belt', nameID: 'Sabuk Putih', color: 'bg-white/10 text-white border-white/20', order_index: 1 },
  { id: 'sabuk kuning', nameEN: 'Yellow Belt', nameID: 'Sabuk Kuning', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', order_index: 2 },
  { id: 'sabuk hijau', nameEN: 'Green Belt', nameID: 'Sabuk Hijau', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', order_index: 3 },
  { id: 'sabuk biru', nameEN: 'Blue Belt', nameID: 'Sabuk Biru', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', order_index: 4 },
  { id: 'sabuk coklat', nameEN: 'Brown Belt', nameID: 'Sabuk Coklat', color: 'bg-amber-800/10 text-amber-500 border-amber-850/20 font-bold', order_index: 5 },
  { id: 'sabuk hitam', nameEN: 'Black Belt', nameID: 'Sabuk Hitam', color: 'bg-neutral-800/60 text-stone-200 border-stone-700/80 font-bold', order_index: 6 },
  { id: 'pelatih I', nameEN: 'Trainer I', nameID: 'Pelatih I', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-semibold', order_index: 7 },
  { id: 'pelatih II', nameEN: 'Trainer II', nameID: 'Pelatih II', color: 'bg-rose-600/10 text-rose-300 border-rose-600/20 font-semibold', order_index: 8 },
  { id: 'pelatih III', nameEN: 'Trainer III', nameID: 'Pelatih III', color: 'bg-rose-700/10 text-rose-200 border-rose-700/20 font-semibold', order_index: 9 },
  { id: 'master IV', nameEN: 'Master IV', nameID: 'Master IV', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold', order_index: 10 },
  { id: 'master V', nameEN: 'Master V', nameID: 'Master V', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold', order_index: 11 },
  { id: 'master VI', nameEN: 'Master VI', nameID: 'Master VI', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20 font-bold', order_index: 12 },
  { id: 'master VII', nameEN: 'Master VII', nameID: 'Master VII', color: 'bg-fuchsia-100/10 text-fuchsia-400 border-fuchsia-500/20 font-bold', order_index: 13 }
];

export interface StepDetail {
  text: string;
  duration?: number; // duration in seconds for this step. If 0 or undefined, manually completed.
  type?: 'instruction' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'static_hold' | 'action';
  hint?: string; // audio coach verbal cues or technical posture tips
  loops?: number; // loop count for cyclical breath control stages
  ttsCommand?: string; // text-to-speech exact command to read (e.g., "Inhale.")
}

export interface Exercise {
  id: string;
  title: string;
  category: string;
  difficulty: BeltLevel;
  duration: number; // in minutes
  calories: number; // estimated calories burned
  description: string;
  steps: string[];
  stepDetails?: StepDetail[]; // Advanced timed execution data for mobile engine synchronization
  mediaType: 'image' | 'video' | 'slides' | 'youtube';
  mediaUrl: string;
  mediaSlides?: string[]; // for slides-based exercise diagrams
  loops?: number; // default outer loop count, e.g. 5
  vocalGuide?: boolean; // toggle audio speech voice highlights
  lungWaveD?: boolean; // toggle breathing rhythm visualizer panel/animation (Lung Wave diagram)
  targetMuscles: string[];
  katedaSpecific?: boolean; // Whether it is an official Kateda martial art / central power breathing technique
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon identifier
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  exerciseId: string;
  exerciseTitle: string;
  timestamp: string; // ISO String
  duration: number; // duration actual spent in minutes
  caloriesBurned: number;
  status: 'completed' | 'paused' | 'active';
  heartRateAvg?: number;
  notes?: string;
}

export interface KeepFitStats {
  totalExercises: number;
  totalActivities: number;
  totalBurnedCalories: number;
  totalActiveTime: number; // in minutes
  activeUsersCount: number;
}
