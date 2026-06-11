import { useState, useEffect, FormEvent } from 'react';
import { 
  Dumbbell, 
  Activity, 
  HeartPulse, 
  Flame, 
  Clock, 
  Plus, 
  PlusCircle,
  CheckSquare,
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
  Users,
  UserPlus,
  Database, 
  ArrowRight,
  BookOpen,
  Info,
  Menu,
  Footprints,
  Calendar
} from 'lucide-react';
import { Exercise, Category, Activity as ActivityType, KeepFitStats, BELT_LEVELS, BeltLevel, BeltLevelInfo, Member, DailyStepLog } from './types';
import { KatedaStepDiagram } from './components/KatedaStepDiagram';
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
  saveBeltLevels,
  getMembers,
  addMember,
  updateMember,
  deleteMember,
  getDailyStepLogs,
  addOrUpdateDailyStepLog,
  deleteDailyStepLog
} from './db';

export default function App() {
  // Localization State
  const [language, setLanguage] = useState<'EN' | 'ID'>('ID');
  const t = translations[language];

  // Dynamic Belt levels from DB
  const [beltLevels, setBeltLevels] = useState<BeltLevelInfo[]>([]);

  const getBeltInfo = (difficulty: any) => {
    const diffNum = Number(difficulty);
    if (!isNaN(diffNum) && difficulty !== null && difficulty !== undefined && String(difficulty).trim() !== '') {
      const info = beltLevels.find(b => Number(b.id) === diffNum);
      if (info) return info;
      const staticInfo = BELT_LEVELS.find(b => Number(b.id) === diffNum);
      if (staticInfo) return staticInfo;
    }

    // Try string comparison fallback
    const levelStr = String(difficulty || '').toLowerCase().trim();
    const infoByStr = beltLevels.find(b => String(b.id).toLowerCase() === levelStr);
    if (infoByStr) return infoByStr;
    const staticInfoByStr = BELT_LEVELS.find(b => String(b.id).toLowerCase() === levelStr);
    if (staticInfoByStr) return staticInfoByStr;

    // Direct translation comparison fallback
    const infoByName = beltLevels.find(b => b.nameEN.toLowerCase() === levelStr || b.nameID.toLowerCase() === levelStr);
    if (infoByName) return infoByName;
    const staticInfoByName = BELT_LEVELS.find(b => b.nameEN.toLowerCase() === levelStr || b.nameID.toLowerCase() === levelStr);
    if (staticInfoByName) return staticInfoByName;

    // Fallbacks for beginner, intermediate, advanced or legacy string keys
    if (levelStr === 'beginner' || levelStr === 'sabuk putih') return BELT_LEVELS[0];
    if (levelStr === 'intermediate' || levelStr === 'sabuk kuning') return BELT_LEVELS[1];
    if (levelStr === 'advanced' || levelStr === 'sabuk coklat') return BELT_LEVELS[4];

    // Default to white belt (id: 1)
    return BELT_LEVELS[0];
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exercises' | 'activities' | 'members' | 'developer'>('dashboard');
  const [activitiesSubTab, setActivitiesSubTab] = useState<'workouts' | 'steps'>('workouts');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleTabChange = (tab: 'dashboard' | 'exercises' | 'activities' | 'members' | 'developer') => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Backend Synchronized States
  const [rawExercises, setRawExercises] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [dailyStepLogs, setDailyStepLogs] = useState<DailyStepLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<KeepFitStats>({
    totalExercises: 0,
    totalActivities: 0,
    totalBurnedCalories: 0,
    totalActiveTime: 0,
    activeUsersCount: 0
  });

  const getCategoryName = (id: string): string => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return id;
    return language === 'EN' ? cat.nameEN : cat.nameID;
  };

  const getCategoryBadgeStyle = (id: string): string => {
    switch (id) {
      case 'jurus':
        return 'bg-orange-950/45 text-orange-400 border border-orange-500/20';
      case 'pernapasan':
        return 'bg-teal-950/45 text-teal-400 border border-teal-500/20';
      case 'exercise':
        return 'bg-emerald-950/45 text-emerald-400 border border-emerald-500/20';
      case 'isometrik':
        return 'bg-indigo-950/45 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-zinc-950/45 text-[#a1a1aa] border border-[#27272a]/40';
    }
  };

  // UI States
  const [loading, setLoading] = useState(true);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseMediaTab, setExerciseMediaTab] = useState<'slides' | 'video'>('slides');

  useEffect(() => {
    if (selectedExercise) {
      const slidesFromField = (selectedExercise.mediaSlides || selectedExercise.slidesUrl || []).filter(Boolean);
      const hasSlides = slidesFromField.length > 0 || (selectedExercise.stepDetails && selectedExercise.stepDetails.length > 0);
      const hasVideo = selectedExercise.mediaUrl && (
        selectedExercise.mediaUrl.includes('youtube.com') || 
        selectedExercise.mediaUrl.includes('youtu.be') || 
        selectedExercise.mediaUrl.endsWith('.mp4') || 
        selectedExercise.mediaUrl.includes('.mp4?') ||
        selectedExercise.mediaType === 'video' ||
        selectedExercise.mediaType === 'youtube'
      );
      if (hasSlides) {
        setExerciseMediaTab('slides');
      } else if (hasVideo) {
        setExerciseMediaTab('video');
      } else {
        setExerciseMediaTab('slides');
      }
    }
  }, [selectedExercise?.id]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Custom Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Members States
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilterBelt, setMemberFilterBelt] = useState<string>('all');
  const [memberFilterStatus, setMemberFilterStatus] = useState<string>('all');
  const [memberFormData, setMemberFormData] = useState({
    id: undefined as string | undefined,
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    beltLevel: 1,
    birthDate: '1998-01-01',
    joinedDate: new Date().toISOString().split('T')[0],
    phoneNumber: '',
    height: 170,
    weight: 65,
    status: 'active' as 'active' | 'inactive',
    notes: '',
    avatar: undefined as string | undefined
  });
  
  // Form States (AI components removed for client-only operation)
  const [formData, setFormData] = useState<Partial<Exercise>>({
    title: '',
    category: 'jurus',
    difficulty: 1,
    duration: 15,
    calories: 120,
    description: '',
    steps: [''],
    stepDetails: [{ text: '', duration: 0, type: 'instruction', hint: '', loops: 1, ttsCommand: '', unit: 'none', waitForTTS: true }],
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

  // Trainer Administrative session log overridden state variables
  const [useRegisteredMember, setUseRegisteredMember] = useState<boolean>(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [manualPractitionerName, setManualPractitionerName] = useState<string>('');
  const [sessionDateTime, setSessionDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [achievedUnitsQty, setAchievedUnitsQty] = useState<string>('');

  // Daily Steps Form States
  const [stepMemberId, setStepMemberId] = useState<string>('');
  const [stepDate, setStepDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stepCount, setStepCount] = useState<string>('');
  const [stepSaving, setStepSaving] = useState<boolean>(false);

  // Mobile Workout simulator inputs
  const [simFormData, setSimFormData] = useState({
    userId: 'user-' + Math.floor(100 + Math.random() * 900),
    userName: 'John Doe',
    exerciseIndex: 0,
    duration: '20',
    calories: '180',
    notes: 'Class performance notes: Great focus, central power breathing was locked in.',
    heartRateAvg: '132'
  });
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);

  // Interactive REST API Sandbox state removed so that data queries handshake directly with live Supabase.


  // Status/Error logs
  const [sysLogs, setSysLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warn' | 'api' }[]>([
    { time: '11:33:20', msg: 'System online. Strictly using Supabase cloud DB connection.', type: 'info' },
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
      const [exList, catList, actList, statTotals, beltList, memberList, stepsList] = await Promise.all([
        getExercises(),
        getCategories(),
        getActivities(),
        getStats(),
        getBeltLevels(),
        getMembers(),
        getDailyStepLogs()
      ]);

      setRawExercises(exList);
      setCategories(catList);
      setActivities(actList);
      setStats(statTotals);
      setBeltLevels(beltList);
      setMembers(memberList);
      setDailyStepLogs(stepsList);
      if (memberList.length > 0) {
        setSelectedMemberId(memberList[0].id);
        setStepMemberId(memberList[0].id);
      }

      addLog(`Synchronized active databases. Loaded ${exList.length} exercises, ${beltList.length} belt levels, ${memberList.length} members, ${actList.length} activities, and ${stepsList.length} daily steps.`, 'success');
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

  // Synchronize translated viewports of active exercises on language change
  useEffect(() => {
    const mapped = rawExercises.map(ex => ({
      ...ex,
      title: language === 'EN' ? (ex.titleEN || ex.title || '') : (ex.titleID || ex.title || ''),
      description: language === 'EN' ? (ex.descriptionEN || ex.description || '') : (ex.descriptionID || ex.description || ''),
      steps: language === 'EN' ? (ex.stepsEN || ex.steps || []) : (ex.stepsID || ex.steps || []),
      stepDetails: language === 'EN' ? (ex.stepDetailsEN || ex.stepDetails || []) : (ex.stepDetailsID || ex.stepDetails || [])
    }));
    setExercises(mapped);

    if (selectedExercise) {
      const activeMatch = mapped.find(ex => ex.id === selectedExercise.id);
      if (activeMatch) {
        setSelectedExercise(activeMatch);
      }
    }
  }, [language, rawExercises]);

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
      const currentList = [...rawExercises];
      const filteredSteps = formData.steps?.filter(s => s.trim() !== '') || [];
      
      const rawStepDetails = formData.stepDetails || [];
      const sanitizedStepDetails = rawStepDetails.map((detail, idx) => {
        const type = detail.type || 'instruction';
        const unit = type === 'instruction' ? 'none' : (detail.unit || 'seconds');
        const duration = unit === 'none' ? 0 : (unit === 'seconds' ? (detail.duration !== undefined ? Number(detail.duration) : 15) : 0);
        const quantity = (unit !== 'none' && unit !== 'seconds') ? (detail.quantity !== undefined ? Number(detail.quantity) : 10) : undefined;
        const loops = ['inhale', 'hold', 'exhale', 'rest'].includes(type) ? (detail.loops !== undefined ? Number(detail.loops) : 5) : undefined;
        const ttsCommand = detail.ttsCommand || detail.text || '';
        const waitForTTS = detail.waitForTTS !== false;

        return {
          text: detail.text || '',
          hint: detail.hint || '',
          type,
          unit,
          duration,
          quantity,
          loops,
          ttsCommand,
          waitForTTS
        };
      });

      let savedElement: Exercise;
      if (formData.id) {
        // Edit mode
        const index = currentList.findIndex(item => item.id === formData.id);
        if (index === -1) {
          addLog('Exercise not found.', 'warn');
          return;
        }
        const prevEx = currentList[index];
        const computedMediaType = (url: string) => {
          if (formData.mediaSlides && formData.mediaSlides.length > 0) return 'slides';
          if (!url) return 'image';
          if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
          if (url.endsWith('.mp4') || url.includes('.mp4?')) return 'video';
          return 'image';
        };
        const finalUnit = formData.targetUnit || 'minutes';
        const finalVal = formData.targetValue !== undefined ? Number(formData.targetValue) : 15;
        const finalDuration = finalUnit === 'minutes' ? finalVal : 0;

        const mediaInputUrl = String(formData.mediaUrl || '');
        const isVideoInput = mediaInputUrl.includes('youtube.com') || mediaInputUrl.includes('youtu.be') || mediaInputUrl.endsWith('.mp4') || mediaInputUrl.includes('.mp4?');

        savedElement = {
          ...prevEx,
          ...formData,
          titleEN: language === 'EN' ? String(formData.title) : (prevEx.titleEN || prevEx.title || String(formData.title)),
          titleID: language === 'ID' ? String(formData.title) : (prevEx.titleID || prevEx.title || String(formData.title)),
          descriptionEN: language === 'EN' ? String(formData.description) : (prevEx.descriptionEN || prevEx.description || String(formData.description)),
          descriptionID: language === 'ID' ? String(formData.description) : (prevEx.descriptionID || prevEx.description || String(formData.description)),
          stepsEN: language === 'EN' ? filteredSteps : (prevEx.stepsEN || prevEx.steps || filteredSteps),
          stepsID: language === 'ID' ? filteredSteps : (prevEx.stepsID || prevEx.steps || filteredSteps),
          stepDetailsEN: language === 'EN' ? sanitizedStepDetails : (prevEx.stepDetailsEN || prevEx.stepDetails || sanitizedStepDetails),
          stepDetailsID: language === 'ID' ? sanitizedStepDetails : (prevEx.stepDetailsID || prevEx.stepDetails || sanitizedStepDetails),
          mediaType: computedMediaType(formData.mediaUrl || ''),
          videoUrl: isVideoInput ? mediaInputUrl : '',
          slidesUrl: formData.mediaSlides || [],
          targetUnit: finalUnit,
          targetValue: finalVal,
          duration: finalDuration,
          updatedAt: new Date().toISOString()
        } as Exercise;
        currentList[index] = savedElement;
        addLog(`Exercise updated successfully: "${savedElement.title}"`, 'success');
      } else {
        // Create mode
        const exId = `ex-${Date.now()}`;
        const computedMediaType = (url: string) => {
          if (formData.mediaSlides && formData.mediaSlides.length > 0) return 'slides';
          if (!url) return 'image';
          if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
          if (url.endsWith('.mp4') || url.includes('.mp4?')) return 'video';
          return 'image';
        };

        const finalUnit = formData.targetUnit || 'minutes';
        const finalVal = formData.targetValue !== undefined ? Number(formData.targetValue) : 15;
        const finalDuration = finalUnit === 'minutes' ? finalVal : 0;

        savedElement = {
          id: exId,
          title: String(formData.title),
          titleEN: String(formData.title),
          titleID: String(formData.title),
          category: String(formData.category),
          difficulty: formData.difficulty !== undefined ? formData.difficulty : 1,
          duration: finalDuration,
          calories: Number(formData.calories) || 120,
          description: String(formData.description),
          descriptionEN: String(formData.description),
          descriptionID: String(formData.description),
          steps: filteredSteps,
          stepsEN: filteredSteps,
          stepsID: filteredSteps,
          stepDetailsEN: sanitizedStepDetails,
          stepDetailsID: sanitizedStepDetails,
          mediaType: computedMediaType(formData.mediaUrl || ''),
          mediaUrl: String(formData.mediaUrl || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800'),
          mediaSlides: formData.mediaSlides || [],
          videoUrl: (formData.mediaUrl && (formData.mediaUrl.includes('youtube.com') || formData.mediaUrl.includes('youtu.be') || formData.mediaUrl.endsWith('.mp4') || formData.mediaUrl.includes('.mp4?'))) ? formData.mediaUrl : '',
          slidesUrl: formData.mediaSlides || [],
          loops: formData.loops || 5,
          vocalGuide: true,
          lungWaveD: true,
          targetMuscles: formData.targetMuscles || [],
          katedaSpecific: false,
          targetUnit: finalUnit,
          targetValue: finalVal,
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
  const handleDeleteExercise = (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: language === 'EN' ? 'Delete Exercise' : 'Hapus Latihan',
      message: language === 'EN' ? `Are you sure you want to delete the exercise "${name}" from KeepFit API catalog? This will unsync this ID from mobile catalog.` : `Apakah Anda yakin ingin menghapus latihan "${name}" dari katalog KeepFit? Tindakan ini akan menghapus ID ini dari katalog seluler.`,
      onConfirm: async () => {
        try {
          const filtered = rawExercises.filter(item => item.id !== id);
          await saveExercises(filtered);
          addLog(language === 'EN' ? `Deleted "${name}" successfully` : `Berhasil menghapus "${name}"`, 'success');
          if (selectedExercise?.id === id) setSelectedExercise(null);
          loadSystemData();
        } catch (e) {
          addLog('Error invoking delete pipeline', 'warn');
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Save member
  const handleSaveMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!memberFormData.fullName.trim()) {
      addLog('Validation failed. Member name cannot be blank.', 'warn');
      return;
    }

    try {
      const isEdit = !!memberFormData.id;
      let targetMember: Member;

      if (isEdit) {
        targetMember = {
          id: memberFormData.id!,
          fullName: memberFormData.fullName.trim(),
          gender: memberFormData.gender,
          beltLevel: Number(memberFormData.beltLevel) || 1,
          birthDate: memberFormData.birthDate,
          joinedDate: memberFormData.joinedDate,
          phoneNumber: memberFormData.phoneNumber || '',
          height: Number(memberFormData.height) || 0,
          weight: Number(memberFormData.weight) || 0,
          status: memberFormData.status,
          notes: memberFormData.notes || '',
          avatar: memberFormData.avatar || undefined
        };
        await updateMember(targetMember);
        addLog(`Updated Kateda practitioner profile: "${targetMember.fullName}" successfully`, 'success');
      } else {
        const newMemId = 'mem-' + Date.now();
        targetMember = {
          id: newMemId,
          fullName: memberFormData.fullName.trim(),
          gender: memberFormData.gender,
          beltLevel: Number(memberFormData.beltLevel) || 1,
          birthDate: memberFormData.birthDate,
          joinedDate: memberFormData.joinedDate,
          phoneNumber: memberFormData.phoneNumber || '',
          height: Number(memberFormData.height) || 0,
          weight: Number(memberFormData.weight) || 0,
          status: memberFormData.status,
          notes: memberFormData.notes || '',
          avatar: memberFormData.avatar || undefined
        };
        await addMember(targetMember);
        
        const hM = targetMember.height / 100;
        const computedBmi = hM > 0 ? (targetMember.weight / (hM * hM)).toFixed(1) : '0.0';
        addLog(`Registered Kateda practitioner successfully: "${targetMember.fullName}" with automatic dynamic BMI of ${computedBmi}`, 'success');
      }
      
      setShowMemberModal(false);
      // Reset form to defaults
      setMemberFormData({
        id: undefined,
        fullName: '',
        gender: 'Male',
        beltLevel: 1,
        birthDate: '1998-01-01',
        joinedDate: new Date().toISOString().split('T')[0],
        phoneNumber: '',
        height: 170,
        weight: 65,
        status: 'active',
        notes: '',
        avatar: undefined
      });
      loadSystemData();
    } catch (err) {
      addLog('Error writing member to DB', 'warn');
    }
  };

  const handleEditMember = (member: Member) => {
    setMemberFormData({
      id: member.id,
      fullName: member.fullName,
      gender: member.gender,
      beltLevel: member.beltLevel,
      birthDate: member.birthDate,
      joinedDate: member.joinedDate,
      phoneNumber: member.phoneNumber || '',
      height: member.height,
      weight: member.weight,
      status: member.status,
      notes: member.notes || '',
      avatar: member.avatar
    });
    setShowMemberModal(true);
  };

  const handleOpenAddMemberModal = () => {
    setMemberFormData({
      id: undefined,
      fullName: '',
      gender: 'Male',
      beltLevel: 1,
      birthDate: '1998-01-01',
      joinedDate: new Date().toISOString().split('T')[0],
      phoneNumber: '',
      height: 170,
      weight: 65,
      status: 'active',
      notes: '',
      avatar: undefined
    });
    setShowMemberModal(true);
  };

  // Delete member
  const handleDeleteMember = (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: language === 'EN' ? 'Delete Member' : 'Hapus Anggota',
      message: language === 'EN' ? `Are you sure you want to delete the member "${name}"? This is irreversible.` : `Apakah Anda yakin ingin menghapus anggota "${name}"? Tindakan ini bersifat permanen.`,
      onConfirm: async () => {
        try {
          await deleteMember(id);
          addLog(language === 'EN' ? `Deleted member successfully: "${name}"` : `Berhasil menghapus anggota: "${name}"`, 'success');
          loadSystemData();
        } catch (err) {
          addLog('Error deleting member from DB', 'warn');
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Reset exercise form
  const resetForm = () => {
    setFormData({
      title: '',
      category: 'jurus',
      difficulty: 1,
      duration: 15,
      calories: 120,
      description: '',
      steps: [''],
      stepDetails: [{ text: '', duration: 0, type: 'instruction', hint: '', loops: 1, ttsCommand: '', unit: 'none', waitForTTS: true }],
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
          const unit = type === 'instruction' ? 'none' as const : 'seconds' as const;
          return {
            text: s,
            duration: unit === 'none' ? 0 : duration,
            type,
            hint,
            unit,
            ttsCommand: s,
            waitForTTS: true,
            loops: ['inhale', 'hold', 'exhale', 'rest'].includes(type) ? 5 : undefined
          };
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
      duration: 0,
      type: 'instruction' as const,
      hint: '',
      unit: 'none' as const,
      ttsCommand: '',
      waitForTTS: true,
      loops: 1
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
        const isTimeBased = !stepObj.unit || stepObj.unit === 'seconds';
        let customGoalPhrase = '';
        if (!isTimeBased && stepObj.quantity) {
          const unitWord = stepObj.unit === 'reps' ? 'repetitions' : 
                          stepObj.unit === 'steps' ? 'steps' : 
                          stepObj.unit === 'series' ? 'series' : 
                          stepObj.unit === 'cycles' ? 'cycles' : stepObj.unit || '';
          customGoalPhrase = `Goal: perform ${stepObj.quantity} ${unitWord}. `;
        }

        if (stepObj.type === 'inhale') {
          phrase = `Inhale. Loop ${loopNo}. ${customGoalPhrase}${stepObj.hint || 'Breathe in slowly.'}`;
        } else if (stepObj.type === 'hold') {
          phrase = `Hold. ${customGoalPhrase}${stepObj.hint || 'Lock breath and tense core.'}`;
        } else if (stepObj.type === 'exhale') {
          phrase = `Exhale. ${customGoalPhrase}${stepObj.hint || 'Breathe out hard.'}`;
        } else if (stepObj.type === 'rest') {
          phrase = `Rest. ${customGoalPhrase}${stepObj.hint || 'Breath rest.'}`;
        } else {
          phrase = `${customGoalPhrase}${stepObj.text}. ${stepObj.hint || ''}`;
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
    
    const firstStep = details[0];
    const isFirstTimeBased = !firstStep || !firstStep.unit || firstStep.unit === 'seconds';
    setSecondsLeft(isFirstTimeBased ? (firstStep.duration || 15) : 0);
    speakCurrentStep(firstStep, 1);
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
        const isNextStepTimeBased = !nextStep || !nextStep.unit || nextStep.unit === 'seconds';
        setSecondsLeft(isNextStepTimeBased ? (nextStep.duration || 15) : 0);
        speakCurrentStep(nextStep, activeLoopCount + 1);
        return;
      }
    }

    if (activeStepIdx < details.length - 1) {
      const nextIdx = activeStepIdx + 1;
      setActiveStepIdx(nextIdx);
      const nextStep = details[nextIdx];
      const isNextStepTimeBased = !nextStep || !nextStep.unit || nextStep.unit === 'seconds';
      setSecondsLeft(isNextStepTimeBased ? (nextStep.duration || 15) : 0);
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
        const details = selectedExercise?.stepDetails || [];
        const currentStep = details[activeStepIdx];
        const isTimeBased = !currentStep || !currentStep.unit || currentStep.unit === 'seconds';

        if (isTimeBased) {
          setSecondsLeft(prev => {
            if (prev <= 1) {
              handleStepCompletion();
              return 0;
            }
            return prev - 1;
          });
        } else {
          // Count up elapsed seconds spent on this step
          setSecondsLeft(prev => prev + 1);
        }
      }, 1000);
    } else {
      clearInterval(timerId);
    }
    return () => clearInterval(timerId);
  }, [practiceActive, isPlaying, activeStepIdx, activeLoopCount, selectedExercise]);

  // Launch mobile emulator trigger / Manual log override handler
  const handleSimulateWorkout = async (e: FormEvent) => {
    e.preventDefault();
    if (!exercises.length) {
      alert('Please initialize exercises catalog first.');
      return;
    }

    const linkedEx = exercises[Number(simFormData.exerciseIndex) % exercises.length];
    if (!linkedEx) return;

    setSimulating(true);

    let finalUserId = 'idx-anonymous';
    let finalUserName = 'Ad-hoc Practitioner';
    let finalUserAvatar = '';

    if (useRegisteredMember) {
      const activeMember = members.find(m => m.id === selectedMemberId) || members[0];
      if (activeMember) {
        finalUserId = activeMember.id;
        finalUserName = activeMember.fullName;
        finalUserAvatar = activeMember.avatar || '';
      } else {
        // Fallback to custom fields
        finalUserId = simFormData.userId;
        finalUserName = simFormData.userName;
      }
    } else {
      finalUserId = `ad-hoc-${Date.now()}`;
      finalUserName = manualPractitionerName || 'Ad-hoc Practitioner';
    }

    addLog(`Registering administrative training log entry for ${finalUserName}...`, 'api');

    try {
      const parsedAchievedQty = achievedUnitsQty !== '' 
        ? Number(achievedUnitsQty) 
         : (Number(linkedEx.targetValue) || Number(linkedEx.duration) || 15);
      
      const newAct: ActivityType = {
        id: `act-${Date.now()}`,
        userId: finalUserId,
        userName: finalUserName,
        userAvatar: finalUserAvatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80`,
        exerciseId: linkedEx.id,
        exerciseTitle: linkedEx.title,
        timestamp: sessionDateTime ? new Date(sessionDateTime).toISOString() : new Date().toISOString(),
        duration: Number(simFormData.duration),
        caloriesBurned: Number(simFormData.calories),
        status: 'completed',
        notes: simFormData.notes,
        heartRateAvg: Number(simFormData.heartRateAvg),
        achievedUnit: linkedEx.targetUnit || 'minutes',
        achievedValue: parsedAchievedQty
      };

      await addActivity(newAct);
      addLog(`Administrative entry recorded: Added session log for ${finalUserName} (${linkedEx.title})`, 'success');
      setSimSuccess(true);
      setTimeout(() => setSimSuccess(false), 3000);
      loadSystemData();
    } catch (e) {
      addLog(`Failed to finalize training transaction entry`, 'warn');
    } finally {
      setSimulating(false);
    }
  };

  // Daily Steps Handlers
  const handleSaveSteps = async (e: FormEvent) => {
    e.preventDefault();
    const stepsNum = Number(stepCount);
    if (!stepsNum || stepsNum <= 0) {
      alert('Please enter a valid positive number of steps.');
      return;
    }

    if (!stepMemberId) {
      alert('Please select a member to log steps for.');
      return;
    }

    const member = members.find(m => m.id === stepMemberId);
    if (!member) return;

    setStepSaving(true);
    try {
      const distanceKm = Number((stepsNum * 0.00075).toFixed(2));
      const caloriesBurned = Math.round(stepsNum * 0.04);

      const log: DailyStepLog = {
        id: `steps-${stepMemberId}-${stepDate}`,
        userId: stepMemberId,
        userName: member.fullName,
        userAvatar: member.avatar || '',
        date: stepDate,
        steps: stepsNum,
        caloriesBurned,
        distanceKm,
        updatedAt: new Date().toISOString()
      };

      await addOrUpdateDailyStepLog(log);
      addLog(`Recorded ${stepsNum.toLocaleString()} steps for ${member.fullName} on ${stepDate}`, 'success');
      setStepCount('');
      
      const freshStepLogs = await getDailyStepLogs();
      setDailyStepLogs(freshStepLogs);
      
      const freshStats = await getStats();
      setStats(freshStats);
    } catch (err: any) {
      addLog(`Failed to record steps: ${err.message || err}`, 'warn');
    } finally {
      setStepSaving(false);
    }
  };

  const handleDeleteStepLog = (id: string, memberName: string, date: string) => {
    setConfirmConfig({
      isOpen: true,
      title: language === 'EN' ? 'Delete Step Log' : 'Hapus Catatan Langkah',
      message: language === 'EN' ? `Are you sure you want to delete step log for ${memberName} on ${date}?` : `Apakah Anda yakin ingin menghapus catatan langkah untuk ${memberName} pada ${date}?`,
      onConfirm: async () => {
        try {
          await deleteDailyStepLog(id);
          addLog(language === 'EN' ? `Deleted step log for ${memberName} on ${date}` : `Berhasil menghapus catatan langkah ${memberName} pada ${date}`, 'success');
          const freshStepLogs = await getDailyStepLogs();
          setDailyStepLogs(freshStepLogs);
          
          const freshStats = await getStats();
          setStats(freshStats);
        } catch (err: any) {
          addLog(`Failed to delete step log: ${err.message || err}`, 'warn');
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.title.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
                          ex.description.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
                          ex.targetMuscles.some(m => m.toLowerCase().includes(exerciseSearch.toLowerCase()));
    
    if (activeCategoryFilter === 'all') return matchesSearch;
    return ex.category === activeCategoryFilter && matchesSearch;
  });

  // Filter members
  const filteredMembers = members.filter(m => {
    const searchLower = memberSearch.toLowerCase();
    const matchesSearch = m.fullName.toLowerCase().includes(searchLower) || 
                          (m.phoneNumber && m.phoneNumber.toLowerCase().includes(searchLower)) || 
                          (m.notes && m.notes.toLowerCase().includes(searchLower));

    const matchesBelt = memberFilterBelt === 'all' || m.beltLevel === Number(memberFilterBelt);
    const matchesStatus = memberFilterStatus === 'all' || m.status === memberFilterStatus;

    return matchesSearch && matchesBelt && matchesStatus;
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
            <span>{t.dashboard}</span>
          </button>

          <button 
            onClick={() => handleTabChange('exercises')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'exercises' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-exercises"
          >
            <Dumbbell className="w-5 h-5 opacity-80" />
            <span>{t.exercises}</span>
          </button>

          <button 
            onClick={() => handleTabChange('activities')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'activities' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-activities"
          >
            <Activity className="w-5 h-5 opacity-80" />
            <span>{t.activities}</span>
          </button>

          <button 
            onClick={() => handleTabChange('members')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'members' ? 'bg-[#27272a] text-white shadow-xs' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
            id="nav-tab-members"
          >
            <Users className="w-5 h-5 opacity-80" />
            <span>{t.members}</span>
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
                {activeTab === 'members' && t.members}
                {activeTab === 'developer' && t.interactiveRest}
              </h2>
              <p className="sidebar-subtext text-[10px] sm:text-xs text-[#a1a1aa] hidden sm:block truncate max-w-xs sm:max-w-md">
                {activeTab === 'dashboard' && t.adminSubtitle}
                {activeTab === 'exercises' && t.exercisesSubtitle}
                {activeTab === 'activities' && t.activitiesSubtitle}
                {activeTab === 'members' && t.membersSubtitle}
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
                                ID: {ex.id}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${getCategoryBadgeStyle(ex.category)}`}>
                                {getCategoryName(ex.category)}
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
                        {act.userAvatar ? (
                          <img 
                            src={act.userAvatar}
                            alt={act.userName}
                            className="w-8 h-8 rounded-full border border-[#27272a] shrink-0 object-cover mt-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-800 text-white font-semibold text-xs border border-zinc-700 select-none flex items-center justify-center shrink-0 mt-0.5">
                            {(act.userName || 'A').charAt(0).toUpperCase()}
                          </div>
                        )}
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
                      <span>{getCategoryName(cat.id)}</span>
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
                  <span>New Workout</span>
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
                              <div className="flex gap-4 items-center">
                                <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-[#27272a] overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                                  {(() => {
                                    const slidesFromField = (ex.mediaSlides || ex.slidesUrl || []).filter(Boolean);
                                    const rawMediaUrl = ex.mediaUrl || '';
                                    const isMediaUrlVideo = rawMediaUrl && (
                                      rawMediaUrl.includes('youtube.com') || 
                                      rawMediaUrl.includes('youtu.be') || 
                                      rawMediaUrl.endsWith('.mp4') || 
                                      rawMediaUrl.includes('.mp4?') ||
                                      ex.mediaType === 'video' ||
                                      ex.mediaType === 'youtube'
                                    );
                                    const coverImage = !isMediaUrlVideo ? rawMediaUrl : '';
                                    
                                    const thumbSrc = slidesFromField.length > 0
                                      ? slidesFromField[0]
                                      : (coverImage || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=200");

                                    const isVid = isMediaUrlVideo;
                                    return (
                                      <>
                                        <img 
                                          src={thumbSrc} 
                                          alt={ex.title} 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            (e.target as any).src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=200";
                                          }}
                                        />
                                        {isVid && (
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-md">
                                              <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                              </svg>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white text-base leading-tight flex items-center gap-2">
                                    {ex.title}
                                  </div>
                                  <p className="text-xs text-[#a1a1aa] line-clamp-2 mt-1 font-medium">{ex.description}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 mt-2 flex-wrap pl-18">
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
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${getCategoryBadgeStyle(ex.category)}`}>
                                {getCategoryName(ex.category)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-white font-semibold font-mono text-xs">{ex.calories} kcal</div>
                              <div className="text-[10px] text-[#a1a1aa] font-mono font-medium">
                                {ex.targetUnit === 'minutes' 
                                  ? `${ex.targetValue || ex.duration} mins sequence` 
                                  : `${ex.targetValue} ${ex.targetUnit}`
                                }
                              </div>
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
                          <div className="flex gap-3.5 items-start">
                            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-[#27272a] overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                              {(() => {
                                const slidesFromField = (ex.mediaSlides || ex.slidesUrl || []).filter(Boolean);
                                const rawMediaUrl = ex.mediaUrl || '';
                                const isMediaUrlVideo = rawMediaUrl && (
                                  rawMediaUrl.includes('youtube.com') || 
                                  rawMediaUrl.includes('youtu.be') || 
                                  rawMediaUrl.endsWith('.mp4') || 
                                  rawMediaUrl.includes('.mp4?') ||
                                  ex.mediaType === 'video' ||
                                  ex.mediaType === 'youtube'
                                );
                                const coverImage = !isMediaUrlVideo ? rawMediaUrl : '';
                                
                                const thumbSrc = slidesFromField.length > 0
                                  ? slidesFromField[0]
                                  : (coverImage || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=150");

                                const isVid = isMediaUrlVideo;
                                return (
                                  <>
                                    <img 
                                      src={thumbSrc} 
                                      alt={ex.title} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as any).src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=150";
                                      }}
                                    />
                                    {isVid && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-md">
                                          <svg className="w-2.5 h-2.5 fill-current ml-0.5" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <h4 className="text-white font-bold leading-tight text-xs truncate">
                                  {ex.title}
                                </h4>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider shrink-0 ${getCategoryBadgeStyle(ex.category)}`}>
                                  {getCategoryName(ex.category)}
                                </span>
                              </div>
                              <p className="text-xs text-[#a1a1aa] line-clamp-2 font-medium">{ex.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-[#a1a1aa]">
                            <span className="font-semibold">
                              {ex.steps.length} steps • {ex.targetUnit === 'minutes' ? `${ex.targetValue || ex.duration}m` : `${ex.targetValue} ${ex.targetUnit}`} • {ex.calories}cal
                            </span>
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

                      {/* Header visual banner / Interactive media guide */}
                      {(() => {
                        const slidesFromField = (selectedExercise.mediaSlides || selectedExercise.slidesUrl || []).filter(Boolean);
                        const hasRealSlides = slidesFromField.length > 0 && !slidesFromField.some(url => url.includes('photo-1544367567-0f2fcb009e0b'));
                        const hasSlides = hasRealSlides || (selectedExercise.stepDetails && selectedExercise.stepDetails.length > 0);
                        const hasVideo = selectedExercise.mediaUrl && (
                          selectedExercise.mediaUrl.includes('youtube.com') ||
                          selectedExercise.mediaUrl.includes('youtu.be') ||
                          selectedExercise.mediaUrl.endsWith('.mp4') ||
                          selectedExercise.mediaUrl.includes('.mp4?') ||
                          selectedExercise.mediaType === 'video' ||
                          selectedExercise.mediaType === 'youtube'
                        );

                        return (
                          <div className="space-y-3">
                            {/* Segment toggle if both exist */}
                            {hasSlides && hasVideo && (
                              <div className="flex bg-[#121214] p-1 border border-[#27272a] rounded-xl animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => setExerciseMediaTab('slides')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold font-sans cursor-pointer transition-all ${
                                    exerciseMediaTab === 'slides' 
                                      ? 'bg-zinc-900 border border-[#27272a] text-white' 
                                      : 'text-[#a1a1aa] hover:text-white hover:bg-zinc-950/20'
                                  }`}
                                >
                                  🖼️ {hasRealSlides ? `Slides (${slidesFromField.length})` : `Breathing Guide (${selectedExercise.stepDetails?.length || 0})`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExerciseMediaTab('video')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold font-sans cursor-pointer transition-all ${
                                    exerciseMediaTab === 'video' 
                                      ? 'bg-zinc-900 border border-[#27272a] text-white' 
                                      : 'text-[#a1a1aa] hover:text-white hover:bg-zinc-950/20'
                                  }`}
                                >
                                  🎥 Video Playback
                                </button>
                              </div>
                            )}

                            {/* Main Display Area */}
                            <div className="relative h-56 rounded-xl overflow-hidden bg-zinc-950 border border-[#27272a] flex flex-col justify-center items-center">
                              {exerciseMediaTab === 'video' && hasVideo ? (
                                // Render Video guide
                                (selectedExercise.mediaUrl.includes('youtube.com') || selectedExercise.mediaUrl.includes('youtu.be') || selectedExercise.mediaType === 'youtube') ? (
                                  <iframe 
                                    src={getYoutubeEmbedUrl(selectedExercise.mediaUrl)}
                                    title={selectedExercise.title}
                                    className="w-full h-full border-none"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video 
                                    src={selectedExercise.mediaUrl}
                                    controls 
                                    className="w-full h-full object-cover" 
                                    muted 
                                    loop 
                                    playsInline 
                                  />
                                )
                              ) : (
                                // Render Slides or continuous images
                                (() => {
                                  // Determine list of items to slide through
                                  const slideList = hasRealSlides 
                                    ? slidesFromField 
                                    : (selectedExercise.stepDetails && selectedExercise.stepDetails.length > 0 
                                      ? selectedExercise.stepDetails 
                                      : [null]);

                                  const activeIndex = practiceActive 
                                    ? (activeStepIdx % slideList.length) 
                                    : (currentSlideIdx % slideList.length);

                                  const activeItem = slideList[activeIndex];

                                  return (
                                    <div className="relative w-full h-full group">
                                      {hasRealSlides && typeof activeItem === 'string' ? (
                                        <img 
                                          src={activeItem} 
                                          alt={`Slide ${activeIndex + 1}`}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            (e.target as any).src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800"
                                          }}
                                        />
                                      ) : (
                                        // Render our stunning procedural step diagram
                                        <KatedaStepDiagram
                                          stepType={activeItem?.type || 'instruction'}
                                          stepText={activeItem?.text || selectedExercise.title}
                                          stepHint={activeItem?.hint}
                                          isPlaying={isPlaying}
                                          secondsLeft={practiceActive ? secondsLeft : undefined}
                                          totalDuration={practiceActive ? activeItem?.duration : undefined}
                                          activeLoop={practiceActive ? activeLoopCount : undefined}
                                          maxLoops={practiceActive ? (activeItem?.loops || selectedExercise.loops || 5) : undefined}
                                        />
                                      )}

                                      {slideList.length > 1 && (
                                        <div className="absolute inset-x-0 top-3 px-3 flex justify-between items-center bg-black/65 py-1 text-[9px] font-mono text-[#fafafa] tracking-wider font-bold rounded-md mx-2 border border-[#27272a]/40 z-20">
                                          <span>SLIDE {activeIndex + 1} OF {slideList.length}</span>
                                          {practiceActive && <span className="text-emerald-400 font-bold">SYNCD TO WORKOUT STEP</span>}
                                        </div>
                                      )}
                                      {!practiceActive && slideList.length > 1 && (
                                        <div className="absolute inset-y-0 inset-x-0 flex justify-between items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCurrentSlideIdx(prev => (prev - 1 + slideList.length) % slideList.length);
                                            }}
                                            className="p-1 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-950 text-white hover:bg-zinc-850 text-xs font-mono font-bold cursor-pointer border border-[#27272a]"
                                            title="Prev Slide"
                                          >
                                            &lt;
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCurrentSlideIdx(prev => (prev + 1) % slideList.length);
                                            }}
                                            className="p-1 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-950 text-white hover:bg-zinc-850 text-xs font-mono font-bold cursor-pointer border border-[#27272a]"
                                            title="Next Slide"
                                          >
                                            &gt;
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()
                              )}

                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 to-transparent p-4 flex items-end justify-between pointer-events-none z-10">
                                <span className="px-2 py-1 bg-zinc-950/85 border border-[#27272a]/80 text-[#fafafa] rounded text-[9px] font-mono font-bold uppercase flex items-center gap-1.5 shadow-lg">
                                  {exerciseMediaTab === 'video' ? (
                                    <>
                                      <Video className="w-3 h-3 text-red-500" />
                                      <span>VIDEO REFERENCE</span>
                                    </>
                                  ) : hasRealSlides ? (
                                    <>
                                      <Layers className="w-3 h-3 text-blue-400" />
                                      <span>SLIDE PRESENTATION</span>
                                    </>
                                  ) : (
                                    <>
                                      <Activity className="w-3 h-3 text-emerald-400" />
                                      <span>BREATH LOCK MATRIX</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

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
                          <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold">
                            {selectedExercise.targetUnit === 'minutes' ? 'Duration' : 'Goal'}
                          </p>
                          <p className="text-xs text-white font-mono font-bold mt-0.5">
                            {selectedExercise.targetUnit === 'minutes' 
                              ? `${selectedExercise.targetValue || selectedExercise.duration} mins` 
                              : `${selectedExercise.targetValue} ${selectedExercise.targetUnit}`
                            }
                          </p>
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

                      {/* Trainer Quick Admin Session Logger instead of mobile rehearsal player */}
                      <div className="bg-[#09090b] border border-emerald-500/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono tracking-wider">
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                          <span>⚡ TRAINER QUICK SESSION LOGGER</span>
                        </div>
                        <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                          Record a training session completion for this exercise directly onto a practitioner's timeline.
                        </p>
                        
                        <div className="space-y-2.5">
                          {/* Member Dropdown */}
                          <div>
                            <span className="block text-[9px] uppercase font-mono tracking-wider text-[#a1a1aa] font-bold mb-1">Target Practitioner</span>
                            <select 
                              id="quick-member-select"
                              value={selectedMemberId}
                              onChange={(e) => setSelectedMemberId(e.target.value)}
                              className="w-full bg-[#18181b] border border-[#27272a]/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              {members.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.fullName} (Sabuk {m.beltLevel})
                                </option>
                              ))}
                              {members.length === 0 && (
                                <option value="">No registered members in system</option>
                              )}
                            </select>
                          </div>

                          {/* Achieved metric row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[9px] uppercase font-mono tracking-wider text-[#a1a1aa] font-bold mb-1">
                                Completed ({selectedExercise.targetUnit || 'minutes'})
                              </span>
                              <input 
                                type="number"
                                placeholder={`e.g. ${selectedExercise.targetValue || selectedExercise.duration || 10}`}
                                value={achievedUnitsQty}
                                onChange={(e) => setAchievedUnitsQty(e.target.value)}
                                className="w-full bg-[#18181b] border border-[#27272a]/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase font-mono tracking-wider text-[#a1a1aa] font-bold mb-1">Avg Heart Rate</span>
                              <input 
                                type="number"
                                placeholder="e.g. 132 BPM"
                                value={simFormData.heartRateAvg}
                                onChange={(e) => setSimFormData(prev => ({ ...prev, heartRateAvg: e.target.value }))}
                                className="w-full bg-[#18181b] border border-[#27272a]/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Simple action submit */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!members.length) {
                                alert('Please register a class member first.');
                                return;
                              }
                              const activeMember = members.find(m => m.id === selectedMemberId) || members[0];
                              if (!activeMember) return;
                              const currentValStr = achievedUnitsQty !== '' ? achievedUnitsQty : String(selectedExercise.targetValue || selectedExercise.duration || 10);
                              
                              const newQuickAct: ActivityType = {
                                id: `act-${Date.now()}`,
                                userId: activeMember.id,
                                userName: activeMember.fullName,
                                userAvatar: activeMember.avatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80`,
                                exerciseId: selectedExercise.id,
                                exerciseTitle: selectedExercise.title,
                                timestamp: new Date().toISOString(),
                                duration: selectedExercise.duration,
                                caloriesBurned: selectedExercise.calories,
                                status: 'completed' as const,
                                notes: `Logged from Quick Catalog Drawer. Smooth postural compliance.`,
                                heartRateAvg: Number(simFormData.heartRateAvg) || 132,
                                achievedUnit: selectedExercise.targetUnit || 'minutes',
                                achievedValue: Number(currentValStr)
                              };

                              try {
                                setSimulating(true);
                                await addActivity(newQuickAct);
                                addLog(`Quick training log recorded in catalog drawers for ${activeMember.fullName}`, 'success');
                                alert(`Successfully logged custom ${selectedExercise.title} completion for ${activeMember.fullName}!`);
                                loadSystemData();
                              } catch(error) {
                                addLog('Failure uploading quick record', 'warn');
                              } finally {
                                setSimulating(false);
                              }
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer font-sans shadow-md"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Quick Log Custom Achievement</span>
                          </button>
                        </div>
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

          {/* TAB 3: ACTIVITY WORKOUT MONITOR AND ADMINISTRATIVE LOGGER */}
          {!loading && activeTab === 'activities' && (
            <div className="space-y-8 animate-fadeIn" id="view-activities">
              
              {/* Introduction bar */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#fafafa] flex items-center gap-1.5 font-sans">
                    <User className="text-emerald-400 w-5 h-5 shrink-0" />
                    <span>Administrative Workout Logging Console</span>
                  </h4>
                  <p className="text-xs text-[#a1a1aa] font-medium leading-relaxed max-w-2xl">
                    Log custom training sessions manually for central syllabus students or registered practitioners. This updates member timelines, recalculates energy performance ratios, and locks active stats in real-time.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider font-mono">Trainer Mode</div>
                    <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">MANUAL LOGS READY</div>
                  </div>
                </div>
              </div>

              {/* Navigation toggle pills */}
              <div className="flex bg-[#18181b] p-1 border border-[#27272a] rounded-xl self-start w-fit">
                <button
                  type="button"
                  onClick={() => setActivitiesSubTab('workouts')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${activitiesSubTab === 'workouts' ? 'bg-[#27272a] text-white shadow-xs border border-zinc-805' : 'text-[#a1a1aa] hover:text-white'}`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Workout Session Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivitiesSubTab('steps')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${activitiesSubTab === 'steps' ? 'bg-[#27272a] text-white shadow-xs border border-zinc-805' : 'text-[#a1a1aa] hover:text-white'}`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Daily Steps Tracker</span>
                </button>
              </div>

              {activitiesSubTab === 'workouts' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left side: Trainer Workout Session Logger form widget */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 self-start flex flex-col justify-between animate-fadeIn" id="mobile-simulation-widget">
                  <div className="space-y-1 mb-5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[#09090b] text-[#fafafa] border border-[#27272a] text-[9px] font-mono uppercase font-bold text-emerald-400">Class Recorder</span>
                      <span className="text-[10px] font-mono text-zinc-400">offline-first</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1">Manual Activity Logger</h4>
                    <p className="text-xs text-[#a1a1aa]">Log physical milestones directly into database timelines.</p>
                  </div>

                  <form onSubmit={handleSimulateWorkout} className="space-y-4">
                    {/* Member Selection Toggle */}
                    <div className="bg-[#09090b] border border-[#27272a] p-2.5 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-[#a1a1aa] font-bold">Practitioner Type</span>
                      <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 shrink-0">
                        <button 
                          type="button"
                          onClick={() => setUseRegisteredMember(true)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer transition-all ${useRegisteredMember ? 'bg-emerald-500 text-black' : 'text-[#a1a1aa] hover:text-white'}`}
                        >
                          DB Member
                        </button>
                        <button 
                          type="button"
                          onClick={() => setUseRegisteredMember(false)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer transition-all ${!useRegisteredMember ? 'bg-emerald-500 text-black' : 'text-[#a1a1aa] hover:text-white'}`}
                        >
                          Ad-Hoc Name
                        </button>
                      </div>
                    </div>

                    {useRegisteredMember ? (
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Select Registered Member</label>
                        <select 
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                          required
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {members.map(m => (
                            <option key={m.id} value={m.id} className="bg-[#18181b]">
                              {m.fullName} (Sabuk {m.beltLevel})
                            </option>
                          ))}
                          {members.length === 0 && (
                            <option value="">No members found in DB</option>
                          )}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Ad-Hoc Practitioner Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Guest Student" 
                          value={manualPractitionerName}
                          onChange={(e) => setManualPractitionerName(e.target.value)}
                          required
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

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
                              notes: `Class performance: Core power aligned. Smooth execution of ${chosen.title}.`
                            }));
                            setAchievedUnitsQty(String(chosen.targetValue || chosen.duration || 15));
                          } else {
                            setSimFormData(prev => ({ ...prev, exerciseIndex: idx }));
                          }
                        }}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {exercises.map((ex, i) => (
                          <option key={ex.id} value={i} className="bg-[#18181b]">
                            {ex.title} (Goal: {ex.targetValue || ex.duration} {ex.targetUnit || 'minutes'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Achieved Target Unit Input row */}
                    {(() => {
                      const chosen = exercises[Number(simFormData.exerciseIndex) % exercises.length];
                      const activeUnit = chosen?.targetUnit || 'minutes';
                      return (
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-emerald-400 font-extrabold mb-1">
                            Completed Quantity ({activeUnit.toUpperCase()})
                          </label>
                          <div className="relative">
                            <input 
                              type="number" 
                              placeholder={`e.g. ${chosen?.targetValue || 10}`}
                              value={achievedUnitsQty}
                              onChange={(e) => setAchievedUnitsQty(e.target.value)}
                              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            <span className="absolute right-3 top-2 text-[10px] font-mono text-[#a1a1aa] uppercase font-bold">
                              {activeUnit}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* DateTime Picker */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Session Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={sessionDateTime}
                        onChange={(e) => setSessionDateTime(e.target.value)}
                        required
                        className="w-full bg-[#09090b] border border-[#27272a] text-xs text-[#fafafa] rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                      />
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
                      <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Trainer Remarks & Assessment</label>
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
                          <span>Pushing to local databases...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Log Administrative Training Session</span>
                        </>
                      )}
                    </button>
                    
                    {simSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-center text-xs animate-fadeIn font-bold font-sans">
                        ✓ Training transaction registered securely! Log update processed.
                      </div>
                    )}
                  </form>
                </div>

                {/* Right side: Interactive activity log output list  */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between animate-fadeIn" id="activity-logs-dashboard">
                  <div className="space-y-1 mb-5">
                    <h4 className="text-base font-bold text-white">Live Activity Logs Monitor ({activities.length})</h4>
                    <p className="text-xs text-[#a1a1aa]">This is the core state store updated live by client sports integrations and trainers.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className="text-[10px] uppercase text-[#a1a1aa] font-bold tracking-wider border-b border-[#27272a] bg-zinc-950/20">
                          <th className="px-4 py-3">Member Details</th>
                          <th className="px-4 py-3">Training Course Completed</th>
                          <th className="px-4 py-3 text-center">Exercise Metric Performance</th>
                          <th className="px-4 py-3 text-right">Handshake Date</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-[#27272a]/30">
                        {activities.map((act) => (
                          <tr key={act.id} className="hover:bg-zinc-800/10 font-medium font-sans">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {act.userAvatar ? (
                                  <img 
                                    src={act.userAvatar}
                                    alt={act.userName}
                                    className="w-8 h-8 rounded-full border border-[#27272a] object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-neutral-800 text-white font-semibold text-[10px] border border-zinc-700 select-none flex items-center justify-center shrink-0">
                                    {(act.userName || 'A').charAt(0).toUpperCase()}
                                  </div>
                                )}
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
                              <div className="text-emerald-400 font-mono font-black text-xs">
                                {act.achievedValue !== undefined ? `${act.achievedValue} ${act.achievedUnit || 'minutes'}` : `${act.duration} active mins`}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{act.caloriesBurned} kcal{Number(act.duration) > 0 ? ` • ${act.duration} mins` : ''}</div>
                              {act.heartRateAvg && (
                                <span className="inline-block px-1.5 py-0.5 bg-red-950/20 text-red-500 rounded text-[9px] font-mono font-bold mt-1 border border-red-500/10">
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
              ) : (
                /* Daily steps sub-tab view */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn" id="daily-steps-view">
                  {/* Left Column: Form to manual-log steps */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 self-start flex flex-col justify-between" id="steps-form-widget">
                    <div className="space-y-1 mb-5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-[#09090b] text-[#fafafa] border border-[#27272a] text-[9px] font-mono uppercase font-bold text-emerald-400">Step Recorder</span>
                        <span className="text-[10px] font-mono text-zinc-400">offline-first</span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">Manual Steps Logger</h4>
                      <p className="text-xs text-[#a1a1aa]">Log physical steps directly into practitioner timelines.</p>
                    </div>

                    <form onSubmit={handleSaveSteps} className="space-y-4">
                      {/* Member Selection */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Select Practitioner</label>
                        <select 
                          value={stepMemberId}
                          onChange={(e) => setStepMemberId(e.target.value)}
                          required
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {members.map(m => (
                            <option key={m.id} value={m.id} className="bg-[#18181b]">
                              {m.fullName} (Sabuk {m.beltLevel})
                            </option>
                          ))}
                          {members.length === 0 && (
                            <option value="">No members found in DB</option>
                          )}
                        </select>
                      </div>

                      {/* Date selection */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Activity Date</label>
                        <input 
                          type="date"
                          value={stepDate}
                          onChange={(e) => setStepDate(e.target.value)}
                          required
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      {/* Steps count input */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Daily Steps Count</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="e.g. 8000" 
                            value={stepCount}
                            onChange={(e) => setStepCount(e.target.value)}
                            required
                            min="1"
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <span className="absolute right-3 top-2 text-[10px] font-mono text-[#a1a1aa] uppercase font-bold">
                            steps
                          </span>
                        </div>
                      </div>

                      {/* Expected calculated metrics preview */}
                      {stepCount && Number(stepCount) > 0 && (
                        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 space-y-3">
                          <div className="text-[9px] font-mono uppercase text-emerald-400 font-bold">Est. Physical Expenditure metrics</div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-[#18181b] border border-[#27272a] p-2 rounded-lg">
                              <div className="text-[10px] text-zinc-400">Distance</div>
                              <div className="text-xs font-bold text-white font-mono mt-0.5">{(Number(stepCount) * 0.00075).toFixed(2)} KM</div>
                            </div>
                            <div className="bg-[#18181b] border border-[#27272a] p-2 rounded-lg">
                              <div className="text-[10px] text-zinc-400">Calories Burned</div>
                              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{Math.round(Number(stepCount) * 0.04)} kcal</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={stepSaving || !stepCount}
                        className={`w-full font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans shadow-md ${
                          stepSaving || !stepCount ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Footprints className="w-4 h-4" />
                        <span>{stepSaving ? 'Recording Logs...' : 'Record Daily Steps'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column (2/3 width): Steps log history table */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-2xl lg:col-span-2 overflow-hidden self-start">
                    <div className="p-6 border-b border-[#27272a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-emerald-400" />
                          <span>Logged Physical Steps History</span>
                        </h4>
                        <p className="text-xs text-[#a1a1aa] mt-0.5">List of verified daily steps metrics synchronized with active databases.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#27272a] bg-[#09090b] text-[10px] font-mono text-[#a1a1aa] uppercase tracking-wider select-none">
                            <th className="px-4 py-3">Practitioner</th>
                            <th className="px-4 py-3 text-center">Date</th>
                            <th className="px-4 py-3 text-center">Steps Count</th>
                            <th className="px-4 py-3 text-center">Estimated Metrics</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a] text-xs">
                          {dailyStepLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#1f1f23]/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={log.userAvatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80`} 
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-full border border-[#27272a] bg-zinc-900 object-cover" 
                                    alt="" 
                                  />
                                  <div>
                                    <span className="text-white block font-bold leading-normal truncate max-w-xs">{log.userName}</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">UID: {log.userId}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-mono whitespace-nowrap">
                                <span className="bg-[#09090b] border border-[#27272a] px-2 py-1 rounded text-zinc-300">
                                  {log.date}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="text-emerald-400 font-mono font-black text-sm flex items-center justify-center gap-1">
                                  <Footprints className="w-3.5 h-3.5 inline text-emerald-400" />
                                  <span>{log.steps.toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="text-white font-mono font-bold text-xs">
                                  {log.distanceKm !== undefined ? `${log.distanceKm} KM` : '-- KM'}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                  {log.caloriesBurned !== undefined ? `${log.caloriesBurned} kcal` : '-- kcal'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStepLog(log.id, log.userName, log.date)}
                                  className="p-1 px-2.5 bg-red-950/20 hover:bg-red-950/60 border border-red-500/10 text-red-500 hover:text-red-400 text-[10px] font-bold font-mono rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {dailyStepLogs.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 font-medium">
                                No physical step logs recorded yet for any active practitioners.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'members' && (
            <div className="space-y-6 animate-fadeIn p-4 sm:p-8" id="view-members">
              {/* Member Metric Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="member-metrics-grid">
                <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-xs text-[#a1a1aa] font-medium font-sans uppercase tracking-wider">
                      {language === 'EN' ? 'Total Members' : 'Total Anggota'}
                    </p>
                    <h3 className="text-2xl font-bold text-white font-sans mt-1">{members.length}</h3>
                  </div>
                  <div className="w-10 h-10 bg-emerald-950/35 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/10">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-xs text-[#a1a1aa] font-medium font-sans uppercase tracking-wider">
                      {language === 'EN' ? 'Active Practitioners' : 'Praktisi Aktif'}
                    </p>
                    <h3 className="text-2xl font-bold text-emerald-400 font-sans mt-1">
                      {members.filter(m => m.status === 'active').length}
                    </h3>
                  </div>
                  <div className="w-10 h-10 bg-emerald-950/35 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/10">
                    <Check className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-xs text-[#a1a1aa] font-medium font-sans uppercase tracking-wider">
                      {language === 'EN' ? 'Average BMI Scale' : 'Rata-rata Skala BMI'}
                    </p>
                    <h3 className="text-2xl font-bold text-white font-sans mt-1">
                      {members.length > 0 
                        ? (members.reduce((sum, m) => {
                            const h = m.height / 100;
                            const bmi = h > 0 ? (m.weight / (h * h)) : 0;
                            return sum + bmi;
                          }, 0) / members.length).toFixed(1)
                        : '0.0'
                      }
                    </h3>
                  </div>
                  <div className="w-10 h-10 bg-indigo-950/35 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/10">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-xs text-[#a1a1aa] font-medium font-sans uppercase tracking-wider">
                      {language === 'EN' ? 'Optimal BMI Ratio' : 'Rasio BMI Optimal (18.5-24.9)'}
                    </p>
                    <h3 className="text-2xl font-semibold text-emerald-400 font-sans mt-1">
                      {members.length > 0
                        ? `${((members.filter(m => {
                            const h = m.height / 100;
                            const bmi = h > 0 ? (m.weight / (h * h)) : 0;
                            return bmi >= 18.5 && bmi <= 24.9;
                          }).length / members.length) * 100).toFixed(0)}%`
                        : '0%'
                      }
                    </h3>
                  </div>
                  <div className="w-10 h-10 bg-teal-950/35 text-teal-400 rounded-xl flex items-center justify-center border border-teal-500/10">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filtering and Actions Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121214] border border-[#27272a] p-4 rounded-2xl" id="members-filter-controls">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl">
                  {/* Search Bar */}
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-[#a1a1aa]" />
                    <input 
                      type="text"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                      placeholder={language === 'EN' ? "Search by name or contact..." : "Cari berdasarkan nama atau kontak..."}
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      id="member-search-input"
                    />
                  </div>

                  {/* Belt Filter */}
                  <select
                    className="w-full sm:w-48 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-emerald-500"
                    value={memberFilterBelt}
                    onChange={(e) => setMemberFilterBelt(e.target.value)}
                    id="member-filter-belt"
                  >
                    <option value="all">{language === 'EN' ? 'All Belts' : 'Semua Sabuk'}</option>
                    {beltLevels.map(b => (
                      <option key={b.id} value={b.id}>
                        {language === 'EN' ? b.nameEN : b.nameID}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    className="w-full sm:w-40 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-emerald-500"
                    value={memberFilterStatus}
                    onChange={(e) => setMemberFilterStatus(e.target.value)}
                    id="member-filter-status"
                  >
                    <option value="all">{language === 'EN' ? 'All Status' : 'Semua Status'}</option>
                    <option value="active">{language === 'EN' ? 'Active' : 'Aktif'}</option>
                    <option value="inactive">{language === 'EN' ? 'Inactive' : 'Nonaktif'}</option>
                  </select>
                </div>

                {/* Add Member CTA */}
                <button
                  onClick={handleOpenAddMemberModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto shadow-md shadow-emerald-600/10"
                  id="btn-trigger-register-member"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'EN' ? 'Register Member' : 'Daftar Anggota Baru'}</span>
                </button>
              </div>

              {/* Members List Table Container */}
              <div className="bg-[#121214] border border-[#27272a] rounded-3xl overflow-hidden shadow-sm" id="members-list-container">
                <div className="overflow-x-auto min-w-full">
                  <table className="min-w-full divide-y divide-[#27272a]">
                    <thead className="bg-[#18181b]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{language === 'EN' ? 'Practitioner' : 'Praktisi'}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{language === 'EN' ? 'Belt Level' : 'Tingkatan Sabuk'}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{language === 'EN' ? 'Joined' : 'Bergabung'}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{language === 'EN' ? 'Body Dimensions' : 'Dimensi Fisik'}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">BMI</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{language === 'EN' ? 'Status' : 'Status'}</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{language === 'EN' ? 'Actions' : 'Tindakan'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272a]/60 bg-[#121214]" id="members-table-body">
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-[#a1a1aa] text-xs font-sans">
                            {language === 'EN' 
                              ? 'No members registered yet matching search filters.' 
                              : 'Belum ada anggota terdaftar yang cocok dengan filter pencarian.'
                            }
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map(member => {
                          const matchingBelt = beltLevels.find(b => b.id === member.beltLevel) || BELT_LEVELS[0];
                          const beltName = language === 'EN' ? matchingBelt.nameEN : matchingBelt.nameID;
                          const yearsOld = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
                          
                          // Dynamic BMI calculation on the fly
                          const hM = member.height / 100;
                          const computedBmi = hM > 0 ? (member.weight / (hM * hM)) : 0;
                          
                          // BMI evaluation
                          let bmiColor = 'bg-emerald-950/45 text-emerald-400 border border-emerald-500/20';
                          let bmiTag = language === 'EN' ? 'Normal' : 'Normal';
                          if (computedBmi < 18.5) {
                            bmiColor = 'bg-blue-950/45 text-blue-400 border border-blue-500/10';
                            bmiTag = language === 'EN' ? 'Underweight' : 'Kurus';
                          } else if (computedBmi >= 25.0 && computedBmi <= 29.9) {
                            bmiColor = 'bg-amber-950/45 text-amber-400 border border-amber-500/10';
                            bmiTag = language === 'EN' ? 'Overweight' : 'Gemuk';
                          } else if (computedBmi >= 30.0) {
                            bmiColor = 'bg-red-950/45 text-red-400 border border-red-500/20';
                            bmiTag = language === 'EN' ? 'Obese' : 'Obesitas';
                          }

                          return (
                            <tr key={member.id} className="hover:bg-[#18181b]/30 transition-colors" id={`row-member-${member.id}`}>
                              {/* Practitioner Profile card */}
                              <td className="px-6 py-4.5 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  {member.avatar ? (
                                    <img 
                                      src={member.avatar} 
                                      alt={member.fullName} 
                                      className="w-9 h-9 rounded-full border border-[#27272a] object-cover" 
                                    />
                                  ) : (
                                    <div className="w-9 h-9 bg-neutral-800 rounded-full flex items-center justify-center text-white font-semibold text-xs border border-zinc-700 select-none">
                                      {member.fullName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-semibold text-white font-sans">{member.fullName}</div>
                                    <div className="text-[10px] text-[#a1a1aa] font-medium flex items-center gap-1.5 mt-0.5">
                                      <span>{member.gender === 'Male' ? (language === 'EN' ? 'Male' : 'Pria') : (language === 'EN' ? 'Female' : 'Wanita')}</span>
                                      <span>•</span>
                                      <span>{yearsOld} y/o</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Belt Rank */}
                              <td className="px-6 py-4.5 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${matchingBelt.color || 'bg-white/10 text-white'}`}>
                                  {beltName}
                                </span>
                              </td>

                              {/* Join Date */}
                              <td className="px-6 py-4.5 whitespace-nowrap text-xs text-[#a1a1aa] font-sans">
                                {new Date(member.joinedDate).toLocaleDateString(language === 'EN' ? 'en-US' : 'id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>

                              {/* Physical Body Coordinates */}
                              <td className="px-6 py-4.5 whitespace-nowrap">
                                <span className="text-xs text-zinc-350 font-mono">
                                  {member.height} cm / {member.weight} kg
                                </span>
                              </td>

                              {/* Body BMI */}
                              <td className="px-6 py-4.5 whitespace-nowrap text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white font-mono">{computedBmi.toFixed(1)}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest font-extrabold ${bmiColor}`}>
                                    {bmiTag}
                                  </span>
                                </div>
                              </td>

                              {/* Online Status */}
                              <td className="px-6 py-4.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-extrabold border ${
                                  member.status === 'active' 
                                    ? 'bg-emerald-950/45 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-zinc-950/45 text-[#a1a1aa] border-[#27272a]/40'
                                }`}>
                                  {member.status === 'active' ? (language === 'EN' ? 'Active' : 'Aktif') : (language === 'EN' ? 'Inactive' : 'Nonaktif')}
                                </span>
                              </td>

                              {/* Action Items */}
                              <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs">
                                <div className="flex items-center justify-end gap-2">
                                  {member.phoneNumber && (
                                    <a 
                                      href={`tel:${member.phoneNumber}`}
                                      className="p-1 px-2.5 bg-neutral-800 hover:bg-neutral-700 text-[#a1a1aa] hover:text-white rounded border border-[#27272a] text-[10px] transition-colors"
                                      title="Call member"
                                    >
                                      {language === 'EN' ? 'Call' : 'Hubungi'}
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleEditMember(member)}
                                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#a1a1aa] hover:text-white rounded border border-[#27272a] transition-colors cursor-pointer"
                                    title={language === 'EN' ? 'Edit member profile' : 'Ubah profil anggota'}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMember(member.id, member.fullName)}
                                    className="p-1.5 bg-red-950/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                                    title="Delete member"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Personal Notes Highlights for Admins */}
              <div className="bg-[#121214] border border-[#27272a] p-5 rounded-3xl" id="member-notes-panel">
                <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#a1a1aa] mb-3">
                  {language === 'EN' ? 'Breathing Focus & Ranks Checklist' : 'Checklist & Catatan Fokus Pernapasan'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="member-notes-grid">
                  {filteredMembers.filter(m => m.notes && m.notes.trim() !== '').slice(0, 3).map(m => (
                    <div key={m.id} className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col justify-between">
                      <p className="text-xs italic text-zinc-350 font-sans leading-relaxed">
                        "{m.notes}"
                      </p>
                      <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-[#27272a]">
                        <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] text-white font-bold select-none">
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-semibold text-white">{m.fullName}</span>
                      </div>
                    </div>
                  ))}
                  {filteredMembers.filter(m => m.notes && m.notes.trim() !== '').length === 0 && (
                    <div className="col-span-full py-4 text-xs text-[#a1a1aa] italic font-sans">
                      {language === 'EN' ? 'No personal health or rank notes registered.' : 'Belum ada catatan kesehatan atau pangkat personal yang terdaftar.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* REGISTER MEMBER MODAL - Automatic dynamic BMI calculated inputs */}
          {showMemberModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-xs overflow-y-auto" id="register-member-modal">
              <div className="relative w-full max-w-lg bg-[#121214] border border-[#27272a] rounded-3xl overflow-hidden p-6 sm:p-8 animate-scaleIn max-h-[90vh] overflow-y-auto" id="modal-container-member">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                      {memberFormData.id ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-md sm:text-lg font-bold text-white font-sans">
                        {memberFormData.id 
                          ? (language === 'EN' ? 'Edit Member Profile' : 'Ubah Profil Anggota') 
                          : (language === 'EN' ? 'Register New Member' : 'Daftarkan Anggota Baru')
                        }
                      </h3>
                      <p className="text-[10px] text-[#a1a1aa]">
                        {memberFormData.id 
                          ? (language === 'EN' ? 'Update physical parameters and rank status' : 'Perbarui parameter fisik dan status tingkatan sabuk')
                          : (language === 'EN' ? 'Set dynamic body metrics for athletic tracking' : 'Konfigurasi metrik tubuh untuk pelacakan fisik harian')
                        }
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMemberModal(false)}
                    className="p-1 px-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white cursor-pointer active:scale-95 transition-transform"
                    id="btn-close-member-modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveMember} className="space-y-4" id="member-register-form">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Full Name' : 'Nama Lengkap'} *</label>
                    <input 
                      type="text"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Budi Santoso"
                      value={memberFormData.fullName}
                      onChange={(e) => setMemberFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Gender & Belt Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Gender' : 'Jenis Kelamin'} *</label>
                      <select
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={memberFormData.gender}
                        onChange={(e) => setMemberFormData(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                      >
                        <option value="Male">{language === 'EN' ? 'Male' : 'Pria'}</option>
                        <option value="Female">{language === 'EN' ? 'Female' : 'Wanita'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Belt Level' : 'Tingkatan Sabuk'} *</label>
                      <select
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={memberFormData.beltLevel}
                        onChange={(e) => setMemberFormData(prev => ({ ...prev, beltLevel: Number(e.target.value) }))}
                      >
                        {beltLevels.map(b => (
                          <option key={b.id} value={b.id}>
                            {language === 'EN' ? b.nameEN : b.nameID}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Body Dimensions (Height + Weight) with REAL-TIME BMI CALCULATOR */}
                  <div className="bg-[#09090b] border border-[#27272a] p-4.5 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">{language === 'EN' ? 'Body Parameters' : 'Parameter Tubuh'}</span>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-[#a1a1aa]">{language === 'EN' ? 'Live BMI' : 'BMI Langsung'}:</span>
                        <span className="font-black text-white">
                          {(memberFormData.height > 0 
                            ? (memberFormData.weight / ((memberFormData.height / 100) * (memberFormData.height / 100))).toFixed(1)
                            : '0.0'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Height text field & Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">{language === 'EN' ? 'Height (cm)' : 'Tinggi Badan (cm)'}</label>
                          <span className="text-[11px] font-mono text-white font-semibold">{memberFormData.height} cm</span>
                        </div>
                        <input 
                          type="range"
                          min="100"
                          max="230"
                          className="w-full accent-emerald-500 mb-1"
                          value={memberFormData.height}
                          onChange={(e) => setMemberFormData(prev => ({ ...prev, height: Number(e.target.value) }))}
                        />
                        <input 
                          type="number"
                          className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-2 py-1 text-xs text-center font-mono text-white focus:outline-none focus:border-emerald-500"
                          value={memberFormData.height}
                          onChange={(e) => setMemberFormData(prev => ({ ...prev, height: Number(e.target.value) }))}
                        />
                      </div>

                      {/* Weight text field & Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">{language === 'EN' ? 'Weight (kg)' : 'Berat Badan (kg)'}</label>
                          <span className="text-[11px] font-mono text-white font-semibold">{memberFormData.weight} kg</span>
                        </div>
                        <input 
                          type="range"
                          min="30"
                          max="160"
                          className="w-full accent-emerald-500 mb-1"
                          value={memberFormData.weight}
                          onChange={(e) => setMemberFormData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                        />
                        <input 
                          type="number"
                          className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-2 py-1 text-xs text-center font-mono text-white focus:outline-none focus:border-emerald-500"
                          value={memberFormData.weight}
                          onChange={(e) => setMemberFormData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    {/* Live BMI indicator banner */}
                    {(() => {
                      const computedBmiVal = memberFormData.height > 0 
                        ? (memberFormData.weight / ((memberFormData.height / 100) * (memberFormData.height / 100)))
                        : 0;
                      
                      let bannerText = '';
                      let bannerColor = '';
                      if (computedBmiVal < 18.5) {
                        bannerText = language === 'EN' ? 'Underweight — Practitioner requires muscle mass progression.' : 'Kurang Berat Badan — Praktisi membutuhkan peningkatan massa otot.';
                        bannerColor = 'bg-blue-950/25 text-blue-400 border border-blue-500/10';
                      } else if (computedBmiVal <= 24.9) {
                        bannerText = language === 'EN' ? 'Optimal BMI — Superb physical frame for central breathing locks.' : 'BMI Optimal — Postur yang fantastis untuk pernapasan terkunci.';
                        bannerColor = 'bg-emerald-950/25 text-emerald-400 border border-emerald-500/15';
                      } else if (computedBmiVal <= 29.9) {
                        bannerText = language === 'EN' ? 'Overweight — Moderate cardiovascular training is advised.' : 'Kelebihan Berat Badan — Disarankan porsi latihan kardiovaskular moderat.';
                        bannerColor = 'bg-amber-950/25 text-amber-500 border border-amber-500/10';
                      } else {
                        bannerText = language === 'EN' ? 'Obese — Highly structured endurance conditioning required.' : 'Obesitas — Diperlukan pengkondisian daya tahan terstruktur tinggi.';
                        bannerColor = 'bg-red-950/20 text-red-500 border border-red-500/15';
                      }

                      return (
                        <div className={`p-3 rounded-xl text-[10px] leading-relaxed font-medium flex items-center gap-2 mt-2 ${bannerColor}`}>
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span>{bannerText}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Dates Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Birth Date' : 'Tanggal Lahir'}</label>
                      <input 
                        type="date"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={memberFormData.birthDate}
                        onChange={(e) => setMemberFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Joined Date' : 'Tanggal Masuk'}</label>
                      <input 
                        type="date"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={memberFormData.joinedDate}
                        onChange={(e) => setMemberFormData(prev => ({ ...prev, joinedDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Contact details */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Phone Number / Contact' : 'Nomor Telepon / Kontak'}</label>
                    <input 
                      type="tel"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. +62812345678"
                      value={memberFormData.phoneNumber}
                      onChange={(e) => setMemberFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Status' : 'Status'} *</label>
                    <select
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={memberFormData.status}
                      onChange={(e) => setMemberFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    >
                      <option value="active">{language === 'EN' ? 'Active' : 'Aktif'}</option>
                      <option value="inactive">{language === 'EN' ? 'Inactive' : 'Nonaktif'}</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa] mb-1.5">{language === 'EN' ? 'Practitioner Health / Rank Notes' : 'Catatan Kesehatan / Tingkat Latihan'}</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder={language === 'EN' ? "e.g. Focus on stomach muscles control during static positions..." : "misal. Fokus pada kontrol otot perut saat kuda-kuda statis..."}
                      value={memberFormData.notes}
                      onChange={(e) => setMemberFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMemberModal(false)}
                      className="w-1/2 p-2.5 rounded-xl border border-[#27272a] hover:bg-neutral-800 transition-colors text-xs font-semibold text-[#fafafa] cursor-pointer text-center"
                    >
                      {language === 'EN' ? 'Discard' : 'Batal'}
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer text-center shadow-md shadow-emerald-500/10"
                      id="btn-submit-save-member"
                    >
                      {memberFormData.id
                        ? (language === 'EN' ? 'Save Changes' : 'Simpan Perubahan')
                        : (language === 'EN' ? 'Save Member' : 'Simpan Anggota')
                      }
                    </button>
                  </div>
                </form>
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
              language={language}
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
                    <option value="jurus" className="bg-[#18181b]">Jurus (Forms)</option>
                    <option value="pernapasan" className="bg-[#18181b]">Pernapasan (Breathing Conditioning)</option>
                    <option value="exercise" className="bg-[#18181b]">Exercise (Physical Workout)</option>
                    <option value="isometrik" className="bg-[#18181b]">Isometrik (Isometric Tension)</option>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">{language === 'EN' ? 'Belt Level' : 'Tingkatan Sabuk'}</label>
                  <select 
                    value={formData.difficulty}
                    onChange={(e) => setFormData(p => ({ ...p, difficulty: Number(e.target.value) }))}
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
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Target Unit</label>
                  <select 
                    value={formData.targetUnit || 'minutes'}
                    onChange={(e) => {
                      const nu = e.target.value as any;
                      setFormData(p => ({ 
                        ...p, 
                        targetUnit: nu,
                        targetValue: nu !== 'minutes' ? (p.targetValue || 10) : (p.duration || 15)
                      }));
                    }}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-white text-xs cursor-pointer focus:border-emerald-500/50 focus:outline-none"
                  >
                    <option value="minutes">⏱️ Minutes</option>
                    <option value="reps">🔁 Reps (Repetitions)</option>
                    <option value="series">🧩 Series (Forms/Jurus)</option>
                    <option value="cycles">🔄 Cycles (Breaths)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">
                    {(formData.targetUnit || 'minutes') === 'minutes' ? 'Target mins' : `Target ${formData.targetUnit}`}
                  </label>
                  <input 
                    type="number" 
                    value={formData.targetValue !== undefined ? formData.targetValue : (formData.duration || 15)}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      setFormData(p => ({
                        ...p,
                        targetValue: val
                      }));
                    }}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-white text-center font-mono focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Calories (Est)</label>
                  <input 
                    type="number" 
                    value={formData.calories}
                    onChange={(e) => setFormData(p => ({ ...p, calories: Number(e.target.value) }))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-white text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Video URL (Demonstration)</label>
                  <input 
                    type="text" 
                    placeholder="E.g., YouTube link or direct MP4 URL"
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

              {/* Diagram Carousel Slides Manager (Multi-Image Slideshow) */}
              <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Diagram Carousel Slides (Multi-Image)</span>
                    <p className="text-[9px] text-[#a1a1aa] mt-0.5">Configure sequential images/diagrams for step-by-step guidance slides.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentSlides = formData.mediaSlides || [];
                      setFormData(p => ({
                        ...p,
                        mediaSlides: [...currentSlides, '']
                      }));
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold font-mono py-1 px-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    + Add Slide Image URL
                  </button>
                </div>

                {(!formData.mediaSlides || formData.mediaSlides.length === 0) ? (
                  <div className="text-center py-4 bg-zinc-950/40 border border-[#27272a]/40 border-dashed rounded-lg text-[10px] text-[#a1a1aa] font-mono">
                    No custom slides added. If left blank, a default placeholder/mock illustration will be displayed as a slide.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {formData.mediaSlides.map((slide, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2.5 bg-zinc-950 p-2 border border-[#27272a] rounded-xl">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 w-16 text-center bg-emerald-950/55 rounded py-1 px-1.5 border border-emerald-500/10 shrink-0">
                          SLIDE {sIdx + 1}
                        </span>
                        
                        {/* Slide Thumbnail Preview if URL is set */}
                        <div className="w-8 h-8 rounded bg-zinc-900 border border-[#27272a] overflow-hidden shrink-0 flex items-center justify-center">
                          {slide ? (
                            <img 
                              src={slide} 
                              alt="thumb" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as any).src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=80"
                              }}
                            />
                          ) : (
                            <div className="text-[8px] text-[#a1a1aa] font-bold">N/A</div>
                          )}
                        </div>

                        <input 
                          type="text" 
                          placeholder="e.g. https://images.unsplash.com/photo-..."
                          value={slide}
                          onChange={(e) => {
                            const updated = [...(formData.mediaSlides || [])];
                            updated[sIdx] = e.target.value;
                            setFormData(p => ({ ...p, mediaSlides: updated }));
                          }}
                          className="flex-1 min-w-0 bg-[#09090b] border border-[#27272a]/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#52525b]"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move up */}
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            onClick={() => {
                              if (sIdx === 0) return;
                              const updated = [...(formData.mediaSlides || [])];
                              const temp = updated[sIdx];
                              updated[sIdx] = updated[sIdx - 1];
                              updated[sIdx - 1] = temp;
                              setFormData(p => ({ ...p, mediaSlides: updated }));
                            }}
                            className="p-1 text-[#a1a1aa] hover:text-white bg-zinc-900 hover:bg-zinc-850 disabled:opacity-20 disabled:hover:bg-transparent rounded cursor-pointer transition-colors"
                            title="Move Up"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>

                          {/* Move down */}
                          <button
                            type="button"
                            disabled={sIdx === (formData.mediaSlides || []).length - 1}
                            onClick={() => {
                              const list = formData.mediaSlides || [];
                              if (sIdx === list.length - 1) return;
                              const updated = [...list];
                              const temp = updated[sIdx];
                              updated[sIdx] = updated[sIdx + 1];
                              updated[sIdx + 1] = temp;
                              setFormData(p => ({ ...p, mediaSlides: updated }));
                            }}
                            className="p-1 text-[#a1a1aa] hover:text-white bg-zinc-900 hover:bg-zinc-850 disabled:opacity-20 disabled:hover:bg-transparent rounded cursor-pointer transition-colors"
                            title="Move Down"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.mediaSlides || []).filter((_, innerIdx) => innerIdx !== sIdx);
                              setFormData(p => ({ ...p, mediaSlides: updated }));
                            }}
                            className="p-1 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded cursor-pointer transition-colors"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/60 p-4 border border-[#27272a] rounded-xl">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#a1a1aa] font-bold mb-1">Overall Exercise Cycles (Loops)</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0 or 1 for uncoded/single playthrough"
                    value={formData.loops !== undefined ? formData.loops : 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData(p => ({ ...p, loops: isNaN(val) ? 0 : Math.max(0, val) }));
                    }}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-white text-center font-mono font-bold max-w-[200px]"
                  />
                  <p className="text-[9px] text-[#a1a1aa] mt-1">Default repeat loop iterations. Use <code className="text-purple-400">0</code> or <code className="text-purple-400">1</code> for single walk, jog, or stretch (Non-cycles).</p>
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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[11px]">
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#a1a1aa] mb-1">State Type</label>
                          <select 
                            value={detail.type || 'instruction'}
                            onChange={(e) => {
                              const nuType = e.target.value as any;
                              // Default unit to none for instruction, default to seconds for active types
                              updateStepRow(idx, { 
                                type: nuType,
                                unit: nuType === 'instruction' ? 'none' : (detail.unit === 'none' ? 'seconds' : detail.unit)
                              });
                            }}
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
                          <label className="block text-[9px] font-mono uppercase text-[#a1a1aa] mb-1">Target Metric</label>
                          <select 
                            value={detail.unit || 'seconds'}
                            onChange={(e) => {
                              const newUnit = e.target.value as any;
                              updateStepRow(idx, { 
                                unit: newUnit,
                                quantity: (newUnit !== 'seconds' && newUnit !== 'none') ? (detail.quantity || 10) : undefined,
                                duration: newUnit === 'none' ? 0 : (detail.duration || 15)
                              });
                            }}
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1.5 text-white"
                          >
                            <option value="none">✨ None (Auto / Manual)</option>
                            <option value="seconds">⏱️ Seconds</option>
                            <option value="reps">🔁 Reps (Repetitions)</option>
                            <option value="series">🧩 Series (Forms/Jurus)</option>
                            <option value="cycles">🔄 Cycles (Breaths)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#a1a1aa] mb-1">
                            {detail.unit === 'none' ? 'Target Metric' : (!detail.unit || detail.unit === 'seconds') ? 'Duration (Sec)' : `Target ${detail.unit}`}
                          </label>
                          {detail.unit === 'none' ? (
                            <div className="w-full bg-[#09090b]/40 border border-[#27272a]/40 rounded-lg py-1.5 text-center text-emerald-400 font-mono text-[9px] font-bold uppercase select-none">
                              Voice / Tap
                            </div>
                          ) : (!detail.unit || detail.unit === 'seconds') ? (
                            <input 
                              type="number" 
                              value={detail.duration || 15}
                              onChange={(e) => updateStepRow(idx, { duration: Math.max(1, Number(e.target.value)) })}
                              required
                              placeholder="Seconds"
                              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1 text-center text-white font-mono"
                            />
                          ) : (
                            <input 
                              type="number" 
                              value={detail.quantity || 10}
                              onChange={(e) => updateStepRow(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                              required
                              placeholder="Quantity"
                              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1 text-center text-white font-mono"
                            />
                          )}
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
                          <label className="block text-[9px] font-mono uppercase text-[#fafafa] font-bold mb-1 font-mono">📣 Speech Cues</label>
                          <input 
                            type="text" 
                            value={detail.ttsCommand || ''}
                            placeholder="e.g. Inhale deeply."
                            onChange={(e) => updateStepRow(idx, { ttsCommand: e.target.value })}
                            className="w-full bg-[#09090b] border border-amber-500/20 rounded-lg px-2 py-1 text-amber-300 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono uppercase text-[#fafafa] font-bold mb-1 font-mono">🔊 Voice Sync</label>
                          <button
                            type="button"
                            onClick={() => updateStepRow(idx, { waitForTTS: detail.waitForTTS !== false ? false : true })}
                            className={`w-full py-1.5 px-3 rounded-lg border text-[10px] font-mono font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                              detail.waitForTTS !== false 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                                : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {detail.waitForTTS !== false ? '🎙️ Wait for Voice' : '⚡ No Waiting'}
                          </button>
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

      {/* CUSTOM IN-APP CONFIRMATION MODAL */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn" id="custom-confirm-modal">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-950/40 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-bold text-white font-sans">{confirmConfig.title}</h4>
                <p className="text-xs text-[#a1a1aa] leading-relaxed font-sans">{confirmConfig.message}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#27272a]/40">
              <button
                type="button"
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="bg-zinc-900 hover:bg-zinc-800 text-[#a1a1aa] hover:text-white border border-[#27272a]/80 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'EN' ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmConfig.onConfirm();
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer transition-all shadow-md shadow-rose-500/10"
              >
                {language === 'EN' ? 'Confirm Delete' : 'Konfirmasi Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
