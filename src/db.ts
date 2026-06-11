import { createClient } from '@supabase/supabase-js';
import { Exercise, Category, Activity, KeepFitStats, BeltLevelInfo, BELT_LEVELS, Member, DailyStepLog } from './types';

const memberTemplates: Member[] = [
  {
    id: 'mem-1',
    fullName: 'Arman Hendra Harnanda',
    gender: 'Male',
    beltLevel: 1, // White Belt
    birthDate: '1978-05-12',
    joinedDate: '2026-01-15',
    phoneNumber: '+6281234567890',
    height: 163,
    weight: 99,
    status: 'active',
    notes: 'Praktisi Kateda Keepfit. Latihan pernapasan dada dan perut teratur untuk kebugaran fisik senior.'
  },
  {
    id: 'mem-2',
    fullName: 'Rayi Hendra Puspita',
    gender: 'Female',
    beltLevel: 1, // White Belt
    birthDate: '1982-09-20',
    joinedDate: '2026-02-10',
    phoneNumber: '+6281987654321',
    height: 150,
    weight: 99,
    status: 'active',
    notes: 'Praktisi Kateda Keepfit wanita. Fokus pemulihan stamina mandiri dengan jurus penahanan nafas dada dasar.'
  }
];

const categoryTemplates: Category[] = [
  {
    id: 'jurus',
    nameEN: 'Jurus (Forms)',
    nameID: 'Jurus',
    descriptionEN: 'Defensive self-protection physical stances, central focus postures, and strike locks.',
    descriptionID: 'Sikap fisik pertahanan diri, postur fokus pusat, dan kuncian serangan.',
    icon: 'Shield'
  },
  {
    id: 'pernapasan',
    nameEN: 'Breathing Conditioning',
    nameID: 'Pernapasan',
    descriptionEN: 'Deep internal breathing, oxygen saturation optimization, and lung retention waves.',
    descriptionID: 'Pernapasan dalam internal, optimalisasi saturasi oksigen, dan gelombang penahanan paru.',
    icon: 'Wind'
  },
  {
    id: 'exercise',
    nameEN: 'Physical Exercises',
    nameID: 'Exercise',
    descriptionEN: 'Dynamic strength training, bodyweight resistance, and high energy calorie burning.',
    descriptionID: 'Latihan kekuatan dinamis, ketahanan berat badan, dan pembakaran kalori energi tinggi.',
    icon: 'Dumbbell'
  },
  {
    id: 'isometrik',
    nameEN: 'Isometric Tension',
    nameID: 'Isometrik',
    descriptionEN: 'Static muscle tensing, structural strength, bone density focus, and joint stability.',
    descriptionID: 'Ketegangan otot statis, kekuatan struktural, fokus kepadatan tulang, dan stabilitas sendi.',
    icon: 'Zap'
  }
];

const exerciseTemplates: Exercise[] = [];
const activityTemplates: Activity[] = [];

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
    } else {
      console.warn('Supabase credentials missing. The application operates in strict Supabase mode.');
    }
  }
  return supabaseInstance;
}

export function isSupabaseActive(): boolean {
  return !!getSupabaseClient();
}

export async function resetEntireDatabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  try {
    await supabase.from('activities').delete().neq('id', 'placeholder-none');
    await supabase.from('exercises').delete().neq('id', 'placeholder-none');
    await supabase.from('categories').delete().neq('id', 'placeholder-none');
    try {
      await supabase.from('daily_steps').delete().neq('id', 'placeholder-none');
    } catch (e) {}
    try {
      await supabase.from('belt_levels').delete().neq('id', 'placeholder-none');
    } catch (e) {}
    try {
      await supabase.from('members').delete().neq('id', 'placeholder-none');
    } catch (e) {}

    await supabase.from('categories').insert(categoryTemplates);
    if (exerciseTemplates.length > 0) {
      await supabase.from('exercises').insert(exerciseTemplates);
    }
    if (activityTemplates.length > 0) {
      await supabase.from('activities').insert(activityTemplates);
    }
    try {
      await supabase.from('belt_levels').insert(BELT_LEVELS);
    } catch (e) {}
    try {
      await insertOrUpsertMembers(memberTemplates, false);
    } catch (e) {}
  } catch (err: any) {
    console.error('Error hard-seeding linked Supabase instance:', err.message || err);
    throw new Error(`Supabase synchronization error during reset: ${err.message || err}`);
  }
}

