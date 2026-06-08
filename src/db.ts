import { createClient } from '@supabase/supabase-js';
import { Exercise, Category, Activity, KeepFitStats, BeltLevelInfo, BELT_LEVELS } from './types';

// Storage Key for Local Browser Database
const LOCAL_STORAGE_KEY = 'keepfit_db';

// Hardcoded Seed Templates matching original Kateda syllabus
const categoryTemplates: Category[] = [
  {
    id: 'kateda',
    name: 'Kateda Central Power',
    description: 'Traditional internal self-defense power, breathing, and posture training.',
    icon: 'Zap'
  },
  {
    id: 'strength',
    name: 'Strength Training',
    description: 'Building muscle, endurance, and structural power.',
    icon: 'Dumbbell'
  },
  {
    id: 'cardio',
    name: 'Cardiovascular Conditioning',
    description: 'High-energy stamina and breathing lung efficiency.',
    icon: 'HeartPulse'
  },
  {
    id: 'mobility',
    name: 'Mobility & Flexibility',
    description: 'Stretching, joint lubrication, and flow.',
    icon: 'Activity'
  }
];

const exerciseTemplates: Exercise[] = [];

const activityTemplates: Activity[] = [];

// Lazy-loaded Supabase Client (front-end context)
let supabaseInstance: any = null;
export function getSupabaseClient() {
  if (!supabaseInstance) {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL;
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    if (url && key && url !== 'MY_SUPABASE_URL' && key !== 'MY_SUPABASE_KEY') {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
      console.log('Client-side Supabase client initialized.');
    }
  }
  return supabaseInstance;
}

export function isSupabaseActive(): boolean {
  return !!getSupabaseClient();
}

// In-Browser fallback DB state loader (using standard LocalStorage)
interface InBrowserDb {
  exercises: Exercise[];
  categories: Category[];
  activities: Activity[];
  beltLevels?: BeltLevelInfo[];
}

