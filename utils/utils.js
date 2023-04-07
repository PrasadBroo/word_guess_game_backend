const { roomPrefix, timeLimit } = require("../constants/constants");
const wordsDb = require("../database/words.json");
const Chance = require("chance");
const { fetchWordDefination } = require("../services/wordDefination");
const chance = new Chance();

/**
 * A function that returns random room id
 * @param {string} prefix - Prefix for the rom
 * @returns {string} The room id
 */
module.exports.generateRoom = (prefix = roomPrefix) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
};

module.exports.getAvailableRoom = (roomsAdapter) => {
  let available_room;
  for (const [roomId, room] of roomsAdapter) {
    if (room.size === 1 && roomId.substring(0, 4) === "room" && !room.data) {
      available_room = roomId;
      break;
    }
  }

  if (!available_room) {
    let newroom = this.generateRoom();
    available_room = newroom;
  }
  return available_room;
};

module.exports.generateRandomWordAndDefination = async () => {
  const random_word = chance.pickone(wordsDb);
  const word_defination = await fetchWordDefination(random_word);
  return { word: random_word, defination: word_defination, counter: 120 };
};
module.exports.generatePrivateRoom = () => {
  const private_room_id = this.generateRoom("private");
  return private_room_id;
};