export async function autoSeedSupabaseInBrowser() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data: catData, error: catError } = await supabase.from('categories').select('id');
    
    if (catError) {
      console.warn('Unable to query Supabase categories table. Please ensure the Supabase schema exists! Error:', catError.message);
      return;
    }

    const hasOld = catData && catData.some((c: any) => ['kateda', 'strength', 'cardio', 'mobility'].includes(c.id));
    if (hasOld) {
      console.log('Detected old categories in Supabase, initiating clean migration...');
      await supabase.from('categories').upsert(categoryTemplates);
      await supabase.from('categories').delete().in('id', ['kateda', 'strength', 'cardio', 'mobility']);
      const { data: exData } = await supabase.from('exercises').select('id,category');
      if (exData) {
        for (const ex of exData) {
          let newCat = ex.category;
          if (ex.category === 'kateda') newCat = 'jurus';
          else if (ex.category === 'strength') newCat = 'exercise';
          else if (ex.category === 'cardio') newCat = 'pernapasan';
          else if (ex.category === 'mobility') newCat = 'isometrik';
          
          if (newCat !== ex.category) {
            await supabase.from('exercises').update({ category: newCat }).eq('id', ex.id);
          }
        }
      }
      console.log('Supabase category migration successfully finished!');
    }

    if (!catData || catData.length === 0) {
      console.log('Supabase tables are empty. Pre-populating with starter Kateda templates...');
      
      const { error: catSeedErr } = await supabase.from('categories').insert(categoryTemplates);
      if (catSeedErr) console.error('Error seeding categories to Supabase:', catSeedErr);

      if (exerciseTemplates.length > 0) {
        const { error: exSeedErr } = await supabase.from('exercises').insert(exerciseTemplates);
        if (exSeedErr) console.error('Error seeding exercises to Supabase:', exSeedErr);
      }

      if (activityTemplates.length > 0) {
        const { error: actSeedErr } = await supabase.from('activities').insert(activityTemplates);
        if (actSeedErr) console.error('Error seeding activities to Supabase:', actSeedErr);
      }

      try {
        const { error: beltSeedErr } = await supabase.from('belt_levels').insert(BELT_LEVELS);
        if (beltSeedErr) console.log('Seed message regarding belt_levels table:', beltSeedErr.message);
      } catch (e) {}

      try {
        await insertOrUpsertMembers(memberTemplates, false);
      } catch (e) {}

      console.log('Successfully completed Supabase auto-seeding!');
    }
  } catch (err: any) {
    console.error('Exception during Supabase interactive seeder:', err.message || err);
  }
}

export async function getBeltLevels(): Promise<BeltLevelInfo[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return BELT_LEVELS;

  const { data, error } = await supabase
    .from('belt_levels')
    .select('*')
    .order('id', { ascending: true });

  if (error || !data || data.length === 0) {
    return BELT_LEVELS;
  }
  return data as BeltLevelInfo[];
}

export async function saveBeltLevels(belts: BeltLevelInfo[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

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
      id: Number(b.id),
      nameEN: b.nameEN,
      nameID: b.nameID,
      color: b.color || 'bg-white/10 text-white border-white/20'
    }));
    await supabase.from('belt_levels').upsert(cleanedBelts);
  }
}

