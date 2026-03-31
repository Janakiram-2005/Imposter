import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import axios from "axios";

// MongoDB Setup
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://testuser:testpassword123@cluster0.vulsn3z.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret_for_development";

mongoose.connect(MONGO_URI).then(() => console.log("Connected to MongoDB")).catch(err => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  avatar: String,
  description: { type: String, default: "I'm ready to play!" },
  gamerId: { type: String },
  gamesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  imposterWins: { type: Number, default: 0 },
  crewmateWins: { type: Number, default: 0 },
});
const User = mongoose.model('User', userSchema);

interface Player {
  id: string;
  name: string;
  dbUserId?: string;
  avatar?: string;
  gamerId?: string;
  isHost: boolean;
  isImposter: boolean;
  votedFor: string | null;
  votesReceived: number;
  isReadyToVote: boolean;
  hasMessagedThisRound: boolean;
  connected: boolean;
}

interface Room {
  id: string;
  players: Player[];
  status: "lobby" | "playing" | "transition-voting" | "voting" | "result";
  topic: string | null;
  timer: number;
  messages: { sender: string; text: string; id: string; avatar?: string; gamerId?: string }[];
  winner: "players" | "imposter" | null;
  kickedPlayer: string | null;
  gameDuration: number;
  votingDuration: number;
  readyToVoteCount: number;
}

