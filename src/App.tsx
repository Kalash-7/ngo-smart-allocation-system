import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Users, 
  Camera,
  Search,
  ChevronRight,
  TrendingUp,
  Package,
  Heart,
  Calendar,
  X,
  Upload,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  where,
  Timestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, DEMO_USER } from './lib/firebase';
import { processSurveyImage, matchVolunteerToTasks } from './services/ai';

// --- Types ---
interface DemoUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}
interface Need {
  id: string;
  title: string;
  description: string;
  category: 'Food' | 'Water' | 'Health' | 'Shelter' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  status: 'Active' | 'Fulfilled';
  createdAt: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  location: string;
  status: 'Open' | 'In Progress' | 'Completed';
  assignedVolunteerId?: string;
  needId?: string;
  createdAt: any;
}

interface Volunteer {
  id: string;
  name: string;
  skills: string[];
  location?: string;
}

// --- Components ---

const Navbar = ({ user, isAdmin, onToggleMode, onOpenProfile }: { user: DemoUser, isAdmin: boolean, onToggleMode: () => void, onOpenProfile: () => void }) => (
  <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 uppercase italic">UnityNet <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded ml-2 not-italic tracking-widest uppercase font-sans">{isAdmin ? 'Admin' : 'Demo'}</span></span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={onToggleMode}
            className="text-[10px] uppercase tracking-[0.2em] font-black border-2 border-black px-3 py-1.5 rounded hover:bg-black hover:text-white transition-all"
          >
            {isAdmin ? 'Volunteering Mode' : 'Admin Panel'}
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
              <p className="text-xs text-gray-500 italic">{isAdmin ? 'Authorized Admin' : 'Demo Environment'}</p>
            </div>
            <button onClick={onOpenProfile} className="hover:opacity-80 transition-opacity">
              <img 
                src={user.photoURL} 
                className="w-8 h-8 rounded-full border border-gray-200" 
                referrerPolicy="no-referrer"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
);