function mapExerciseRow(row: any): Exercise {
  const steps = row.stepsEN || row.stepsID || row.steps || [];
  const stepDetails = row.stepDetailsEN || row.stepDetailsID || row.stepDetails || [];
  
  const slidesFromField = (row.slidesUrl || row.mediaSlides || []).filter(Boolean);
  
  const isVideoUrlActualVideo = row.videoUrl && (
    row.videoUrl.includes('youtube.com') ||
    row.videoUrl.includes('youtu.be') ||
    row.videoUrl.endsWith('.mp4') ||
    row.videoUrl.includes('.mp4?')
  );
  
  const videoUrlVal = isVideoUrlActualVideo ? row.videoUrl : '';
  const coverUrlVal = !isVideoUrlActualVideo ? (row.videoUrl || row.mediaUrl || '') : (row.mediaUrl || '');

  return {
    ...row,
    title: row.titleEN || row.titleID || row.title || '',
    description: row.descriptionEN || row.descriptionID || row.description || '',
    steps: steps,
    stepDetails: stepDetails,
    targetUnit: row.targetUnit || 'minutes',
    targetValue: row.targetValue !== undefined ? Number(row.targetValue) : (row.duration || 15),
    videoUrl: videoUrlVal,
    slidesUrl: slidesFromField,
    mediaUrl: videoUrlVal || coverUrlVal || (slidesFromField.length > 0 ? slidesFromField[0] : ''),
    mediaSlides: slidesFromField
  } as Exercise;
}

export async function getExercises(): Promise<Exercise[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Supabase exercises fetch failed: ${error.message}`);
  }

  return (data || []).map(mapExerciseRow);
}

export async function saveExercises(exercises: Exercise[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

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
    const cleanedExercises = exercises.map(ex => {
      const titleEN = ex.titleEN || ex.title || '';
      const titleID = ex.titleID || ex.title || '';
      const descEN = ex.descriptionEN || ex.description || '';
      const descID = ex.descriptionID || ex.description || '';
      const stepsEN = ex.stepsEN || ex.steps || [];
      const stepsID = ex.stepsID || ex.steps || [];
      const detailsEN = ex.stepDetailsEN || ex.stepDetails || generateFallbackStepDetails(ex);
      const detailsID = ex.stepDetailsID || ex.stepDetails || generateFallbackStepDetails(ex);

      return {
        id: ex.id,
        titleEN: titleEN,
        titleID: titleID,
        category: ex.category,
        difficulty: ex.difficulty,
        duration: Number(ex.duration) || 0,
        calories: Number(ex.calories) || 0,
        descriptionEN: descEN,
        descriptionID: descID,
        stepsEN: stepsEN,
        stepsID: stepsID,
        stepDetailsEN: detailsEN,
        stepDetailsID: detailsID,
        videoUrl: ex.videoUrl || ex.mediaUrl || '',
        slidesUrl: ex.slidesUrl || ex.mediaSlides || [],
        loops: Number(ex.loops) || 1,
        targetMuscles: ex.targetMuscles || [],
        katedaSpecific: ex.katedaSpecific || false,
        updatedAt: ex.updatedAt || new Date().toISOString(),
        targetUnit: ex.targetUnit || 'minutes',
        targetValue: ex.targetValue !== undefined ? Number(ex.targetValue) : (Number(ex.duration) || 15)
      };
    });

    const { error: upsertErr } = await supabase.from('exercises').upsert(cleanedExercises);
    if (upsertErr) {
      throw new Error(`Supabase upsert exercises failed: ${upsertErr.message}`);
    }
  }
}

export async function getActivities(): Promise<Activity[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('id', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Supabase activities fetch failed: ${error.message}`);
  }

  const rows = data || [];
  
  let membersList: Member[] = [];
  let exercisesList: Exercise[] = [];
  try {
    membersList = await getMembers();
    exercisesList = await getExercises();
  } catch (lookupErr) {
    console.warn('Failed to fully pre-fetch related tables for activities mapping: ', lookupErr);
  }

  return rows.map((row: any) => {
    const uId = row.userId || row.userid || '';
    const exId = row.exerciseId || row.exerciseid || '';

    const matchingMember = membersList.find(m => m.id === uId);
    const matchingExercise = exercisesList.find(e => e.id === exId);

    const name = matchingMember ? matchingMember.fullName : (row.userName || row.username || 'Anonymous Practitioner');
    const avatar = matchingMember ? (matchingMember.avatar || '') : (row.userAvatar || row.useravatar || '');
    const tEN = matchingExercise ? matchingExercise.titleEN : (row.exerciseTitleEN || row.exercisetitleen || row.exerciseTitle || row.exercisetitle || 'Exercise Activity');
    const tID = matchingExercise ? matchingExercise.titleID : (row.exerciseTitleID || row.exercisetitleid || row.exerciseTitle || row.exercisetitle || 'Aktivitas Latihan');

    return {
      id: row.id,
      userId: uId,
      userName: name,
      userAvatar: avatar,
      exerciseId: exId,
      exerciseTitle: tEN || tID,
      exerciseTitleEN: tEN,
      exerciseTitleID: tID,
      timestamp: row.timestamp || '',
      duration: Number(row.duration) || 0,
      caloriesBurned: Number(row.caloriesBurned !== undefined ? row.caloriesBurned : (row.caloriesburned !== undefined ? row.caloriesburned : 0)) || 0,
      status: row.status || 'completed',
      heartRateAvg: row.heartRateAvg !== undefined ? Number(row.heartRateAvg) : (row.heartrateavg !== undefined ? Number(row.heartrateavg) : undefined),
      notes: row.notes || '',
      achievedUnit: row.achievedUnit || row.achievedunit || '',
      achievedValue: row.achievedValue !== undefined ? Number(row.achievedValue) : (row.achievedvalue !== undefined ? Number(row.achievedvalue) : undefined)
    };
  }) as Activity[];
}

