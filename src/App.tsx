import { useState, useEffect, FormEvent } from 'react';
import { 
  Dumbbell, 
  Activity, 
  HeartPulse, 
  Flame, 
  Clock, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Terminal, 
  Check, 
  Video, 
  Image as ImageIcon, 
  RefreshCw, 
  Play, 
  Layers, 
  X, 
  User, 
  Database, 
  ArrowRight,
  BookOpen,
  Info,
  Menu
} from 'lucide-react';
import { Exercise, Category, Activity as ActivityType, KeepFitStats, BELT_LEVELS, BeltLevel, BeltLevelInfo } from './types';
import StatsDashboard from './components/StatsDashboard';
import DeveloperTab from './components/DeveloperTab';
import { translations } from './locales';
import {
  getExercises,
  getCategories,
  getActivities,
  getStats,
  saveExercises,
  addActivity,
  getBeltLevels,
  saveBeltLevels
} from './db';

export default function App() {
  // Localization State
  const [language, setLanguage] = useState<'EN' | 'ID'>('EN');
  const t = translations[language];

  // Dynamic Belt levels from DB
  const [beltLevels, setBeltLevels] = useState<BeltLevelInfo[]>([]);

  const getBeltInfo = (difficulty: string) => {
    const level = difficulty?.toLowerCase();
    const info = beltLevels.find(b => b.id.toLowerCase() === level);
    if (info) return info;
    const staticInfo = BELT_LEVELS.find(b => b.id.toLowerCase() === level);
    if (staticInfo) return staticInfo;
    // Fallbacks for beginner, intermediate, advanced
    if (level === 'beginner') return { id: 'sabuk putih', nameEN: 'White Belt', nameID: 'Sabuk Putih', color: 'bg-white/10 text-white border border-white/20', order_index: 1 };
    if (level === 'intermediate') return { id: 'sabuk kuning', nameEN: 'Yellow Belt', nameID: 'Sabuk Kuning', color: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20', order_index: 2 };
    if (level === 'advanced') return { id: 'sabuk coklat', nameEN: 'Brown Belt', nameID: 'Sabuk Coklat', color: 'bg-amber-800/10 text-amber-500 border border-amber-850/20 font-bold', order_index: 5 };
    // Default general fallback
    return { id: difficulty || 'sabuk putih', nameEN: difficulty || 'White Belt', nameID: difficulty || 'Sabuk Putih', color: 'bg-white/10 text-white border border-white/20 font-medium', order_index: 99 };
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exercises' | 'activities' | 'developer'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleTabChange = (tab: 'dashboard' | 'exercises' | 'activities' | 'developer') => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Backend Synchronized States
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [stats, setStats] = useState<KeepFitStats>({
    totalExercises: 0,
    totalActivities: 0,
    totalBurnedCalories: 0,
    totalActiveTime: 0,
    activeUsersCount: 0
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  
  // Form States (AI components removed for client-only operation)
  const [formData, setFormData] = useState<Partial<Exercise>>({
    title: '',
    category: 'kateda',
    difficulty: 'sabuk putih',
    duration: 15,
    calories: 120,
    description: '',
    steps: [''],
    stepDetails: [{ text: '', duration: 15, type: 'instruction', hint: '', loops: 5, ttsCommand: '' }],
    mediaType: 'image',
    mediaUrl: '',
    targetMuscles: ['Abdominals', 'Core'],
    katedaSpecific: false,
    loops: 5,
    vocalGuide: true,
    lungWaveD: true,
    mediaSlides: []
  });

  // Practice sequence player states (for physical tensing and breath lock countdowns)
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [activeLoopCount, setActiveLoopCount] = useState(1);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [practiceActive, setPracticeActive] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Mobile Workout simulator inputs
  const [simFormData, setSimFormData] = useState({
    userId: 'user-' + Math.floor(100 + Math.random() * 900),
    userName: 'John Doe',
    exerciseIndex: 0,
    duration: '20',
    calories: '180',
    notes: 'Simulated from KeepFit Admin simulator widget.',
    heartRateAvg: '135'
  });
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);

  // Interactive REST API Sandbox state removed so that data queries handshake directly with live Supabase.


  // Status/Error logs
  const [sysLogs, setSysLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warn' | 'api' }[]>([
    { time: '11:33:20', msg: 'System online. Browser client-side LocalStorage DB connected.', type: 'info' },
    { time: '11:33:21', msg: 'Admin Panel loaded in Elegant Dark style guide rules. Direct Supabase sync ready.', type: 'success' }
  ]);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'api' = 'info') => {
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setSysLogs(prev => [{ time: timeNow, msg, type }, ...prev].slice(0, 30));
  };

  // Fetch initial system data
  const loadSystemData = async () => {
    try {
      setLoading(true);
      const [exList, catList, actList, statTotals, beltList] = await Promise.all([
        getExercises(),
        getCategories(),
        getActivities(),
        getStats(),
        getBeltLevels()
      ]);

      setExercises(exList);
      setCategories(catList);
      setActivities(actList);
      setStats(statTotals);
      setBeltLevels(beltList);

      addLog(`Synchronized active databases. Loaded ${exList.length} exercises, ${beltList.length} belt levels, and ${actList.length} activities.`, 'success');
    } catch (e: any) {
      console.error(e);
      addLog(`Sync Failure: ${e.message || e}`, 'warn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemData();
  }, []);

  useEffect(() => {
    setCurrentSlideIdx(0);
  }, [selectedExercise]);

  // Handle manual exercise creation
  const handleSaveExercise = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.description) {
      addLog('Validation failed. Title, category, and description are required', 'warn');
      return;
    }

    try {
      const currentList = [...exercises];
      const filteredSteps = formData.steps?.filter(s => s.trim() !== '') || [];
      
      let savedElement: Exercise;
      if (formData.id) {
        // Edit mode
        const index = currentList.findIndex(item => item.id === formData.id);
        if (index === -1) {
          addLog('Exercise not found.', 'warn');
          return;
        }
        savedElement = {
          ...currentList[index],
          ...formData,
          steps: filteredSteps,
          updatedAt: new Date().toISOString()
        } as Exercise;
        currentList[index] = savedElement;
        addLog(`Exercise updated successfully: "${savedElement.title}"`, 'success');
      } else {
        // Create mode
        const exId = `ex-${Date.now()}`;
        savedElement = {
          id: exId,
          title: String(formData.title),
          category: String(formData.category),
          difficulty: formData.difficulty || 'sabuk putih',
          duration: Number(formData.duration) || 15,
          calories: Number(formData.calories) || 120,
          description: String(formData.description),
          steps: filteredSteps,
          mediaType: formData.mediaType || 'image',
          mediaUrl: String(formData.mediaUrl || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800'),
          mediaSlides: formData.mediaSlides || [],
          loops: formData.loops || 5,
          vocalGuide: formData.vocalGuide !== undefined ? formData.vocalGuide : true,
          lungWaveD: formData.lungWaveD !== undefined ? formData.lungWaveD : true,
          targetMuscles: formData.targetMuscles || [],
          katedaSpecific: formData.katedaSpecific || false,
          updatedAt: new Date().toISOString()
        };
        currentList.unshift(savedElement);
        addLog(`Exercise created successfully: "${savedElement.title}"`, 'success');
      }
      
      await saveExercises(currentList);
      setShowCreateModal(false);
      resetForm();
      loadSystemData();
    } catch (err) {
      addLog('Error writing exercise transaction to DB.', 'warn');
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the exercise "${name}" from KeepFit API catalog? This will unsync this ID from mobile catalog.`)) return;

    try {
      const filtered = exercises.filter(item => item.id !== id);
      await saveExercises(filtered);
      addLog(`Deleted "${name}" successfully`, 'success');
      if (selectedExercise?.id === id) setSelectedExercise(null);
      loadSystemData();
    } catch (e) {
      addLog('Error invoking delete pipeline', 'warn');
    }
  };

  // Reset exercise form
  const resetForm = () => {
    setFormData({
      title: '',
      category: 'kateda',
      difficulty: 'sabuk putih',
      duration: 15,
      calories: 120,
      description: '',
      steps: [''],
      stepDetails: [{ text: '', duration: 15, type: 'instruction', hint: '', loops: 5, ttsCommand: '' }],
      mediaType: 'image',
      mediaUrl: '',
      targetMuscles: ['Abdominals', 'Core'],
      katedaSpecific: false,
      loops: 5,
      vocalGuide: true,
      lungWaveD: true,
      mediaSlides: []
    });
  };

  // Handle loading existing exercises into form with upgraded steps structure mapping
  const handleLoadForEditing = (ex: Exercise) => {
    const details = ex.stepDetails && ex.stepDetails.length > 0 
      ? ex.stepDetails 
      : ex.steps.map(s => {
          let type: 'instruction' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'static_hold' | 'action' = 'instruction';
          let duration = 20;
          let hint = '';
          const l = s.toLowerCase();
          if (l.includes('inhale') || l.includes('breathe in')) {
            type = 'inhale'; duration = 4; hint = 'Inhale deep through nose.';
          } else if (l.includes('hold') || l.includes('lock') || l.includes('tahan')) {
            type = 'hold'; duration = 4; hint = 'Squeeze core muscles.';
          } else if (l.includes('exhale') || l.includes('breathe out')) {
            type = 'exhale'; duration = 4; hint = 'Exhale sharply with low hum.';
          } else if (l.includes('rest') || l.includes('relax')) {
            type = 'rest'; duration = 10; hint = 'Slightly relax and breathe.';
          } else if (l.includes('stance') || l.includes('stand')) {
            type = 'static_hold'; duration = 30; hint = 'Stay low in stance.';
          }
          return { text: s, duration, type, hint };
        });

    setFormData({
      ...ex,
      stepDetails: details
    });
    setShowCreateModal(true);
  };

  // Sync tools for Create/Edit Modal Steps rows
  const addStepRow = () => {
    const newDetail = {
      text: '',
      duration: 15,
      type: 'instruction' as const,
      hint: '',
    };
    setFormData(p => ({
      ...p,
      stepDetails: [...(p.stepDetails || []), newDetail],
      steps: [...(p.steps || []), '']
    }));
  };

  const removeStepRow = (idx: number) => {
    setFormData(p => {
      const updatedDetails = (p.stepDetails || []).filter((_, i) => i !== idx);
      const updatedSteps = (p.steps || []).filter((_, i) => i !== idx);
      return {
        ...p,
        stepDetails: updatedDetails,
        steps: updatedSteps
      };
    });
  };

  const updateStepRow = (idx: number, fields: Partial<typeof formData.stepDetails extends (infer U)[] ? U : any>) => {
    setFormData(p => {
      const updatedDetails = [...(p.stepDetails || [])];
      updatedDetails[idx] = { ...updatedDetails[idx], ...fields };
      
      const updatedSteps = [...(p.steps || [])];
      if (fields.text !== undefined) {
        updatedSteps[idx] = fields.text;
      }
      
      return {
        ...p,
        stepDetails: updatedDetails,
        steps: updatedSteps
      };
    });
  };

  // Helper to extract YouTube video ID and format in embed standard
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
    } catch (e) {
      console.warn("Could not parse YouTube URL", e);
    }
    return '';
  };

  // Speech Coaching Helpers
  const speakPhrase = (phrase: string) => {
    const isVocalDisabled = selectedExercise && selectedExercise.vocalGuide === false;
    if (isAudioMuted || isVocalDisabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis fail', e);
    }
  };

  const speakCurrentStep = (stepObj: any, loopNo: number) => {
    const isVocalDisabled = selectedExercise && selectedExercise.vocalGuide === false;
    if (isAudioMuted || isVocalDisabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      let phrase = '';
      if (stepObj.ttsCommand) {
        phrase = stepObj.ttsCommand;
        if (['inhale', 'hold', 'exhale', 'rest'].includes(stepObj.type || '') && loopNo > 1) {
          phrase = `${phrase} Loop ${loopNo}.`;
        }
      } else {
        if (stepObj.type === 'inhale') {
          phrase = `Inhale. Loop ${loopNo}. ${stepObj.hint || 'Breathe in slowly.'}`;
        } else if (stepObj.type === 'hold') {
          phrase = `Hold. ${stepObj.hint || 'Lock breath and tense core.'}`;
        } else if (stepObj.type === 'exhale') {
          phrase = `Exhale. ${stepObj.hint || 'Breathe out hard.'}`;
        } else if (stepObj.type === 'rest') {
          phrase = `Rest. ${stepObj.hint || 'Breath rest.'}`;
        } else {
          phrase = `${stepObj.text}. ${stepObj.hint || ''}`;
        }
      }
      
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  };

  // practice-play helpers
  const getFirstBreathingStepIdx = (details: any[]) => {
    return details.findIndex(d => ['inhale', 'hold', 'exhale', 'rest'].includes(d.type || ''));
  };

  const getLastBreathingStepIdx = (details: any[]) => {
    let lastIdx = -1;
    for (let i = 0; i < details.length; i++) {
      if (['inhale', 'hold', 'exhale', 'rest'].includes(details[i].type || '')) {
        lastIdx = i;
      }
    }
    return lastIdx;
  };

  const startPractice = (ex: Exercise) => {
    const details = ex.stepDetails || [];
    if (details.length === 0) return;
    
    setPracticeActive(true);
    setIsPlaying(true);
    setActiveStepIdx(0);
    setActiveLoopCount(1);
    setSecondsLeft(details[0].duration || 15);
    speakCurrentStep(details[0], 1);
  };

  const simulateCompletedPractice = async () => {
    if (!selectedExercise) return;
    try {
      const activityObj: ActivityType = {
        id: `act-${Date.now()}`,
        userId: 'user-practitioner',
        userName: 'Practice Playground Tester',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80',
        exerciseId: selectedExercise.id,
        exerciseTitle: selectedExercise.title,
        timestamp: new Date().toISOString(),
        duration: selectedExercise.duration,
        caloriesBurned: selectedExercise.calories,
        status: 'completed',
        notes: 'Auto-verified practice countdown flow with voice coach parameters.',
        heartRateAvg: 118
      };
      await addActivity(activityObj);
      addLog(`Registered sequence test completion run: "${selectedExercise.title}"`, 'success');
      loadSystemData();
    } catch (e) {
      console.error('Failed to register testing rehearsal.', e);
    }
  };

  const handleStepCompletion = () => {
    if (!selectedExercise) return;
    const details = selectedExercise.stepDetails || [];
    if (details.length === 0) {
      setPracticeActive(false);
      setIsPlaying(false);
      return;
    }

    const currentStep = details[activeStepIdx];
    const isBreathingStep = ['inhale', 'hold', 'exhale', 'rest'].includes(currentStep.type || '');
    const maxLoops = currentStep.loops || selectedExercise.loops || 5;

    // Check loops repeating for cyclical breath locking sequences
    if (isBreathingStep && activeStepIdx === getLastBreathingStepIdx(details)) {
      if (activeLoopCount < maxLoops) {
        const firstBreatheIdx = getFirstBreathingStepIdx(details);
        setActiveStepIdx(firstBreatheIdx);
        setActiveLoopCount(prev => prev + 1);
        const nextStep = details[firstBreatheIdx];
        setSecondsLeft(nextStep.duration || 15);
        speakCurrentStep(nextStep, activeLoopCount + 1);
        return;
      }
    }

    if (activeStepIdx < details.length - 1) {
      const nextIdx = activeStepIdx + 1;
      setActiveStepIdx(nextIdx);
      const nextStep = details[nextIdx];
      setSecondsLeft(nextStep.duration || 15);
      speakCurrentStep(nextStep, activeLoopCount);
    } else {
      setPracticeActive(false);
      setIsPlaying(false);
      speakPhrase("Practice completed. Outstanding energy preservation!");
      simulateCompletedPractice();
    }
  };

  // Practice sequence ticker Hook
  useEffect(() => {
    let timerId: any = null;
    if (practiceActive && isPlaying) {
      timerId = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            handleStepCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerId);
    }
    return () => clearInterval(timerId);
  }, [practiceActive, isPlaying, activeStepIdx, activeLoopCount, selectedExercise]);

  // Launch mobile emulator trigger
  const handleSimulateWorkout = async (e: FormEvent) => {
    e.preventDefault();
    if (!exercises.length) {
      alert('Please initialize exercises catalog first.');
      return;
    }

    const linkedEx = exercises[Number(simFormData.exerciseIndex) % exercises.length];
    if (!linkedEx) return;

    setSimulating(true);
    addLog(`Initiating KeepFit mobile API handshake for user ${simFormData.userName}...`, 'api');

    try {
      const newAct: ActivityType = {
        id: `act-${Date.now()}`,
        userId: simFormData.userId,
        userName: simFormData.userName,
        userAvatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80`,
        exerciseId: linkedEx.id,
        exerciseTitle: linkedEx.title,
        timestamp: new Date().toISOString(),
        duration: Number(simFormData.duration),
        caloriesBurned: Number(simFormData.calories),
        status: 'completed',
        notes: simFormData.notes,
        heartRateAvg: Number(simFormData.heartRateAvg)
      };

      await addActivity(newAct);
      addLog(`Mobile API success. Added workout record for ${simFormData.userName} (${linkedEx.title})`, 'success');
      setSimSuccess(true);
      setTimeout(() => setSimSuccess(false), 3000);
      loadSystemData();
    } catch (e) {
      addLog(`Handshake failed on POST /api/activities`, 'warn');
    } finally {
      setSimulating(false);
    }
  };

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.title.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
                          ex.description.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
                          ex.targetMuscles.some(m => m.toLowerCase().includes(exerciseSearch.toLowerCase()));
    
    if (activeCategoryFilter === 'all') return matchesSearch;
    return ex.category === activeCategoryFilter && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200" id="main-admin-app">
      
      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION - Exactly matching Elegant Dark structure, now responsive */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-[#27272a] bg-[#09090b] flex flex-col shrink-0 transition-transform duration-300 transform lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} id="admin-sidebar">
        {/* Sidebar Header Brand */}
        <div className="p-8">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20">KF</div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">KeepFit</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#a1a1aa] font-semibold">Kateda Subsidiary</p>
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 px-4 space-y-1.5">
          <button 
            onClick={() => handleTabChange('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'dashboard' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-dashboard"
          >
            <Layers className="w-5 h-5 opacity-80" />
            <span>{t.sidebarDashboard}</span>
          </button>

          <button 
            onClick={() => handleTabChange('exercises')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'exercises' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-exercises"
          >
            <Dumbbell className="w-5 h-5 opacity-80" />
            <span>{t.sidebarExercises}</span>
          </button>

          <button 
            onClick={() => handleTabChange('activities')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'activities' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-activities"
          >
            <Activity className="w-5 h-5 opacity-80" />
            <span>{t.sidebarUsers}</span>
          </button>

          <button 
            onClick={() => handleTabChange('developer')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'developer' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-developer"
          >
            <Terminal className="w-5 h-5 opacity-80" />
            <span>{t.developer}</span>
          </button>


        </nav>

        {/* Console status ticker block */}
        <div className="px-5 py-3 mx-4 my-2 rounded-xl bg-[#18181b] border border-[#27272a]" id="event-ticker-console">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-[#a1a1aa] uppercase tracking-wider font-mono">{t.realTimeLogs}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="h-20 overflow-y-auto text-[10px] font-mono text-emerald-400 space-y-1 scrollbar-none" id="log-scroll">
            {sysLogs.map((log, index) => (
              <p key={index} className="leading-tight">
                <span className="text-[#a1a1aa] select-none">[{log.time}]</span> {log.msg}
              </p>
            ))}
          </div>
        </div>
        
        {/* Admin profile card bottom bar */}
        <div className="p-4 mt-auto border-t border-[#27272a]">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]/40" id="profile-card">
            <div className="w-8 h-8 rounded-lg bg-emerald-990/60 border border-emerald-500/20 flex items-center justify-center text-emerald-300 text-xs font-bold italic">JD</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Jordan Miller</p>
              <p className="text-[10px] text-[#a1a1aa] truncate">System Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] overflow-y-auto" id="admin-workspace-pane">
        
        {/* TOP LEVEL BAR */}
        <header className="h-20 border-b border-[#27272a] px-4 sm:px-8 flex items-center justify-between bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center min-w-0">
            {/* Hamburger button for mobile devices */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 mr-3 rounded-xl bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white cursor-pointer active:scale-95 transition-transform shrink-0 flex items-center justify-center"
              id="sidebar-toggle-btn"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase-first truncate" id="page-title">
                {activeTab === 'dashboard' && t.adminTitle}
                {activeTab === 'exercises' && t.exercises}
                {activeTab === 'activities' && t.deviceSyncTitle}
                {activeTab === 'developer' && t.interactiveRest}
              </h2>
              <p className="sidebar-subtext text-[10px] sm:text-xs text-[#a1a1aa] hidden sm:block truncate max-w-xs sm:max-w-md">
                {activeTab === 'dashboard' && t.adminSubtitle}
                {activeTab === 'exercises' && t.exercisesSubtitle}
                {activeTab === 'activities' && t.activitiesSubtitle}
                {activeTab === 'developer' && t.developerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Search Bar for Exercises Tab */}
            {activeTab === 'exercises' && (
              <div className="relative">
                <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="bg-[#18181b] border border-[#27272a] text-white rounded-full pl-9 pr-3 py-1.5 text-xs w-24 sm:w-44 focus:w-32 focus:sm:w-64 transition-all duration-300 placeholder:text-[#a1a1aa]/60" 
                  id="search-input"
                />
              </div>
            )}

            {/* Language Selector Pill */}
            <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-xl p-1 gap-1" id="language-toggle">
              <button
                onClick={() => setLanguage('EN')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                  language === 'EN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
                title="English language option"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ID')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                  language === 'ID'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
                title="Indonesian language option"
              >
                ID
              </button>
            </div>

            {/* Simulated Server State */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-[11px] font-mono font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{t.onlineStatus}: 3000</span>
            </div>

            <button 
              onClick={() => {
                if (activeTab === 'exercises') {
                  resetForm();
                  setShowCreateModal(true);
                } else if (activeTab === 'activities') {
                  // Focus simulation widget
                  document.getElementById('mobile-simulation-widget')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  handleTabChange('exercises');
                  resetForm();
                  setShowCreateModal(true);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs p-2.5 sm:px-4 sm:py-2.5 rounded-xl transition-all font-semibold shadow-md shadow-emerald-600/10 hover:shadow-emerald-500/20 flex items-center gap-1.5 shrink-0"
              id="action-header-btn"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.createExercise}</span>
            </button>
          </div>
        </header>

        {/* CONTAINER AND WORKSPACE GRIDS */}
        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8" id="scrolling-content-space">
          
          {/* loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#a1a1aa] gap-3" id="loading-spinner">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm font-semibold tracking-wide font-mono text-emerald-400">CONNECTING TO KATEDA BACKEND...</p>
            </div>
          )}

          {/* TAB 1: DASHBOARD VIEW (With custom charts and widgets) */}
          {!loading && activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn" id="view-dashboard">
              {/* Specialized Interactive Stats Panel */}
              <StatsDashboard stats={stats} activities={activities} language={language} />

              {/* Bento Row: Secondary exercises analytics and telemetry logs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Exercises short catalog snapshot */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between" id="snapshot-exercises-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">Active Syllabus Coordinates</h4>
                      <p className="text-xs text-[#a1a1aa]">Latest training programs configured in Database.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('exercises')}
                      className="text-emerald-400 text-xs hover:underline flex items-center gap-0.5 justify-end"
                    >
                      <span>Manage catalog</span> <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-[#a1a1aa] font-bold tracking-wider border-b border-[#27272a] pb-2">
                          <th className="py-3 px-4">Exercise Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Steps</th>
                          <th className="py-3 px-4">Effort Rating</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-[#27272a]/30">
                        {exercises.slice(0, 4).map((ex) => (
                          <tr key={ex.id} className="hover:bg-zinc-800/20 transition-all font-medium">
                            <td className="py-3 px-4">
                              <span className="text-white block font-semibold">{ex.title}</span>
                              <span className="text-[9px] text-[#a1a1aa] uppercase tracking-wider font-mono">
                                {ex.katedaSpecific ? '⚡ OFFICIAL KATEDA TECHNIQUE' : 'KEEP_FIT STANDARD'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                ex.category === 'kateda' ? 'bg-orange-950/40 text-orange-400 border border-orange-500/20' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10'
                              }`}>
                                {ex.category === 'kateda' ? 'Central Power' : ex.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#a1a1aa] font-mono">{ex.steps.length} steps</td>
                            <td className="py-3 px-4 opacity-90">
                              {(() => {
                                const belt = getBeltInfo(ex.difficulty);
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-sans border font-bold ${belt.color}`}>
                                    {language === 'EN' ? belt.nameEN : belt.nameID}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={() => {
                                  handleLoadForEditing(ex);
                                }}
                                className="text-[#a1a1aa] hover:text-emerald-400 p-1 rounded hover:bg-[#27272a] transition-all ml-auto block"
                                title="Edit variables"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulated live API traffic feeds */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 flex flex-col justify-between" id="snapshot-live-feeds-card">
                  <div className="space-y-1 mb-4">
                    <h4 className="text-base font-bold text-white">Device Synchronization Log</h4>
                    <p className="text-xs text-[#a1a1aa]">Real-time client REST requests mapped to local DB.</p>
                  </div>

                  <div className="flex-1 space-y-4 max-h-56 overflow-y-auto scrollbar-none mb-4 pr-1">
                    {activities.slice(0, 4).map((act) => (
                      <div key={act.id} className="flex gap-3 border-b border-[#27272a]/20 pb-3 last:border-0 last:pb-0 font-medium">
                        <img 
                          src={act.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80"}
                          alt={act.userName}
                          className="w-8 h-8 rounded-full border border-[#27272a] shrink-0 object-cover mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white leading-tight font-bold truncate">
                            {act.userName} <span className="font-normal text-[#a1a1aa]">completed</span>
                          </p>
                          <p className="text-[11px] text-emerald-400 font-semibold truncate mt-0.5">
                            {act.exerciseTitle}
                          </p>
                          <p className="text-[9px] text-[#a1a1aa] font-mono mt-1 flex items-center justify-between">
                            <span>{act.duration} mins • {act.caloriesBurned} kcal</span>
                            <span>{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-center text-xs text-[#a1a1aa] italic py-8">No workouts registered yet. Use Simulator tab!</p>
                    )}
                  </div>

                  <button 
                    onClick={() => setActiveTab('activities')}
                    className="w-full bg-[#27272a] hover:bg-[#27272a]/80 text-[#fafafa] rounded-xl py-2.5 text-xs font-semibold border border-[#27272a] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Launch Mobile Simulator</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: EXERCISES LIST CATALOG WITH ADD/EDIT AND AI GENERATOR */}
          {!loading && activeTab === 'exercises' && (
            <div className="space-y-6 animate-fadeIn" id="view-exercises">
              
              {/* Category Quick Filter Pill Bar */}
              <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
                <div className="flex items-center gap-2 overflow-x-auto pr-2">
                  <button
                    onClick={() => setActiveCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${activeCategoryFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-[#18181b] text-[#a1a1aa] hover:bg-zinc-800'}`}
                  >
                    All Exercises ({exercises.length})
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${activeCategoryFilter === cat.id ? 'bg-emerald-600 text-white' : 'bg-[#18181b] text-[#a1a1aa] hover:bg-zinc-800'}`}
                    >
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="bg-[#27272a] hover:bg-[#27272a]/80 text-emerald-400 border border-emerald-500/10 text-xs px-3.5 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Custom Workout</span>
                </button>
              </div>

              {/* Table of Exercises */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Left Side: Table of exercises (col-span-2) */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden xl:col-span-2 flex flex-col" id="exercises-dashboard-table">
                  <div className="p-6 border-b border-[#27272a] flex justify-between items-center bg-[#18181b]/50">
                    <h3 className="font-bold text-[#fafafa] flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Workout Catalog ({filteredExercises.length})</span>
                    </h3>
                    <p className="text-xs text-[#a1a1aa]">Searching active catalog database assets.</p>
                  </div>

                  <div className="overflow-x-auto flex-1 max-h-[640px]">
                    {/* PC/Tablet Table View */}
                    <table className="hidden sm:table w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-[#a1a1aa] font-bold tracking-wider border-b border-[#27272a] bg-zinc-950/20">
                          <th className="px-6 py-4">Exercise Name / Description</th>
                          <th className="px-6 py-4">Instruction steps</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Calories & Active Time</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-[#27272a]/30">
                        {filteredExercises.map((ex) => (
                          <tr 
                            key={ex.id}
                            onClick={() => {
                              setSelectedExercise(ex);
                              if (window.innerWidth < 1280) {
                                setTimeout(() => {
                                  document.getElementById('exercise-preview-card')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }
                            }}
                            className={`cursor-pointer transition-all ${selectedExercise?.id === ex.id ? 'bg-[#27272a]/30' : 'hover:bg-[#27272a]/10'}`}
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-white text-base leading-tight flex items-center gap-2">
                                {ex.title}
                                {ex.katedaSpecific && (
                                  <span className="px-1.5 py-0.5 bg-orange-950/60 border border-orange-500/20 text-orange-400 rounded text-[8px] font-mono tracking-widest font-black uppercase">
                                    KATEDA PUSAT
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#a1a1aa] line-clamp-2 mt-1 font-medium">{ex.description}</p>
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {ex.targetMuscles.map((muscle, index) => (
                                  <span key={index} className="px-1.5 py-0.5 bg-zinc-800/80 text-[#fafafa]/80 rounded text-[9px] font-mono font-bold">
                                    {muscle}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[#a1a1aa] font-medium font-mono text-center">
                              {ex.steps.length} steps
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${
                                ex.category === 'kateda' ? 'bg-orange-950/45 text-orange-400 border border-orange-500/20' : 'bg-emerald-950/45 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {ex.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-white font-semibold font-mono text-xs">{ex.calories} kcal</div>
                              <div className="text-[10px] text-[#a1a1aa] font-mono font-medium">{ex.duration} mins sequence</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-1 opacity-70 hover:opacity-100 justify-end transition-all" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => {
                                    handleLoadForEditing(ex);
                                  }}
                                  className="text-emerald-400 hover:text-white p-2 rounded-lg hover:bg-emerald-950/30 transition-all cursor-pointer"
                                  title="Edit details"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteExercise(ex.id, ex.title)}
                                  className="text-red-400 hover:text-white p-2 rounded-lg hover:bg-red-950/30 transition-all cursor-pointer"
                                  title="Remove Exercise"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredExercises.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-xs text-[#a1a1aa] italic">
                              No exercises match your filters. Switch categories or type a new query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Mobile Card List View */}
                    <div className="block sm:hidden divide-y divide-[#27272a]/35">
                      {filteredExercises.map((ex) => (
                        <div 
                          key={ex.id}
                          onClick={() => {
                            setSelectedExercise(ex);
                            setTimeout(() => {
                              document.getElementById('exercise-preview-card')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className={`p-4 space-y-3 cursor-pointer transition-all ${selectedExercise?.id === ex.id ? 'bg-[#27272a]/30' : 'active:bg-[#27272a]/10'}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="space-y-1">
                              <h4 className="text-white font-bold leading-tight text-sm">
                                {ex.title}
                              </h4>
                              {ex.katedaSpecific && (
                                <span className="inline-block px-1.5 py-0.5 bg-orange-950/60 border border-orange-500/20 text-orange-400 rounded text-[8px] font-mono font-bold tracking-widest uppercase">
                                  KATEDA PUSAT
                                </span>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest shrink-0 ${
                              ex.category === 'kateda' ? 'bg-orange-950/45 text-orange-400 border border-orange-500/20' : 'bg-emerald-950/45 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {ex.category}
                            </span>
                          </div>
                          
                          <p className="text-xs text-[#a1a1aa] line-clamp-2 font-medium">{ex.description}</p>
                          
                          <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-[#a1a1aa]">
                            <span className="font-semibold">{ex.steps.length} steps • {ex.duration}m • {ex.calories}cal</span>
                            <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => {
                                  handleLoadForEditing(ex);
                                }}
                                className="text-emerald-400 p-2 hover:text-white"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteExercise(ex.id, ex.title)}
                                className="text-red-400 p-2 hover:text-white"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredExercises.length === 0 && (
                        <div className="py-12 text-center text-xs text-[#a1a1aa] italic">
                          No exercises match your filters.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick Preview Detail Drawer */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 self-start space-y-6" id="exercise-preview-card">
                  {selectedExercise ? (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#a1a1aa] uppercase">
                          Exercise Blueprint Specs
                        </span>
                        <button 
                          onClick={() => setSelectedExercise(null)}
                          className="text-[#a1a1aa] hover:text-white p-1 rounded-full hover:bg-[#27272a] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Header visual banner */}
                      <div className="relative h-52 rounded-xl overflow-hidden bg-zinc-950 border border-[#27272a] flex flex-col justify-center items-center">
                        {selectedExercise.mediaType === 'youtube' || (selectedExercise.mediaUrl && (selectedExercise.mediaUrl.includes('youtube.com') || selectedExercise.mediaUrl.includes('youtu.be'))) ? (
                          <iframe 
                            src={getYoutubeEmbedUrl(selectedExercise.mediaUrl)}
                            title={selectedExercise.title}
                            className="w-full h-full border-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : selectedExercise.mediaType === 'video' ? (
                          <video 
                            src={selectedExercise.mediaUrl}
                            controls 
                            className="w-full h-full object-cover" 
                            muted 
                            loop 
                            playsInline 
                          />
                        ) : (selectedExercise.mediaType === 'slides' || (selectedExercise.mediaSlides && selectedExercise.mediaSlides.length > 0)) ? (
                          (() => {
                            const slideList = selectedExercise.mediaSlides && selectedExercise.mediaSlides.length > 0 
                              ? selectedExercise.mediaSlides 
                              : [selectedExercise.mediaUrl];
                            const activeIndex = practiceActive 
                              ? (activeStepIdx % slideList.length) 
                              : (currentSlideIdx % slideList.length);
                            return (
                              <div className="relative w-full h-full group">
                                <img 
                                  src={slideList[activeIndex]} 
                                  alt={`Slide ${activeIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as any).src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800"
                                  }}
                                />
                                <div className="absolute inset-x-0 top-3 px-3 flex justify-between items-center bg-black/50 py-1 text-[9px] font-mono text-[#a1a1aa] tracking-widest font-bold rounded-md mx-2">
                                  <span>SLIDE {activeIndex + 1} OF {slideList.length}</span>
                                  {practiceActive && <span className="text-emerald-400 font-bold">SYNCD TO WORKOUT STEP</span>}
                                </div>
                                {!practiceActive && slideList.length > 1 && (
                                  <div className="absolute inset-y-0 inset-x-0 flex justify-between items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentSlideIdx(prev => (prev - 1 + slideList.length) % slideList.length);
                                      }}
                                      className="p-1 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-900/90 text-white hover:bg-zinc-800 text-xs font-mono font-bold cursor-pointer"
                                    >
                                      &lt;
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentSlideIdx(prev => (prev + 1) % slideList.length);
                                      }}
                                      className="p-1 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-900/90 text-white hover:bg-zinc-800 text-xs font-mono font-bold cursor-pointer"
                                    >
                                      &gt;
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <img 
                            src={selectedExercise.mediaUrl} 
                            alt={selectedExercise.title}
                            className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                            onError={(e) => {
                              (e.target as any).src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800"
                            }}
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 to-transparent p-4 flex items-end justify-between pointer-events-none">
                          <span className="px-2 py-1 bg-zinc-950/85 border border-[#27272a] text-white rounded text-[9px] font-mono font-bold uppercase flex items-center gap-1.5 shadow-lg">
                            {selectedExercise.mediaType === 'video' ? <Video className="w-3 h-3 text-emerald-400" /> : selectedExercise.mediaType === 'youtube' ? <Video className="w-3 h-3 text-red-400" /> : selectedExercise.mediaType === 'slides' ? <Layers className="w-3 h-3 text-blue-400" /> : <ImageIcon className="w-3 h-3 text-emerald-400" />}
                            <span>{selectedExercise.mediaType?.toUpperCase() || 'IMAGE'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Info lines */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-lg font-bold text-white">{selectedExercise.title}</h4>
                        </div>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed font-medium">{selectedExercise.description}</p>
                      </div>

                      {/* Micro KPI table */}
                      <div className="grid grid-cols-3 gap-3 border-y border-[#27272a] py-3 text-center">
                        <div>
                          <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold">{language === 'EN' ? 'Belt Level' : 'Tingkatan Sabuk'}</p>
                          {(() => {
                            const belt = getBeltInfo(selectedExercise.difficulty);
                            return (
                              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] border font-sans font-bold ${belt.color}`}>
                                {language === 'EN' ? belt.nameEN : belt.nameID}
                              </span>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold">Duration</p>
                          <p className="text-xs text-white font-mono font-bold mt-0.5">{selectedExercise.duration} mins</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold">Calories</p>
                          <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">{selectedExercise.calories} kcal</p>
                        </div>
                      </div>

                      {/* Target muscles list */}
                      <div>
                        <h5 className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold select-none mb-2">Target Muscle Focus Groups</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedExercise.targetMuscles.map((muscle, idx) => (
                            <span key={idx} className="bg-zinc-800 text-white rounded-lg px-2 py-1 text-[11px] font-semibold border border-[#27272a]">
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Advanced Interactive Practice Sequencer HUD */}
                      <div className="bg-zinc-950 border border-emerald-500/10 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono tracking-wider">
                            <span className="relative flex h-2 w-2">
                              {isPlaying && practiceActive && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying && practiceActive ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                            </span>
                            PRACTICE REHEARSAL AGENT
                          </span>
                          
                          {/* Audio Mute Switch */}
                          <button 
                            onClick={() => {
                              const nextMuted = !isAudioMuted;
                              setIsAudioMuted(nextMuted);
                              if (!nextMuted) {
                                if (window.speechSynthesis) {
                                  window.speechSynthesis.cancel();
                                  window.speechSynthesis.speak(new SpeechSynthesisUtterance("Audio coach active."));
                                }
                              }
                            }}
                            className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded transition-colors ${
                              isAudioMuted ? 'text-zinc-500 hover:text-zinc-300' : 'text-emerald-400 bg-emerald-950/20'
                            }`}
                            title={isAudioMuted ? "Enable Voice Over Coach" : "Disable Voice Over Coach"}
                          >
                            {isAudioMuted ? '🔇 MUTE COACH' : '🔊 COACH ACTIVE'}
                          </button>
                        </div>

                        {practiceActive ? (
                          // Sequencer Active Layout
                          <div className="space-y-4">
                            {/* Running Step detail card */}
                            <div className="bg-zinc-900 border border-[#27272a] rounded-xl p-4 text-center space-y-2">
                              {/* Step Index badge and Loop label */}
                              <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-[#a1a1aa] font-bold">
                                <span>Step {activeStepIdx + 1} of {(selectedExercise.stepDetails || []).length}</span>
                                {['inhale', 'hold', 'exhale', 'rest'].includes(selectedExercise.stepDetails?.[activeStepIdx]?.type || '') && (
                                  <span className="bg-purple-950/40 text-purple-400 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono">
                                    Loop {activeLoopCount} / {selectedExercise.stepDetails?.[activeStepIdx]?.loops || 10}
                                  </span>
                                )}
                              </div>

                              {/* Action text */}
                              <h4 className="text-xs font-bold text-white transition-all leading-relaxed">
                                {selectedExercise.stepDetails?.[activeStepIdx]?.text || selectedExercise.steps[activeStepIdx]}
                              </h4>

                              {/* Hint / Coach cue in speech bubble */}
                              {selectedExercise.stepDetails?.[activeStepIdx]?.hint && (
                                <p className="text-[10px] text-emerald-400 italic bg-emerald-950/15 border border-emerald-500/10 py-1.5 px-3 rounded-lg inline-block text-center mt-1 font-medium">
                                  "{selectedExercise.stepDetails[activeStepIdx].hint}"
                                </p>
                              )}

                              {/* Countdown display */}
                              <div className="pt-2 flex items-center justify-center">
                                <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-zinc-800 bg-zinc-950/50 shadow-inner">
                                  {/* Pulsing visual core layer */}
                                  <div className={`absolute inset-1 rounded-full border border-emerald-500/10 transition-all ${
                                    isPlaying ? 'animate-pulse scale-105 bg-emerald-500/[0.02]' : ''
                                  }`} />
                                  <div className="text-center">
                                    <span className="block text-xl font-bold font-mono text-white leading-none">
                                      {String(secondsLeft).padStart(2, '0')}
                                    </span>
                                    <span className="text-[8px] font-mono text-[#a1a1aa] tracking-widest font-bold">SEC LEFT</span>
                                  </div>
                                </div>
                              </div>

                              {/* Step Type badge display */}
                              <div className="flex justify-center pt-1">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-bold ${
                                  selectedExercise.stepDetails?.[activeStepIdx]?.type === 'inhale' ? 'bg-blue-950/50 text-blue-400 border border-blue-500/25' :
                                  selectedExercise.stepDetails?.[activeStepIdx]?.type === 'hold' ? 'bg-orange-950/50 text-orange-400 border border-orange-500/25' :
                                  selectedExercise.stepDetails?.[activeStepIdx]?.type === 'exhale' ? 'bg-emerald-950/50 text-emerald-500 border border-emerald-500/25' :
                                  selectedExercise.stepDetails?.[activeStepIdx]?.type === 'rest' ? 'bg-zinc-800/40 text-zinc-400 border border-[#27272a]' :
                                  selectedExercise.stepDetails?.[activeStepIdx]?.type === 'static_hold' ? 'bg-purple-950/50 text-purple-400 border border-purple-500/25' :
                                  'bg-zinc-900 text-[#a1a1aa] border border-zinc-800'
                                }`}>
                                  STATE: {selectedExercise.stepDetails?.[activeStepIdx]?.type || 'Instruction'}
                                </span>
                              </div>

                              {/* Breathing Lung & Diaphragm Wave Visual Aid (lungWaveD) */}
                              {selectedExercise.lungWaveD && ['inhale', 'hold', 'exhale'].includes(selectedExercise.stepDetails?.[activeStepIdx]?.type || '') && (
                                <div className="p-3 bg-zinc-950/40 border border-[#27272a]/80 rounded-xl space-y-2 mt-2">
                                  <div className="flex items-center justify-between text-[8px] font-mono text-[#a1a1aa] font-bold uppercase tracking-wider">
                                    <span>LUNG STATUS</span>
                                    <span className="text-emerald-400 animate-pulse">
                                      {selectedExercise.stepDetails?.[activeStepIdx]?.type === 'inhale' ? 'Expanding Lungs' :
                                       selectedExercise.stepDetails?.[activeStepIdx]?.type === 'hold' ? 'Lock Core Power' :
                                       'Contracting Lungs'}
                                    </span>
                                  </div>
                                  <div className="relative h-14 w-full flex items-center justify-center overflow-hidden">
                                    {/* Waves animated nodes */}
                                    <div className="absolute inset-0 flex items-center justify-around px-6 opacity-35 select-none pointer-events-none">
                                      {[1, 2, 3, 4, 5].map((idx) => {
                                        return (
                                          <div 
                                            key={idx} 
                                            style={{
                                              height: selectedExercise.stepDetails?.[activeStepIdx]?.type === 'inhale' ? '40px' : 
                                                      selectedExercise.stepDetails?.[activeStepIdx]?.type === 'hold' ? '30px' : '12px',
                                              transition: "all 0.8s ease-in-out"
                                            }}
                                            className={`w-1.5 rounded-full ${
                                              selectedExercise.stepDetails?.[activeStepIdx]?.type === 'inhale' ? 'bg-blue-500' :
                                              selectedExercise.stepDetails?.[activeStepIdx]?.type === 'hold' ? 'bg-amber-500' :
                                              'bg-emerald-500'
                                            }`} 
                                          />
                                        );
                                      })}
                                    </div>
                                    {/* Pulse orb */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[8px] font-mono border font-bold transition-all duration-1000 ${
                                      selectedExercise.stepDetails?.[activeStepIdx]?.type === 'inhale' ? 'scale-125 bg-blue-500/20 border-blue-500 text-blue-400' :
                                      selectedExercise.stepDetails?.[activeStepIdx]?.type === 'hold' ? 'scale-110 bg-amber-500/25 border-amber-500 text-amber-300' :
                                      'scale-75 bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                    }`}>
                                      {selectedExercise.stepDetails?.[activeStepIdx]?.type === 'inhale' ? 'EXPAND' :
                                       selectedExercise.stepDetails?.[activeStepIdx]?.type === 'hold' ? 'LOCK' :
                                       'DROP'}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Runner control buttons */}
                            <div className="flex gap-2 text-[11px]">
                              <button 
                                onClick={() => {
                                  if (activeStepIdx > 0) {
                                    const prevIdx = activeStepIdx - 1;
                                    setActiveStepIdx(prevIdx);
                                    const details = selectedExercise.stepDetails || [];
                                    setSecondsLeft(details[prevIdx].duration || 15);
                                    speakCurrentStep(details[prevIdx], activeLoopCount);
                                  }
                                }}
                                disabled={activeStepIdx === 0}
                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-[#a1a1aa] hover:text-white border border-[#27272a] rounded-xl py-1.5 font-bold transition-colors disabled:opacity-50"
                              >
                                Prev
                              </button>

                              <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`flex-1 rounded-xl py-1.5 font-bold transition-colors ${
                                  isPlaying ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-[#3f3f46]' : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                }`}
                              >
                                {isPlaying ? '⏸️ Pause' : '▶️ Resume'}
                              </button>

                              <button 
                                onClick={handleStepCompletion}
                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-[#a1a1aa] hover:text-white border border-[#27272a] rounded-xl py-1.5 font-bold transition-colors"
                              >
                                Skip
                              </button>
                            </div>

                            <button 
                              onClick={() => {
                                setPracticeActive(false);
                                setIsPlaying(false);
                                if (window.speechSynthesis) window.speechSynthesis.cancel();
                              }}
                              className="w-full bg-red-950/20 hover:bg-red-950/30 text-red-400 border border-red-500/10 rounded-xl py-1.5 text-xs font-bold transition-colors"
                            >
                              Stop Practice Run
                            </button>
                          </div>
                        ) : (
                          // Idle Sequencer Launch Layout
                          <div className="space-y-3 text-center py-1">
                            <p className="text-[11px] text-[#a1a1aa] leading-relaxed font-semibold">
                              Test posture countdowns & repeating loop constraints with voice overs before sync to mobile.
                            </p>
                            
                            <button 
                              onClick={() => startPractice(selectedExercise)}
                              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl py-2 text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                            >
                              <span>▶️ Rehearse Timing Sequence</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* steps array checklist */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold select-none">Ordered Training Coordinates ({selectedExercise.steps.length})</h5>
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                          {selectedExercise.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-2.5 items-start bg-zinc-950/40 border border-[#27272a]/30 p-2.5 rounded-xl font-medium">
                              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5 font-bold">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-[#a1a1aa] leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button 
                          onClick={() => {
                            handleLoadForEditing(selectedExercise);
                          }}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-[#27272a] rounded-xl py-2.5 text-xs text-center font-semibold transition-all cursor-pointer"
                        >
                          Modify Parameters
                        </button>
                        <button 
                          onClick={() => handleDeleteExercise(selectedExercise.id, selectedExercise.title)}
                          className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/10 rounded-xl px-3 py-2.5 text-xs transition-all cursor-pointer flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#a1a1aa]" id="preview-no-exercise">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-[#a1a1aa]/60 mx-auto mb-4">
                        <Info className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">No Selection</p>
                      <p className="text-xs text-[#a1a1aa] mt-1 max-w-xs mx-auto font-medium">Click any exercise in the catalog table to preview its instruction steps, muscle guides, and asset cards.</p>
                      
                      <div className="mt-8 border border-dashed border-[#27272a]/80 p-4 rounded-xl text-left bg-zinc-950/20 space-y-2">
                        <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 uppercase">Pro Tip</span>
                        <p className="text-[11px] text-[#a1a1aa] font-medium italic">"Click 'New Custom Workout' to manually build professional breath control regimens and configure stamina posturing centered around Kateda rules."</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY WORKOUT MONITOR AND MOBILE API SIMULATOR */}
          {!loading && activeTab === 'activities' && (
            <div className="space-y-8 animate-fadeIn" id="view-activities">
              
              {/* Introduction bar */}
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#fafafa] flex items-center gap-1.5 font-sans">
                    <User className="text-emerald-400 w-5 h-5 shrink-0" />
                    <span>Real-time Mobile REST Synchronization Controller</span>
                  </h4>
                  <p className="text-xs text-[#a1a1aa] font-medium leading-relaxed max-w-2xl">This panel acts as the developer console for monitoring real device connections. When KeepFit mobile app users complete workouts on iOS or Android, their telemetry pushes to this API. Simulatethe call below!</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider font-mono">Mobile Node</div>
                    <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">HTTPS POST ACTIVE</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left side: Simulated Workout REST client POST tool */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 self-start flex flex-col justify-between" id="mobile-simulation-widget">
                  <div className="space-y-1 mb-5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-zinc-800 text-[#fafafa] border border-[#27272a] text-[9px] font-mono uppercase font-bold">POST Endpoint</span>
                      <span className="text-[10px] font-mono text-emerald-400">/api/activities</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1">Mobile REST Simulator client</h4>
                    <p className="text-xs text-[#a1a1aa]">Trigger a workout log callback to verify active state integration.</p>
                  </div>

                  <form onSubmit={handleSimulateWorkout} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">User Identifier</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="User ID" 
                          value={simFormData.userId}
                          onChange={(e) => setSimFormData(prev => ({ ...prev, userId: e.target.value }))}
                          required
                          className="bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-emerald-500"
                        />
                        <input 
                          type="text" 
                          placeholder="User Name" 
                          value={simFormData.userName}
                          onChange={(e) => setSimFormData(prev => ({ ...prev, userName: e.target.value }))}
                          required
                          className="bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Associated Workout Exercise</label>
                      <select 
                        value={simFormData.exerciseIndex}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          const chosen = exercises[idx % exercises.length];
                          if (chosen) {
                            setSimFormData(prev => ({
                              ...prev,
                              exerciseIndex: idx,
                              duration: String(chosen.duration),
                              calories: String(chosen.calories),
                              notes: `Successfully locked down: ${chosen.title} course steps.`
                            }));
                          } else {
                            setSimFormData(prev => ({ ...prev, exerciseIndex: idx }));
                          }
                        }}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {exercises.map((ex, i) => (
                          <option key={ex.id} value={i} className="bg-[#18181b]">
                            {ex.title} ({ex.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Workout Statistics telemetry</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="block text-[9px] text-[#a1a1aa] font-medium mb-0.5">Active Mins</span>
                          <input 
                            type="number" 
                            value={simFormData.duration}
                            onChange={(e) => setSimFormData(prev => ({ ...prev, duration: e.target.value }))}
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-xs text-white text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="block text-[9px] text-[#a1a1aa] font-medium mb-0.5">kcal Burn</span>
                          <input 
                            type="number" 
                            value={simFormData.calories}
                            onChange={(e) => setSimFormData(prev => ({ ...prev, calories: e.target.value }))}
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-xs text-white text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="block text-[9px] text-[#a1a1aa] font-medium mb-0.5">Avg BPM</span>
                          <input 
                            type="number" 
                            value={simFormData.heartRateAvg}
                            onChange={(e) => setSimFormData(prev => ({ ...prev, heartRateAvg: e.target.value }))}
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-xs text-white text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">User Personal Note / Feeling</label>
                      <textarea 
                        value={simFormData.notes}
                        onChange={(e) => setSimFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Core power aligned..."
                      ></textarea>
                    </div>

                    <button 
                      type="submit"
                      disabled={simulating || exercises.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
                    >
                      {simulating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pushing restful JSON body...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Transmit REST Callback payload</span>
                        </>
                      )}
                    </button>
                    
                    {simSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-center text-xs animate-fadeIn font-bold">
                        ✓ API Transaction registered securely! Graph updated.
                      </div>
                    )}
                  </form>
                </div>

                {/* Right side: Interactive activity log output list  */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between" id="activity-logs-dashboard">
                  <div className="space-y-1 mb-5">
                    <h4 className="text-base font-bold text-white">Live Activity Logs Monitor ({activities.length})</h4>
                    <p className="text-xs text-[#a1a1aa]">This is the core state store updated live by client sports integrations.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-[#a1a1aa] font-bold tracking-wider border-b border-[#27272a] bg-zinc-950/20">
                          <th className="px-4 py-3">Member Details</th>
                          <th className="px-4 py-3">Training Course Completed</th>
                          <th className="px-4 py-3 text-center">Calories & Heart Rate</th>
                          <th className="px-4 py-3 text-right">Handshake Date</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-[#27272a]/30">
                        {activities.map((act) => (
                          <tr key={act.id} className="hover:bg-zinc-800/10 font-medium">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <img 
                                  src={act.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80"}
                                  alt={act.userName}
                                  className="w-8 h-8 rounded-full border border-[#27272a] object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="text-white font-bold leading-tight truncate">{act.userName}</p>
                                  <p className="text-[9px] text-[#a1a1aa] font-mono tracking-wider font-semibold uppercase">{act.userId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              <span className="text-white block font-bold leading-normal truncate max-w-xs">{act.exerciseTitle}</span>
                              {act.notes && (
                                <p className="text-[10px] text-[#a1a1aa] font-medium italic truncate max-w-xs mt-0.5">"{act.notes}"</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="text-white font-mono font-bold">{act.caloriesBurned} kcal</div>
                              <div className="text-[10px] text-[#a1a1aa] font-mono mt-0.5">{act.duration} active mins</div>
                              {act.heartRateAvg && (
                                <span className="inline-block px-1.5 py-0.5 bg-red-950/20 text-red-400 rounded text-[9px] font-mono font-bold mt-1">
                                  ♥ {act.heartRateAvg} BPM
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-[#a1a1aa] font-mono">
                              <div>{new Date(act.timestamp).toLocaleDateString()}</div>
                              <div className="text-[10px] mt-0.5">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {!loading && activeTab === 'developer' && (
            <DeveloperTab 
              onAddLog={addLog} 
              onRefreshAllData={loadSystemData} 
              beltLevels={beltLevels}
              onSaveBeltLevels={async (belts) => {
                await saveBeltLevels(belts);
                await loadSystemData();
              }}
              exercises={exercises}
            />
          )}



        </div>
      </main>

      {/* DETAILED INTERACTIVE POPUP MODAL (Add/Edit Exercise with Gemini AI helper) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn" id="create-exercise-modal">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  <span>{formData.id ? 'Modify Exercise Parameter' : 'Design Custom Workout'}</span>
                </h3>
                <p className="text-xs text-[#a1a1aa]">Configure training coordinates and active parameters manually.</p>
              </div>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-[#a1a1aa] hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors pointer-cursor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config Form */}
            <form onSubmit={handleSaveExercise} className="space-y-4 text-xs font-medium">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Training Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Iron Forearm Deflection"
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    required
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Catalog Category focus *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="kateda" className="bg-[#18181b]">Kateda Central Power (Internal Stances)</option>
                    <option value="strength" className="bg-[#18181b]">Strength & Muscle Power</option>
                    <option value="cardio" className="bg-[#18181b]">Cardio & Conditioning</option>
                    <option value="mobility" className="bg-[#18181b]">Joint Release & Flexibility</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Physiological Description *</label>
                <textarea 
                  rows={2}
                  placeholder="Explain stance anatomy, breathing, tensing variables..."
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">{language === 'EN' ? 'Belt Level' : 'Tingkatan Sabuk'}</label>
                  <select 
                    value={formData.difficulty}
                    onChange={(e) => setFormData(p => ({ ...p, difficulty: e.target.value as any }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-white text-xs cursor-pointer focus:border-orange-500/50 focus:outline-none"
                  >
                    {beltLevels.map(belt => (
                      <option key={belt.id} value={belt.id} className="bg-[#09090b] text-white">
                        {language === 'EN' ? belt.nameEN : belt.nameID}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Duration (Min)</label>
                  <input 
                    type="number" 
                    value={formData.duration}
                    onChange={(e) => setFormData(p => ({ ...p, duration: Number(e.target.value) }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Calories (Estimated)</label>
                  <input 
                    type="number" 
                    value={formData.calories}
                    onChange={(e) => setFormData(p => ({ ...p, calories: Number(e.target.value) }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-white text-center font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="inline-flex items-center gap-2 py-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={formData.katedaSpecific}
                      onChange={(e) => setFormData(p => ({ ...p, katedaSpecific: e.target.checked }))}
                      className="rounded border-[#27272a] bg-zinc-950 text-emerald-500 font-mono focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Kateda Official?</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Media Asset Format</label>
                  <select 
                    value={formData.mediaType || 'image'}
                    onChange={(e) => setFormData(p => ({ ...p, mediaType: e.target.value as any }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="image">Static JPG/PNG Image</option>
                    <option value="video">Direct MP4 Video Clip</option>
                    <option value="youtube">Embedded YouTube Link</option>
                    <option value="slides">Image Slideshow Deck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Primary Media URL / Video Link</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/photo-... or YouTube link"
                    value={formData.mediaUrl || ''}
                    onChange={(e) => setFormData(p => ({ ...p, mediaUrl: e.target.value }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Muscle Focus Groups (CSV)</label>
                  <input 
                    type="text" 
                    placeholder="Abdominals, Lower Back, Quadriceps"
                    value={formData.targetMuscles?.join(', ') || ''}
                    onChange={(e) => setFormData(p => ({ ...p, targetMuscles: e.target.value.split(',').map(s => s.trim()) }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Optional Deck of Slides */}
              {(formData.mediaType === 'slides' || (formData.mediaSlides && formData.mediaSlides.length > 0)) && (
                <div className="p-3 bg-blue-950/10 border border-blue-500/15 rounded-xl space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-mono uppercase text-blue-400 font-bold">Image Slideshow URLs (Comma Separated List)</label>
                  <input 
                    type="text" 
                    placeholder="https://img1.com, https://img2.com, https://img3.com"
                    value={formData.mediaSlides?.join(', ') || ''}
                    onChange={(e) => setFormData(p => ({ ...p, mediaSlides: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0) }))}
                    className="w-full bg-[#09090b] border border-blue-500/25 rounded-lg px-3 py-1.5 text-[#fff]"
                  />
                  <p className="text-[10px] text-[#a1a1aa] italic">Provides multiple diagrams for sequential steps. If active step exceeds count, slides will loop around.</p>
                </div>
              )}

              {/* Extended KeepFit Exercise Custom Configuration Parameters */}
              <div className="bg-zinc-900/60 p-4 border border-[#27272a] rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Overall Exercise Cycles (Loops)</label>
                  <input 
                    type="number" 
                    value={formData.loops !== undefined ? formData.loops : 5}
                    onChange={(e) => setFormData(p => ({ ...p, loops: Math.max(1, Number(e.target.value) || 5) }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-white text-center font-mono font-bold"
                  />
                  <p className="text-[9px] text-[#a1a1aa] mt-1">Default repeat loop iterations for cyclical components.</p>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={formData.vocalGuide !== false}
                      onChange={(e) => setFormData(p => ({ ...p, vocalGuide: e.target.checked }))}
                      className="rounded border-[#27272a] bg-zinc-950 text-emerald-500 font-mono focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Enable Voice Over Coach?</span>
                  </label>
                  <p className="text-[9px] text-[#a1a1aa] mt-1 pl-6">Announce training cue steps via speechSynthesis engine.</p>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={formData.lungWaveD !== false}
                      onChange={(e) => setFormData(p => ({ ...p, lungWaveD: e.target.checked }))}
                      className="rounded border-[#27272a] bg-zinc-950 text-emerald-500 font-mono focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Lung Wave Diagram Aid?</span>
                  </label>
                  <p className="text-[9px] text-[#a1a1aa] mt-1 pl-6">Toggle live expansion/contraction visualizer graphics during workout.</p>
                </div>
              </div>

              {/* Dynamic steps entry fields with advanced Timing & Breath Cues */}
              <div className="space-y-4">
                <label className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-[#a1a1aa]">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Chronological Steps, Timers & Coaching Cues *</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={addStepRow}
                    className="text-emerald-400 hover:text-white capitalize flex items-center gap-0.5"
                  >
                    + Add Sequence Step
                  </button>
                </label>
                
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {(formData.stepDetails || []).map((detail, idx) => (
                    <div key={idx} className="bg-zinc-950/80 border border-[#27272a] rounded-xl p-3.5 space-y-3 relative group">
                      
                      {/* Step Header */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/20 flex items-center justify-center text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase text-[#a1a1aa]">SEQUENCE COORDINATE</span>
                        </div>
                        {formData.stepDetails && formData.stepDetails.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeStepRow(idx)}
                            className="text-red-400 hover:text-white hover:bg-zinc-800 px-2 py-0.5 rounded-lg transition-colors text-[10px] font-bold"
                          >
                            Remove Step
                          </button>
                        )}
                      </div>

                      {/* Main step instruction statement */}
                      <div>
                        <input 
                          type="text" 
                          value={detail.text || ''}
                          placeholder={`Step ${idx + 1} action description (e.g. "Inhale slowly through your nose for 4 seconds...")`}
                          onChange={(e) => updateStepRow(idx, { text: e.target.value })}
                          required
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Step secondary timing details parameters */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#a1a1aa] mb-1">State Type</label>
                          <select 
                            value={detail.type || 'instruction'}
                            onChange={(e) => updateStepRow(idx, { type: e.target.value as any })}
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1.5 text-white"
                          >
                            <option value="instruction">Instruction</option>
                            <option value="action">Active Exercise</option>
                            <option value="static_hold">Stance Hold</option>
                            <option value="inhale">🌬️ Inhale</option>
                            <option value="hold">🛑 Breath Hold</option>
                            <option value="exhale">💨 Exhale</option>
                            <option value="rest">🧘 Post-Lock Rest</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#a1a1aa] mb-1">Duration (Sec)</label>
                          <input 
                            type="number" 
                            value={detail.duration || 15}
                            onChange={(e) => updateStepRow(idx, { duration: Math.max(1, Number(e.target.value)) })}
                            required
                            placeholder="Seconds"
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1 text-center text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#a1a1aa] mb-1">Verbal hint</label>
                          <input 
                            type="text" 
                            value={detail.hint || ''}
                            placeholder="Squeeze core tight!"
                            onChange={(e) => updateStepRow(idx, { hint: e.target.value })}
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#fafafa] font-bold mb-1">📣 TTS Speech Command</label>
                          <input 
                            type="text" 
                            value={detail.ttsCommand || ''}
                            placeholder="e.g. Inhale deeply."
                            onChange={(e) => updateStepRow(idx, { ttsCommand: e.target.value })}
                            className="w-full bg-[#09090b] border border-amber-500/20 rounded-lg px-2 py-1 text-amber-300 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Optional loops count render if the step is breathing related */}
                      {['inhale', 'hold', 'exhale', 'rest'].includes(detail.type || '') && (
                        <div className="flex items-center gap-3 bg-purple-950/10 border border-purple-500/15 p-2 rounded-lg text-[10px]">
                          <span className="text-purple-400 font-bold font-mono">🔁 Repetition loops repeat count:</span>
                          <input 
                            type="number" 
                            value={detail.loops || 10}
                            onChange={(e) => updateStepRow(idx, { loops: Math.max(1, Number(e.target.value)) })}
                            className="w-16 bg-[#09090b] border border-[#27272a] rounded text-center text-white text-[10px] font-mono"
                          />
                          <span className="text-[#a1a1aa] italic">Cycles this sequence back to inhale upon completion.</span>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>

              {/* Save/Submit triggers */}
              <div className="flex gap-3 justify-end pt-4 border-t border-[#27272a]">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-[#fafafa] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Discard parameters
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-6 py-2.5 text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  Confirm & Sync DB
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
