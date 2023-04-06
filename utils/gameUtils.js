module.exports.handelGameEnd = (socket, io, room_name) => {
  io.in(room_name).disconnectSockets(true);
  io.sockets.adapter.del(room_name);
};
