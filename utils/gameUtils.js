module.exports.handelGameEnd = (socket, io, room_name) => {
  io.in(room_name).disconnectSockets(true);
  io.sockets.adapter.del(room_name);
};

module.exports.revealLetter = (io, room, word, wordIndexToReveal) => {
  let reveal = { letter: word[wordIndexToReveal], index: wordIndexToReveal };

  io.in(room).emit("reveal_letter", reveal);
};

module.exports.decreamentGameCounter = (io, room_details, room_name) => {
  const decrementCounter = setInterval(() => {
    room_details.data.counter -= 1;
    if (room_details.data.counter === 0) {
      clearInterval(decrementCounter);
      io.in(room_name).emit("end_game", {
        winners: room_details.data.winners,
        word: room_details.data.word,
      });
    } //end game
    if (room_details.data.counter / 30 in [1, 2, 3, 4, 5]) {
      this.revealLetter(
        io,
        room_name,
        room_details.data.word,
        room_details.data.counter / 30
      );
    }

    io.in(room_name).emit("decrement_counter", room_details.data.counter);
  }, 1000);
};
