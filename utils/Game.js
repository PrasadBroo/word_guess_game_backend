const { timeLimit } = require("../constants/constants");
const { generateRandomWordAndDefination } = require("./utils");

module.exports = class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = io.sockets.adapter.rooms;
  }

  user_init(username, room_name, socket) {
    let user = { name: username, room: room_name, id: socket.id };
    socket.data.user = user;
  }

  join_room(socket, room_name) {
    socket.join(room_name);
  }

  async start_game(socket, room_name) {
    let users = await this.io.in(room_name).fetchSockets();

    const wordData = await generateRandomWordAndDefination();

    const gameData = {
      ...wordData,
      isGameRunning: true,
      gameUsers: users,
      winners: [],
      users: users,
    };

    console.log(wordData);

    let room_details = this.rooms.get(room_name);

    room_details.data = gameData;

    const wating_user = users.filter((u) => u.data.user.id !== socket.id);

    socket.broadcast.to(room_name).emit("found-player", socket.data.user);

    socket.emit("found-player", wating_user[0].data.user);

    this.io.in(room_name).emit("start_game", {
      defination: wordData.defination,
      secret_word_length: wordData.word.length,
      counter: timeLimit,
    });

    this.decreament_game_counter(room_details, room_name);
  }

  decreament_game_counter(room_details, room_name) {
    const decrementCounter = setInterval(() => {
      room_details.data.counter -= 1;
      if(!room_details.data.isGameRunning)clearInterval(decrementCounter);
      if (room_details.data.counter === 0) {
        clearInterval(decrementCounter);
        this.end_game(room_details, room_name);
      } //end game
      if (room_details.data.counter / 30 in [1, 2, 3, 4, 5]) {
        this.revealLetter(
          room_name,
          room_details.data.word,
          room_details.data.counter / 30
        );
      }

      this.io
        .in(room_name)
        .emit("decrement_counter", room_details.data.counter);
    }, 1000);
  }

  async is_users_exist_in_room(room_name) {
    let users = await this.io.in(room_name).fetchSockets();
    return users.length === 2;
  }

  end_game(room_details, room_name) {
    this.io.in(room_name).emit("end_game", {
      winners: room_details.data.winners,
      word: room_details.data.word,
    });
  }

  revealLetter(room, word, wordIndexToReveal) {
    let reveal = { letter: word[wordIndexToReveal], index: wordIndexToReveal };

    this.io.in(room).emit("reveal_letter", reveal);
  }

  player_left(socket, room_details) {
    let users = room_details.data.users || [];
    const left_user = users.find((u) => u.id !== socket.id);
    room_details.data.isGameRunning = false;
    socket.emit("player_left", { user: left_user.data.user });
  }
};