export async function addActivity(activity: Activity): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const mappedToDb = {
    id: activity.id,
    userId: activity.userId,
    exerciseId: activity.exerciseId,
    timestamp: activity.timestamp,
    duration: Number(activity.duration) || 0,
    caloriesBurned: Number(activity.caloriesBurned) || 0,
    status: activity.status,
    heartRateAvg: activity.heartRateAvg !== undefined ? Number(activity.heartRateAvg) : null,
    notes: activity.notes || '',
    achievedUnit: activity.achievedUnit || null,
    achievedValue: activity.achievedValue !== undefined ? Number(activity.achievedValue) : null
  };

  const { error } = await supabase.from('activities').insert([mappedToDb]);
  if (error) {
    throw new Error(`Supabase insert activity failed: ${error.message}`);
  }
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return categoryTemplates;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true });

  if (error || !data || data.length === 0) {
    return categoryTemplates;
  }
  return data as Category[];
}

export async function getStats(): Promise<KeepFitStats> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      totalExercises: 0,
      totalActivities: 0,
      totalBurnedCalories: 0,
      totalActiveTime: 0,
      activeUsersCount: 0
    };
  }

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
      duration = 0;
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
      ttsCommand = step || 'Prepare.';
    }

    const unit = type === 'instruction' ? 'none' : 'seconds';

    return {
      text: step,
      duration: unit === 'none' ? 0 : duration,
      type,
      hint: hint || `Execute Step ${idx + 1}`,
      loops: ['inhale', 'hold', 'exhale', 'rest'].includes(type) ? (loops || 5) : undefined,
      ttsCommand: ttsCommand || step,
      unit,
      waitForTTS: true
    };
  });
}

setTimeout(async () => {
  if (isSupabaseActive()) {
    await autoSeedSupabaseInBrowser();
  }
}, 2000);

