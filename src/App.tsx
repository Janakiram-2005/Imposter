import React, { useState, useEffect, useRef, FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Users, Send, User, Crown, Timer, AlertTriangle, CheckCircle2, XCircle, Sun, Moon, MessageSquare, Ghost, Download } from "lucide-react";
import { cn } from "@/src/lib/utils";
import axios from "axios";
import { Player, Room, Message } from "./types";
import { Toaster, toast } from "sonner";

const socket: Socket = io({
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

const AnimatedBackground = ({ theme }: { theme: "light" | "dark" }) => (
  <div className={cn(
    "absolute inset-0 overflow-hidden pointer-events-none z-0 transform-gpu transition-colors duration-500",
    theme === "dark" ? "bg-[#050505]" : "bg-zinc-100"
  )}>
    {/* Grid Pattern - Subtle grid */}
    <div 
      className={cn(
        "absolute inset-0 will-change-transform",
        theme === "dark" ? "opacity-[0.05]" : "opacity-[0.1]"
      )}
      style={{ 
        backgroundImage: `linear-gradient(to right, ${theme === "dark" ? "#ffffff" : "#000000"} 1px, transparent 1px), linear-gradient(to bottom, ${theme === "dark" ? "#ffffff" : "#000000"} 1px, transparent 1px)`,
        backgroundSize: '100px 100px'
      }} 
    />

    {/* Refined Floating Elements */}
    {[...Array(12)].map((_, i) => {
      const size = Math.random() * 2 + 1;
      const isCross = i % 4 === 0;
      
      return (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: 0,
          }}
          animate={{ 
            y: [null, Math.random() * 100 + "%"],
            opacity: [0, theme === "dark" ? 0.2 : 0.4, 0],
          }}
          transition={{ 
            duration: Math.random() * 40 + 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute flex items-center justify-center will-change-transform transform-gpu"
        >
          {isCross ? (
            <div className="relative w-2 h-2 opacity-10">
              <div className={cn("absolute inset-0 m-auto w-full h-[1px]", theme === "dark" ? "bg-red-600" : "bg-red-500")} />
              <div className={cn("absolute inset-0 m-auto w-[1px] h-full", theme === "dark" ? "bg-red-600" : "bg-red-500")} />
            </div>
          ) : (
            <div 
              style={{ width: size, height: size }}
              className={cn(
                "rounded-full",
                i % 3 === 0 ? (theme === "dark" ? "bg-red-600/30" : "bg-red-500/40") : (theme === "dark" ? "bg-white/5" : "bg-black/10")
              )}
            />
          )}
        </motion.div>
      );
    })}

    {/* Large ambient glows */}
    <motion.div
      animate={{ 
        opacity: [0.03, 0.06, 0.03],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "absolute top-0 left-0 w-[80%] h-[80%] rounded-full blur-[120px] -translate-x-1/4 -translate-y-1/4 will-change-[opacity] transform-gpu",
        theme === "dark" ? "bg-red-900/10" : "bg-red-200/20"
      )}
    />
    <motion.div
      animate={{ 
        opacity: [0.02, 0.05, 0.02],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
      className={cn(
        "absolute bottom-0 right-0 w-[80%] h-[80%] rounded-full blur-[120px] translate-x-1/4 translate-y-1/4 will-change-[opacity] transform-gpu",
        theme === "dark" ? "bg-red-600/5" : "bg-red-300/10"
      )}
    />

    {/* Technical Detail: Slow Scanning Line */}
    <motion.div 
      animate={{ y: ["-10%", "110%"] }}
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      className={cn(
        "absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-600/10 to-transparent will-change-transform transform-gpu",
        theme === "light" && "via-red-400/20"
      )}
    />

    {/* Vignette - Static */}
    <div className={cn(
      "absolute inset-0",
      theme === "dark" 
        ? "bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]"
        : "bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)]"
    )} />
  </div>
);

const GlitchText = ({ text, className }: { text: string; className?: string }) => {
  return (
    <div className={cn("relative inline-block group", className)}>
      <span className="relative z-10">{text}</span>
      <motion.span
        animate={{ 
          x: [0, -2, 2, -1, 0],
          opacity: [0, 0.5, 0.2, 0.8, 0],
          skew: [0, 10, -10, 5, 0]
        }}
        transition={{ 
          duration: 0.2, 
          repeat: Infinity, 
          repeatDelay: Math.random() * 5 + 2,
          ease: "easeInOut"
        }}
        className="absolute inset-0 z-0 text-red-500 opacity-50 select-none pointer-events-none transform-gpu"
      >
        {text}
      </motion.span>
      <motion.span
        animate={{ 
          x: [0, 2, -2, 1, 0],
          opacity: [0, 0.3, 0.6, 0.1, 0],
          skew: [0, -5, 5, -10, 0]
        }}
        transition={{ 
          duration: 0.15, 
          repeat: Infinity, 
          repeatDelay: Math.random() * 3 + 1,
          ease: "easeInOut"
        }}
        className="absolute inset-0 z-0 text-blue-500 opacity-30 select-none pointer-events-none transform-gpu"
      >
        {text}
      </motion.span>
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [name, setName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showLobbyChat, setShowLobbyChat] = useState(false);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [recentRooms, setRecentRooms] = useState<{ id: string; date: number }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [profileEdit, setProfileEdit] = useState({ description: '', gamerId: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/user/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setUser(res.data);
          setName(res.data.name);
          setProfileEdit({ description: res.data.description || '', gamerId: res.data.gamerId || '' });
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  const updateProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.put('/api/user/me', profileEdit, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      toast.success("Profile updated!");
      setShowProfile(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('/api/leaderboard');
      setLeaderboard(res.data);
      setShowLeaderboard(true);
    } catch (err) {
      toast.error("Failed to load leaderboard");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();
      
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        toast.error('Please allow popups to sign in with Google');
      }
    } catch (error: any) {
      toast.error(error.message || "Sign in failed");
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.token;
        localStorage.setItem('token', token);
          axios.get('/api/user/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => {
            setUser(res.data);
            setName(res.data.name);
            setProfileEdit({ description: res.data.description || '', gamerId: res.data.gamerId || '' });
            toast.success("Signed in successfully!");
          })
          .catch(() => toast.error("Failed to fetch user profile"));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const storedRecent = localStorage.getItem("recentRooms");
    if (storedRecent) {
      try {
        setRecentRooms(JSON.parse(storedRecent));
      } catch (e) {
        console.error("Failed to parse recent rooms", e);
      }
    }
  }, []);

  const addRecentRoom = (roomId: string) => {
    setRecentRooms(prev => {
      const filtered = prev.filter(r => r.id !== roomId);
      const updated = [{ id: roomId, date: Date.now() }, ...filtered].slice(0, 3);
      localStorage.setItem("recentRooms", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  useEffect(() => {
    console.log("Room state updated:", room);
  }, [room]);

  useEffect(() => {
    console.log("Joined state updated:", joined);
  }, [joined]);

  useEffect(() => {
    if (lastMessage) {
      const timer = setTimeout(() => setLastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");

    const storedName = sessionStorage.getItem("playerName");
    const storedRoomId = sessionStorage.getItem("roomId");
    
    if (storedName) setName(storedName);
    
    if (storedRoomId) {
      setRoomIdInput(storedRoomId);
    } else if (roomParam) {
      setRoomIdInput(roomParam);
    }

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
      
      const currentStoredName = sessionStorage.getItem("playerName");
      const currentStoredRoomId = sessionStorage.getItem("roomId");
      
      if (currentStoredName && currentStoredRoomId) {
        console.log("Auto-reconnecting to room", currentStoredRoomId);
        socket.emit("join-room", { roomId: currentStoredRoomId, name: currentStoredName });
      }
    };

    socket.on("connect", handleConnect);

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("room-joined", ({ roomId, player, room }) => {
      console.log("Room joined event received:", { roomId, player, room });
      setRoom(room);
      setCurrentPlayer(player);
      setJoined(true);
      setIsJoining(false);
      setIsCreating(false);
      setError(null);
      
      sessionStorage.setItem("playerName", player.name);
      sessionStorage.setItem("roomId", roomId);
      addRecentRoom(roomId);
    });

    socket.on("player-joined", (players) => {
      setRoom((prev) => prev ? { ...prev, players } : null);
      const me = players.find((p: Player) => p.id === socket.id);
      if (me) setCurrentPlayer(me);
    });

    socket.on("player-left", (players) => {
      setRoom((prev) => prev ? { ...prev, players } : null);
      const me = players.find((p: Player) => p.id === socket.id);
      if (me) setCurrentPlayer(me);
    });

    socket.on("game-started", (updatedRoom) => {
      setRoom(updatedRoom);
      // Update current player state to reflect imposter status
      const me = updatedRoom.players.find((p: Player) => p.id === socket.id);
      if (me) {
        setCurrentPlayer(me);
        setShowRoleReveal(true);
        setTimeout(() => setShowRoleReveal(false), 4000);
      }
    });

    socket.on("timer-update", (timer) => {
      setRoom((prev) => prev ? { ...prev, timer } : null);
    });

    socket.on("new-message", (message: Message) => {
      setRoom((prev) => prev ? { ...prev, messages: [...prev.messages, message] } : null);
      
      // Show popup if chat is hidden and message is from someone else
      if (message.sender !== currentPlayer?.name) {
        setLastMessage(message);
      }
    });

    socket.on("voting-started", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on("transition-voting", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on("notification", ({ message }) => {
      toast(message);
    });

    socket.on("player-voted", ({ voterId, targetId }) => {
      setRoom((prev) => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => {
          if (p.id === voterId) return { ...p, votedFor: targetId };
          if (p.id === targetId) return { ...p, votesReceived: p.votesReceived + 1 };
          return p;
        });
        return { ...prev, players: newPlayers };
      });
    });

    socket.on("game-ended", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on("returned-to-lobby", (updatedRoom) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p: Player) => p.id === socket.id);
      if (me) setCurrentPlayer(me);
    });

    socket.on("settings-updated", ({ gameDuration, votingDuration }) => {
      setRoom((prev) => prev ? { ...prev, gameDuration, votingDuration } : null);
    });

    socket.on("player-ready-to-vote", ({ playerId, readyToVoteCount }) => {
      setRoom((prev) => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => 
          p.id === playerId ? { ...p, isReadyToVote: true } : p
        );
        return { ...prev, players: newPlayers, readyToVoteCount };
      });
    });

    socket.on("round-reset", () => {
      setRoom((prev) => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => ({ ...p, hasMessagedThisRound: false }));
        return { ...prev, players: newPlayers };
      });
      setCurrentPlayer((prev) => prev ? { ...prev, hasMessagedThisRound: false } : null);
    });

    socket.on("error", (msg) => {
      setError(msg);
      setIsJoining(false);
      setIsCreating(false);
      if (msg.includes("Room not found")) {
        sessionStorage.removeItem("playerName");
        sessionStorage.removeItem("roomId");
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("room-joined");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("game-started");
      socket.off("timer-update");
      socket.off("new-message");
      socket.off("voting-started");
      socket.off("player-voted");
      socket.off("game-ended");
      socket.off("returned-to-lobby");
      socket.off("settings-updated");
      socket.off("player-ready-to-vote");
      socket.off("round-reset");
      socket.off("error");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages]);

  const createRoom = () => {
    if (!name) return setError("Please enter your name");
    if (isCreating) return;
    setIsCreating(true);
    socket.emit("create-room", { name, dbUserId: user?._id, avatar: user?.avatar, gamerId: user?.gamerId });
  };

  const joinRoom = () => {
    if (!name) return setError("Please enter your name");
    if (!roomIdInput) return setError("Please enter a room ID");
    if (isJoining) return;
    setIsJoining(true);
    console.log(`Attempting to join room ${roomIdInput} with name ${name}. Socket ID: ${socket.id}`);
    socket.emit("join-room", { roomId: roomIdInput, name, dbUserId: user?._id, avatar: user?.avatar, gamerId: user?.gamerId });
  };

  const startGame = () => {
    if (room) socket.emit("start-game", room.id);
  };

  const updateSettings = (gameDuration: number, votingDuration: number) => {
    if (room && currentPlayer?.isHost) {
      socket.emit("update-settings", { roomId: room.id, gameDuration, votingDuration });
    }
  };

  const setReadyToVote = () => {
    if (room && currentPlayer && !currentPlayer.isReadyToVote) {
      socket.emit("ready-to-vote", room.id);
      setCurrentPlayer({ ...currentPlayer, isReadyToVote: true });
    }
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && room && currentPlayer) {
      if (room.status === "playing" && currentPlayer.hasMessagedThisRound) return;
      
      socket.emit("send-message", { roomId: room.id, text: messageInput });
      setMessageInput("");
      
      if (room.status === "playing") {
        setCurrentPlayer({ ...currentPlayer, hasMessagedThisRound: true });
      }
    }
  };

  const handleVote = (targetId: string) => {
    if (room && currentPlayer && !currentPlayer.votedFor && targetId !== currentPlayer.id) {
      socket.emit("vote", { roomId: room.id, targetId });
      setCurrentPlayer(prev => prev ? { ...prev, votedFor: targetId } : null);
    }
  };

  const returnToLobby = () => {
    if (room) socket.emit("return-to-lobby", room.id);
  };

  const leaveRoom = () => {
    socket.emit("leave-room", room?.id);
    setJoined(false);
    setRoom(null);
    setCurrentPlayer(null);
    setError(null);
    sessionStorage.removeItem("playerName");
    sessionStorage.removeItem("roomId");
  };

  if (!joined) {
    return (
      <div className="min-h-screen text-foreground flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative bg-background transition-colors duration-500">
        <AnimatedBackground theme={theme} />

        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-card border border-border text-foreground hover:bg-muted transition-all shadow-lg"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-12 relative z-10"
        >
          <div className="relative inline-block">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-600/40 transform -rotate-12">
                <Ghost size={40} className="text-white" />
              </div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-red-600 italic uppercase transform -skew-x-12 drop-shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                <GlitchText text="IMPOSTER" />
              </h1>
            </div>
            <div className="absolute -bottom-2 right-0 bg-foreground text-background px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
              Game
            </div>
          </div>
        </motion.div>

        <div className="w-full max-w-md space-y-6 bg-card/40 backdrop-blur-xl p-8 rounded-2xl border border-border shadow-2xl relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-muted/30 border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition-colors text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="bg-foreground text-background font-bold py-3 rounded-lg hover:opacity-90 transition-colors uppercase text-sm tracking-widest disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Room"}
            </button>
            <div className="relative">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                placeholder="Room ID"
                className="w-full bg-muted/30 border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition-colors text-sm uppercase text-foreground"
              />
            </div>
          </div>
          
          <button
            onClick={joinRoom}
            disabled={isJoining}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors uppercase text-sm tracking-widest disabled:opacity-50 shadow-lg shadow-red-600/40"
          >
            {isJoining ? "Joining..." : "Join Room"}
          </button>

          {recentRooms.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 text-center">Recent Rooms</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {recentRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRoomIdInput(r.id);
                      if (name.trim()) {
                        socket.emit("join-room", { roomId: r.id, name: name.trim(), dbUserId: user?._id, avatar: user?.avatar, gamerId: user?.gamerId });
                        setIsJoining(true);
                      }
                    }}
                    className="bg-muted/30 hover:bg-muted/50 border border-border px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-colors"
                  >
                    {r.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-[0.2em] font-bold transition-colors"
            >
              How to Play
            </button>
            <div className="flex gap-4">
              {user && (
                <button
                  onClick={() => setShowProfile(true)}
                  className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-[0.2em] font-bold transition-colors"
                >
                  Profile
                </button>
              )}
              <button
                onClick={fetchLeaderboard}
                className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-[0.2em] font-bold transition-colors"
              >
                Leaderboard
              </button>
            </div>
          </div>

          {!user ? (
            <button
              onClick={handleGoogleSignIn}
              className="w-full mt-4 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-100 transition-colors uppercase text-sm tracking-widest flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          ) : (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border flex items-center gap-4">
              {user.avatar && <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />}
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">Wins: {user.wins} | Played: {user.gamesPlayed}</div>
              </div>
              <button onClick={() => {
                localStorage.removeItem('token');
                setUser(null);
              }} className="text-xs text-red-500 hover:text-red-400 uppercase tracking-widest font-bold">
                Sign Out
              </button>
            </div>
          )}

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 transition-all uppercase text-xs tracking-widest shadow-lg shadow-red-600/20 border border-red-500/50"
            >
              <Download size={16} />
              Add Shortcut to Home
            </button>
          )}

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-center text-sm font-medium"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Leaderboard Modal */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/40 backdrop-blur-sm transform-gpu"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl max-w-lg w-full p-8 relative overflow-hidden transform-gpu"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
                <h3 className="text-2xl font-black italic text-yellow-500 uppercase transform -skew-x-12 mb-6 tracking-tighter">Leaderboard</h3>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {leaderboard.length === 0 ? (
                    <p className="text-center text-muted-foreground">No data available yet.</p>
                  ) : (
                    leaderboard.map((player, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="text-xl font-black text-muted-foreground w-6 text-center">
                          {index + 1}
                        </div>
                        {player.avatar && (
                          <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full" />
                        )}
                        <div className="flex-1">
                          <div className="font-bold text-foreground">
                            {player.name}
                            {player.gamerId && <span className="ml-2 text-xs font-mono text-muted-foreground/60">({player.gamerId})</span>}
                          </div>
                          {player.description && <div className="text-xs text-muted-foreground/80 italic mb-1 truncate max-w-[200px]">{player.description}</div>}
                          <div className="text-xs text-muted-foreground flex gap-3">
                            <span>Wins: <span className="text-yellow-500 font-bold">{player.wins}</span></span>
                            <span>Played: {player.gamesPlayed}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="mt-8 w-full bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-lg transition-colors uppercase text-sm tracking-widest"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Modal */}
        <AnimatePresence>
          {showProfile && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/40 backdrop-blur-sm transform-gpu"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl max-w-lg w-full p-8 relative overflow-hidden transform-gpu"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                <h3 className="text-2xl font-black italic text-blue-500 uppercase transform -skew-x-12 mb-6 tracking-tighter">My Profile</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {user.avatar && <img src={user.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-border" />}
                    <div>
                      <div className="text-xl font-bold text-foreground">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Games</div>
                      <div className="text-2xl font-black">{user.gamesPlayed}</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Wins</div>
                      <div className="text-2xl font-black text-yellow-500">{user.wins}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gamer ID</label>
                    <input
                      type="text"
                      value={profileEdit.gamerId}
                      onChange={(e) => setProfileEdit({ ...profileEdit, gamerId: e.target.value })}
                      placeholder="e.g. Player#1234"
                      className="w-full bg-muted/30 border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                    <textarea
                      value={profileEdit.description}
                      onChange={(e) => setProfileEdit({ ...profileEdit, description: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full bg-muted/30 border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm text-foreground resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setShowProfile(false)}
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-lg transition-colors uppercase text-sm tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateProfile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors uppercase text-sm tracking-widest shadow-lg shadow-blue-600/40"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How to Play Modal */}
        <AnimatePresence>
          {showHowToPlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/40 backdrop-blur-sm transform-gpu"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl max-w-lg w-full p-8 relative overflow-hidden transform-gpu"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
                <h3 className="text-2xl font-black italic text-red-600 uppercase transform -skew-x-12 mb-6 tracking-tighter">How to Play</h3>
                
                <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                  <section>
                    <h4 className="text-foreground font-bold uppercase tracking-widest text-xs mb-2">The Concept</h4>
                    <p>Everyone in the room is given a secret topic (e.g., "Pizza"), except for one person—the <span className="text-red-500 font-bold italic">Imposter</span>. The Imposter has no idea what the topic is.</p>
                  </section>

                  <section>
                    <h4 className="text-foreground font-bold uppercase tracking-widest text-xs mb-2">The Goal</h4>
                    <p><span className="text-foreground font-bold">Players:</span> Find and vote out the Imposter before time runs out.</p>
                    <p><span className="text-red-500 font-bold">Imposter:</span> Blend in, participate in the conversation, and avoid being caught.</p>
                  </section>

                  <section>
                    <h4 className="text-foreground font-bold uppercase tracking-widest text-xs mb-2">The Flow</h4>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Message in turns to discuss the topic without being too obvious.</li>
                      <li>If you think you know the Imposter, click <span className="text-foreground font-bold">"Ready to Vote"</span>.</li>
                      <li>Once more than half are ready, voting begins!</li>
                    </ul>
                  </section>
                </div>

                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="mt-8 w-full bg-foreground text-background font-bold py-3 rounded-lg hover:opacity-90 transition-colors uppercase text-sm tracking-widest shadow-xl"
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const toggleLobbyChat = () => {
    setShowLobbyChat(prev => {
      if (!prev) setLastMessage(null);
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden relative transition-colors duration-500">
      <AnimatedBackground theme={theme} />

      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-card border border-border text-foreground hover:bg-muted transition-all shadow-lg"
        aria-label="Toggle Theme"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      {/* Header */}
      <header className="p-3 md:p-4 border-b border-border flex items-center justify-between bg-card/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
            <Ghost size={18} className="text-white" />
          </div>
          <h2 className="text-xl md:text-2xl font-black italic text-red-600 transform -skew-x-12">
            <GlitchText text="IMPOSTER" />
          </h2>
          <div 
            onClick={() => {
              navigator.clipboard.writeText(room?.id || "");
            }}
            className="bg-muted/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-mono tracking-widest text-muted-foreground cursor-pointer hover:bg-muted transition-colors flex items-center gap-1"
            title="Click to copy Room ID"
          >
            {room?.id}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setShowPlayers(!showPlayers)}
            className="md:hidden bg-muted/30 p-2 rounded-lg border border-border"
          >
            <Users size={18} />
          </button>
          <div className="hidden md:flex items-center gap-2 text-muted-foreground/60 text-sm">
            <Users size={16} />
            <span>{room?.players.length}/15</span>
          </div>
          <button 
            onClick={leaveRoom}
            className="bg-muted/30 hover:bg-red-600/20 hover:text-red-600 px-2 md:px-3 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all uppercase tracking-widest border border-border hover:border-red-600/40"
          >
            Leave
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        {/* Role Reveal Overlay */}
        <AnimatePresence>
          {showRoleReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-6 backdrop-blur-md",
                currentPlayer?.isImposter ? "bg-red-950/90" : "bg-blue-950/90"
              )}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="space-y-6 relative"
              >
                {/* Ambient glow behind text */}
                <div className={cn(
                  "absolute inset-0 blur-[100px] -z-10 rounded-full",
                  currentPlayer?.isImposter ? "bg-red-600/30" : "bg-blue-600/30"
                )} />

                <h2 className={cn(
                  "text-5xl md:text-8xl font-black italic uppercase transform -skew-x-12 tracking-tighter drop-shadow-2xl",
                  currentPlayer?.isImposter ? "text-red-500" : "text-blue-400"
                )}>
                  {currentPlayer?.isImposter ? "Imposter" : "Innocent"}
                </h2>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
                  <p className="text-white/60 uppercase tracking-widest text-xs mb-2 font-bold">
                    {currentPlayer?.isImposter ? "Your Goal" : "Your Secret Topic"}
                  </p>
                  <p className="text-2xl md:text-4xl font-bold text-white uppercase drop-shadow-md">
                    {currentPlayer?.isImposter ? "Don't get caught!" : room?.topic}
                  </p>
                </div>
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] pt-8"
                >
                  Game starting soon...
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Sidebar: Players */}
        <div className={cn(
          "absolute md:relative z-40 w-full md:w-64 bg-card/60 backdrop-blur-md border-r border-border p-4 overflow-y-auto transition-transform duration-300 h-full",
          showPlayers ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Players</h3>
            <button onClick={() => setShowPlayers(false)} className="md:hidden text-muted-foreground/40">
              <XCircle size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {room?.players.map((p) => (
              <div 
                key={p.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all transform-gpu will-change-transform",
                  p.id === currentPlayer?.id ? "bg-muted/50 border-border/50" : "bg-muted/30 border-transparent",
                  room.status === "voting" && p.votedFor && "border-green-500/50",
                  !p.connected && "opacity-50 grayscale"
                )}
              >
                <div className="flex items-center gap-3">
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className={cn(
                      "w-8 h-8 rounded-full border-2",
                      p.id === currentPlayer?.id ? "border-red-600" : "border-transparent",
                      !p.connected && "grayscale opacity-50"
                    )} />
                  ) : (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      p.id === currentPlayer?.id ? "bg-red-600 text-white" : "bg-muted/50",
                      !p.connected && "bg-gray-500"
                    )}>
                      {p.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[120px]">{p.name}</span>
                    {p.gamerId && <span className="text-[9px] text-muted-foreground/60 font-mono">{p.gamerId}</span>}
                    {!p.connected && <span className="text-[10px] text-red-500 font-bold">Disconnected</span>}
                  </div>
                </div>
                {p.isHost && <Crown size={14} className="text-yellow-500" />}
              </div>
            ))}
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {showPlayers && (
          <div 
            className="absolute inset-0 bg-muted/20 z-30 md:hidden"
            onClick={() => setShowPlayers(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          <AnimatePresence mode="wait">
            {room?.status === "lobby" && (
              <motion.div 
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col md:flex-row h-full overflow-hidden transform-gpu"
              >
                {/* Lobby Info & Settings */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-red-600/20 rounded-full flex items-center justify-center mb-4 md:mb-6 border border-red-600/30">
                    <Users size={32} className="text-red-500 md:size-[48px]" />
                  </div>
                  <h2 className="text-xl md:text-4xl font-black italic uppercase transform -skew-x-12 mb-1 md:mb-2 tracking-tighter">Waiting for Players</h2>
                  <p className="text-xs md:text-base text-muted-foreground/50 mb-4 md:mb-8 font-medium">Need at least 3 players to start the fun.</p>
                  
                  {currentPlayer?.isHost ? (
                    <div className="w-full max-w-sm space-y-4 md:space-y-6 mb-4 md:mb-8">
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1 md:space-y-2 text-left">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Game Time (sec)</label>
                          <input 
                            type="number" 
                            value={room.gameDuration}
                            onChange={(e) => updateSettings(parseInt(e.target.value) || 0, room.votingDuration)}
                            className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 text-foreground"
                          />
                        </div>
                        <div className="space-y-1 md:space-y-2 text-left">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Voting Time (sec)</label>
                          <input 
                            type="number" 
                            value={room.votingDuration}
                            onChange={(e) => updateSettings(room.gameDuration, parseInt(e.target.value) || 0)}
                            className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 text-foreground"
                          />
                        </div>
                      </div>
                      <button
                        onClick={startGame}
                        disabled={room.players.length < 3}
                        className="w-full bg-red-600 text-white px-6 md:px-12 py-2.5 md:py-4 rounded-xl font-bold text-sm md:text-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg shadow-red-600/40"
                      >
                        Start Game
                      </button>
                      <button
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set("room", room.id);
                          navigator.clipboard.writeText(url.toString());
                        }}
                        className="w-full bg-muted/50 text-foreground px-6 md:px-12 py-2.5 md:py-4 rounded-xl font-bold text-sm md:text-lg hover:bg-muted transition-all uppercase tracking-widest shadow-lg border border-border mt-4"
                      >
                        Copy Invite Link
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex gap-3 md:gap-4 justify-center">
                        <div className="bg-muted/30 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-border text-[10px] md:text-xs">
                          <span className="text-muted-foreground/40 uppercase mr-2 font-bold">Game:</span>
                          {room.gameDuration}s
                        </div>
                        <div className="bg-muted/30 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-border text-[10px] md:text-xs">
                          <span className="text-muted-foreground/40 uppercase mr-2 font-bold">Voting:</span>
                          {room.votingDuration}s
                        </div>
                      </div>
                      <div className="bg-muted/30 px-4 md:px-6 py-2 md:py-3 rounded-lg border border-border text-xs md:text-sm italic text-muted-foreground/60 font-medium">
                        Waiting for host to start...
                      </div>
                      <button
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set("room", room.id);
                          navigator.clipboard.writeText(url.toString());
                        }}
                        className="w-full bg-muted/50 text-foreground px-6 md:px-12 py-2.5 md:py-4 rounded-xl font-bold text-sm md:text-lg hover:bg-muted transition-all uppercase tracking-widest shadow-lg border border-border mt-4"
                      >
                        Copy Invite Link
                      </button>
                    </div>
                  )}
                </div>

                {/* Lobby Chat Toggle & Popup */}
                <div className="absolute bottom-6 right-6 z-50 flex flex-row-reverse items-center gap-3 pointer-events-none">
                  {/* Toggle Button */}
                  {!showLobbyChat && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      onClick={toggleLobbyChat}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all transform-gpu pointer-events-auto bg-card border border-border text-foreground hover:bg-muted"
                    >
                      <MessageSquare size={24} />
                    </motion.button>
                  )}

                  {/* Recent Message Popup */}
                  <AnimatePresence>
                    {lastMessage && !showLobbyChat && (
                      <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="bg-card border border-border p-3 rounded-2xl shadow-2xl max-w-[200px] pointer-events-auto"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">{lastMessage.sender}</p>
                        <p className="text-xs text-foreground line-clamp-2">{lastMessage.text}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Lobby Chat Panel */}
                <AnimatePresence>
                  {showLobbyChat && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute top-0 right-0 w-full md:w-96 flex flex-col bg-card/95 backdrop-blur-xl border-l border-border h-full z-40 shadow-2xl"
                    >
                      <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Lobby Chat</h3>
                        <button onClick={() => setShowLobbyChat(false)} className="text-muted-foreground/40 hover:text-foreground">
                          <XCircle size={16} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {room.messages.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-muted-foreground/20 text-xs italic">
                            No messages yet. Say hi!
                          </div>
                        ) : (
                          room.messages.map((msg) => (
                            <div 
                              key={msg.id}
                              className={cn(
                                "flex max-w-[85%] gap-2",
                                msg.sender === currentPlayer?.name ? "ml-auto flex-row-reverse" : "flex-row"
                              )}
                            >
                              {msg.avatar ? (
                                <img src={msg.avatar} alt={msg.sender} className="w-6 h-6 rounded-full border border-border flex-shrink-0 mt-3" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0 mt-3">
                                  <User size={10} className="text-muted-foreground" />
                                </div>
                              )}
                              <div className={cn("flex flex-col", msg.sender === currentPlayer?.name ? "items-end" : "items-start")}>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1 px-1 flex items-center gap-1">
                                  {msg.sender} {msg.gamerId && <span className="text-[7px] opacity-50">({msg.gamerId})</span>}
                                </span>
                                <div className={cn(
                                  "px-3 py-1.5 rounded-2xl text-xs",
                                  msg.sender === currentPlayer?.name ? "bg-red-600 text-white rounded-tr-none" : "bg-muted/30 text-foreground rounded-tl-none border border-border/50"
                                )}>
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <form onSubmit={sendMessage} className="p-3 bg-card/60 backdrop-blur-md border-t border-border">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-600 transition-colors text-foreground"
                          />
                          <button 
                            type="submit"
                            disabled={!messageInput.trim()}
                            className="bg-red-600 p-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <Send size={16} className="text-white" />
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {room?.status === "playing" && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col transform-gpu"
              >
                {/* Topic Banner */}
                <div className="bg-red-600 p-4 md:p-6 flex items-center justify-between shadow-2xl z-10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                  <div className="flex-1 relative z-10">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/60">Your Secret Topic</span>
                    <h2 className="text-xl md:text-4xl font-black uppercase leading-tight italic transform -skew-x-12 tracking-tighter text-white drop-shadow-lg">
                      {currentPlayer?.isImposter ? "You are the IMPOSTER" : room.topic}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 bg-card/40 backdrop-blur-md px-3 md:px-5 py-2 md:py-3 rounded-xl ml-4 border border-border shadow-lg relative z-10">
                    <Timer size={18} className="md:w-6 md:h-6 text-red-500 animate-pulse" />
                    <span className="text-xl md:text-3xl font-mono font-black text-foreground">
                      {Math.floor(room.timer / 60)}:{(room.timer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-transparent">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {room.messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={cn(
                          "flex max-w-[80%] gap-2",
                          msg.sender === currentPlayer?.name ? "ml-auto flex-row-reverse" : "flex-row"
                        )}
                      >
                        {msg.avatar ? (
                          <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full border border-border flex-shrink-0 mt-4" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0 mt-4">
                            <User size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className={cn("flex flex-col", msg.sender === currentPlayer?.name ? "items-end" : "items-start")}>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1 px-1 flex items-center gap-1">
                            {msg.sender} {msg.gamerId && <span className="text-[8px] opacity-50">({msg.gamerId})</span>}
                          </span>
                          <div className={cn(
                            "px-4 py-2 rounded-2xl text-sm shadow-lg",
                            msg.sender === currentPlayer?.name ? "bg-red-600 text-white rounded-tr-none" : "bg-muted/30 text-foreground rounded-tl-none border border-border/50"
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Ready to Vote Button */}
                  <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                      Ready to vote: {room.readyToVoteCount}/{room.players.length}
                    </div>
                    <button
                      onClick={setReadyToVote}
                      disabled={currentPlayer?.isReadyToVote}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                        currentPlayer?.isReadyToVote
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-muted/50 text-foreground hover:bg-muted border border-border"
                      )}
                    >
                      {currentPlayer?.isReadyToVote ? "Ready ✓" : "Ready to Vote?"}
                    </button>
                  </div>

                  <form onSubmit={sendMessage} className="p-4 bg-card/60 backdrop-blur-md border-t border-border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={currentPlayer?.hasMessagedThisRound ? "Wait for others..." : "Discuss the topic..."}
                        disabled={currentPlayer?.hasMessagedThisRound}
                        className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors disabled:opacity-50 text-foreground"
                      />
                      <button 
                        type="submit"
                        disabled={!messageInput.trim() || currentPlayer?.hasMessagedThisRound}
                        className="bg-red-600 p-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Send size={20} className="text-white" />
                      </button>
                    </div>
                    {currentPlayer?.hasMessagedThisRound && (
                      <p className="text-[10px] text-muted-foreground/30 mt-2 text-center uppercase tracking-widest font-bold">
                        Wait for the next round to speak again.
                      </p>
                    )}
                  </form>
                </div>
              </motion.div>
            )}

            {room?.status === "transition-voting" && (
              <motion.div 
                key="transition-voting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-6 text-center transform-gpu"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-red-600/20 rounded-full flex items-center justify-center mb-6 md:mb-8 border border-red-600/30">
                  <AlertTriangle size={40} className="text-red-500 md:size-[48px] animate-pulse" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black italic uppercase transform -skew-x-12 mb-4 tracking-tighter text-red-500">
                  <GlitchText text="Voting Time" />
                </h2>
                <p className="text-base md:text-xl text-muted-foreground/70 mb-8 font-medium">Get ready to cast your vote!</p>
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-muted-foreground/60 text-xs font-bold uppercase tracking-[0.3em]"
                >
                  Starting in a few seconds...
                </motion.div>
              </motion.div>
            )}

            {room?.status === "voting" && (
              <motion.div 
                key="voting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 transform-gpu"
              >
                <div className="text-center mb-6 md:mb-12">
                  <AlertTriangle size={32} className="text-red-500 mx-auto mb-3 md:size-[48px] md:mb-4 animate-pulse" />
                  <h2 className="text-2xl md:text-4xl font-black uppercase mb-2 italic transform -skew-x-12 tracking-tighter">Time to Vote</h2>
                  <p className="text-xs md:text-base text-muted-foreground/50 font-medium">Who is the imposter? Choose wisely.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full max-w-4xl">
                  {room.players.map((p) => (
                    <button
                      key={p.id}
                      disabled={currentPlayer?.votedFor !== null || p.id === currentPlayer?.id}
                      onClick={() => handleVote(p.id)}
                      className={cn(
                        "relative p-4 md:p-6 rounded-2xl border transition-all flex flex-col items-center gap-2 md:gap-3 group transform-gpu will-change-transform",
                        currentPlayer?.votedFor === p.id 
                          ? "bg-red-600/20 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.2)]" 
                          : "bg-muted/30 backdrop-blur-sm border-border hover:border-border/50",
                        (p.id === currentPlayer?.id) && "opacity-50 cursor-not-allowed",
                        !p.connected && "grayscale"
                      )}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-muted/50 rounded-full flex items-center justify-center text-lg md:text-xl font-bold">
                        {p.name[0].toUpperCase()}
                      </div>
                      <span className="font-bold truncate w-full text-center text-sm md:text-base">{p.name}</span>
                      
                      {room.players.filter(player => player.votedFor === p.id).length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                          {room.players.filter(player => player.votedFor === p.id).length}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                {currentPlayer?.votedFor && (
                  <p className="mt-8 text-muted-foreground/40 animate-pulse font-bold uppercase tracking-widest text-xs">Waiting for others to vote...</p>
                )}
              </motion.div>
            )}

            {room?.status === "result" && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center transform-gpu"
              >
                <div className="mb-6 md:mb-8">
                  {room.winner === "players" ? (
                    currentPlayer?.isImposter ? (
                      <div className="flex flex-col items-center">
                        <XCircle size={60} className="text-red-500 mb-4 md:size-[80px]" />
                        <h2 className="text-4xl md:text-6xl font-black text-red-600 italic uppercase transform -skew-x-12 mb-2 tracking-tighter">DEFEAT</h2>
                        <p className="text-base md:text-xl text-muted-foreground/70">You were caught! The players won.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 size={60} className="text-green-500 mb-4 md:size-[80px]" />
                        <h2 className="text-4xl md:text-6xl font-black text-green-500 italic uppercase transform -skew-x-12 mb-2 tracking-tighter">VICTORY</h2>
                        <p className="text-base md:text-xl text-muted-foreground/70">The Imposter <span className="text-foreground font-bold italic">{room.players.find(p => p.isImposter)?.name}</span> was caught!</p>
                      </div>
                    )
                  ) : (
                    currentPlayer?.isImposter ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 size={60} className="text-green-500 mb-4 md:size-[80px]" />
                        <h2 className="text-4xl md:text-6xl font-black text-green-500 italic uppercase transform -skew-x-12 mb-2 tracking-tighter">VICTORY</h2>
                        <p className="text-base md:text-xl text-muted-foreground/70">You escaped! The Imposter won.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <XCircle size={60} className="text-red-500 mb-4 md:size-[80px]" />
                        <h2 className="text-4xl md:text-6xl font-black text-red-600 italic uppercase transform -skew-x-12 mb-2 tracking-tighter">DEFEAT</h2>
                        <p className="text-base md:text-xl text-muted-foreground/70"><span className="text-foreground font-bold italic">{room.kickedPlayer}</span> was innocent. The Imposter was <span className="text-foreground font-bold italic">{room.players.find(p => p.isImposter)?.name}</span>!</p>
                      </div>
                    )
                  )}
                </div>

                <div className="bg-muted/30 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-border mb-8 md:mb-12 max-w-md w-full">
                  <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">The Secret Topic was</h3>
                  <p className="text-xl md:text-3xl font-black text-foreground uppercase italic transform -skew-x-12 tracking-tighter">{room.topic}</p>
                </div>

                {currentPlayer?.isHost && (
                  <button
                    onClick={returnToLobby}
                    className="bg-foreground text-background px-8 md:px-12 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:opacity-90 transition-all uppercase tracking-widest shadow-xl"
                  >
                    Back to Lobby
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
