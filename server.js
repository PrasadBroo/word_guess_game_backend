require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const {
  getAvailableRoom,
  generateRandomWordAndDefination,
  generatePrivateRoom,
} = require("./utils/utils");
const { maxRoomSize, timeLimit } = require("./constants/constants");
const { revealLetter, decreamentGameCounter } = require("./utils/gameUtils");
const GameManager = require("./utils/Game");
const port = process.env.PORT || 4000;
const server = require("http").createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
});

app.use(cors());

const rooms = io.sockets.adapter.rooms;

io.on("connection", async (socket) => {
  const players_count = await io.fetchSockets();
  io.emit("players_count", players_count.length);

  socket.on("join_room", async (data) => {
    // Filter out rooms with only one socket connected
    const selectedRomm = getAvailableRoom(rooms);

    const game = new GameManager(io, socket);

    game.join_room(socket, selectedRomm);

    game.user_init(data.data.username, selectedRomm, socket);

    if (rooms.get(selectedRomm).size === maxRoomSize) {
      await game.start_game(socket, selectedRomm);
    }
  });

  socket.on("user_guess", ({ user, room, guess, id }) => {
    const user_room = rooms.get(room);
    const correctGuess = guess === user_room.data.word;

    if (correctGuess) {
      if (!user_room.data.winners.includes(user))
        user_room.data.winners = [...user_room.data.winners, id];

      socket.emit("user_guess", {
        user: { name: user, guess, typing: false, id, correct: true },
      });

      socket.broadcast.to(room).emit("user_guess", {
        user: {
          name: user,
          guess: `${user} guessed the word :)`,
          typing: false,
          id,
          correct: true,
        },
      });
      return;
    }

    if (user_room.data.winners.includes(id)) {
      const wordRegex = user_room.data.word.split("").join("|");
      const regex = new RegExp(wordRegex, "g");
      const modifiedGuess = guess.replace(regex, "?"); //users will still find a way ;-;

      socket.emit("user_guess", {
        user: { name: user, guess, typing: false, id, correct: false },
      });

      socket.broadcast.to(room).emit("user_guess", {
        user: {
          name: user,
          guess: modifiedGuess,
          typing: false,
          id,
          correct: false,
        },
      });
      return;
    }

    io.in(room).emit("user_guess", {
      user: { name: user, guess, typing: false, id, correct: false },
    });
  });

  socket.on("user_typing", (user) => {
    if (!user) return;
    socket.broadcast.to(user.room).emit("user_typing", {
      user: {
        name: user.name,
        guess: null,
        typing: true,
        id: user.id,
      },
    });
  });

  socket.on("generate_room", (data) => {
    const private_room = generatePrivateRoom();

    socket.join(private_room);

    const user = {
      name: data.name,
      room: private_room,
      id: socket.id,
    };

    socket.data.user = user;

    socket.emit("generated_room", private_room);
  });

  socket.on("join_private_room", async (data) => {
    const { name, room: roomid } = data;
    const room_details = rooms.get(roomid);

    if (!room_details || !name) {
      socket.emit("private_room_not_found", roomid);
      return;
    }

    const game = new GameManager(io, socket);

    game.user_init(name, roomid, socket);

    if (room_details.size === 1) {
      game.join_room(socket, roomid);

      await game.start_game(socket, roomid);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(reason);
    if (reason && reason === "client namespace disconnect") {
      console.log(reason);
    }
  });

  socket.on("disconnected", (data) => {
    io.in(data.room).disconnectSockets(true);
  });
});

app.use((err, req, res) => {
  console.log(err);
});
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