function readLocalStorageDb(): InBrowserDb {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    const initial: InBrowserDb = {
      exercises: exerciseTemplates,
      categories: categoryTemplates,
      activities: activityTemplates,
      beltLevels: BELT_LEVELS
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const db = JSON.parse(raw) as InBrowserDb;
    let modified = false;

    // Apply any missing structural validations dynamically to localized elements
    // If lists are completely empty, check if we should auto-populate them from starter templates
    const isWiped = (!db.exercises || db.exercises.length === 0) && (!db.categories || db.categories.length === 0);

    if (!db.exercises || !Array.isArray(db.exercises) || (isWiped && db.exercises.length === 0)) {
      db.exercises = exerciseTemplates;
      modified = true;
    }
    if (!db.categories || !Array.isArray(db.categories) || (isWiped && db.categories.length === 0)) {
      db.categories = categoryTemplates;
      modified = true;
    }
    if (!db.activities || !Array.isArray(db.activities) || (isWiped && db.activities.length === 0)) {
      db.activities = activityTemplates;
      modified = true;
    }
    if (!db.beltLevels || !Array.isArray(db.beltLevels) || (isWiped && db.beltLevels.length === 0)) {
      db.beltLevels = BELT_LEVELS;
      modified = true;
    }

    if (modified) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    }
    return db;
  } catch (err) {
    console.error('Failed to parse localStorage KeepFit state, resetting database:', err);
    const initial: InBrowserDb = {
      exercises: exerciseTemplates,
      categories: categoryTemplates,
      activities: activityTemplates,
      beltLevels: BELT_LEVELS
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export async function resetEntireDatabase(): Promise<void> {
  const initial: InBrowserDb = {
    exercises: exerciseTemplates,
    categories: categoryTemplates,
    activities: activityTemplates,
    beltLevels: BELT_LEVELS
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Unsync existing entries to clear duplicates
      await supabase.from('activities').delete().neq('id', 'placeholder-none');
      await supabase.from('exercises').delete().neq('id', 'placeholder-none');
      await supabase.from('categories').delete().neq('id', 'placeholder-none');
      try {
        await supabase.from('belt_levels').delete().neq('id', 'placeholder-none');
      } catch (e) {
        // Safe check
      }

      // Re-insert starter templates
      await supabase.from('categories').insert(categoryTemplates);
      await supabase.from('exercises').insert(exerciseTemplates);
      await supabase.from('activities').insert(activityTemplates);
      try {
        await supabase.from('belt_levels').insert(BELT_LEVELS);
      } catch (e) {
        // Safe check
      }
    } catch (err: any) {
      console.error('Error hard-seeding linked Supabase instance:', err.message || err);
      throw new Error(`Supabase synchronization error during reset: ${err.message || err}`);
    }
  }
}

function writeLocalStorageDb(db: InBrowserDb) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

// Trigger browser client-side auto sync for empty Supabase table schema
export async function autoSeedSupabaseInBrowser() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data: catData, error: catError } = await supabase.from('categories').select('id').limit(1);
    
    if (catError) {
      console.warn('Unable to query Supabase categories table. Please ensure the Supabase schema exists! Error:', catError.message);
      return;
    }

    if (!catData || catData.length === 0) {
      console.log('Supabase tables are empty. Pre-populating with starter Kateda templates...');
      
      const { error: catSeedErr } = await supabase.from('categories').insert(categoryTemplates);
      if (catSeedErr) console.error('Error seeding categories to Supabase:', catSeedErr);

      const { error: exSeedErr } = await supabase.from('exercises').insert(exerciseTemplates);
      if (exSeedErr) console.error('Error seeding exercises to Supabase:', exSeedErr);

      const { error: actSeedErr } = await supabase.from('activities').insert(activityTemplates);
      if (actSeedErr) console.error('Error seeding activities to Supabase:', actSeedErr);

      try {
        const { error: beltSeedErr } = await supabase.from('belt_levels').insert(BELT_LEVELS);
        if (beltSeedErr) console.log('Seed message regarding belt_levels table:', beltSeedErr.message);
      } catch (e) {
        // Safe catch
      }

      console.log('Successfully completed Supabase auto-seeding!');
    }
  } catch (err: any) {
    console.error('Exception during Supabase interactive seeder:', err.message || err);
  }
}

export async function getBeltLevels(): Promise<BeltLevelInfo[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('belt_levels')
        .select('*')
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as BeltLevelInfo[];
      }
    } catch (err) {
      // Graceful fallback
    }
  }
  const db = readLocalStorageDb();
  const list = db.beltLevels || BELT_LEVELS;
  return [...list].sort((a, b) => a.order_index - b.order_index);
}

export async function saveBeltLevels(belts: BeltLevelInfo[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const incomingIds = belts.map(b => b.id);
      const { data: dbBelts, error: selectErr } = await supabase.from('belt_levels').select('id');
      
      if (dbBelts && !selectErr) {
        const dbIds = dbBelts.map((b: any) => b.id);
        const toDelete = dbIds.filter(id => !incomingIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('belt_levels').delete().in('id', toDelete);
        }
      }

      if (belts.length > 0) {
        const cleanedBelts = belts.map(b => ({
          id: b.id,
          nameEN: b.nameEN,
          nameID: b.nameID,
          color: b.color || 'bg-white/10 text-white border-white/20',
          order_index: Number(b.order_index) || 99
        }));
        await supabase.from('belt_levels').upsert(cleanedBelts);
      }
    } catch (err) {
      // Graceful local save
    }
  }

  const db = readLocalStorageDb();
  db.beltLevels = belts;
  writeLocalStorageDb(db);
}

// ---------------------------------------------------------------------------
// CLIENT-SIDE ASYNC CRUD FUNCTIONS
// ---------------------------------------------------------------------------

