export type BeltLevel = number;

export interface BeltLevelInfo {
  id: number;
  nameEN: string;
  nameID: string;
  color: string;
}

export const BELT_LEVELS: BeltLevelInfo[] = [
  { id: 1, nameEN: 'White Belt', nameID: 'Sabuk Putih', color: 'bg-white/10 text-white border-white/20' },
  { id: 2, nameEN: 'Yellow Belt', nameID: 'Sabuk Kuning', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { id: 3, nameEN: 'Green Belt', nameID: 'Sabuk Hijau', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 4, nameEN: 'Blue Belt', nameID: 'Sabuk Biru', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 5, nameEN: 'Brown Belt', nameID: 'Sabuk Coklat', color: 'bg-amber-800/10 text-amber-500 border-amber-850/20 font-bold' },
  { id: 6, nameEN: 'Black Belt', nameID: 'Sabuk Hitam', color: 'bg-neutral-800/60 text-stone-200 border-stone-700/80 font-bold' },
  { id: 7, nameEN: 'Trainer I', nameID: 'Pelatih I', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-semibold' },
  { id: 8, nameEN: 'Trainer II', nameID: 'Pelatih II', color: 'bg-rose-600/10 text-rose-300 border-rose-600/20 font-semibold' },
  { id: 9, nameEN: 'Trainer III', nameID: 'Pelatih III', color: 'bg-rose-700/10 text-rose-200 border-rose-700/20 font-semibold' },
  { id: 10, nameEN: 'Master IV', nameID: 'Master IV', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold' },
  { id: 11, nameEN: 'Master V', nameID: 'Master V', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold' },
  { id: 12, nameEN: 'Master VI', nameID: 'Master VI', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20 font-bold' },
  { id: 13, nameEN: 'Master VII', nameID: 'Master VII', color: 'bg-fuchsia-100/10 text-fuchsia-400 border-fuchsia-500/20 font-bold' }
];

export interface StepDetail {
  text: string;
  duration?: number; // duration in seconds for this step. If 0 or undefined, manually completed.
  type?: 'instruction' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'static_hold' | 'action';
  hint?: string; // audio coach verbal cues or technical posture tips
  loops?: number; // loop count for cyclical breath control stages
  ttsCommand?: string; // text-to-speech exact command to read (e.g., "Inhale.")
  unit?: 'seconds' | 'reps' | 'steps' | 'series' | 'cycles'; // target metric unit for the movement
  quantity?: number; // quantity target for non-seconds unit (e.g. 10 steps, 3 series)
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
  targetUnit?: 'minutes' | 'reps' | 'steps' | 'series' | 'cycles'; // overall execution unit for the movement
  targetValue?: number; // target quantity matching targetUnit

  // Real Database Bilingual fields to support live PostgreSQL schema mapping
  titleEN?: string;
  titleID?: string;
  descriptionEN?: string;
  descriptionID?: string;
  stepsEN?: string[];
  stepsID?: string[];
  stepDetailsEN?: StepDetail[];
  stepDetailsID?: StepDetail[];
}

export interface Category {
  id: string;
  nameEN: string;
  nameID: string;
  descriptionEN: string;
  descriptionID: string;
  icon: string; // Lucide icon identifier
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  exerciseId: string;
  exerciseTitle: string;
  exerciseTitleEN?: string;
  exerciseTitleID?: string;
  timestamp: string; // ISO String
  duration: number; // duration actual spent in minutes
  caloriesBurned: number;
  status: 'completed' | 'paused' | 'active';
  heartRateAvg?: number;
  notes?: string;
  achievedUnit?: string;
  achievedValue?: number;
}

export interface KeepFitStats {
  totalExercises: number;
  totalActivities: number;
  totalBurnedCalories: number;
  totalActiveTime: number; // in minutes
  activeUsersCount: number;
}

export interface Member {
  id: string;
  fullName: string;
  gender: 'Male' | 'Female';
  beltLevel: number; // Links to BeltLevelInfo.id
  birthDate: string; // YYYY-MM-DD
  joinedDate: string; // YYYY-MM-DD
  phoneNumber?: string;
  height: number; // cm
  weight: number; // kg
  status: 'active' | 'inactive';
  notes?: string;
  avatar?: string;
}

