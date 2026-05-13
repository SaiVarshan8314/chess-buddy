/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Layout, Grid as ChessIcon, BarChart3, MessageSquare, User as UserIcon, LogOut, History, Zap, Users, Target, BookOpen, Trophy } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';
import Profile from './components/Profile';
import AIChat from './components/AIChat';
import PlayWithFriends from './components/PlayWithFriends';
import Tactics from './components/Tactics';
import Leaderboard from './components/Leaderboard';
import Manual from './components/Manual';
import Landing from './components/Landing';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'play' | 'analysis' | 'tactics' | 'chat' | 'world' | 'profile' | 'manual'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for deep link /play/:id
    const path = window.location.pathname;
    if (path.startsWith('/play/')) {
      const sessionId = path.split('/')[2];
      if (sessionId) {
        setInitialSessionId(sessionId);
        setActiveTab('play');
      }
    }

    const handleDashboard = () => setActiveTab('dashboard');
    const handleProfile = () => setActiveTab('profile');
    const handleManual = () => setActiveTab('manual');

    window.addEventListener('NAV_DASHBOARD', handleDashboard);
    window.addEventListener('NAV_PROFILE', handleProfile);
    window.addEventListener('NAV_MANUAL', handleManual);

    return () => {
      window.removeEventListener('NAV_DASHBOARD', handleDashboard);
      window.removeEventListener('NAV_PROFILE', handleProfile);
      window.removeEventListener('NAV_MANUAL', handleManual);
    };
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Initial setup/check
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const newUser = {
              userId: user.uid,
              username: user.displayName || 'Chess Buddy User',
              email: user.email,
              fairScore: 100,
              createdAt: new Date().toISOString(),
            };
            
            const publicProfile = {
              userId: user.uid,
              username: newUser.username,
              photoURL: user.photoURL || '',
              fairScore: 100,
              xp: 0,
              createdAt: newUser.createdAt
            };

            await Promise.all([
              setDoc(userDocRef, newUser),
              setDoc(doc(db, 'publicProfiles', user.uid), publicProfile)
            ]);
          }

          // Real-time listener for profile updates
          unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setDbUser(data);

              // Ensure publicProfile exists for existing users
              const publicProfileRef = doc(db, 'publicProfiles', user.uid);
              const publicProfileSnap = await getDoc(publicProfileRef);
              if (!publicProfileSnap.exists()) {
                const publicProfile = {
                  userId: user.uid,
                  username: data.username || user.displayName || 'Chess Buddy User',
                  photoURL: data.photoURL || user.photoURL || '',
                  fairScore: data.fairScore || 100,
                  xp: data.xp || 0,
                  createdAt: data.createdAt || new Date().toISOString()
                };
                await setDoc(publicProfileRef, publicProfile);
              }
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          });

        } catch (e) {
          console.error("Firestore init error:", e);
          if (e instanceof Error && (e.message.includes('offline') || e.message.includes('unavailable'))) {
            // Graceful degradation: still show app but maybe with limited data
            console.warn("Client is operating in offline mode.");
          } else {
            handleFirestoreError(e, OperationType.GET, 'users/init');
          }
        }
      } else {
        setUser(null);
        setDbUser(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-[#f5f5f5]">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <h1 className="text-2xl font-sans tracking-tighter">CHESS BUDDY</h1>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Landing onLogin={loginWithGoogle} />;
  }

  return (
    <div className="h-screen flex bg-[#0a0a0a] text-[#f5f5f5] overflow-hidden font-sans">
      {/* Sidebar - Desktop & Tablet */}
      <nav className="hidden md:flex w-64 border-r border-[#2a2a2a] flex-col p-4 gap-6 bg-[#0f0f0f]">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ChessIcon className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter uppercase leading-none">Chess Buddy</span>
            <span className="text-[8px] font-black text-orange-500 tracking-[0.2em] uppercase">by SAI VARSHAN</span>
          </div>
        </div>

        <NavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<BarChart3 />} 
          label="Dashboard" 
        />
        <NavItem 
          active={activeTab === 'play'} 
          onClick={() => setActiveTab('play')} 
          icon={<Users />} 
          label="Play Center" 
        />
        <NavItem 
          active={activeTab === 'analysis'} 
          onClick={() => setActiveTab('analysis')} 
          icon={<Zap />} 
          label="Analysis" 
        />
        <NavItem 
          active={activeTab === 'tactics'} 
          onClick={() => setActiveTab('tactics')} 
          icon={<Target />} 
          label="Puzzle Lab" 
        />
        <NavItem 
          active={activeTab === 'chat'} 
          onClick={() => setActiveTab('chat')} 
          icon={<MessageSquare />} 
          label="AI Friend" 
        />
        <NavItem 
          active={activeTab === 'world'} 
          onClick={() => setActiveTab('world')} 
          icon={<Trophy />} 
          label="Leaderboard" 
        />
        <NavItem 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
          icon={<UserIcon />} 
          label="Profile" 
        />
        <NavItem 
          active={activeTab === 'manual'} 
          onClick={() => setActiveTab('manual')} 
          icon={<BookOpen />} 
          label="User Guide" 
        />

        <div className="mt-auto pt-4 border-t border-[#2a2a2a]">
          <div className="px-4 mb-4">
            <span className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">System Founder</span>
            <p className="text-[10px] font-black text-white uppercase italic tracking-tight">SAI VARSHAN</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content & Mobile Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header Branding */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0f0f0f] border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <ChessIcon className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter uppercase leading-none">Chess Buddy</span>
              <span className="text-[7px] font-black text-orange-500 tracking-widest uppercase">SAI VARSHAN</span>
            </div>
          </div>
          <div className="flex gap-1">
             <MobileTabItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 className="w-4 h-4" />} />
             <MobileTabItem active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<Zap className="w-4 h-4" />} />
             <MobileTabItem active={activeTab === 'tactics'} onClick={() => setActiveTab('tactics')} icon={<Target className="w-4 h-4" />} />
             <MobileTabItem active={activeTab === 'play'} onClick={() => setActiveTab('play')} icon={<Users className="w-4 h-4" />} />
             <MobileTabItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon className="w-4 h-4" />} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#121212]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {activeTab === 'dashboard' && <Dashboard user={user} dbUser={dbUser} />}
              {activeTab === 'analysis' && <Analysis user={user} dbUser={dbUser} />}
              {activeTab === 'tactics' && <Tactics user={user} dbUser={dbUser} />}
              {activeTab === 'chat' && <AIChat user={user} />}
              {activeTab === 'play' && <PlayWithFriends user={user} dbUser={dbUser} initialSessionId={initialSessionId} />}
              {activeTab === 'world' && <Leaderboard user={user} dbUser={dbUser} />}
              {activeTab === 'profile' && <Profile user={user} dbUser={dbUser} />}
              {activeTab === 'manual' && <Manual />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function MobileTabItem({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${active ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
    >
      {icon}
    </button>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
          : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-100'
      }`}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

