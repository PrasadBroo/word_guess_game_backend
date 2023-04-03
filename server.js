const express = require("express");
const app = express();
const cors = require("cors");
const {
  getAvailableRoom,
  generateRandomWordAndDefination,
} = require("./utils/utils");
const port = process.env.PORT || 4000;
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(cors());

const rooms = io.sockets.adapter.rooms;

io.on("connection", (socket) => {
  // socket.leave(socket.id);
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

    if (rooms.get(selectedRomm).size === 2) {
      let romm = rooms.get(selectedRomm);

      const wordData = await generateRandomWordAndDefination();
      console.log(wordData);
      romm.data = wordData;
      romm.data.counter = 120;

      let users = await io.in(selectedRomm).fetchSockets();

      const wating_user = users.filter((u) => u.data.user.id !== user.id);

      socket.broadcast.to(selectedRomm).emit("found-player", user);

      socket.emit("found-player", wating_user[0].data.user);

      //delaying to make sure both clients gets event data
      setTimeout(() => {
        io.in(selectedRomm).emit("start_game", {
          defination: wordData.defination,
          secret_word_length: wordData.word.length,
          counter: 120,
        });
      }, 1000);

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

  socket.on("user_guess", ({ user, room, guess }) => {
    const user_room = rooms.get(room);

    if (guess === user_room.data.word) {
      socket.emit("user_guess", { data: { name: user, guess } });
      socket.broadcast.to(room).emit("user_guess", {
        data: { name: user, guess: `${user} guessed the word :)` },
      });
      return;
    }
    io.in(room).emit("user_guess", {
      data: { name: user, guess },
    });
  });

  socket.on("disconnect", (reason) => {
    if (reason && reason === "client namespace disconnect") {
      console.log(reason);
    }
  });
  socket.on("disconnected", (data) => {
    io.in(data.room).disconnectSockets(true);
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
