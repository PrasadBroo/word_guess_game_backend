module.exports.handelGameEnd = (socket, io, room_name) => {
  io.in(room_name).disconnectSockets(true);
  io.sockets.adapter.del(room_name);
};

module.exports.revealLetter = (io,room, word, wordIndexToReveal) => {
  let reveal = { letter: word[wordIndexToReveal], index: wordIndexToReveal };

  io.in(room).emit("reveal_letter", reveal);
};