const TOPICS = [
  "Pizza", "Space Exploration", "The Beach", "Video Games", "Coffee",
  "Hiking", "Movies", "Music", "Cooking", "Travel", "Photography",
  "Gardening", "Reading", "Bicycling", "Swimming", "Dancing",
  "Painting", "Yoga", "Camping", "Skiing", "Surfing", "Fishing",
  "Artificial Intelligence", "Dinosaurs", "Superheroes", "Time Travel",
  "Aliens", "Zombies", "Magic", "Pirates", "Ninjas", "Robots",
  "Vampires", "Ghosts", "Dragons", "Unicorns", "Mermaids", "Fairies",
  "Witches", "Wizards", "Knights", "Castles", "Space Stations",
  "Submarines", "Airplanes", "Trains", "Cars", "Motorcycles",
  "Bicycles", "Skateboards", "Rollerblades", "Ice Skates", "Snowboards",
  "Surfboards", "Boats", "Ships", "Helicopters", "Hot Air Balloons",
  "Rockets", "Satellites", "Telescopes", "Microscopes", "Computers",
  "Smartphones", "Tablets", "Smartwatches", "Virtual Reality",
  "Augmented Reality", "3D Printing", "Drones", "Self-Driving Cars",
  "Electric Vehicles", "Solar Power", "Wind Power", "Nuclear Power",
  "Fusion Power", "Quantum Computing", "Nanotechnology", "Biotechnology",
  "Genetic Engineering", "Cloning", "Cybernetics", "Bionics",
  "Prosthetics", "Brain-Computer Interfaces", "Telepathy", "Telekinesis",
  "Teleportation", "Invisibility", "Super Strength", "Super Speed",
  "Flight", "Immortality", "Time Control", "Mind Control",
  "Shape-Shifting", "Elemental Control", "Healing", "Resurrection",
  "Prophecy", "Clairvoyance"
];

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous characters like I, O, 0, 1
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const rooms: Map<string, Room> = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", ({ name, dbUserId, avatar, gamerId }) => {
      const roomId = generateRoomId();
      const player: Player = {
        id: socket.id,
        name: name.trim(),
        dbUserId,
        avatar,
        gamerId,
        isHost: true,
        isImposter: false,
        votedFor: null,
        votesReceived: 0,
        isReadyToVote: false,
        hasMessagedThisRound: false,
        connected: true,
      };
      const room: Room = {
        id: roomId,
        players: [player],
        status: "lobby",
        topic: null,
        timer: 0,
        messages: [],
        winner: null,
        kickedPlayer: null,
        gameDuration: 120,
        votingDuration: 60,
        readyToVoteCount: 0,
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room-joined", { roomId, player, room });
      console.log(`Room ${roomId} created by ${name.trim()} (Socket: ${socket.id})`);
    });

    socket.on("join-room", ({ roomId, name, dbUserId, avatar, gamerId }) => {
      if (!roomId || !name) {
        socket.emit("error", "Room ID and Name are required");
        return;
      }

      const normalizedRoomId = roomId.trim().toUpperCase();
      const playerName = name.trim();
      
      console.log(`Join request from ${playerName} for room ${normalizedRoomId} (Socket: ${socket.id})`);
      const room = rooms.get(normalizedRoomId);
      
      if (!room) {
        console.log(`Room ${normalizedRoomId} not found. Available rooms: ${Array.from(rooms.keys()).join(", ")}`);
        socket.emit("error", "Room not found. Make sure you are using the correct ID and are on the same environment (Dev/Preview).");
        return;
      }

      // Check if player with this socket ID is already in the room
      const existingPlayerBySocket = room.players.find(p => p.id === socket.id);
      if (existingPlayerBySocket) {
        console.log(`Player ${playerName} with socket ${socket.id} already in room ${normalizedRoomId}.`);
        socket.emit("room-joined", { roomId: normalizedRoomId, player: existingPlayerBySocket, room });
        return;
      }

      // Check if name is already taken in the room
      const existingPlayerByName = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (existingPlayerByName) {
        if (existingPlayerByName.connected) {
          socket.emit("error", "This name is already taken in the room.");
          return;
        } else {
          // If the socket is not connected, allow taking over the slot (reconnect)
          console.log(`Player ${playerName} re-joining with new socket ${socket.id}. Updating player ID.`);
          existingPlayerByName.id = socket.id;
          existingPlayerByName.connected = true;
          if (dbUserId) existingPlayerByName.dbUserId = dbUserId;
          if (avatar) existingPlayerByName.avatar = avatar;
          if (gamerId) existingPlayerByName.gamerId = gamerId;
          socket.join(normalizedRoomId);
          socket.emit("room-joined", { roomId: normalizedRoomId, player: existingPlayerByName, room });
          io.to(normalizedRoomId).emit("player-joined", room.players);
          return;
        }
      }

      if (room.players.length >= 15) {
        socket.emit("error", "Room is full (max 15 players)");
        return;
      }
      if (room.status !== "lobby") {
        socket.emit("error", "Game already in progress");
        return;
      }

      const player: Player = {
        id: socket.id,
        name: playerName,
        dbUserId,
        avatar,
        gamerId,
        isHost: false,
        isImposter: false,
        votedFor: null,
        votesReceived: 0,
        isReadyToVote: false,
        hasMessagedThisRound: false,
        connected: true,
      };
      
      room.players.push(player);
      socket.join(normalizedRoomId);
      
      console.log(`Player ${playerName} joined room ${normalizedRoomId}. Total players: ${room.players.length}`);
      
      socket.emit("room-joined", { roomId: normalizedRoomId, player, room });
      io.to(normalizedRoomId).emit("player-joined", room.players);
    });

    socket.on("update-settings", ({ roomId, gameDuration, votingDuration }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "lobby") return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host || !host.isHost) return;

      room.gameDuration = gameDuration;
      room.votingDuration = votingDuration;
      io.to(roomId).emit("settings-updated", { gameDuration, votingDuration });
    });

    socket.on("ready-to-vote", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.isReadyToVote) return;

      player.isReadyToVote = true;
      room.readyToVoteCount = room.players.filter(p => p.isReadyToVote).length;
      const connectedPlayersCount = room.players.filter(p => p.connected).length;

      io.to(roomId).emit("player-ready-to-vote", { playerId: player.id, readyToVoteCount: room.readyToVoteCount });

      if (room.readyToVoteCount > connectedPlayersCount / 2) {
        room.status = "transition-voting";
        io.to(roomId).emit("transition-voting", room);
        
        setTimeout(() => {
          const currentRoom = rooms.get(roomId);
          if (currentRoom && currentRoom.status === "transition-voting") {
            currentRoom.status = "voting";
            currentRoom.timer = currentRoom.votingDuration;
            io.to(roomId).emit("voting-started", currentRoom);
            startVotingTimer(roomId);
          }
        }, 3000);
      }
    });

    socket.on("start-game", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "lobby") return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host || !host.isHost) return;

      // Reset players
      room.players.forEach(p => {
        p.isImposter = false;
        p.votedFor = null;
        p.votesReceived = 0;
        p.isReadyToVote = false;
        p.hasMessagedThisRound = false;
      });

      // Assign Imposter
      const imposterIndex = Math.floor(Math.random() * room.players.length);
      room.players[imposterIndex].isImposter = true;

      // Assign Topic
      room.topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      room.status = "playing";
      room.timer = room.gameDuration;
      room.messages = [];
      room.winner = null;
      room.kickedPlayer = null;
      room.readyToVoteCount = 0;

      io.to(roomId).emit("game-started", room);

      // Start Timer
      const interval = setInterval(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.status !== "playing") {
          clearInterval(interval);
          return;
        }

        currentRoom.timer--;
        io.to(roomId).emit("timer-update", currentRoom.timer);

        if (currentRoom.timer <= 0) {
          clearInterval(interval);
          currentRoom.status = "transition-voting";
          io.to(roomId).emit("transition-voting", currentRoom);
          
          setTimeout(() => {
            const roomCheck = rooms.get(roomId);
            if (roomCheck && roomCheck.status === "transition-voting") {
              roomCheck.status = "voting";
              roomCheck.timer = roomCheck.votingDuration;
              io.to(roomId).emit("voting-started", roomCheck);
              startVotingTimer(roomId);
            }
          }, 3000);
        }
      }, 1000);
    });

    function startVotingTimer(roomId: string) {
      const interval = setInterval(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.status !== "voting") {
          clearInterval(interval);
          return;
        }

        currentRoom.timer--;
        io.to(roomId).emit("timer-update", currentRoom.timer);

        if (currentRoom.timer <= 0) {
          clearInterval(interval);
          resolveVoting(roomId);
        }
      }, 1000);
    }

    socket.on("send-message", ({ roomId, text }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.status !== "playing" && room.status !== "lobby") return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Only enforce one message per round during the "playing" phase
      if (room.status === "playing" && player.hasMessagedThisRound) return;

      if (room.status === "playing") {
        player.hasMessagedThisRound = true;
      }

      const message = {
        sender: player.name,
        text,
        id: Math.random().toString(36).substring(7),
        avatar: player.avatar,
        gamerId: player.gamerId,
      };
      room.messages.push(message);
      io.to(roomId).emit("new-message", message);

      if (room.status === "playing") {
        // Check if everyone has messaged
        const allMessaged = room.players.every(p => !p.connected || p.hasMessagedThisRound);
        if (allMessaged) {
          room.players.forEach(p => p.hasMessagedThisRound = false);
          io.to(roomId).emit("round-reset");
        }
      }
    });

    socket.on("vote", ({ roomId, targetId }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "voting") return;

      const voter = room.players.find(p => p.id === socket.id);
      if (!voter || voter.votedFor) return;

      voter.votedFor = targetId;
      const target = room.players.find(p => p.id === targetId);
      if (target) target.votesReceived++;

      io.to(roomId).emit("player-voted", { voterId: voter.id, targetId });

      // Check if everyone voted
      const allVoted = room.players.every(p => !p.connected || p.votedFor !== null);
      if (allVoted) {
        resolveVoting(roomId);
      }
    });

    function resolveVoting(roomId: string) {
      const room = rooms.get(roomId);
      if (!room || room.status !== "voting") return;

      // Find player with most votes
      let maxVotes = -1;
      let candidates: Player[] = [];

      room.players.forEach(p => {
        if (p.votesReceived > maxVotes) {
          maxVotes = p.votesReceived;
          candidates = [p];
        } else if (p.votesReceived === maxVotes) {
          candidates.push(p);
        }
      });

      // If tie, pick random from candidates
      const kicked = candidates[Math.floor(Math.random() * candidates.length)];
      room.kickedPlayer = kicked.name;
      room.status = "result";

      if (kicked.isImposter) {
        room.winner = "players";
      } else {
        room.winner = "imposter";
      }

      updateStats(room);

      io.to(roomId).emit("game-ended", room);
    }

    async function updateStats(room: Room) {
      if (!room.winner) return;
      
      for (const player of room.players) {
        if (!player.dbUserId) continue;
        
        try {
          const isWinner = (room.winner === "imposter" && player.isImposter) || (room.winner === "players" && !player.isImposter);
          
          const update: any = { $inc: { gamesPlayed: 1 } };
          if (isWinner) {
            update.$inc.wins = 1;
            if (player.isImposter) {
              update.$inc.imposterWins = 1;
            } else {
              update.$inc.crewmateWins = 1;
            }
          }
          
          await User.findByIdAndUpdate(player.dbUserId, update);
        } catch (err) {
          console.error(`Failed to update stats for user ${player.dbUserId}:`, err);
        }
      }
    }

    socket.on("return-to-lobby", (roomId) => {
      const room = rooms.get(roomId);
      if (!room) return;
      
      const host = room.players.find(p => p.id === socket.id);
      if (!host || !host.isHost) return;

      room.status = "lobby";
      room.topic = null;
      room.timer = 0;
      room.messages = [];
      room.winner = null;
      room.kickedPlayer = null;

      // Remove disconnected players
      room.players = room.players.filter(p => p.connected);
      
      if (room.players.length === 0) {
        rooms.delete(roomId);
        return;
      }
      
      // Reassign host if needed
      if (!room.players.some(p => p.isHost)) {
        room.players[0].isHost = true;
      }

      room.players.forEach(p => {
        p.votedFor = null;
        p.votesReceived = 0;
        p.isImposter = false;
      });

      io.to(roomId).emit("returned-to-lobby", room);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      const room = rooms.get(roomId);
      if (room) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const player = room.players[playerIndex];
          const wasHost = player.isHost;
          
          io.to(roomId).emit("notification", { message: `${player.name} left the game` });
          
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            if (wasHost) {
              const nextHost = room.players.find(p => p.connected);
              if (nextHost) nextHost.isHost = true;
            }
            io.to(roomId).emit("player-left", room.players);
            
            if (player.isImposter && (room.status === "playing" || room.status === "voting" || room.status === "transition-voting")) {
              room.status = "result";
              room.winner = "players";
              updateStats(room);
              io.to(roomId).emit("game-ended", room);
              io.to(roomId).emit("notification", { message: `Imposter (${player.name}) left the game! Crewmates win!` });
            }
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const player = room.players[playerIndex];
          player.connected = false;
          io.to(roomId).emit("player-left", room.players);
          io.to(roomId).emit("notification", { message: `${player.name} disconnected` });
          
          const currentRoom = rooms.get(roomId);
          if (currentRoom) {
            // Reassign host if the disconnected player was the host
            if (player.isHost) {
              player.isHost = false;
              const nextHost = currentRoom.players.find(p => p.connected);
              if (nextHost) {
                nextHost.isHost = true;
                io.to(roomId).emit("player-left", currentRoom.players); // Update UI
              }
            }

            if (player.isImposter && (currentRoom.status === "playing" || currentRoom.status === "voting" || currentRoom.status === "transition-voting")) {
              currentRoom.status = "result";
              currentRoom.winner = "players";
              updateStats(currentRoom);
              io.to(roomId).emit("game-ended", currentRoom);
              io.to(roomId).emit("notification", { message: `Imposter (${player.name}) disconnected! Crewmates win!` });
              return;
            }

            if (currentRoom.status === "playing") {
               const allMessaged = currentRoom.players.every(p => !p.connected || p.hasMessagedThisRound);
               if (allMessaged) {
                 currentRoom.players.forEach(p => p.hasMessagedThisRound = false);
                 io.to(roomId).emit("round-reset");
               }
               
               const connectedPlayersCount = currentRoom.players.filter(p => p.connected).length;
               if (currentRoom.readyToVoteCount > connectedPlayersCount / 2 && connectedPlayersCount > 0) {
                 currentRoom.status = "transition-voting";
                 io.to(roomId).emit("transition-voting", currentRoom);
                 
                 setTimeout(() => {
                   const roomCheck = rooms.get(roomId);
                   if (roomCheck && roomCheck.status === "transition-voting") {
                     roomCheck.status = "voting";
                     roomCheck.timer = roomCheck.votingDuration;
                     io.to(roomId).emit("voting-started", roomCheck);
                     startVotingTimer(roomId);
                   }
                 }, 3000);
               }
            } else if (currentRoom.status === "voting") {
               const allVoted = currentRoom.players.every(p => !p.connected || p.votedFor !== null);
               if (allVoted) {
                 resolveVoting(roomId);
               }
            }
          }

          // Remove player after 15 seconds if they don't reconnect and game is in lobby
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            if (currentRoom) {
              const pIndex = currentRoom.players.findIndex(p => p.name === player.name && !p.connected);
              if (pIndex !== -1 && currentRoom.status === "lobby") {
                const wasHost = currentRoom.players[pIndex].isHost;
                currentRoom.players.splice(pIndex, 1);
                
                if (currentRoom.players.length === 0) {
                  rooms.delete(roomId);
                } else {
                  if (wasHost) {
                    currentRoom.players[0].isHost = true;
                  }
                  io.to(roomId).emit("player-left", currentRoom.players);
                }
              } else if (pIndex !== -1 && currentRoom.players.every(p => !p.connected)) {
                // If everyone is disconnected in a game, delete the room
                rooms.delete(roomId);
              }
            }
          }, 15000);
        }
      });
    });
  });

  app.use(express.json());

  app.get('/api/auth/url', (req, res) => {
    const origin = req.query.origin as string;
    const redirectUri = `${origin}/api/auth/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured" });
    }

    const state = Buffer.from(JSON.stringify({ origin })).toString('base64');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      state: state
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  app.get('/api/auth/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
      const redirectUri = `${decodedState.origin}/api/auth/callback`;

      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      });

      const { access_token } = tokenResponse.data;

      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const profile = userResponse.data;

      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture
        });
        await user.save();
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get('/api/user/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await User.findById(decoded.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.put('/api/user/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { description, gamerId } = req.body;
      
      // Basic validation for gamerId
      if (gamerId && !/^[a-zA-Z0-9_#]{3,20}$/.test(gamerId)) {
        return res.status(400).json({ error: "Invalid Gamer ID format." });
      }

      // Check if gamerId is already taken by another user
      if (gamerId) {
        const existingUser = await User.findOne({ gamerId, _id: { $ne: decoded.userId } });
        if (existingUser) {
          return res.status(400).json({ error: "Gamer ID is already taken." });
        }
      }

      const user = await User.findByIdAndUpdate(
        decoded.userId,
        { $set: { description, gamerId } },
        { new: true }
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const topUsers = await User.find().sort({ wins: -1 }).limit(10).select('name avatar wins gamesPlayed imposterWins crewmateWins gamerId description');
      res.json(topUsers);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = process.env.PORT || 3000;
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
