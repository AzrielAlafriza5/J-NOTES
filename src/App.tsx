import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Mic, 
  Search, 
  Archive, 
  Lock, 
  MoreHorizontal, 
  ChevronLeft,
  Settings,
  Grid,
  Menu,
  List as ListIcon,
  Star,
  CheckCircle2,
  Trash2,
  Unlock,
  Share2,
  Undo2,
  Redo2,
  Download,
  Link as LinkIcon,
  X,
  FileText,
  Instagram,
  Linkedin,
  Languages,
  Info,
  Type,
  Bold,
  Italic,
  List,
  Sun,
  Moon,
  SunMoon,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveAs } from 'file-saver';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { handleFirestoreError, OperationType, testConnection } from './lib/firestore-utils';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
  isArchived: boolean;
  isSecret: boolean;
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: any;
  passwordPin?: string;
  color?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'archived' | 'secret' | 'trash' | 'favorites'>('all');
  const [isEditing, setIsEditing] = useState<Note | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [authenticatedSecret, setAuthenticatedSecret] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'create' | 'validate'>('validate');
  const [onPinSuccess, setOnPinSuccess] = useState<{ callback: () => void } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [theme, setTheme] = useState<'default' | 'light' | 'dark'>('default');
  const [isScrolled, setIsScrolled] = useState(false);

  const t = (key: string) => {
    const translations: any = {
      id: {
        catatan: 'Catatan',
        arsip: 'Arsip',
        privat: 'Privat',
        favorit: 'Favorit',
        sampah: 'Sampah',
        menu: 'Menu',
        pengaturan: 'Pengaturan',
        keluar: 'Keluar Akun',
        kembali: 'Kembali',
        bahasa: 'Bahasa',
        tentang: 'Tentang',
        search: 'Cari...',
        save: 'Simpan',
        empty: 'SUNYI DI SINI...',
        followers: 'Pengikut Kami',
        connect: 'Terhubung',
        masukkanPin: 'Masukkan PIN',
        buatPin: 'Buat PIN Baru',
        pinSalah: 'PIN Salah',
        pinBerhasil: 'PIN Disimpan',
        konfirmasiPin: 'Konfirmasi PIN',
        tema: 'Tema',
        dark: 'Malam',
        light: 'Siang',
        default: 'System'
      },
      en: {
        catatan: 'Notes',
        arsip: 'Archived',
        privat: 'Secret',
        favorit: 'Favorites',
        sampah: 'Trash',
        menu: 'Menu',
        pengaturan: 'Settings',
        keluar: 'Sign Out',
        kembali: 'Back',
        bahasa: 'Language',
        tentang: 'About',
        search: 'Search...',
        save: 'Save',
        empty: 'NOTHING HERE...',
        followers: 'Follow Us',
        connect: 'Connect',
        masukkanPin: 'Enter PIN',
        buatPin: 'Create PIN',
        pinSalah: 'Incorrect PIN',
        pinBerhasil: 'PIN Saved',
        konfirmasiPin: 'Confirm PIN',
        tema: 'Theme',
        dark: 'Night',
        light: 'Day',
        default: 'System'
      }
    };
    return translations[language][key] || key;
  };
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [isSelectingMode, setIsSelectingMode] = useState(false);

  // Clear notification after 3s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Clean up selection when changing tab
  useEffect(() => {
    setIsSelectingMode(false);
    setSelectedNotes([]);
  }, [activeTab]);

  // Scroll lock when editor is open
  useEffect(() => {
    if (isEditing) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isEditing]);

  // Scroll listener
  useEffect(() => {
    testConnection();
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply theme to body
  useEffect(() => {
    const b = document.body;
    if (theme === 'dark') {
      b.style.backgroundImage = 'none';
      b.style.backgroundColor = '#000000';
      b.classList.add('dark');
      b.style.color = '#FFFFFF';
    } else if (theme === 'light') {
      b.style.backgroundImage = 'none';
      b.style.backgroundColor = '#FFFFFF';
      b.classList.remove('dark');
      b.style.color = '#000000';
    } else {
      // default iOS 26
      b.style.backgroundImage = 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)';
      b.style.backgroundColor = '#F2F2F7';
      b.classList.remove('dark');
      b.style.color = '#000000';
    }
  }, [theme]);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Fetch user config (PIN)
  useEffect(() => {
    if (!user) return;

    const path = `userConfigs/${user.uid}`;
    return onSnapshot(doc(db, 'userConfigs', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserPin(data.pin);
        if (data.theme) setTheme(data.theme);
      } else {
        setUserPin(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }, [user]);

  // Fetch notes
  useEffect(() => {
    if (!user) return;

    const path = 'notes';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(fetchedNotes);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }, [user]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'trash') {
        const isDeletedMatch = n.isDeleted && matchesSearch;
        if (!isDeletedMatch) return false;
        
        // Auto-delete simulation: don't show notes older than 30 days
        if (n.deletedAt && n.deletedAt.toDate) {
          const deletedAt = n.deletedAt.toDate();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (deletedAt < thirtyDaysAgo) return false;
        }
        return true;
      }
      if (n.isDeleted) return false;
      
      if (activeTab === 'archived') return n.isArchived && !n.isDeleted && matchesSearch;
      if (activeTab === 'secret') return n.isSecret && !n.isDeleted && matchesSearch;
      if (activeTab === 'favorites') return n.isFavorite && !n.isDeleted && matchesSearch;
      return !n.isArchived && !n.isSecret && !n.isDeleted && matchesSearch;
    });
  }, [notes, searchQuery, activeTab]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the sign-in popup.');
      } else {
        console.error('Login error:', error);
      }
    }
  };

  const addNote = async (title: string = '', content: string = '', isSecret = false, color: string = 'rgba(255, 255, 255, 0.72)') => {
    if (!user) return;
    const path = 'notes';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        title: title || 'Catatan Baru',
        content: content,
        isArchived: false,
        isFavorite: false,
        isSecret: isSecret,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        color: color
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const path = `notes/${id}`;
    try {
      const noteRef = doc(db, 'notes', id);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteNote = async (id: string, notify: boolean = false) => {
    const note = notes.find(n => n.id === id);
    const path = `notes/${id}`;
    
    try {
      if (note?.isDeleted) {
        await deleteDoc(doc(db, 'notes', id));
      } else {
        await updateDoc(doc(db, 'notes', id), {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        if (notify) setNotification('Catatan dipindahkan ke sampah');
      }
    } catch (error) {
      handleFirestoreError(error, note?.isDeleted ? OperationType.DELETE : OperationType.WRITE, path);
    }
  };

  const restoreNotes = async (ids: string[]) => {
    try {
      const promises = ids.map(id => {
        const noteRef = doc(db, 'notes', id);
        return updateDoc(noteRef, {
          isDeleted: false,
          deletedAt: null,
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      setIsSelectingMode(false);
      setSelectedNotes([]);
      setNotification(`${ids.length} catatan dipulihkan`);
    } catch (error) {
      console.error('Error restoring notes:', error);
    }
  };

  const processWithAI = async (text: string, type: 'voice' | 'smart') => {
    try {
      const res = await fetch('/api/process-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type })
      });
      const data = await res.json();
      return data.processedText;
    } catch (err) {
      console.error(err);
      return text;
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
      alert('Browser Anda tidak mendukung pengenalan suara.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      const processed = await processWithAI(transcript, 'voice');
      addNote('Hasil Suara', processed);
    };

    recognition.start();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-between p-12 font-sans overflow-hidden">
        {/* Background is already set in body, but we can add a subtle glass overlay if needed */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="text-center"
          >
            <h1 className={cn(
              "text-[84px] font-black tracking-[-0.08em] leading-none mb-2",
              theme === 'dark' ? "text-white" : "text-black"
            )}>
              J.NOTE
            </h1>
            <p className="text-gray-500/60 font-bold tracking-[0.25em] text-[11px] uppercase ml-2">
              Capture Your Thoughts
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="w-full max-w-[240px]"
        >
          <button 
            onClick={login}
            className="w-full py-5 bg-white text-black rounded-[28px] font-black text-base hover:bg-white active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.1)] liquid-squircle flex items-center justify-center gap-2 border border-black/5"
          >
            Mulai Sekarang
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 font-sans pb-48">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 px-8 transition-all duration-500",
        isScrolled ? "pt-1 pb-1 backdrop-blur-2xl bg-white/40 border-b border-black/5" : "pt-4 pb-2 bg-transparent"
      )}>
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3">
            {/* Back Button for non-main pages */}
            <AnimatePresence>
              {activeTab !== 'all' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform",
                      theme === 'dark' ? "glass-dark border-white/10" : "glass-panel"
                    )}
                  >
                    <ChevronLeft className={cn("w-5 h-5", theme === 'dark' ? "text-white" : "text-gray-700")} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <motion.div 
            initial={false}
            animate={{ 
              left: isScrolled ? "50%" : (activeTab !== 'all' ? "56px" : "0%"),
              x: isScrolled ? "-50%" : "0%",
              y: "-50%",
              scale: isScrolled ? 0.5 : 1,
            }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute top-1/2 z-0 pointer-events-none origin-center"
          >
             <h1 className={cn(
               "text-[32px] sm:text-[40px] font-black tracking-tighter whitespace-nowrap transition-colors",
               theme === 'dark' ? "text-white" : "text-black"
             )}>
               {activeTab === 'all' ? t('catatan') : activeTab === 'trash' ? t('sampah') : activeTab === 'archived' ? t('arsip') : activeTab === 'favorites' ? t('favorit') : t('privat')}
             </h1>
          </motion.div>

          <div className="flex items-center gap-2 pointer-events-auto z-10">
            {activeTab === 'trash' && (
              <button 
                onClick={() => {
                  if (isSelectingMode) {
                    setIsSelectingMode(false);
                    setSelectedNotes([]);
                  } else {
                    setIsSelectingMode(true);
                  }
                }}
                className={cn(
                  "px-6 h-11 rounded-full font-black text-xs transition-all liquid-squircle flex items-center gap-2",
                  isSelectingMode ? "bg-red-500 text-white shadow-xl shadow-red-500/20" : (theme === 'dark' ? "glass-dark text-white border-white/10" : "glass-panel text-gray-700")
                )}
              >
                <Trash2 className="w-4 h-4" />
                {isSelectingMode ? 'Batal' : 'Pilih'}
              </button>
            )}

            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                "h-11 rounded-full flex items-center justify-center shadow-lg liquid-squircle transition-all duration-500 overflow-hidden",
                theme === 'dark' ? "glass-dark border-white/10" : "glass-panel",
                showSearch ? "w-48 sm:w-56 px-4 gap-2" : "w-11"
              )}
            >
              <Search className={cn("w-5 h-5 transition-colors min-w-[20px]", showSearch ? "text-blue-600" : (theme === 'dark' ? "text-white/60" : "text-gray-700"))} />
              {showSearch && (
                <input 
                  autoFocus
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent border-none focus:ring-0 font-bold placeholder:text-gray-400 text-sm p-0",
                    theme === 'dark' ? "text-white" : "text-black"
                  )}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </button>

            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shadow-lg liquid-squircle transition-transform active:scale-90",
                theme === 'dark' ? "glass-dark border-white/10" : "glass-panel"
              )}
            >
              <Menu className={cn("w-5 h-5", theme === 'dark' ? "text-white" : "text-gray-700")} />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  "fixed top-[80px] right-4 sm:right-8 w-[calc(100vw-32px)] sm:w-[360px] max-h-[calc(100vh-100px)] z-[70] shadow-[0_30px_60px_rgba(0,0,0,0.15)] flex flex-col rounded-[32px] border border-white/40 transition-colors overflow-hidden",
                  theme === 'dark' ? "bg-[#1c1c1e] sm:glass-dark" : "bg-white sm:glass-panel"
                )}
              >
              <AnimatePresence mode="wait">
                {showSettings ? (
                  <motion.div 
                    key="settings-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col h-full overflow-hidden"
                  >
                    <div className="p-6 sm:p-8 pt-10 flex items-center gap-4">
                      <button 
                        onClick={() => setShowSettings(false)}
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg liquid-squircle active:scale-90 transition-transform",
                          theme === 'dark' ? "glass-dark border-white/10" : "glass-panel"
                        )}
                      >
                        <ChevronLeft className={cn("w-6 h-6", theme === 'dark' ? "text-white" : "text-gray-700")} />
                      </button>
                      <h2 className={cn("text-2xl sm:text-3xl font-black tracking-tighter", theme === 'dark' ? "text-white" : "text-black/80")}>{t('pengaturan')}</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pt-4 custom-scrollbar">
                      <div className="flex flex-col gap-8">
                        {/* Language Selection */}
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 px-2">
                            <Languages className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">{t('bahasa')}</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setLanguage('id')}
                              className={cn(
                                "p-4 rounded-3xl font-black text-sm transition-all liquid-squircle",
                                language === 'id' ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white/40 border border-black/5 text-gray-600"
                              )}
                            >
                              Indonesia
                            </button>
                            <button 
                              onClick={() => setLanguage('en')}
                              className={cn(
                                "p-4 rounded-3xl font-black text-sm transition-all liquid-squircle",
                                language === 'en' ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white/40 border border-black/5 text-gray-600"
                              )}
                            >
                              English
                            </button>
                          </div>
                        </div>

                        {/* About Section */}
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 px-2">
                            <Info className="w-5 h-5 text-purple-500" />
                            <h3 className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">{t('tentang')}</h3>
                          </div>
                          <div className="flex flex-col gap-3">
                            <a 
                              href="https://www.instagram.com/azriil_az?igsh=dnQzYzdrd3FyMmRi" 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-between p-5 bg-white/40 border border-black/5 rounded-[28px] liquid-squircle hover:bg-white/60 transition-colors group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                  <Instagram className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-700">Instagram</span>
                              </div>
                              <span className="text-[10px] font-black text-gray-400 group-hover:text-gray-600 transition-colors">@azriil_az</span>
                            </a>
                            <a 
                              href="https://www.linkedin.com/in/azriel-al-507264331?utm_source=share_via&utm_content=profile&utm_medium=member_android" 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-between p-5 bg-white/40 border border-black/5 rounded-[28px] liquid-squircle hover:bg-white/60 transition-colors group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#0077b5] rounded-xl flex items-center justify-center text-white shadow-lg">
                                  <Linkedin className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-700">LinkedIn</span>
                              </div>
                              <span className="text-[10px] font-black text-gray-400 group-hover:text-gray-600 transition-colors">Azriel Al</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="menu-view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col h-full overflow-hidden"
                  >
                    <div className="p-6 sm:p-8 pt-10 flex items-center justify-between shrink-0">
                      <h2 className={cn("text-2xl sm:text-3xl font-black tracking-tighter", theme === 'dark' ? "text-white" : "text-black/80")}>{t('menu')}</h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowSettings(true)}
                          className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg liquid-squircle active:scale-90 transition-transform",
                            theme === 'dark' ? "glass-dark border-white/10" : "glass-panel"
                          )}
                        >
                          <Settings className={cn("w-5 h-5 sm:w-6 sm:h-6", theme === 'dark' ? "text-white" : "text-gray-700")} />
                        </button>
                        <button 
                          onClick={() => setIsSidebarOpen(false)}
                          className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg liquid-squircle active:scale-90 transition-transform",
                            theme === 'dark' ? "glass-dark border-white/10" : "glass-panel"
                          )}
                        >
                          <X className={cn("w-5 h-5 sm:w-6 sm:h-6", theme === 'dark' ? "text-white" : "text-gray-700")} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-2 custom-scrollbar">
                      <div className="flex flex-col gap-2 sm:gap-3">
                        {/* Theme Section */}
                        <div className="mb-4 sm:mb-6 px-2 sm:px-4">
                          <h3 className={cn("text-[10px] font-black uppercase tracking-widest mb-3 ml-1", theme === 'dark' ? "text-white/40" : "text-gray-400")}>{t('tema')}</h3>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {(['default', 'light', 'dark'] as const).map((th) => (
                              <button
                                key={th}
                                onClick={() => {
                                  setTheme(th);
                                  if (user) {
                                    updateDoc(doc(db, 'userConfigs', user.uid), { theme: th }).catch(() => {
                                      import('firebase/firestore').then(({ setDoc }) => {
                                        setDoc(doc(db, 'userConfigs', user.uid), { userId: user.uid, pin: userPin, theme: th });
                                      });
                                    });
                                  }
                                }}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-2 sm:p-3 rounded-2xl border-2 transition-all liquid-squircle",
                                  theme === th 
                                    ? "border-blue-500 bg-white dark:bg-white/10 shadow-lg" 
                                    : (theme === 'dark' ? "border-transparent bg-white/5 hover:bg-white/10" : "border-transparent bg-white/30 hover:bg-white/50")
                                )}
                              >
                                <div className={cn(
                                  "w-full aspect-square rounded-lg shadow-inner flex items-center justify-center overflow-hidden text-lg sm:text-xl",
                                  th === 'dark' ? "bg-black text-white" : (th === 'light' ? "bg-white border border-black/5 text-blue-500" : (theme === 'dark' ? "bg-white/10 text-white/80" : "bg-black/5 text-gray-600"))
                                )}>
                                  {th === 'dark' ? <Moon className="w-5 h-5" /> : (th === 'light' ? <Sun className="w-5 h-5" /> : <SunMoon className="w-5 h-5" />)}
                                </div>
                                <span className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-wide", theme === th ? "text-blue-600 dark:text-blue-400" : (theme === 'dark' ? "text-white/40" : "text-gray-500"))}>
                                  {t(th)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setActiveTab('all');
                            setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[28px] transition-all liquid-squircle group relative",
                            activeTab === 'all' 
                              ? "bg-white dark:bg-white/10 shadow-[0_10px_30px_rgba(59,130,246,0.15)] border border-blue-500/10 scale-[1.02]" 
                              : "hover:bg-white/40 dark:hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all",
                            activeTab === 'all' ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : (theme === 'dark' ? "bg-white/5 text-white/40 group-hover:bg-white/10" : "bg-gray-100 text-gray-500 group-hover:bg-white")
                          )}>
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className={cn("font-black text-base sm:text-lg tracking-tight", activeTab === 'all' ? "text-blue-600 dark:text-blue-400" : (theme === 'dark' ? "text-white/60" : "text-gray-600"))}>{t('catatan')}</span>
                          <span className={cn(
                            "ml-auto text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                            activeTab === 'all' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : (theme === 'dark' ? "text-white/40 bg-white/5" : "text-gray-400 bg-gray-100/80")
                          )}>
                            {notes.filter(n => !n.isArchived && !n.isSecret && !n.isDeleted).length}
                          </span>
                        </button>

                        <button 
                          onClick={() => {
                            setActiveTab('favorites');
                            setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[28px] transition-all liquid-squircle group relative",
                            activeTab === 'favorites' 
                              ? "bg-white dark:bg-white/10 shadow-[0_10px_30px_rgba(250,204,21,0.15)] border border-yellow-500/10 scale-[1.02]" 
                              : "hover:bg-white/40 dark:hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all",
                            activeTab === 'favorites' ? "bg-yellow-400 text-white shadow-lg shadow-yellow-200" : (theme === 'dark' ? "bg-white/5 text-white/40 group-hover:bg-white/10" : "bg-gray-100 text-gray-500 group-hover:bg-white")
                          )}>
                            <Star className={cn("w-5 h-5 sm:w-6 sm:h-6")} />
                          </div>
                          <span className={cn("font-black text-base sm:text-lg tracking-tight", activeTab === 'favorites' ? "text-yellow-600 dark:text-yellow-400" : (theme === 'dark' ? "text-white/60" : "text-gray-600"))}>{t('favorit')}</span>
                          <span className={cn(
                            "ml-auto text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                            activeTab === 'favorites' ? "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400" : (theme === 'dark' ? "text-white/40 bg-white/5" : "text-gray-400 bg-gray-100/80")
                          )}>
                            {notes.filter(n => n.isFavorite && !n.isDeleted).length}
                          </span>
                        </button>

                        <button 
                          onClick={() => {
                            setActiveTab('archived');
                            setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[28px] transition-all liquid-squircle group relative",
                            activeTab === 'archived' 
                              ? "bg-white dark:bg-white/10 shadow-[0_10px_30px_rgba(59,130,246,0.15)] border border-blue-500/10 scale-[1.02]" 
                              : "hover:bg-white/40 dark:hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all",
                            activeTab === 'archived' ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : (theme === 'dark' ? "bg-white/5 text-white/40 group-hover:bg-white/10" : "bg-gray-100 text-gray-500 group-hover:bg-white")
                          )}>
                            <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className={cn("font-black text-base sm:text-lg tracking-tight", activeTab === 'archived' ? "text-blue-600 dark:text-blue-400" : (theme === 'dark' ? "text-white/60" : "text-gray-600"))}>{t('arsip')}</span>
                          <span className={cn(
                            "ml-auto text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                            activeTab === 'archived' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : (theme === 'dark' ? "text-white/40 bg-white/5" : "text-gray-400 bg-gray-100/80")
                          )}>
                            {notes.filter(n => n.isArchived && !n.isDeleted).length}
                          </span>
                        </button>

                        <button 
                          onClick={() => {
                            if (!authenticatedSecret) {
                              if (!userPin) {
                                setPinMode('create');
                                setOnPinSuccess({ callback: () => {
                                  setActiveTab('secret');
                                  setAuthenticatedSecret(true);
                                }});
                                setShowPinModal(true);
                              } else {
                                setPinMode('validate');
                                setOnPinSuccess({ callback: () => {
                                  setActiveTab('secret');
                                  setAuthenticatedSecret(true);
                                }});
                                setShowPinModal(true);
                              }
                            } else {
                              setActiveTab('secret');
                            }
                            setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[28px] transition-all liquid-squircle group relative",
                            activeTab === 'secret' 
                              ? "bg-white dark:bg-white/10 shadow-[0_10px_30px_rgba(168,85,247,0.15)] border border-purple-500/10 scale-[1.02]" 
                              : "hover:bg-white/40 dark:hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all",
                            activeTab === 'secret' ? "bg-purple-500 text-white shadow-lg shadow-purple-200" : (theme === 'dark' ? "bg-white/5 text-white/40 group-hover:bg-white/10" : "bg-gray-100 text-gray-500 group-hover:bg-white")
                          )}>
                            <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className={cn("font-black text-base sm:text-lg tracking-tight", activeTab === 'secret' ? "text-purple-600 dark:text-purple-400" : (theme === 'dark' ? "text-white/60" : "text-gray-600"))}>{t('privat')}</span>
                          <span className={cn(
                            "ml-auto text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                            activeTab === 'secret' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : (theme === 'dark' ? "text-white/40 bg-white/5" : "text-gray-400 bg-gray-100/80")
                          )}>
                            {notes.filter(n => n.isSecret && !n.isDeleted).length}
                          </span>
                        </button>

                        <button 
                          onClick={() => {
                            setActiveTab('trash');
                            setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[28px] transition-all liquid-squircle group relative",
                            activeTab === 'trash' 
                              ? "bg-white dark:bg-white/10 shadow-[0_10px_30px_rgba(239,68,68,0.15)] border border-red-500/10 scale-[1.02]" 
                              : "hover:bg-white/40 dark:hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all",
                            activeTab === 'trash' ? "bg-red-500 text-white shadow-lg shadow-red-200" : (theme === 'dark' ? "bg-white/5 text-white/40 group-hover:bg-white/10" : "bg-gray-100 text-gray-500 group-hover:bg-white")
                          )}>
                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className={cn("font-black text-base sm:text-lg tracking-tight", activeTab === 'trash' ? "text-red-500 dark:text-red-400" : (theme === 'dark' ? "text-white/60" : "text-gray-600"))}>{t('sampah')}</span>
                          <span className={cn(
                            "ml-auto text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                            activeTab === 'trash' ? "bg-red-500/10 text-red-500 dark:text-red-400" : (theme === 'dark' ? "text-white/40 bg-white/5" : "text-gray-400 bg-gray-100/80")
                          )}>
                            {notes.filter(n => n.isDeleted).length}
                          </span>
                        </button>
                      </div>

                      <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/10 flex flex-col gap-6 sm:gap-8 pb-6">
                        <div className="flex items-center gap-3 sm:gap-4 px-2">
                          <div className={cn(
                            "w-12 h-12 sm:w-14 sm:h-14 rounded-[22px] p-1 shadow-md border liquid-squircle overflow-hidden",
                            theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5"
                          )}>
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-[18px]" />
                            ) : (
                              <div className={cn(
                                "w-full h-full flex items-center justify-center font-black text-lg sm:text-xl rounded-[18px]",
                                theme === 'dark' ? "bg-white/10 text-white/40" : "bg-gray-100 text-gray-500"
                              )}>
                                {user.email?.[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className={cn("font-black truncate text-sm tracking-tight leading-none mb-1", theme === 'dark' ? "text-white" : "text-black")}>{user.displayName || 'Pengguna'}</p>
                            <p className={cn("text-[10px] sm:text-[11px] truncate font-bold uppercase tracking-wider", theme === 'dark' ? "text-white/20" : "text-gray-400")}>{user.email}</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => auth.signOut()}
                          className="w-full py-5 bg-red-500 text-white rounded-[24px] font-black text-sm transition-all active:scale-95 shadow-xl shadow-red-500/20 liquid-squircle flex items-center justify-center gap-3"
                        >
                          <LogOut className="w-5 h-5" />
                          {t('keluar')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPinModal && (
          <PinModal 
            mode={pinMode}
            correctPin={userPin}
            onSuccess={(pin) => {
              if (pinMode === 'create') {
                const path = `userConfigs/${user?.uid}`;
                updateDoc(doc(db, 'userConfigs', user?.uid!), {
                  userId: user?.uid,
                  pin: pin
                }).catch(() => {
                  // If document doesn't exist, set it
                  import('firebase/firestore').then(({ setDoc }) => {
                    setDoc(doc(db, 'userConfigs', user?.uid!), {
                      userId: user?.uid,
                      pin: pin
                    });
                  });
                });
                setUserPin(pin);
                setNotification(t('pinBerhasil'));
              }
              onPinSuccess?.callback();
              setShowPinModal(false);
              setOnPinSuccess(null);
            }}
            onClose={() => {
              setShowPinModal(false);
              setOnPinSuccess(null);
            }}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 py-6 touch-pan-y min-h-[calc(100vh-100px)]">
        {activeTab === 'secret' && !authenticatedSecret ? (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <motion.div 
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-32 h-32 glass-panel rounded-[40px] flex items-center justify-center mb-10 shadow-2xl"
            >
              <Lock className="w-14 h-14 text-indigo-500 stroke-[2.5px]" />
            </motion.div>
            <h2 className="text-3xl font-black mb-4 tracking-tight">Ruang Terenkripsi</h2>
            <p className="text-gray-500 mb-12 max-w-xs mx-auto font-medium">Gunakan biometrik atau PIN untuk sinkronisasi data aman.</p>
            <button 
              onClick={() => {
                if (!userPin) {
                  setPinMode('create');
                } else {
                  setPinMode('validate');
                }
                setOnPinSuccess({ callback: () => setAuthenticatedSecret(true) });
                setShowPinModal(true);
              }}
              className="px-12 py-5 bg-indigo-600 text-white rounded-[28px] font-black shadow-2xl shadow-indigo-200 active:scale-95 transition-all text-xl liquid-squircle"
            >
              Buka Enkripsi
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note) => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  isSelected={selectedNotes.includes(note.id)}
                  isSelectingMode={isSelectingMode}
                  onSelect={(id) => {
                    setSelectedNotes(prev => 
                      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                    );
                  }}
                  onEdit={(n) => !isSelectingMode && setIsEditing(n)}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onVerifyPin={(callback) => {
                    if (!userPin) {
                      setPinMode('create');
                    } else {
                      setPinMode('validate');
                    }
                    setOnPinSuccess({ callback });
                    setShowPinModal(true);
                  }}
                  t={t}
                  language={language}
                  theme={theme}
                />
              ))}
            </AnimatePresence>

            {filteredNotes.length === 0 && (
              <div className="col-span-full py-48 text-center">
                <div className="text-gray-400 font-black text-2xl tracking-tighter opacity-20">{t('empty')}</div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Notification Bubble */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[150] px-8 py-4 bg-black/90 text-white rounded-full font-bold shadow-2xl backdrop-blur-xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Bottom Bar */}
      <AnimatePresence>
        {isSelectingMode && selectedNotes.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[140] w-[calc(100%-4rem)] max-w-sm glass-dark rounded-[32px] p-4 shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="pl-4">
              <span className="text-white font-black">{selectedNotes.length}</span>
              <span className="text-white/60 font-bold ml-2">Dipilih</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const allIds = filteredNotes.map(n => n.id);
                  if (selectedNotes.length === allIds.length) setSelectedNotes([]);
                  else setSelectedNotes(allIds);
                }}
                className="px-4 py-3 bg-white/10 text-white rounded-[20px] font-bold text-sm hover:bg-white/20 active:scale-95 transition-all"
              >
                {selectedNotes.length === filteredNotes.length ? 'Batal Semua' : 'Semua'}
              </button>
              <button 
                onClick={() => restoreNotes(selectedNotes)}
                className="px-6 py-3 bg-blue-500 text-white rounded-[20px] font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                Pulihkan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock Navigation (Spatial Floating Island) - Moved to Bottom Right */}
      <div className="fixed bottom-8 right-8 z-50 pointer-events-none flex flex-col items-end gap-4">
        {/* Main Plus Button */}
        <button 
          onClick={() => {
            setIsEditing({
              id: 'new',
              title: '',
              content: '',
              userId: user.uid,
              createdAt: null,
              updatedAt: null,
              isArchived: false,
              isFavorite: false,
              isSecret: activeTab === 'secret',
              color: theme === 'dark' ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.72)'
            });
          }}
          className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(59,130,246,0.4)] pointer-events-auto liquid-squircle transition-transform hover:scale-105 active:scale-90"
        >
          <Plus className="w-8 h-8 stroke-[3.5px]" />
        </button>
      </div>

      {/* Footer Navigation (Optional Tabs) */}
      <div className="fixed bottom-0 inset-x-0 h-10 bg-gradient-to-t from-ios-bg to-transparent pointer-events-none" />

      {/* Edit Modal (Now Full Screen Page) */}
      <AnimatePresence>
        {isEditing && (
          <NoteEditor 
            note={isEditing} 
            isNew={isEditing.id === 'new'}
            onClose={() => setIsEditing(null)} 
            onSave={(id, updates) => {
              if (id === 'new') {
                addNote(updates.title || '', updates.content || '', updates.isSecret || false, updates.color);
              } else {
                updateNote(id, updates);
              }
            }}
            onDelete={deleteNote}
            onSmartCalc={async (content) => {
              const processed = await processWithAI(content, 'smart');
              return processed;
            }}
            startRecording={startRecording}
            isRecording={isRecording}
            onVerifyPin={(callback) => {
              if (!userPin) {
                setPinMode('create');
              } else {
                setPinMode('validate');
              }
              setOnPinSuccess({ callback });
              setShowPinModal(true);
            }}
            t={t}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all active:scale-90",
        active ? "text-blue-500" : "text-gray-400"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-110")}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function PinModal({ mode, correctPin, onSuccess, onClose, t }: { 
  mode: 'create' | 'validate', 
  correctPin: string | null,
  onSuccess: (pin: string) => void,
  onClose: () => void,
  t: (key: string) => string
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState(false);

  const handleNumberClick = (num: string) => {
    if (error) setError(false);
    
    const current = isConfirming ? confirmPin : pin;
    if (current.length < 4) {
      const next = current + num;
      if (isConfirming) {
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === pin) {
            onSuccess(pin);
          } else {
            setError(true);
            setTimeout(() => {
              setConfirmPin('');
              setError(false);
            }, 500);
          }
        }
      } else {
        setPin(next);
        if (next.length === 4) {
          if (mode === 'validate') {
            if (next === correctPin) {
              onSuccess(next);
            } else {
              setError(true);
              setTimeout(() => {
                setPin('');
                setError(false);
              }, 500);
            }
          } else {
            setIsConfirming(true);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isConfirming) setConfirmPin(confirmPin.slice(0, -1));
    else setPin(pin.slice(0, -1));
  };

  const currentPin = isConfirming ? confirmPin : pin;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
    >
      <button 
        onClick={onClose}
        className="absolute top-12 left-8 w-12 h-12 glass-panel rounded-full flex items-center justify-center liquid-squircle active:scale-95"
      >
        <ChevronLeft className="w-6 h-6 text-gray-700" />
      </button>

      <div className="flex flex-col items-center w-full max-w-xs">
        <motion.div 
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          className={cn(
            "w-20 h-20 rounded-[30px] flex items-center justify-center mb-10 liquid-squircle shadow-2xl transition-colors",
            error ? "bg-red-500 text-white" : "bg-indigo-600 text-white shadow-indigo-200"
          )}
        >
          {isConfirming ? <CheckCircle2 className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
        </motion.div>

        <h2 className="text-2xl font-black mb-2 tracking-tight text-black text-center">
          {error ? t('pinSalah') : (isConfirming ? t('konfirmasiPin') : (mode === 'create' ? t('buatPin') : t('masukkanPin')))}
        </h2>
        <p className="text-gray-400 font-bold text-sm mb-12 tracking-wide">
          {isConfirming ? 'Ulangi PIN yang baru saja Anda buat' : (mode === 'create' ? 'Tentukan 4 digit angka keamanan' : 'Akses terbatas, masukkan PIN')}
        </p>

        <div className="flex gap-4 mb-16">
          {[0, 1, 2, 3].map((i) => (
            <motion.div 
              key={i}
              animate={currentPin.length > i ? { scale: 1.2 } : { scale: 1 }}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-300",
                currentPin.length > i ? "bg-indigo-600 border-indigo-600" : "border-gray-200"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((item, index) => (
            <button
              key={index}
              onClick={() => item === 'back' ? handleBackspace() : item !== '' && handleNumberClick(item)}
              className={cn(
                "h-20 rounded-[24px] flex items-center justify-center text-2xl font-black transition-all active:scale-95 shadow-sm liquid-squircle",
                item === '' ? "invisible" : (item === 'back' ? "bg-gray-100 text-gray-500" : "bg-white border border-black/5 text-black hover:bg-gray-50")
              )}
            >
              {item === 'back' ? <X className="w-6 h-6" /> : item}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NoteCard({ note, isSelected, isSelectingMode, onSelect, onEdit, onUpdate, onDelete, onVerifyPin, t, language, theme }: { 
  note: Note, 
  isSelected?: boolean,
  isSelectingMode?: boolean,
  onSelect?: (id: string) => void,
  onEdit: (note: Note) => void,
  onUpdate: (id: string, updates: Partial<Note>) => void,
  onDelete: (id: string, notify?: boolean) => void,
  onVerifyPin?: (callback: () => void) => void,
  t: (key: string) => string,
  language: string,
  theme: 'default' | 'light' | 'dark'
}) {
  const [showMenu, setShowMenu] = useState(false);
  const defaultBg = theme === 'dark' ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.72)';
  const currentBg = note.color === 'rgba(255, 255, 255, 0.72)' ? defaultBg : (note.color || defaultBg);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      onClick={() => isSelectingMode ? onSelect?.(note.id) : onEdit(note)}
      className={cn(
        "glass-panel p-7 rounded-[32px] cursor-pointer relative group liquid-squircle h-fit min-h-[200px] flex flex-col shadow-xl border-2 transition-all duration-300",
        isSelected ? "border-blue-500 ring-4 ring-blue-500/10 scale-95" : "border-transparent",
        showMenu ? "z-[50]" : "z-0",
        theme === 'dark' && "glass-dark border-white/10"
      )}
      style={{ backgroundColor: currentBg }}
    >
      {/* Selection Checkbox */}
      <AnimatePresence>
        {isSelectingMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-5 left-5 z-20"
          >
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white/50"
            )}>
              {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {note.content.includes('*') && !isSelectingMode && (
        <div className="absolute top-5 right-5 bg-blue-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-200">
          AI Quantum
        </div>
      )}
      
      <h3 className={cn(
        "font-black text-[20px] mb-3 leading-[1.1] tracking-tight transition-all",
        theme === 'dark' ? "text-white" : "text-black"
      )}>{note.title}</h3>
      <div className={cn(
        "text-[16px] leading-[1.6] line-clamp-5 flex-1 font-medium",
        theme === 'dark' ? "text-white/80" : "text-gray-700"
      )}>
        <ReactMarkdown 
          components={{
            span: ({node, ...props}: any) => {
              if (props.className === 'calc-highlight') return <span className="calc-highlight" {...props} />;
              return <span {...props} />;
            }
          }}
        >
          {note.content}
        </ReactMarkdown>
      </div>

      {note.isSecret && !isSelectingMode && (
        <div className="absolute inset-0 glass-dark opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Unlock className="w-10 h-10 text-white" />
        </div>
      )}

      <div className={cn(
        "mt-6 flex items-center justify-between text-[12px] font-black uppercase tracking-[0.15em]",
        theme === 'dark' ? "text-white/40" : "text-gray-400"
      )}>
        <div className="flex items-center gap-2 relative">
          {!isSelectingMode && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(note.id, { isFavorite: !note.isFavorite });
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-lg liquid-squircle active:scale-90 transition-transform",
                  theme === 'dark' ? "glass-dark border-white/5 hover:bg-white/10" : "glass-panel hover:bg-white/40"
                )}
              >
                <Star className={cn("w-5 h-5", note.isFavorite ? "fill-yellow-400 text-yellow-400" : (theme === 'dark' ? "text-white/20" : "text-gray-400"))} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-lg liquid-squircle active:scale-90 transition-transform",
                  theme === 'dark' ? "glass-dark border-white/5 hover:bg-white/10" : "glass-panel hover:bg-white/40"
                )}
              >
                <MoreHorizontal className={cn("w-6 h-6", theme === 'dark' ? "text-white" : "text-gray-800")} />
              </button>
            </>
          )}
          
          <AnimatePresence>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-[60] bg-transparent cursor-default" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute left-0 bottom-full mb-3 w-48 bg-white rounded-[28px] shadow-2xl z-[70] p-2 border border-black/10 liquid-squircle overflow-hidden"
                >
                  {note.isDeleted ? (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(note.id, { isDeleted: false });
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-black/5 flex items-center gap-3 active:bg-black/10 transition-colors rounded-2xl mb-1"
                      >
                        <Undo2 className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-sm text-gray-700">Pulihkan</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(note.id, { isArchived: !note.isArchived });
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-black/5 flex items-center gap-3 active:bg-black/10 transition-colors rounded-2xl mb-1"
                      >
                        <Archive className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-sm text-gray-700">{note.isArchived ? 'Buka Arsip' : 'Arsipkan'}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!note.isSecret) {
                            onVerifyPin?.(() => onUpdate(note.id, { isSecret: true }));
                          } else {
                            onUpdate(note.id, { isSecret: false });
                          }
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-black/5 flex items-center gap-3 active:bg-black/10 transition-colors rounded-2xl mb-1"
                      >
                        {note.isSecret ? <Unlock className="w-4 h-4 text-purple-600" /> : <Lock className="w-4 h-4 text-purple-600" />}
                        <span className="font-bold text-sm text-gray-700">{note.isSecret ? 'Hapus Privat' : 'Jadikan Privat'}</span>
                      </button>
                    </>
                  )}
                  <div className="h-[1px] bg-gray-100/50 mx-2 my-1" />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (note.isDeleted) {
                        if (confirm('Hapus permanen catatan ini?')) onDelete(note.id);
                      } else {
                        onDelete(note.id, true);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-red-500/10 text-red-600 flex items-center gap-3 active:bg-red-500/20 transition-colors rounded-2xl"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="font-bold text-sm">{note.isDeleted ? 'Hapus Permanen' : 'Hapus'}</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold transition-colors",
          theme === 'dark' ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-500"
        )}>
          {note.updatedAt ? new Date(note.updatedAt.toDate()).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' }) : (language === 'id' ? 'Baru' : 'New')}
        </span>
      </div>
    </motion.div>
  );
}

function NoteEditor({ note, isNew, onClose, onSave, onDelete, onSmartCalc, startRecording, isRecording, onVerifyPin, t, theme }: { 
  note: Note, 
  isNew: boolean,
  onClose: () => void, 
  onSave: (id: string, updates: Partial<Note>) => void,
  onDelete: (id: string) => void,
  onSmartCalc: (content: string) => Promise<string>,
  startRecording: () => void,
  isRecording: boolean,
  onVerifyPin?: (callback: () => void) => void,
  t: (key: string) => string,
  theme: 'default' | 'light' | 'dark'
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color || 'rgba(255, 255, 255, 0.72)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const defaultBg = theme === 'dark' ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.72)';
  const currentBg = color === 'rgba(255, 255, 255, 0.72)' ? defaultBg : color;

  const [history, setHistory] = useState<{title: string, content: string}[]>([{title: note.title, content: note.content}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [lastAutoSave, setLastAutoSave] = useState<{title: string, content: string}>({title: note.title, content: note.content});

  // Undo/Redo logic
  const pushToHistory = (newTitle: string, newContent: string, force = false) => {
    // Optimization: Skip history if nothing changed
    if (newTitle === lastAutoSave.title && newContent === lastAutoSave.content) return;
    
    const wordBoundary = newContent.endsWith(' ') || newContent.endsWith('\n') || 
                        newTitle.endsWith(' ') || newTitle.endsWith('\n');
    
    if (force || wordBoundary) {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ title: newTitle, content: newContent });
        return newHistory.length > 50 ? newHistory.slice(1) : newHistory;
      });
      setHistoryIndex(prev => {
        const next = Math.min(historyIndex + 1, 49);
        // Use a small delay for non-critical state updates to keep input smooth
        return next;
      });
      setLastAutoSave({ title: newTitle, content: newContent });
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setTitle(prev.title);
      setContent(prev.content);
      setHistoryIndex(historyIndex - 1);
      setLastAutoSave(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setTitle(next.title);
      setContent(next.content);
      setHistoryIndex(historyIndex + 1);
      setLastAutoSave(next);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${title || 'catatan'}.txt`);
    setShowShareSheet(false);
  };

  const handleShareLink = () => {
    // Simple placeholder for link sharing
    navigator.clipboard.writeText(window.location.href);
    alert('Link disalin ke papan klip!');
    setShowShareSheet(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    const selection = text.substring(start, end);

    const before = text.substring(0, start);
    const after = text.substring(end);

    const newContent = before + prefix + selection + suffix + after;
    setContent(newContent);
    pushToHistory(title, newContent, true);

    // Re-focus and set selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + prefix.length + selection.length + suffix.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-transparent backdrop-blur-3xl flex flex-col overflow-hidden h-[100svh]"
    >
      {/* Editor Header */}
      <header className="px-6 pt-4 pb-4 flex items-center justify-between z-10 bg-white/20 backdrop-blur-xl border-b border-white/10 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-blue-600 font-bold active:opacity-50">
          <ChevronLeft className="w-7 h-7" />
          <span className="text-lg">{t('kembali')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.preventDefault(); handleUndo(); }}
            disabled={historyIndex === 0}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all liquid-squircle",
              historyIndex === 0 
                ? "opacity-30 cursor-not-allowed bg-black/5 dark:bg-white/5" 
                : "bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 shadow-sm active:scale-90 hover:bg-white/80 dark:hover:bg-black/60"
            )}
          >
            <Undo2 className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleRedo(); }}
            disabled={historyIndex === history.length - 1}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all liquid-squircle",
              historyIndex === history.length - 1 
                ? "opacity-30 cursor-not-allowed bg-black/5 dark:bg-white/5" 
                : "bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 shadow-sm active:scale-90 hover:bg-white/80 dark:hover:bg-black/60"
            )}
          >
            <Redo2 className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>

          <button onClick={() => setShowShareSheet(true)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all liquid-squircle active:scale-90 ml-1">
            <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </button>
          
          <div className="relative ml-1">
            <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 active:opacity-50">
              <MoreHorizontal className="w-6 h-6 text-blue-600" />
            </button>
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute right-0 top-12 w-48 glass-panel rounded-2xl shadow-2xl z-[150] py-2 border border-white/40 overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      onSave(note.id, { isArchived: !note.isArchived });
                      setShowMoreMenu(false);
                      onClose();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 active:bg-blue-100 transition-colors"
                  >
                    <Archive className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm text-gray-700">{note.isArchived ? 'Pindah dari Arsip' : 'Pindah ke Arsip'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      onSave(note.id, { isFavorite: !note.isFavorite });
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-yellow-50 flex items-center gap-3 active:bg-yellow-100 transition-colors"
                  >
                    <Star className={cn("w-4 h-4", note.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400")} />
                    <span className="font-bold text-sm text-gray-700">{note.isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (!note.isSecret) {
                        onVerifyPin?.(() => {
                          onSave(note.id, { isSecret: true });
                          setShowMoreMenu(false);
                        });
                      } else {
                        onSave(note.id, { isSecret: false });
                        setShowMoreMenu(false);
                      }
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 active:bg-purple-100 transition-colors"
                  >
                    {note.isSecret ? <Unlock className="w-4 h-4 text-purple-600" /> : <Lock className="w-4 h-4 text-purple-600" />}
                    <span className="font-bold text-sm text-gray-700">{note.isSecret ? 'Hapus Privat' : 'Jadikan Privat'}</span>
                  </button>
                  <div className="h-[1px] bg-gray-100/50 mx-2 my-1" />
                  <button 
                    onClick={() => {
                      onDelete(note.id);
                      setShowMoreMenu(false);
                      onClose();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-500 flex items-center gap-3 active:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="font-bold text-sm">Hapus</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => {
              onSave(note.id, { title, content, color });
              onClose();
            }}
            className="px-5 py-2 bg-blue-600 text-white rounded-full font-black text-sm active:scale-95 transition-all shadow-md shadow-blue-200"
          >
            {t('save')}
          </button>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col" style={{ backgroundColor: currentBg }}>
        <input 
          type="text" 
          value={title}
          autoComplete="off"
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            pushToHistory(title, content, true);
          }}
          onChange={(e) => {
            const newVal = e.target.value;
            setTitle(newVal);
            pushToHistory(newVal, content);
          }}
          placeholder="Judul"
          className={cn(
            "text-4xl font-black w-full bg-transparent border-none focus:ring-0 mb-6 tracking-tight shrink-0",
            theme === 'dark' ? "text-white placeholder:text-white/50" : "text-black placeholder:text-gray-500"
          )}
        />
        
        {/* Color Palette (Subtle Accent) */}
        <div className="flex gap-4 mb-8">
          {[
            { label: 'Default', value: 'rgba(255, 255, 255, 0.72)' },
            { label: 'Red', value: 'rgba(255, 59, 48, 0.15)' },
            { label: 'Blue', value: 'rgba(0, 122, 255, 0.15)' },
            { label: 'Green', value: 'rgba(52, 199, 89, 0.15)' },
            { label: 'Yellow', value: 'rgba(255, 204, 0, 0.15)' },
          ].map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-transform active:scale-75 shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
                color === c.value ? "border-blue-500 scale-110" : "border-black/10 dark:border-white/30"
              )}
              style={{ backgroundColor: c.value === 'rgba(255, 255, 255, 0.72)' ? defaultBg : c.value }}
            />
          ))}
        </div>
        
        {/* Formatting Toolbar */}
        <div className="min-h-[64px] mb-4 shrink-0 flex items-center">
          <AnimatePresence>
            {isFocused && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-2xl w-fit",
                  theme === 'dark' ? "glass-dark border-white/10" : "glass-panel border-white/40"
                )}
              >
                <button 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); insertMarkdown('**', '**'); }}
                  onMouseDown={(e) => { e.preventDefault(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/10 active:scale-90 transition-all"
                  title="Bold"
                >
                  <Bold className={cn("w-5 h-5", theme === 'dark' ? "text-white" : "text-gray-800")} />
                </button>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); insertMarkdown('*', '*'); }}
                  onMouseDown={(e) => { e.preventDefault(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/10 active:scale-90 transition-all"
                  title="Italic"
                >
                  <Italic className={cn("w-5 h-5", theme === 'dark' ? "text-white" : "text-gray-800")} />
                </button>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); insertMarkdown('- '); }}
                  onMouseDown={(e) => { e.preventDefault(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/10 active:scale-90 transition-all"
                  title="List"
                >
                  <List className={cn("w-5 h-5", theme === 'dark' ? "text-white" : "text-gray-800")} />
                </button>
                <div className={cn("w-[1px] h-6 mx-1", theme === 'dark' ? "bg-white/20" : "bg-gray-300")} />
                <button 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); insertMarkdown('# '); }}
                  onMouseDown={(e) => { e.preventDefault(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/10 active:scale-90 transition-all"
                  title="Heading"
                >
                  <Type className={cn("w-5 h-5", theme === 'dark' ? "text-white" : "text-gray-800")} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <textarea 
          ref={textareaRef}
          value={content}
          autoComplete="off"
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            pushToHistory(title, content, true);
          }}
          onChange={(e) => {
            const newVal = e.target.value;
            setContent(newVal);
            pushToHistory(title, newVal);
          }}
          placeholder="Mulai menulis..."
          className={cn(
            "w-full bg-transparent border-none focus:ring-0 text-xl leading-relaxed resize-none font-medium min-h-[50vh] pb-[60svh]",
            theme === 'dark' ? "text-white/90 placeholder:text-white/50" : "text-gray-700 placeholder:text-gray-500"
          )}
        />
      </div>

      {/* Share Bottom Sheet */}
      <AnimatePresence>
        {showShareSheet && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl rounded-t-[40px] z-[120] p-8 pb-12 flex flex-col gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
              <button 
                onClick={handleDownload}
                className="w-full flex items-center gap-4 p-5 btn-hero-grad rounded-[24px] font-bold"
              >
                <div className="w-12 h-12 btn-glass-blue rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-lg text-gray-800">Unduh Catatan</p>
                  <p className="text-gray-500 text-sm font-medium">Format Teks (.txt)</p>
                </div>
              </button>
              <button 
                onClick={handleShareLink}
                className="w-full flex items-center gap-4 p-5 btn-hero-grad rounded-[24px] font-bold"
              >
                <div className="w-12 h-12 btn-glass-purple rounded-full flex items-center justify-center">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-lg text-gray-800">Bagikan Link</p>
                  <p className="text-gray-500 text-sm font-medium">Salin ke papan klip</p>
                </div>
              </button>
              <button 
                onClick={() => setShowShareSheet(false)}
                className="w-full mt-4 py-5 btn-hero-grad text-gray-700 rounded-[24px] font-black text-lg"
              >
                Batal
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 btn-hero-grad px-6 py-4 rounded-[28px] shadow-xl border-white/50 whitespace-nowrap liquid-squircle"
    >
      <div className="text-blue-600">{icon}</div>
      <span className="text-[12px] font-black text-gray-800 tracking-wider uppercase">{label}</span>
    </button>
  );
}