export async function insertOrUpsertMembers(members: Member[], isUpsert = false): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const camelCleaned = members.map(m => ({
    id: m.id,
    fullName: m.fullName,
    gender: m.gender,
    beltLevel: Number(m.beltLevel) || 1,
    birthDate: m.birthDate,
    joinedDate: m.joinedDate,
    phoneNumber: m.phoneNumber || '',
    height: Number(m.height) || 0,
    weight: Number(m.weight) || 0,
    status: m.status || 'active',
    notes: m.notes || '',
    avatar: m.avatar || ''
  }));

  let res = isUpsert 
    ? await supabase.from('members').upsert(camelCleaned)
    : await supabase.from('members').insert(camelCleaned);

  if (res.error) {
    console.warn(`Primary members query failed: ${res.error.message}. Trying snake_case...`);
    const snakeCleaned = camelCleaned.map((item: any) => {
      const snakeItem: any = {};
      for (const key of Object.keys(item)) {
        const mappedKey = key === 'fullName' ? 'full_name' :
                          key === 'beltLevel' ? 'belt_level' :
                          key === 'birthDate' ? 'birth_date' :
                          key === 'joinedDate' ? 'joined_date' :
                          key === 'phoneNumber' ? 'phone_number' : key;
        snakeItem[mappedKey] = item[key];
      }
      return snakeItem;
    });

    res = isUpsert
      ? await supabase.from('members').upsert(snakeCleaned)
      : await supabase.from('members').insert(snakeCleaned);

    if (res.error) {
      console.warn(`Snake_case members query failed: ${res.error.message}. Trying pure lowercase...`);
      const lowercaseCleaned = camelCleaned.map((item: any) => {
        const lowercaseItem: any = {};
        for (const key of Object.keys(item)) {
          const mappedKey = key === 'fullName' ? 'fullname' :
                            key === 'beltLevel' ? 'beltlevel' :
                            key === 'birthDate' ? 'birthdate' :
                            key === 'joinedDate' ? 'joineddate' :
                            key === 'phoneNumber' ? 'phonenumber' : key.toLowerCase();
          lowercaseItem[mappedKey] = item[key];
        }
        return lowercaseItem;
      });

      res = isUpsert
        ? await supabase.from('members').upsert(lowercaseCleaned)
        : await supabase.from('members').insert(lowercaseCleaned);

      if (res.error) {
        throw new Error(`Supabase members writing failed: ${res.error.message}`);
      }
    }
  }
}

export async function getMembers(): Promise<Member[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return memberTemplates;

  try {
    const { data, error } = await supabase.from('members').select('*');
    
    if (!error && data) {
      if (data.length === 0) {
        console.log('Supabase members table is active but empty. Auto-populating with starter members...');
        try {
          await insertOrUpsertMembers(memberTemplates, false);
          const refetched = await supabase.from('members').select('*');
          if (!refetched.error && refetched.data && refetched.data.length > 0) {
            const mapped = refetched.data.map((row: any) => ({
              id: row.id,
              fullName: row.fullName || row.full_name || row.fullname || '',
              gender: row.gender || '',
              beltLevel: Number(row.beltLevel !== undefined ? row.beltLevel : (row.belt_level !== undefined ? row.belt_level : (row.beltlevel !== undefined ? row.beltlevel : 1))),
              birthDate: row.birthDate || row.birth_date || row.birthdate || '',
              joinedDate: row.joinedDate || row.joined_date || row.joineddate || '',
              phoneNumber: row.phoneNumber || row.phone_number || row.phonenumber || '',
              height: Number(row.height !== undefined ? row.height : 0),
              weight: Number(row.weight !== undefined ? row.weight : 0),
              status: row.status || 'active',
              notes: row.notes || '',
              avatar: row.avatar || ''
            }));
            mapped.sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime());
            return mapped as Member[];
          }
        } catch (seedErr) {
          console.warn('Failed to auto-seed empty Supabase members table', seedErr);
        }
        return memberTemplates;
      }

      const mapped = data.map((row: any) => ({
        id: row.id,
        fullName: row.fullName || row.full_name || row.fullname || '',
        gender: row.gender || '',
        beltLevel: Number(row.beltLevel !== undefined ? row.beltLevel : (row.belt_level !== undefined ? row.belt_level : (row.beltlevel !== undefined ? row.beltlevel : 1))),
        birthDate: row.birthDate || row.birth_date || row.birthdate || '',
        joinedDate: row.joinedDate || row.joined_date || row.joineddate || '',
        phoneNumber: row.phoneNumber || row.phone_number || row.phonenumber || '',
        height: Number(row.height !== undefined ? row.height : 0),
        weight: Number(row.weight !== undefined ? row.weight : 0),
        status: row.status || 'active',
        notes: row.notes || '',
        avatar: row.avatar || ''
      }));
      
      mapped.sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime());
      return mapped as Member[];
    }
  } catch (err: any) {
    console.warn('getMembers exception:', err.message || err);
  }
  return memberTemplates;
}