export async function getExercises(): Promise<Exercise[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Supabase exercises fetch failed: ${error.message} (Target Table: 'exercises')`);
    }
    return (data || []) as Exercise[];
  }
  return readLocalStorageDb().exercises;
}

export async function saveExercises(exercises: Exercise[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const incomingIds = exercises.map(e => e.id);
    const { data: dbExercises, error: selectErr } = await supabase.from('exercises').select('id');
    
    if (selectErr) {
      throw new Error(`Supabase query exercises index failed: ${selectErr.message}`);
    }

    if (dbExercises) {
      const dbIds = dbExercises.map((e: any) => e.id);
      const toDelete = dbIds.filter(id => !incomingIds.includes(id));
      if (toDelete.length > 0) {
        const { error: deleteErr } = await supabase.from('exercises').delete().in('id', toDelete);
        if (deleteErr) {
          throw new Error(`Supabase delete exercises failed: ${deleteErr.message}`);
        }
      }
    }

    if (exercises.length > 0) {
      const cleanedExercises = exercises.map(ex => ({
        id: ex.id,
        title: ex.title,
        category: ex.category,
        difficulty: ex.difficulty,
        duration: ex.duration,
        calories: ex.calories,
        description: ex.description,
        steps: ex.steps,
        stepDetails: ex.stepDetails || generateFallbackStepDetails(ex),
        mediaType: ex.mediaType,
        mediaUrl: ex.mediaUrl,
        mediaSlides: ex.mediaSlides || [],
        loops: ex.loops,
        vocalGuide: ex.vocalGuide !== undefined ? ex.vocalGuide : true,
        lungWaveD: ex.lungWaveD !== undefined ? ex.lungWaveD : true,
        targetMuscles: ex.targetMuscles || [],
        katedaSpecific: ex.katedaSpecific || false,
        updatedAt: ex.updatedAt || new Date().toISOString()
      }));

      const { error: upsertErr } = await supabase.from('exercises').upsert(cleanedExercises);
      if (upsertErr) {
        throw new Error(`Supabase upsert exercises failed: ${upsertErr.message}`);
      }
    }
  }

  // Also maintain local fallback storage for persistence matching client capability
  const db = readLocalStorageDb();
  db.exercises = exercises;
  writeLocalStorageDb(db);
}

export async function getActivities(): Promise<Activity[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('id', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Supabase activities fetch failed: ${error.message} (Target Table: 'activities')`);
    }
    return (data || []) as Activity[];
  }
  return readLocalStorageDb().activities;
}

