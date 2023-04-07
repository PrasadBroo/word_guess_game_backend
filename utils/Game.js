const { generateRandomWordAndDefination } = require("./utils");

class Game {
  constructor(io, socket) {
    this.socket = socket;
    this.io = io;
    this.rooms = io.sockets.adapter.rooms;
  }

  user_init(username, room_name, socket_id) {
    let user = { name: username, room: room_name, id: socket_id };
    this.socket_user = user;
    this.socket.data.user = user;
  }

  join_room(room_name) {
    this.socket.join(room_name);
  }
  async start_game(socket, room_name) {
    let users = await this.io.in(room_name).fetchSockets();

    const wordData = await generateRandomWordAndDefination();

    const gameData = {
      ...wordData,
      isGameRunning: true,
      gameUsers: users,
      winners: [],
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
  }
}
