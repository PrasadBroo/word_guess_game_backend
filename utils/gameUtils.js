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
module.exports.generateRandomNumber = (word_length, arr) => {
  const min = 0;
  const max = word_length - 1; //array index starts at 0
  let randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  while (arr.includes(randomNum)) {
    randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return randomNum;
};