const PriorityBadge = ({ priority }: { priority: Need['priority'] }) => {
  const styles = {
    Critical: 'bg-red-50 text-red-700 border-red-100',
    High: 'bg-orange-50 text-orange-700 border-orange-100',
    Medium: 'bg-blue-50 text-blue-700 border-blue-100',
    Low: 'bg-gray-50 text-gray-700 border-gray-100',
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${styles[priority]}`}>
      {priority}
    </span>
  );
};

const NeedCard = ({ need }: { need: Need, key?: React.Key }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-gray-200 p-4 rounded-xl hover:shadow-sm transition-shadow group cursor-pointer"
  >
    <div className="flex justify-between items-start mb-3">
      <PriorityBadge priority={need.priority} />
      <span className="text-[10px] text-gray-400 font-mono">
        {need.createdAt?.toDate().toLocaleDateString()}
      </span>
    </div>
    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-black transition-colors">{need.title}</h3>
    <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">{need.description}</p>
    <div className="flex items-center gap-4 mt-auto">
      <div className="flex items-center gap-1 text-[11px] text-gray-500">
        <MapPin className="w-3 h-3" />
        {need.location}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-gray-500">
        <Package className="w-3 h-3" />
        {need.category}
      </div>
    </div>
  </motion.div>
);

const TaskCard = ({ task, onAssign, onSolve }: { task: Task, onAssign?: (taskId: string) => void, onSolve?: (taskId: string) => void, key?: React.Key }) => (
  <motion.div 
    layout
    className="bg-gray-50 border border-gray-200 p-5 rounded-xl transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${task.status === 'Open' ? 'bg-green-100 text-green-600' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
          {task.status === 'Open' ? <Clock className="w-4 h-4" /> : task.status === 'In Progress' ? <Users className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        </div>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">{task.status}</span>
      </div>
      {task.status === 'Open' && onAssign && (
        <button 
          onClick={() => onAssign(task.id)}
          className="text-xs font-bold text-black border-b border-black hover:opacity-70 transition-opacity"
        >
          CLAIM TASK
        </button>
      )}
      {task.status === 'In Progress' && onSolve && (
        <button 
          onClick={() => onSolve(task.id)}
          className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 transition-colors uppercase tracking-widest"
        >
          <CheckCircle2 className="w-3.2 h-3.2" />
          Mark Solved
        </button>
      )}
    </div>
    <h4 className="font-bold text-lg text-gray-900 mb-2">{task.title}</h4>
    <p className="text-sm text-gray-600 mb-4">{task.description}</p>
    <div className="flex flex-wrap gap-2 mb-4">
      {task.requiredSkills.map(skill => (
        <span key={skill} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">
          {skill}
        </span>
      ))}
    </div>
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <MapPin className="w-3 h-3" />
      {task.location}
    </div>
  </motion.div>
);

export default function App() {
  const [user] = useState<DemoUser>(DEMO_USER);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [recommendedTasks, setRecommendedTasks] = useState<any[]>([]);

  const [isDigitizing, setIsDigitizing] = useState(false);
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [digitizedResult, setDigitizedResult] = useState<any>(null);

  // Form State
  const [newNeed, setNewNeed] = useState({
    title: '',
    description: '',
    category: 'Other' as Need['category'],
    priority: 'Medium' as Need['priority'],
    location: ''
  });

  useEffect(() => {
    const qN = query(collection(db, 'needs'), orderBy('createdAt', 'desc'));
    const unsubN = onSnapshot(qN, (snap) => {
      setNeeds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Need)));
    });
    const qT = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubT = onSnapshot(qT, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    // Volunteer Listener
    const volRef = doc(db, 'volunteers', user.uid);
    const unsubV = onSnapshot(volRef, (snap) => {
      if (snap.exists()) {
        setVolunteer({ id: snap.id, ...snap.data() } as Volunteer);
      } else {
        // Init demo volunteer if not exists
        setDoc(volRef, {
          name: user.displayName,
          skills: ['First Aid', 'Driving'],
          location: 'Central Hub'
        });
      }
    });

    return () => { unsubN(); unsubT(); unsubV(); };
  }, [user.uid, user.displayName]);

  useEffect(() => {
    if (volunteer && volunteer.skills.length > 0 && tasks.length > 0) {
      const openTasks = tasks.filter(t => t.status === 'Open');
      if (openTasks.length > 0) {
        matchVolunteerToTasks(volunteer.skills, openTasks).then(matches => {
          setRecommendedTasks(matches);
        });
      }
    }
  }, [volunteer, tasks]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await processSurveyImage(base64);
        setDigitizedResult(result);
        setIsProcessing(false);
        
        // Auto-save to Firestore
        if (user) {
          await addDoc(collection(db, 'surveys'), {
            volunteerId: user.uid,
            summary: result.summary,
            keyPoints: result.keyPoints,
            extractedData: result.extractedData,
            createdAt: Timestamp.now(),
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const assignTask = async (taskId: string) => {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      status: 'In Progress',
      assignedVolunteerId: user.uid
    });
  };

  const solveTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      status: 'Completed'
    });

    if (task.needId) {
      const needRef = doc(db, 'needs', task.needId);
      await updateDoc(needRef, {
        status: 'Fulfilled'
      });
    }
  };

  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeed.title || !newNeed.description) return;

    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        title: `Respond to: ${newNeed.title}`,
        description: `Deployment needed for: ${newNeed.description}`,
        requiredSkills: ["General Assistance"],
        location: newNeed.location,
        status: 'Open',
        needId: (await addDoc(collection(db, 'needs'), {
          ...newNeed,
          status: 'Active',
          createdAt: Timestamp.now()
        })).id,
        createdAt: Timestamp.now()
      });

      setNewNeed({
        title: '',
        description: '',
        category: 'Other',
        priority: 'Medium',
        location: ''
      });
      setIsAdminFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const claimedTasksCount = tasks.filter(t => t.status === 'In Progress' || t.status === 'Completed').length;
  const resolvedNeedsCount = needs.filter(n => n.status === 'Fulfilled').length;
  const activeVolunteersCount = new Set(tasks.filter(t => t.assignedVolunteerId).map(t => t.assignedVolunteerId)).size + 1; // +1 for the demo user

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar user={user} isAdmin={isAdmin} onToggleMode={() => setIsAdmin(!isAdmin)} onOpenProfile={() => setIsProfileOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Urgent Needs Dashboard */}
          <div className="lg:col-span-8 space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight mb-2 italic uppercase">{isAdmin ? 'Command Center' : 'Mission Control'}</h1>
                <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">{isAdmin ? 'ADMINISTRATIVE OVERSIGHT & DISPATCH' : 'REAL-TIME COMMUNITY NEEDS TRACKER'}</p>
              </div>
              
              {isAdmin && (
                <div className="flex gap-4 px-6 border-l border-gray-200 ml-4">
                  <div className="text-center">
                    <p className="text-xl font-black">{activeVolunteersCount}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black">{claimedTasksCount}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Claimed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-green-600">{resolvedNeedsCount}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Solved</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {isAdmin ? (
                  <button 
                    onClick={() => setIsAdminFormOpen(true)}
                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-black/20 hover:scale-[1.02] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    DISPATCH NEW NEED
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsDigitizing(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    DIGITIZE FORM
                  </button>
                )}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black" />
                  <input 
                    type="text" 
                    placeholder="Search needs..." 
                    className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-48 transition-all"
                  />
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {needs.length > 0 ? (
                needs.map(n => <NeedCard key={n.id} need={n} />)
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Heart className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No urgent needs reported yet.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Volunteer Space */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-black text-white p-8 rounded-3xl shadow-xl shadow-black/10">
              <h2 className="text-2xl font-black italic uppercase tracking-tight mb-2">Volunteer Portal</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">Smart-matched tasks based on your expertise.</p>
              
              <div className="space-y-4">
                {/* AI Recommendations */}
                {recommendedTasks.length > 0 && (
                  <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3 flex items-center gap-2">
                       <TrendingUp className="w-3 h-3" />
                       AI RECOMMENDED FOR YOU
                    </h4>
                    <div className="space-y-3">
                      {recommendedTasks.map(match => {
                        const task = tasks.find(t => t.id === match.taskId);
                        if (!task || task.status !== 'Open') return null;
                        return (
                          <div key={task.id} className="group">
                             <div className="flex justify-between items-start gap-2 mb-1">
                               <p className="text-sm font-bold text-white line-clamp-1">{task.title}</p>
                               <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black italic">%{Math.round(match.matchScore * 100)} MATCH</span>
                             </div>
                             <p className="text-[10px] text-gray-400 italic line-clamp-1 mb-2">{match.reason}</p>
                             <button 
                               onClick={() => assignTask(task.id)}
                               className="w-full py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                             >
                               FAST CLAIM
                             </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {tasks.filter(t => t.status !== 'Completed').length > 0 ? (
                  tasks.filter(t => t.status !== 'Completed').slice(0, 5).map(t => (
                    <TaskCard key={t.id} task={t} onAssign={assignTask} onSolve={solveTask} />
                  ))
                ) : (
                  <div className="py-8 text-center bg-gray-900/50 rounded-2xl border border-gray-800">
                    <CheckCircle2 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-mono">ALL CLEAR / NO PENDING TASKS</p>
                  </div>
                )}
                
                {tasks.length > 3 && (
                  <button className="w-full text-center py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
                    VIEW ALL OPEN OPPORTUNITIES ({tasks.length - 3})
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-3xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-wide text-gray-400">
                <TrendingUp className="w-4 h-4" />
                Impact Analytics
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Volunteers</span>
                  <span className="text-2xl font-black text-black">{activeVolunteersCount}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Tasks Claimed</span>
                  <span className="text-2xl font-black text-black">{claimedTasksCount}</span>
                </div>
                <div className="p-4 bg-black text-white rounded-2xl flex justify-between items-center shadow-lg shadow-black/10">
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Emergency Metrics Met</span>
                  <span className="text-2xl font-black">{resolvedNeedsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Digitizer Modal */}
      <AnimatePresence>
        {isDigitizing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDigitizing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black italic uppercase tracking-tight">AI Form Digitizer</h2>
                  <button onClick={() => setIsDigitizing(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!digitizedResult ? (
                  <div className="space-y-6">
                    <p className="text-gray-500 leading-relaxed">
                      Upload a photo of a community survey form. Gemini AI will analyze the handwriting and fields to extract urgent needs and key data points.
                    </p>
                    
                    <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                      {isProcessing ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 animate-spin text-black" />
                          <p className="font-bold text-sm uppercase tracking-widest animate-pulse">Analyzing specialized handwriting...</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-gray-500" />
                          </div>
                          <span className="font-bold text-gray-900">Upload Image / Scan Form</span>
                          <span className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Supports JPG, PNG</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isProcessing} />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-green-900 uppercase text-sm">Successfully Digitized</h4>
                      </div>
                      <p className="text-green-800 text-sm leading-relaxed">{digitizedResult.summary}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Extracted Key Points</h4>
                      <ul className="space-y-3">
                        {digitizedResult.keyPoints.map((point: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="w-5 h-5 flex-shrink-0 bg-black text-white text-[10px] font-bold rounded-md flex items-center justify-center">
                              {i + 1}
                            </div>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => { setDigitizedResult(null); setIsDigitizing(false); }}
                        className="flex-1 bg-black text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-gray-900"
                      >
                        Mission Recorded
                      </button>
                      <button 
                         onClick={() => setDigitizedResult(null)}
                         className="flex-1 bg-white border border-gray-200 text-gray-900 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-gray-50"
                      >
                        Scan Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin dispatch Modal */}
      <AnimatePresence>
        {isAdminFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminFormOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleAddNeed} className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tight">Dispatch Need</h2>
                    <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">Add an urgent community problem</p>
                  </div>
                  <button type="button" onClick={() => setIsAdminFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Title / Headline</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g., Block 4 Water Shortage"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
                      value={newNeed.title}
                      onChange={e => setNewNeed({...newNeed, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
                      <select 
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all appearance-none"
                        value={newNeed.category}
                        onChange={e => setNewNeed({...newNeed, category: e.target.value as Need['category']})}
                      >
                        {['Food', 'Water', 'Health', 'Shelter', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Priority</label>
                      <select 
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all appearance-none"
                        value={newNeed.priority}
                        onChange={e => setNewNeed({...newNeed, priority: e.target.value as Need['priority']})}
                      >
                        {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Location</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g., East Sector 7"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
                      value={newNeed.location}
                      onChange={e => setNewNeed({...newNeed, location: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Provide specific details for volunteers..."
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all resize-none"
                      value={newNeed.description}
                      onChange={e => setNewNeed({...newNeed, description: e.target.value})}
                    />
                  </div>

                  <button 
                    disabled={isProcessing}
                    type="submit"
                    className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'Dispatching...' : 'Confirm & Publish to Dashboard'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <img src={user.photoURL} className="w-16 h-16 rounded-3xl border-4 border-gray-100 shadow-inner" />
                    <div>
                      <h2 className="text-2xl font-black italic uppercase tracking-tight">{user.displayName}</h2>
                      <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Volunteer Profile</p>
                    </div>
                  </div>
                  <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Professional Skills & Expertise</label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {volunteer?.skills.map((skill, index) => (
                          <span key={index} className="px-3 py-1.5 bg-black text-white rounded-xl text-[10px] font-bold flex items-center gap-2 group">
                            {skill}
                            <button 
                              onClick={() => {
                                if (!volunteer) return;
                                const newSkills = volunteer.skills.filter((_, i) => i !== index);
                                updateDoc(doc(db, 'volunteers', user.uid), { skills: newSkills });
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="relative">
                        <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Add skill (e.g. Navigation, Nursing, Logistics)"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const newSkill = e.currentTarget.value.trim();
                              if (!volunteer?.skills.includes(newSkill)) {
                                const newSkills = [...(volunteer?.skills || []), newSkill];
                                await updateDoc(doc(db, 'volunteers', user.uid), { skills: newSkills });
                              }
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
                        />
                        <p className="text-[9px] text-gray-400 mt-2 ml-1 uppercase font-bold italic tracking-tighter">Press Enter to add skill</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Active Location</label>
                    <input 
                      type="text" 
                      value={volunteer?.location || ''}
                      onChange={async (e) => {
                        await updateDoc(doc(db, 'volunteers', user.uid), { location: e.target.value });
                      }}
                      placeholder="Current deployment zone"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all font-mono"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-[1.5rem]">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Task Matching Engine</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed italic">
                      Our Gemini AI uses your skills to prioritize urgent needs. Add more specific technical skills to see higher accuracy matches in your portal.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