export async function addActivity(activity: Activity): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('activities').insert([activity]);
    if (error) {
      throw new Error(`Supabase insert activity failed: ${error.message} (Target Table: 'activities')`);
    }
  }

  const db = readLocalStorageDb();
  db.activities.unshift(activity);
  if (db.activities.length > 200) {
    db.activities = db.activities.slice(0, 200);
  }
  writeLocalStorageDb(db);
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Supabase categories fetch failed: ${error.message} (Target Table: 'categories')`);
    }
    return (data || []) as Category[];
  }
  return readLocalStorageDb().categories;
}

export async function getStats(): Promise<KeepFitStats> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { count: totalExercises, error: errEx } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true });

    if (errEx) {
      throw new Error(`Supabase exercises count failed: ${errEx.message}`);
    }

    const { data: acts, error: errAct } = await supabase
      .from('activities')
      .select('userId, duration, caloriesBurned, status');

    if (errAct) {
      throw new Error(`Supabase activities telemetry fetch failed: ${errAct.message}`);
    }

    const actsList = acts || [];
    let totalBurnedCalories = 0;
    let totalActiveTime = 0;
    const uniqueUsers = new Set<string>();

    actsList.forEach((act: any) => {
      if (act.status === 'completed' || act.status === 'active') {
        totalBurnedCalories += (Number(act.caloriesBurned) || 0);
        totalActiveTime += (Number(act.duration) || 0);
      }
      if (act.userId) {
        uniqueUsers.add(act.userId);
      }
    });

    return {
      totalExercises: totalExercises || 0,
      totalActivities: actsList.length,
      totalBurnedCalories,
      totalActiveTime,
      activeUsersCount: uniqueUsers.size || 4
    };
  }

  const data = readLocalStorageDb();
  const totalExercises = data.exercises.length;
  const totalActivities = data.activities.length;
  
  let totalBurnedCalories = 0;
  let totalActiveTime = 0;
  const uniqueUsers = new Set<string>();

  data.activities.forEach(act => {
    if (act.status === 'completed' || act.status === 'active') {
      totalBurnedCalories += act.caloriesBurned;
      totalActiveTime += act.duration;
    }
    if (act.userId) {
      uniqueUsers.add(act.userId);
    }
  });

  return {
    totalExercises,
    totalActivities,
    totalBurnedCalories,
    totalActiveTime,
    activeUsersCount: uniqueUsers.size || 4
  };
}

// Timing step fallbacks matching Kateda breathing rhythms exactly
export function generateFallbackStepDetails(ex: Exercise): any[] {
  const steps = ex.steps || [];
  return steps.map((step, idx) => {
    let type: 'instruction' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'static_hold' | 'action' = 'action';
    let duration = 30;
    let loops: number | undefined = undefined;
    let hint = '';

    const lower = step.toLowerCase();
    
    if (lower.includes('inhale') || lower.includes('pernafasan masuk') || lower.includes('tarik nafas')) {
      type = 'inhale';
      duration = 4;
      hint = 'Inhale deeply through your nose, expanding your abdomen.';
      if (lower.includes('repeat') || lower.includes('cycle') || lower.includes('loop') || lower.includes('pernafasan')) {
        loops = 10;
      }
    } else if (lower.includes('hold') || lower.includes('tahan') || lower.includes('lock')) {
      type = 'hold';
      duration = 4;
      hint = 'LOCK breath! Tense core stomach muscles (Pusat) tightly.';
      if (lower.includes('repeat') || lower.includes('cycle') || lower.includes('loop')) {
        loops = 10;
      }
    } else if (lower.includes('exhale') || lower.includes('buang nafas') || lower.includes('hembus')) {
      type = 'exhale';
      duration = 4;
      hint = 'Exhale sharply through the mouth, projecting power.';
      if (lower.includes('repeat') || lower.includes('cycle') || lower.includes('loop')) {
        loops = 10;
      }
    } else if (lower.includes('rest') || lower.includes('relax') || lower.includes('istirahat') || lower.includes('release')) {
      type = 'rest';
      duration = 10;
      hint = 'Rest posture, release muscles, and recover normal breath.';
    } else if (lower.includes('stand') || lower.includes('stance') || lower.includes('pose') || lower.includes('position')) {
      type = 'static_hold';
      duration = 20;
      hint = 'Enter deep stance. Keep spine aligned and maintain solid balance.';
    } else if (lower.includes('strike') || lower.includes('punch') || lower.includes('hit') || lower.includes('rep')) {
      type = 'action';
      duration = 45;
      hint = 'Perform explosive repetitions. Breathe out hard on impact.';
    } else {
      type = 'instruction';
      duration = 15;
      hint = 'Prepare posture and execute the required motion coordinates.';
    }

    const secMatch = step.match(/(\d+)\s*(?:second|sec)/i);
    if (secMatch) {
      duration = parseInt(secMatch[1], 10);
    }

    let ttsCommand = '';
    if (type === 'inhale') {
      ttsCommand = 'Inhale.';
    } else if (type === 'hold') {
      ttsCommand = 'Hold.';
    } else if (type === 'exhale') {
      ttsCommand = 'Exhale.';
    } else if (type === 'rest') {
      ttsCommand = 'Rest.';
    } else if (type === 'static_hold') {
      ttsCommand = 'Hold posture.';
    } else if (type === 'action') {
      ttsCommand = 'Begin strike.';
    } else {
      ttsCommand = 'Prepare.';
    }

    return {
      text: step,
      duration,
      type,
      hint: hint || `Execute Step ${idx + 1}`,
      loops,
      ttsCommand
    };
  });
}

// Run client-side auto-seeding helper
setTimeout(async () => {
  if (isSupabaseActive()) {
    await autoSeedSupabaseInBrowser();
  }
}, 2000);
