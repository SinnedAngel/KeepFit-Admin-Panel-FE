import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Database, 
  Play, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Server, 
  Wifi, 
  WifiOff, 
  Code, 
  Copy, 
  ArrowRight,
  Activity,
  Dumbbell,
  Settings,
  Send,
  Sliders,
  Sparkles,
  Plus
} from 'lucide-react';
import { 
  getSupabaseClient, 
  isSupabaseActive, 
  getExercises, 
  getActivities, 
  getCategories, 
  getStats, 
  addActivity,
  resetEntireDatabase
} from '../db';
import { BELT_LEVELS, BeltLevelInfo, Exercise } from '../types';

interface DeveloperTabProps {
  onAddLog: (msg: string, type: 'info' | 'success' | 'warn' | 'api') => void;
  onRefreshAllData: () => Promise<void>;
  beltLevels: BeltLevelInfo[];
  onSaveBeltLevels: (belts: BeltLevelInfo[]) => Promise<void>;
  exercises: Exercise[];
}

export default function DeveloperTab({ 
  onAddLog, 
  onRefreshAllData,
  beltLevels,
  onSaveBeltLevels,
  exercises
}: DeveloperTabProps) {
  const isConnected = isSupabaseActive();
  const supabase = getSupabaseClient();
  
  // Base parameters
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ntmbmenefuhjybydqlwr.supabase.co';
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  // Tab View selection
  const [devTabMode, setDevTabMode] = useState<'rest-client' | 'sdk-calls' | 'belt-levels'>('rest-client');

  // Connection Performance Metrics
  const [pingTime, setPingTime] = useState<number | null>(null);

  // ==========================================
  // STATE FOR REST API CLIENT (CUSTOMIZABLE)
  // ==========================================
  const [apiUrl, setApiUrl] = useState<string>(`${supabaseUrl}/rest/v1/exercises`);
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [httpHeaders, setHttpHeaders] = useState<{ id: string; key: string; value: string; active: boolean }[]>([
    { id: 'h-1', key: 'apikey', value: supabaseAnonKey, active: true },
    { id: 'h-2', key: 'Authorization', value: `Bearer ${supabaseAnonKey}`, active: true },
    { id: 'h-3', key: 'Content-Type', value: 'application/json', active: true },
    { id: 'h-4', key: 'Prefer', value: 'return=representation', active: false }
  ]);
  const [apiRequestBody, setApiRequestBody] = useState<string>(`[\n  {\n    "id": "ex-custom-${Date.now()}",\n    "title": "Interactive Breath locks",\n    "category": "Breathing",\n    "difficulty": "sabuk kuning",\n    "duration": 15,\n    "calories": 75,\n    "description": "Custom POSTed movement engineered over Supabase REST endpoint."\n  }\n]`);
  
  const [restLoading, setRestLoading] = useState<boolean>(false);
  const [restOutput, setRestOutput] = useState<{
    status: number | null;
    statusText: string;
    latencyMs: number | null;
    headers: Record<string, string>;
    body: any;
  } | null>(null);

  // ==========================================
  // QUERY PARAMETER CONSTRUCTOR BUILDER STATE
  // ==========================================
  const [builderTable, setBuilderTable] = useState<string>('exercises');
  const [builderCategory, setBuilderCategory] = useState<string>('all');
  const [builderDifficulty, setBuilderDifficulty] = useState<string>('all');
  const [builderOrderCol, setBuilderOrderCol] = useState<string>('id');
  const [builderOrderDir, setBuilderOrderDir] = useState<string>('desc');
  const [builderLimit, setBuilderLimit] = useState<string>('all');

  // ==========================================
  // STATE FOR DIRECT SDK QUERY MODULE
  // ==========================================
  const [selectedSdkMethod, setSelectedSdkMethod] = useState<string>('getExercises');
  const [sdkLoading, setSdkLoading] = useState<boolean>(false);
  const [sdkOutput, setSdkOutput] = useState<any>(null);

  // ==========================================
  // STATE FOR DYNAMIC BELT LEVELS MANAGER
  // ==========================================
  const [editingBelt, setEditingBelt] = useState<BeltLevelInfo | null>(null);
  const [showBeltForm, setShowBeltForm] = useState<boolean>(false);
  const [beltFormId, setBeltFormId] = useState<string>('');
  const [beltFormNameEN, setBeltFormNameEN] = useState<string>('');
  const [beltFormNameID, setBeltFormNameID] = useState<string>('');
  const [beltFormColor, setBeltFormColor] = useState<string>('bg-white/10 text-white border-white/20');
  const [beltFormOrderIndex, setBeltFormOrderIndex] = useState<number>(1);

  // Sync Supabase Key changes to Headers context
  useEffect(() => {
    setHttpHeaders([
      { id: 'h-1', key: 'apikey', value: supabaseAnonKey, active: true },
      { id: 'h-2', key: 'Authorization', value: `Bearer ${supabaseAnonKey}`, active: true },
      { id: 'h-3', key: 'Content-Type', value: 'application/json', active: true },
      { id: 'h-4', key: 'Prefer', value: 'return=representation', active: httpMethod === 'POST' }
    ]);
  }, [supabaseAnonKey, httpMethod]);

  // Construct URL dynamically
  const updateUrlFromBuilder = (
    table: string,
    category: string,
    difficulty: string,
    orderCol: string,
    orderDir: string,
    limit: string
  ) => {
    const baseUrl = `${supabaseUrl}/rest/v1/${table}`;
    const params: string[] = [];

    if (table !== 'categories' && category !== 'all') {
      params.push(`category=eq.${category}`);
    }

    if (table === 'exercises' && difficulty !== 'all') {
      params.push(`difficulty=eq.${difficulty}`);
    }

    if (orderCol) {
      params.push(`order=${orderCol}.${orderDir}`);
    }

    if (limit !== 'all') {
      params.push(`limit=${limit}`);
    }

    const finalQuery = params.length > 0 ? `?${params.join('&')}` : '';
    setApiUrl(`${baseUrl}${finalQuery}`);
  };

  const handleBuilderChange = (field: 'table' | 'category' | 'difficulty' | 'orderCol' | 'orderDir' | 'limit', val: string) => {
    let t = builderTable;
    let cat = builderCategory;
    let diff = builderDifficulty;
    let oCol = builderOrderCol;
    let oDir = builderOrderDir;
    let lim = builderLimit;

    if (field === 'table') {
      t = val;
      setBuilderTable(val);
      // Adjust default sorting columns based on selection
      if (val === 'activities') {
        oCol = 'timestamp';
        setBuilderOrderCol('timestamp');
      } else {
        oCol = 'id';
        setBuilderOrderCol('id');
      }
    } else if (field === 'category') {
      cat = val;
      setBuilderCategory(val);
    } else if (field === 'difficulty') {
      diff = val;
      setBuilderDifficulty(val);
    } else if (field === 'orderCol') {
      oCol = val;
      setBuilderOrderCol(val);
    } else if (field === 'orderDir') {
      oDir = val;
      setBuilderOrderDir(val);
    } else if (field === 'limit') {
      lim = val;
      setBuilderLimit(val);
    }

    updateUrlFromBuilder(t, cat, diff, oCol, oDir, lim);
  };

  // Handle Preset Choices helper
  const loadPresetRoute = (route: 'exercises-get' | 'activities-get' | 'activities-post' | 'categories-get') => {
    switch (route) {
      case 'exercises-get':
        setBuilderTable('exercises');
        setBuilderCategory('all');
        setBuilderDifficulty('all');
        setBuilderOrderCol('id');
        setBuilderOrderDir('desc');
        setBuilderLimit('all');
        setApiUrl(`${supabaseUrl}/rest/v1/exercises`);
        setHttpMethod('GET');
        break;
      case 'activities-get':
        setBuilderTable('activities');
        setBuilderCategory('all');
        setBuilderOrderCol('timestamp');
        setBuilderOrderDir('desc');
        setBuilderLimit('10');
        setApiUrl(`${supabaseUrl}/rest/v1/activities?order=timestamp.desc&limit=10`);
        setHttpMethod('GET');
        break;
      case 'activities-post':
        setApiUrl(`${supabaseUrl}/rest/v1/activities`);
        setHttpMethod('POST');
        setApiRequestBody(JSON.stringify({
          id: `act-rest-${Date.now()}`,
          userId: `usr-${Math.floor(100 + Math.random() * 900)}`,
          userName: 'Alex Mercer',
          userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=128&h=128&q=80',
          exerciseId: 'ex-kateda-1',
          exerciseTitle: 'Solar Breath Core Tensing',
          timestamp: new Date().toISOString(),
          duration: 25,
          caloriesBurned: 180,
          status: 'completed',
          notes: 'REST client callback log triggered via custom API endpoint'
        }, null, 2));
        break;
      case 'categories-get':
        setBuilderTable('categories');
        setBuilderCategory('all');
        setBuilderOrderCol('id');
        setBuilderOrderDir('asc');
        setBuilderLimit('all');
        setApiUrl(`${supabaseUrl}/rest/v1/categories`);
        setHttpMethod('GET');
        break;
    }
    onAddLog(`Loaded route preset. Target URL pointing to Supabase tables updated.`, 'info');
  };

  // Ping database function
  const testPing = async () => {
    if (!isConnected || !supabase) return;
    const start = performance.now();
    try {
      await supabase.from('categories').select('id').limit(1);
      const end = performance.now();
      setPingTime(Math.round(end - start));
      onAddLog('Handshake latency check to remote database tables successful.', 'success');
    } catch {
      setPingTime(null);
      onAddLog('Supabase connection latency probe failed.', 'warn');
    }
  };

  // ==========================================
  // BELT LEVELS HANDLERS
  // ==========================================
  const handleOpenAddBelt = () => {
    setEditingBelt(null);
    setBeltFormId('');
    setBeltFormNameEN('');
    setBeltFormNameID('');
    setBeltFormColor('bg-white/10 text-white border-white/20');
    const nextOrder = beltLevels.length > 0 
      ? Math.max(...beltLevels.map(b => b.order_index || 0)) + 1 
      : 1;
    setBeltFormOrderIndex(nextOrder);
    setShowBeltForm(true);
  };

  const handleOpenEditBelt = (belt: BeltLevelInfo) => {
    setEditingBelt(belt);
    setBeltFormId(belt.id);
    setBeltFormNameEN(belt.nameEN);
    setBeltFormNameID(belt.nameID);
    setBeltFormColor(belt.color);
    setBeltFormOrderIndex(belt.order_index);
    setShowBeltForm(true);
  };

  const handleSaveBeltForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beltFormId || !beltFormNameEN || !beltFormNameID) {
      onAddLog('Please key in the ID key, English Name, and Indonesian Name coordinates.', 'warn');
      return;
    }

    const cleanId = beltFormId.trim().toLowerCase();
    let updatedBelts = [...beltLevels];
    
    const newBelt: BeltLevelInfo = {
      id: cleanId,
      nameEN: beltFormNameEN.trim(),
      nameID: beltFormNameID.trim(),
      color: beltFormColor,
      order_index: Number(beltFormOrderIndex) || 99
    };

    if (editingBelt) {
      const idx = updatedBelts.findIndex(b => b.id.toLowerCase() === editingBelt.id.toLowerCase());
      if (idx !== -1) {
        updatedBelts[idx] = newBelt;
      }
    } else {
      if (updatedBelts.some(b => b.id.toLowerCase() === cleanId)) {
        onAddLog(`A belt level with target code "${cleanId}" already exists in the active lookup registry.`, 'warn');
        return;
      }
      updatedBelts.push(newBelt);
    }

    try {
      onAddLog(`Syncing belt level change database query...`, 'info');
      await onSaveBeltLevels(updatedBelts);
      setShowBeltForm(false);
      onAddLog(`Successfully saved belt level specifications for "${cleanId}"!`, 'success');
    } catch (err: any) {
      onAddLog(`Failed to save belt level schema: ${err.message || err}`, 'warn');
    }
  };

  const handleDeleteBelt = async (beltId: string) => {
    const cleanId = beltId.toLowerCase();
    const inUse = exercises.some(ex => ex.difficulty?.toLowerCase() === cleanId);
    if (inUse) {
      onAddLog(`Cannot delete belt level "${beltId}"! It is currently allocated to active training routines.`, 'warn');
      return;
    }

    const updatedBelts = beltLevels.filter(b => b.id.toLowerCase() !== cleanId);
    try {
      onAddLog(`Deleting belt level "${beltId}" from active catalog registry...`, 'info');
      await onSaveBeltLevels(updatedBelts);
      onAddLog(`Successfully deleted belt level specification for "${beltId}"`, 'success');
    } catch (err: any) {
      onAddLog(`Failed to delete belt level: ${err.message || err}`, 'warn');
    }
  };

  useEffect(() => {
    if (isConnected) {
      testPing();
    }
  }, [isConnected]);

  // Add / Edit Custom HTTP header helper functions
  const addHeaderRow = () => {
    setHttpHeaders([...httpHeaders, { id: `h-${Date.now()}`, key: '', value: '', active: true }]);
  };

  const removeHeaderRow = (id: string) => {
    setHttpHeaders(httpHeaders.filter((h) => h.id !== id));
  };

  const updateHeaderRow = (id: string, field: 'key' | 'value' | 'active', value: any) => {
    setHttpHeaders(
      httpHeaders.map((h) => {
        if (h.id === id) {
          return { ...h, [field]: value };
        }
        return h;
      })
    );
  };

  // ==========================================
  // CORE REST TRIGGER METHOD (REAL HTTP CALLS)
  // ==========================================
  const executeRestCall = async () => {
    setRestLoading(true);
    setRestOutput(null);
    onAddLog(`Dispatching real HTTP fetch request: ${httpMethod} ${apiUrl}`, 'api');

    const headersObj: Record<string, string> = {};
    httpHeaders.forEach((h) => {
      if (h.active && h.key.trim() !== '') {
        headersObj[h.key.trim()] = h.value;
      }
    });

    const startTime = performance.now();
    try {
      const options: RequestInit = {
        method: httpMethod,
        headers: headersObj,
      };

      if (httpMethod !== 'GET' && apiRequestBody) {
        options.body = apiRequestBody;
      }

      const response = await fetch(apiUrl, options);
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      // Extract details
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      let responseBody: any = null;
      const textOutput = await response.text();
      try {
        responseBody = textOutput ? JSON.parse(textOutput) : { message: 'Empty body returned.' };
      } catch (parseErr) {
        responseBody = textOutput || 'Could not parse response text.';
      }

      setRestOutput({
        status: response.status,
        statusText: response.statusText || (response.status >= 200 && response.status < 300 ? 'OK' : 'Error Response'),
        latencyMs,
        headers: responseHeaders,
        body: responseBody
      });

      if (response.ok) {
        onAddLog(`HTTP ${response.status} returned from ${apiUrl} in ${latencyMs}ms.`, 'success');
        // If post succeeds on activities database table, refresh statistics data transparently
        if (httpMethod === 'POST' && apiUrl.includes('activities')) {
          await onRefreshAllData();
        }
      } else {
        onAddLog(`HTTP ${response.status} Error returned: ${JSON.stringify(responseBody)}`, 'warn');
      }

    } catch (err: any) {
      const endTime = performance.now();
      setRestOutput({
        status: 0,
        statusText: 'CORS or Network Failure',
        latencyMs: Math.round(endTime - startTime),
        headers: {},
        body: {
          error: err.message || 'The browser blocked the fetch request due to CORS, invalid credentials, or offline connectivity.',
          suggestion: 'Make sure your Supabase Project URL is online, and your project\'s API limits enable cross-origin access.'
        }
      });
      onAddLog(`Fetch execution failure on ${apiUrl}: ${err.message}`, 'warn');
    } finally {
      setRestLoading(false);
    }
  };

  // ==========================================
  // CORE SDK DIRECT ACTION TRIGGER 
  // ==========================================
  const executeSdkCall = async () => {
    setSdkLoading(true);
    setSdkOutput(null);
    onAddLog(`Initiating live Direct database client SDK method: ${selectedSdkMethod}...`, 'info');

    try {
      let result: any = null;

      switch (selectedSdkMethod) {
        case 'getStats':
          result = await getStats();
          onAddLog('Live aggregate statistics computed successfully.', 'success');
          break;
        case 'getExercises':
          result = await getExercises();
          onAddLog(`Fetched program catalog. Loaded ${result.length} workouts.`, 'success');
          break;
        case 'getActivities':
          result = await getActivities();
          onAddLog(`Fetched active trackers. Loaded ${result.length} workout outcomes.`, 'success');
          break;
        case 'getCategories':
          result = await getCategories();
          onAddLog(`Fetched taxonomies. Loaded ${result.length} category metadata files.`, 'success');
          break;
        default:
          throw new Error('Method call context unknown.');
      }

      setSdkOutput({
        timestamp: new Date().toISOString(),
        isKatedaCore: true,
        source: isConnected ? 'Supabase cloud client' : 'Local state Client-Only Database (offline fallback)',
        data: result
      });

    } catch (err: any) {
      setSdkOutput({
        timestamp: new Date().toISOString(),
        error: err.message || 'Direct connection to Supabase aborted'
      });
      onAddLog(`SDK Error on ${selectedSdkMethod}: ${err.message}`, 'warn');
    } finally {
      setSdkLoading(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onAddLog('Payload copied to keyboard.', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="view-developer-sdk">
      
      {/* SUPABASE CONNECTION AUDIT OVERVIEW */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl" id="connection-credentials-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-5">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isConnected ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'}`}>
              {isConnected ? <Wifi className="w-6 h-6 animate-pulse" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#a1a1aa] uppercase bg-zinc-950 px-2 py-0.5 border border-[#27272a] rounded">
                REST & SDK Diagnostics
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Remote Server Database Coordinates</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live PostgREST Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Local Client Sandboxed State
              </span>
            )}
            
            {isConnected && (
              <button 
                onClick={testPing}
                className="p-2 bg-zinc-950 hover:bg-zinc-900 text-xs text-[#a1a1aa] hover:text-white border border-[#27272a] rounded-xl cursor-pointer"
                title="Verify ping latency"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-zinc-950 p-4 border border-[#27272a] rounded-xl">
            <h4 className="text-[10px] uppercase font-mono font-bold text-[#a1a1aa] tracking-widest">PostgREST Endpoint</h4>
            <p className="text-xs font-semibold text-white mt-1 truncate select-all">{supabaseUrl}</p>
          </div>
          <div className="bg-zinc-950 p-4 border border-[#27272a] rounded-xl">
            <h4 className="text-[10px] uppercase font-mono font-bold text-[#a1a1aa] tracking-widest">Project ID</h4>
            <p className="text-xs font-semibold text-white mt-1 truncate font-mono select-all">ntmbmenefuhjybydqlwr</p>
          </div>
          <div className="bg-zinc-950 p-4 border border-[#27272a] rounded-xl flex items-center justify-between">
            <div>
              <h4 className="text-[10px] uppercase font-mono font-bold text-[#a1a1aa] tracking-widest">Connection Latency</h4>
              <p className="text-xs font-semibold text-white mt-1">
                {pingTime !== null ? `${pingTime} ms (Responsive)` : isConnected ? 'Probing...' : 'N/A'}
              </p>
            </div>
            <Server className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-[#a1a1aa]'}`} />
          </div>
        </div>

        {/* Dynamic Recovery Control */}
        <div className="mt-5 p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Syllabus Curriculum Data Seed Recovery
            </h4>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              If your database currently appears blank, click the button to reload all the original Kateda Central Power breathing movements, exercises, categories, and belt levels dynamically.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Are you sure you want to format and reseed all starter syllabus templates? This will overwrite exercises, categories, activities, and belt level parameters.")) {
                try {
                  onAddLog("Initiating local/remote database format & re-seed...", "info");
                  await resetEntireDatabase();
                  onAddLog("Starter curriculum templates successfully loaded and active database synchronized!", "success");
                  await onRefreshAllData();
                } catch (err: any) {
                  onAddLog(`Database recovery failed: ${err.message || err}`, "warn");
                }
              }
            }}
            className="shrink-0 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02]"
          >
            Re-seed Initial Data
          </button>
        </div>
      </div>

      {/* CORE INTERACTIVE SANDBOX TOGGLES */}
      <div className="flex border-b border-[#27272a]">
        <button
          onClick={() => setDevTabMode('rest-client')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            devTabMode === 'rest-client'
              ? 'border-purple-500 text-white bg-purple-500/5'
              : 'border-transparent text-[#a1a1aa] hover:text-white'
          }`}
        >
          <Code className="w-4 h-4 text-purple-400" />
          Real REST API HTTP Client
        </button>
        <button
          onClick={() => setDevTabMode('sdk-calls')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            devTabMode === 'sdk-calls'
              ? 'border-purple-500 text-white bg-purple-500/5'
              : 'border-transparent text-[#a1a1aa] hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          Direct JS SDK Client
        </button>
        <button
          onClick={() => setDevTabMode('belt-levels')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            devTabMode === 'belt-levels'
              ? 'border-purple-500 text-white bg-purple-500/5'
              : 'border-transparent text-[#a1a1aa] hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          Belt Levels Database Manager
        </button>
      </div>

      {/* RENDER TAB 1: REAL REST API CLIENT (CUSTOMIZABLE) */}
      {devTabMode === 'rest-client' && (
        <div className="space-y-6 animate-fadeIn" id="dev-rest-client-module">
          
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-6 shadow-xl">
            
            {/* Quick Presets header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950 p-4 border border-[#27272a] rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Supabase REST URI Presets
                </h4>
                <p className="text-[10px] text-[#a1a1aa] mt-0.5">Quickly swap base templates then fine-tune parameters or URL below.</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => loadPresetRoute('exercises-get')}
                  className="px-2.5 py-1.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[10px] font-mono text-white rounded-lg cursor-pointer font-bold"
                >
                  GET /exercises
                </button>
                <button
                  onClick={() => loadPresetRoute('activities-get')}
                  className="px-2.5 py-1.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[10px] font-mono text-white rounded-lg cursor-pointer font-bold"
                >
                  GET /activities?limit=10
                </button>
                <button
                  onClick={() => loadPresetRoute('activities-post')}
                  className="px-2.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/20 text-[10px] font-mono text-purple-300 rounded-lg cursor-pointer font-bold"
                >
                  POST /activities (Insert)
                </button>
                <button
                  onClick={() => loadPresetRoute('categories-get')}
                  className="px-2.5 py-1.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[10px] font-mono text-white rounded-lg cursor-pointer font-bold"
                >
                  GET /categories
                </button>
              </div>
            </div>

            {/* INTERACTIVE URL & QUERY PARAMETERS CONSTRUCTOR PANEL */}
            <div className="p-4 bg-zinc-950 border border-[#27272a] rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Live API Parameter Query Builder
                </h4>
                <span className="text-[9px] font-mono bg-purple-950/40 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded uppercase font-bold">
                  Updates URL Automatically
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {/* Table Name Selection */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">Target Table Name</label>
                  <select
                    value={builderTable}
                    onChange={(e) => handleBuilderChange('table', e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-2 text-[11px] font-mono text-white cursor-pointer focus:outline-none focus:border-purple-500"
                  >
                    <option value="exercises">exercises</option>
                    <option value="activities">activities</option>
                    <option value="categories">categories</option>
                  </select>
                </div>

                {/* Category Selection Filter */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">
                    Filter Category
                  </label>
                  <select
                    value={builderCategory}
                    disabled={builderTable === 'categories'}
                    onChange={(e) => handleBuilderChange('category', e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-2.5 py-2 text-[11px] font-mono text-white cursor-pointer focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">All Categories (no filter)</option>
                    <option value="kateda">kateda (Martial Breath)</option>
                    <option value="breathing">breathing (Lung Expansion)</option>
                    <option value="warm-ups">warm-ups (Intro Prep)</option>
                    <option value="conditioning">conditioning (Fortitude)</option>
                    <option value="stretching">stretching (Flexibility)</option>
                  </select>
                </div>

                {/* Belt Level Filter */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">
                    Filter Belt Level
                  </label>
                  <select
                    value={builderDifficulty}
                    disabled={builderTable !== 'exercises'}
                    onChange={(e) => handleBuilderChange('difficulty', e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-2.5 py-2 text-[11px] font-mono text-white cursor-pointer focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">All Belt Levels (no filter)</option>
                    {beltLevels.map(belt => (
                      <option key={belt.id} value={belt.id}>
                        {belt.id} ({belt.nameEN})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Column Selection */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">Order By Option</label>
                  <div className="flex gap-1.5">
                    <select
                      value={builderOrderCol}
                      onChange={(e) => handleBuilderChange('orderCol', e.target.value)}
                      className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2 text-[11px] font-mono text-white cursor-pointer focus:outline-none focus:border-purple-500"
                    >
                      <option value="id">id</option>
                      {builderTable === 'exercises' && <option value="title">title</option>}
                      {builderTable === 'exercises' && <option value="category">category</option>}
                      {builderTable === 'exercises' && <option value="duration">duration</option>}
                      {builderTable === 'activities' && <option value="timestamp">timestamp</option>}
                      {builderTable === 'activities' && <option value="duration">duration</option>}
                      {builderTable === 'activities' && <option value="caloriesBurned">calories</option>}
                    </select>
                    <select
                      value={builderOrderDir}
                      onChange={(e) => handleBuilderChange('orderDir', e.target.value)}
                      className="w-16 bg-[#18181b] border border-[#27272a] rounded-lg px-1 text-[10px] font-mono text-white cursor-pointer focus:outline-none focus:border-purple-500"
                    >
                      <option value="desc">desc</option>
                      <option value="asc">asc</option>
                    </select>
                  </div>
                </div>

                {/* Limits Selection */}
                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#27272a]/40 pt-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">Limit Output Records</label>
                    <select
                      value={builderLimit}
                      onChange={(e) => handleBuilderChange('limit', e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-2 text-[11px] font-mono text-white cursor-pointer focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Records (no limit parameter)</option>
                      <option value="5">Limit to 5 items</option>
                      <option value="10">Limit to 10 items</option>
                      <option value="20">Limit to 20 items</option>
                      <option value="50">Limit to 50 items</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <span className="text-[10px] text-[#a1a1aa] font-mono leading-tight">
                      💡 Changing any selector above automatically regenerates standard PostgREST queries and fills the customizable endpoint.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom URL, parameters, methods input pane */}
            <div className="space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-purple-400">
                Configure HTTP Packet Coordinates
              </span>
              
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Method selector */}
                <div className="w-full lg:w-32">
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">HTTP Method</label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as any)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-purple-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                {/* API CUSTOMIZABLE URL */}
                <div className="flex-1">
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa] mb-1">Custom API Request Endpoint URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://your-domain.com/api/endpoint"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3 pr-20 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500 select-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-[#a1a1aa] bg-zinc-900 border border-[#27272a] px-1.5 py-0.5 rounded">
                      EDITABLE
                    </span>
                  </div>
                </div>
              </div>

              {/* HEADERS MANAGEMENT (COLLAPSIBLE / PROGRAMMABLE) */}
              <div className="space-y-2 border border-[#27272a] p-4 rounded-xl bg-zinc-950/80">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    Request Headers ({httpHeaders.filter(h => h.active).length} Active)
                  </h4>
                  <button
                    onClick={addHeaderRow}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-mono font-bold cursor-pointer"
                  >
                    + ADD HEADER
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {httpHeaders.map((header) => (
                    <div key={header.id} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={header.active}
                        onChange={(e) => updateHeaderRow(header.id, 'active', e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-zinc-900 accent-purple-500 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => updateHeaderRow(header.id, 'key', e.target.value)}
                        placeholder="Header key name"
                        className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateHeaderRow(header.id, 'value', e.target.value)}
                        placeholder="Key value string"
                        className="flex-2 bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-purple-500 truncate"
                        title={header.value}
                      />
                      <button
                        onClick={() => removeHeaderRow(header.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 px-1 cursor-pointer font-bold font-mono"
                      >
                        DEL
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* REQUEST BODY BODY (Conditional for POST/PATCH) */}
              {httpMethod !== 'GET' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-mono font-bold uppercase text-[#a1a1aa]">
                    Request Payload Body (JSON)
                  </label>
                  <textarea
                    rows={6}
                    value={apiRequestBody}
                    onChange={(e) => setApiRequestBody(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* EXECUTE INTERACTIVE REST CLIENT SUBMIT BUTTON */}
              <button
                onClick={executeRestCall}
                disabled={restLoading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/15"
              >
                {restLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>FETCHING API RESPONSE PACKETS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white shrink-0" />
                    <span>DISPATCH ACTIVE HTTP REQUEST ({httpMethod})</span>
                  </>
                )}
              </button>
            </div>

            {/* REST Client Console Output Screen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-[#27272a]/60">
              
              {/* Output Response Header pane */}
              <div className="space-y-2 flex flex-col h-full min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase text-[#a1a1aa] tracking-widest">
                  1. Server HTTP Response Headers
                </span>
                
                <div className="flex-1 bg-zinc-950 border border-[#27272a] rounded-xl p-4 font-mono text-[11px] text-[#a1a1aa] min-h-[160px] overflow-y-auto">
                  {restOutput ? (
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between border-b border-[#27272a] pb-1 text-white text-[10px]">
                        <span>Header Key</span>
                        <span>Value</span>
                      </div>
                      <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                        <span className="text-purple-400">content-type</span>
                        <span className="text-white truncate max-w-xs">{restOutput.headers['content-type'] || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                        <span className="text-purple-400">status</span>
                        <span className="text-white font-bold">{restOutput.status} {restOutput.statusText}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                        <span className="text-purple-400">roundtrip latency</span>
                        <span className="text-emerald-400 font-bold">{restOutput.latencyMs} ms</span>
                      </div>
                      {Object.entries(restOutput.headers).map(([key, val]) => {
                        if (['content-type', 'status'].includes(key)) return null;
                        return (
                          <div key={key} className="flex justify-between border-b border-[#27272a]/25 pb-1 text-[10px] overflow-hidden truncate whitespace-nowrap">
                            <span className="text-[#a1a1aa]">{key}</span>
                            <span className="text-white shrink-0 font-medium truncate max-w-[200px]" title={val}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8 text-[#a1a1aa]/60">
                      <Terminal className="w-6 h-6 text-[#27272a]" />
                      <p className="text-[10px] italic">Telemetry header payload clear.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Output Response Body pane */}
              <div className="space-y-2 flex flex-col h-full min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase text-[#a1a1aa] tracking-widest">
                  2. JSON Response Body Console
                </span>

                <div className="flex-1 bg-zinc-950 border border-[#27272a] rounded-xl flex flex-col overflow-hidden justify-between min-h-[160px]">
                  {restOutput ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="px-4 py-2 bg-zinc-900 border-b border-[#27272a]/80 flex items-center justify-between text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          restOutput.status && restOutput.status >= 200 && restOutput.status < 300 
                            ? 'bg-emerald-950/70 text-emerald-400' 
                            : 'bg-red-950/70 text-red-400'
                        }`}>
                          HTTP STAT: {restOutput.status} {restOutput.statusText}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => copyToClipboard(JSON.stringify(restOutput.body, null, 2))}
                            className="text-[#a1a1aa] hover:text-white font-mono text-[10px] cursor-pointer"
                            title="Copy Response JSON"
                          >
                            COPY
                          </button>
                        </div>
                      </div>

                      <pre className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-emerald-400 text-left select-all max-h-64">
                        <code>{JSON.stringify(restOutput.body, null, 2)}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 m-auto text-[#a1a1aa]/60">
                      <Code className="w-8 h-8 text-[#27272a]" />
                      <p className="text-[10px] italic">JSON Response body clear.</p>
                      <p className="text-[9px] max-w-[200px]">Send HTTP request to trigger a real API roundtrip.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* RENDER TAB 2: JS SDK DIRECT ACTIONS (ORM METHOD RUNNER) */}
      {devTabMode === 'sdk-calls' && (
        <div className="space-y-6 animate-fadeIn" id="dev-sdk-calls-module">
          
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-purple-400">
                Execute client SDK method routines directly
              </span>

              <div>
                <label className="block text-[10px] tracking-wider uppercase text-[#a1a1aa] font-mono font-bold mb-1.5">Supabase JS Client SDK Method</label>
                <select
                  value={selectedSdkMethod}
                  onChange={(e) => setSelectedSdkMethod(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-xs font-semibold cursor-pointer"
                >
                  <option value="getStats">SDK: getStats() - Aggregate Totals Sum</option>
                  <option value="getExercises">SDK: getExercises() - Query "exercises" Remote Table</option>
                  <option value="getActivities">SDK: getActivities() - Query "activities" Remote Table</option>
                  <option value="getCategories">SDK: getCategories() - Query "categories" Remote Table</option>
                </select>
              </div>

              {/* ACTION EXECUTE BUTTON */}
              <button
                onClick={executeSdkCall}
                disabled={sdkLoading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/15"
              >
                {sdkLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>TRANSACTING SUPABASE SDK INSTANCE...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-white" />
                    <span>EXECUTE LIVE SDK CALL ({selectedSdkMethod})</span>
                  </>
                )}
              </button>
            </div>

            {/* SDK OUTPUT WINDOW */}
            <div className="space-y-2 flex flex-col h-full min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase text-[#a1a1aa] tracking-widest">
                SDK Result Output
              </span>

              <div className="bg-zinc-950 border border-[#27272a] rounded-xl flex flex-col min-h-[220px] justify-between overflow-hidden">
                {sdkOutput ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="px-4 py-2 bg-zinc-900 border-b border-[#27272a]/80 flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-950/70 text-emerald-400">
                        DIRECT SDK RESPONSE
                      </span>
                      <button 
                        onClick={() => setSdkOutput(null)}
                        className="text-[#a1a1aa] hover:text-white font-mono text-[10px]"
                      >
                        CLEAR
                      </button>
                    </div>
                    
                    <pre className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-emerald-400 text-left select-all max-h-80">
                      <code>{JSON.stringify(sdkOutput, null, 2)}</code>
                    </pre>

                    <div className="px-4 py-2 bg-zinc-900 border-t border-[#27272a] text-[10px] text-[#a1a1aa] font-mono">
                      Completed: {sdkOutput.timestamp}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 m-auto text-[#a1a1aa]/60 animate-pulse">
                    <Terminal className="w-8 h-8 text-[#27272a]" />
                    <p className="text-[10px] italic">SDK Query logger clear.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* RENDER TAB 3: BELT LEVELS DATABASE MANAGER */}
      {devTabMode === 'belt-levels' && (
        <div className="space-y-6 animate-fadeIn" id="belt-manager-workspace">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#a1a1aa] uppercase bg-zinc-950 px-2 py-0.5 border border-[#27272a] rounded">
                    Curriculum Master Table
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">Belts & Ranks Lookup Metadata</h3>
                </div>
              </div>

              {!showBeltForm && (
                <button
                  type="button"
                  onClick={handleOpenAddBelt}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/15"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD BELT LEVEL</span>
                </button>
              )}
            </div>

            {/* FORM CARD */}
            {showBeltForm && (
              <form onSubmit={handleSaveBeltForm} className="bg-zinc-950 border border-purple-500/20 rounded-2xl p-5 space-y-4 animate-fadeIn mt-5">
                <h4 className="text-xs font-bold text-white flex items-center gap-2 border-b border-[#27272a]/70 pb-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  {editingBelt ? `Modify Rank Details: "${editingBelt.id}"` : 'Register New Professional Belt Level'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[#a1a1aa] mb-1">
                      Unique Belt ID Key *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sabuk putih, pelatih i, master iv"
                      disabled={editingBelt !== null}
                      value={beltFormId}
                      onChange={(e) => setBeltFormId(e.target.value)}
                      className="w-full bg-[#18181b]/80 border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    />
                    <p className="text-[9px] text-[#a1a1aa] mt-1">Downcased identifier used physically in DB linking.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[#a1a1aa] mb-1">
                      English Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. White Belt, Senior Coach I"
                      value={beltFormNameEN}
                      onChange={(e) => setBeltFormNameEN(e.target.value)}
                      className="w-full bg-[#18181b]/80 border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[#a1a1aa] mb-1">
                      Indonesian Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sabuk Putih, Pelatih I"
                      value={beltFormNameID}
                      onChange={(e) => setBeltFormNameID(e.target.value)}
                      className="w-full bg-[#18181b]/80 border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[#a1a1aa] mb-1">
                      Ordering Progression Index *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={99}
                      value={beltFormOrderIndex}
                      onChange={(e) => setBeltFormOrderIndex(Number(e.target.value))}
                      className="w-full bg-[#18181b]/80 border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[9px] text-[#a1a1aa] mt-1">Controls rendering progression sort order.</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-mono font-bold text-[#a1a1aa] mb-1">
                      Tailwind Style Badge Classes *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. bg-white/10 text-white border border-white/20 font-bold"
                      value={beltFormColor}
                      onChange={(e) => setBeltFormColor(e.target.value)}
                      className="w-full bg-[#18181b]/80 border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Aesthetic Visual Presets Palette */}
                <div className="bg-zinc-900 border border-[#27272a]/60 p-3.5 rounded-xl">
                  <span className="block text-[10px] uppercase font-mono font-bold text-[#a1a1aa] mb-2 tracking-widest">
                    Quick Preset Color Aura Pickers:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'White Aura', class: 'bg-white/10 text-white border border-white/20' },
                      { name: 'Yellow Aura', class: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' },
                      { name: 'Green Aura', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
                      { name: 'Blue Aura', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium' },
                      { name: 'Brown Aura', class: 'bg-amber-800/15 text-amber-500 border border-amber-850/30 font-bold' },
                      { name: 'Black Aura', class: 'bg-neutral-800/60 text-stone-200 border border-stone-700/80 font-bold' },
                      { name: 'Trainer Red Aura', class: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold' },
                      { name: 'Master Purple Aura', class: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold' },
                      { name: 'Gold Masters Aura', class: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold border-dashed' },
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setBeltFormColor(preset.class)}
                        className="px-2 py-1 text-[9px] font-mono bg-zinc-950 border border-[#27272a] hover:border-purple-500 rounded-lg text-[#a1a1aa] hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full inline-block ${preset.class.split(' ')[0]}`} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-[#a1a1aa] font-mono">Live Preset Preview Badge:</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] border ${beltFormColor}`}>
                      {beltFormNameEN || 'White Belt'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-[#27272a]/70 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowBeltForm(false)}
                    className="px-3.5 py-2 bg-[#18181b]/50 hover:bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white rounded-xl text-xs font-mono cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    SAVE & ARRANGE SPECIFICATION
                  </button>
                </div>
              </form>
            )}

            {/* List Table of Belt Levels */}
            <div className="bg-zinc-950 border border-[#27272a] rounded-2xl overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-[#27272a] text-[#a1a1aa] font-bold text-[10px] uppercase">
                      <th className="px-4 py-3 text-center w-12">Seq</th>
                      <th className="px-4 py-3">Belt ID code</th>
                      <th className="px-4 py-3">English Translation</th>
                      <th className="px-4 py-3">Indonesian Translation</th>
                      <th className="px-4 py-3 text-center">Color Badge preview</th>
                      <th className="px-4 py-3 text-center">Allocated Exercises</th>
                      <th className="px-4 py-3 text-center w-24">Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]/50 text-white">
                    {beltLevels.map((belt) => {
                      const allocatedCount = exercises.filter(
                        ex => ex.difficulty?.toLowerCase() === belt.id.toLowerCase()
                      ).length;

                      return (
                        <tr key={belt.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-3 text-center font-bold text-[#a1a1aa]">
                            {belt.order_index}
                          </td>
                          <td className="px-4 py-3 font-bold text-purple-400 select-all">
                            {belt.id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-stone-200">
                            {belt.nameEN}
                          </td>
                          <td className="px-4 py-3 font-semibold text-stone-400">
                            {belt.nameID}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${belt.color}`}>
                              {belt.nameEN}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                              allocatedCount > 0 
                                ? 'bg-[#10b981]/10 text-emerald-400 border border-[#10b981]/20' 
                                : 'bg-zinc-905 text-[#a1a1aa]'
                            }`}>
                              {allocatedCount} routines
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Edit specification"
                                onClick={() => handleOpenEditBelt(belt)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] hover:border-purple-500 text-[#a1a1aa] hover:text-white rounded cursor-pointer text-[10px] font-bold font-mono"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                title={allocatedCount > 0 ? "Cannot delete while training routines depend on it" : "Delete specification"}
                                disabled={allocatedCount > 0}
                                onClick={() => handleDeleteBelt(belt.id)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-red-950/40 border border-[#27272a] disabled:opacity-35 hover:border-red-500/40 text-[#a1a1aa] hover:text-rose-400 rounded cursor-pointer text-[10px] font-bold font-mono"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SCHEMA SCHEMATICS ARCHITECTURE CHEATSHEET */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6" id="supabase-schema-reference">
        <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          Active Supabase Postgres Architecture Models
        </h3>
        <p className="text-xs text-[#a1a1aa] mb-4">
          This system uses three core relational tables on Supabase. Handshakes and inserts map 100% transparently to these schemas.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="table-relationship-details">
          {/* Table: Exercises */}
          <div className="bg-zinc-950 rounded-xl border border-[#27272a] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white font-mono">Table: exercises</h4>
              </div>
              <div className="mt-3 space-y-2 text-[11px] font-mono font-semibold">
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>Column ID (Primary)</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>title</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>category</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>difficulty</span>
                  <span className="text-[#a1a1aa] font-bold">FK to belt_levels(id)</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>steps</span>
                  <span className="text-purple-400">text[]</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>stepDetails</span>
                  <span className="text-purple-400">jsonb []</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>katedaSpecific</span>
                  <span className="text-purple-400">boolean</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#a1a1aa] italic mt-4 border-t border-[#27272a] pt-2">Holds active martial arts movements, stage requirements, and lung conditioning routines.</p>
          </div>

          {/* Table: Belt Levels */}
          <div className="bg-zinc-950 rounded-xl border border-[#27272a] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white font-mono">Table: belt_levels</h4>
              </div>
              <div className="mt-3 space-y-2 text-[11px] font-mono font-semibold">
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>id (Primary Key)</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>nameEN</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>nameID</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>color</span>
                  <span className="text-purple-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>order_index</span>
                  <span className="text-purple-400">integer</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#a1a1aa] italic mt-4 border-t border-[#27272a] pt-2">Acts as dynamic master lookup configurations for ranks, colorful badge themes, and sequence progression.</p>
          </div>

          {/* Table: Activities */}
          <div className="bg-zinc-950 rounded-xl border border-[#27272a] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white font-mono">Table: activities</h4>
              </div>
              <div className="mt-3 space-y-2 text-[11px] font-mono font-semibold">
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>id (Primary Key)</span>
                  <span className="text-cyan-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>userId</span>
                  <span className="text-cyan-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>userName</span>
                  <span className="text-cyan-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>exerciseId</span>
                  <span className="text-cyan-400">text</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>duration</span>
                  <span className="text-cyan-400">integer</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1 text-[#a1a1aa]">
                  <span>caloriesBurned</span>
                  <span className="text-cyan-400">integer</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#a1a1aa] italic mt-4 border-t border-[#27272a] pt-2">Tracks actual mobile workout outcomes, heart-rate diagnostics, and completion stats.</p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