export async function saveMembers(members: Member[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  await insertOrUpsertMembers(members, true);
}

export async function addMember(member: Member): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  await insertOrUpsertMembers([member], false);
}

export async function updateMember(member: Member): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  await insertOrUpsertMembers([member], true);
}

export async function deleteMember(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  await supabase.from('members').delete().eq('id', id);
}

export async function getDailyStepLogs(): Promise<DailyStepLog[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .order('date', { ascending: false });

  if (!error && data) {
    let membersList: Member[] = [];
    try {
      membersList = await getMembers();
    } catch (mErr) {}

    const mapped = data.map((row: any) => {
      const uId = row.userId || row.userid || '';
      const matchingMember = membersList.find(m => m.id === uId);
      return {
        id: row.id,
        userId: uId,
        userName: matchingMember ? matchingMember.fullName : (row.userName || row.username || 'Practitioner'),
        userAvatar: matchingMember ? (matchingMember.avatar || '') : (row.userAvatar || row.useravatar || ''),
        date: row.date || '',
        steps: Number(row.steps !== undefined ? row.steps : 0),
        caloriesBurned: row.caloriesBurned !== undefined ? Number(row.caloriesBurned) : (row.caloriesburned !== undefined ? Number(row.caloriesburned) : undefined),
        distanceKm: row.distanceKm !== undefined ? Number(row.distanceKm) : (row.distancekm !== undefined ? Number(row.distancekm) : undefined),
        updatedAt: row.updatedAt || row.updatedat || ''
      };
    });
    return mapped as DailyStepLog[];
  }
  return [];
}

export async function addOrUpdateDailyStepLog(log: DailyStepLog): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const preferredRow = {
    id: log.id,
    userId: log.userId,
    date: log.date,
    steps: Number(log.steps) || 0,
    calories: log.caloriesBurned !== undefined ? Number(log.caloriesBurned) : null,
    distance: log.distanceKm !== undefined ? Number(log.distanceKm) : null,
    updatedAt: log.updatedAt || new Date().toISOString()
  };

  let res = await supabase.from('daily_steps').upsert([preferredRow]);

  if (res.error) {
    const oldCamelRow = {
      id: log.id,
      userId: log.userId,
      date: log.date,
      steps: Number(log.steps) || 0,
      caloriesBurned: log.caloriesBurned !== undefined ? Number(log.caloriesBurned) : null,
      distanceKm: log.distanceKm !== undefined ? Number(log.distanceKm) : null,
      updatedAt: log.updatedAt || new Date().toISOString()
    };
    res = await supabase.from('daily_steps').upsert([oldCamelRow]);
  }

  if (res.error) {
    const lowerRow = {
      id: log.id,
      userid: log.userId,
      date: log.date,
      steps: Number(log.steps) || 0,
      caloriesburned: log.caloriesBurned !== undefined ? Number(log.caloriesBurned) : null,
      distancekm: log.distanceKm !== undefined ? Number(log.distanceKm) : null,
      updatedat: log.updatedAt || new Date().toISOString()
    };
    res = await supabase.from('daily_steps').upsert([lowerRow]);
  }

  if (res.error) {
    const lowerUserRow = {
      id: log.id,
      userid: log.userId,
      date: log.date,
      steps: Number(log.steps) || 0,
      calories: log.caloriesBurned !== undefined ? Number(log.caloriesBurned) : null,
      distance: log.distanceKm !== undefined ? Number(log.distanceKm) : null,
      updatedat: log.updatedAt || new Date().toISOString()
    };
    res = await supabase.from('daily_steps').upsert([lowerUserRow]);
  }
  
  if (res.error) {
    throw new Error(`Supabase Daily Steps syncing error: ${res.error.message}`);
  }
}

export async function deleteDailyStepLog(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  await supabase.from('daily_steps').delete().eq('id', id);
}
