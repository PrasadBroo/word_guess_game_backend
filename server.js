const express = require("express");
const app = express();
const cors = require("cors");
const {
  getAvailableRoom,
  generateRandomWordAndDefination,
  generatePrivateRoom,
} = require("./utils/utils");
const { maxRoomSize, timeLimit } = require("./constants/constants");
const port = process.env.PORT || 4000;
const server = require("http").createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5173",
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

    socket.join(selectedRomm);

    const user = {
      name: data.data.username,
      room: selectedRomm,
      id: socket.id,
    };

    socket.data.user = user;

    // console.log(
    //   "selected room------->",
    //   selectedRomm,
    //   "room users---------->",
    //   rooms.get(selectedRomm)
    // );

    if (rooms.get(selectedRomm).size === maxRoomSize) {
      let romm = rooms.get(selectedRomm);
      let users = await io.in(selectedRomm).fetchSockets();

      const wordData = await generateRandomWordAndDefination();
      const gameData = {
        ...wordData,
        isGameRunning: true,
        gameUsers: users,
        winner: null,
      };

      romm.data = gameData;

      const wating_user = users.filter((u) => u.data.user.id !== user.id);

      socket.broadcast.to(selectedRomm).emit("found-player", user);

      socket.emit("found-player", wating_user[0].data.user);

      //delaying to make sure both clients gets event data

      io.in(selectedRomm).emit("start_game", {
        defination: wordData.defination,
        secret_word_length: wordData.word.length,
        counter: timeLimit,
      });

      const decrementCounter = setInterval(() => {
        romm.data.counter -= 1;
        if (romm.data.counter === 0) {
          clearInterval(decrementCounter);
          io.in(selectedRomm).emit("end_game");
        } //end game
        io.in(selectedRomm).emit("decrement_counter", romm.data.counter);
      }, 1000);
    }
  });

  socket.on("user_guess", ({ user, room, guess, id }) => {
    const user_room = rooms.get(room);

    if (guess === user_room.data.word) {
      user_room.data.winner = user;
      user_room.data.isGameRunning = false;

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

    const user = {
      name: name,
      room: roomid,
      id: socket.id,
    };

    socket.data.user = user;

    if (room_details.size === 1) {
      socket.join(roomid);

      //

      let users = await io.in(roomid).fetchSockets();

      const wordData = await generateRandomWordAndDefination();
      const gameData = {
        ...wordData,
        isGameRunning: true,
        gameUsers: users,
        winner: null,
      };

      room_details.data = gameData;

      const wating_user = users.filter((u) => u.data.user.id !== user.id);

      socket.broadcast.to(roomid).emit("found-player", user);

      socket.emit("found-player", wating_user[0].data.user);

      //delaying to make sure both clients gets event data

      io.in(roomid).emit("start_game", {
        defination: wordData.defination,
        secret_word_length: wordData.word.length,
        counter: timeLimit,
      });

      const decrementCounter = setInterval(() => {
        room_details.data.counter -= 1;
        if (room_details.data.counter === 0) {
          clearInterval(decrementCounter);
          io.in(roomid).emit("end_game");
        } //end game
        io.in(roomid).emit("decrement_counter", room_details.data.counter);
      }, 1000);
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
