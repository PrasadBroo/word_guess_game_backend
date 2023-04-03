const { default: axios } = require("axios");

module.exports.fetchWordDefination = async (word) => {
  try {
    const { data } = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    const defination = data[0].meanings[0].definitions[0].definition;
    return defination;
  } catch (error) {
    throw new Error(error);
  }
};
