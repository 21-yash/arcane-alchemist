const mongoose = require("mongoose");

module.exports = mongoose.model("Config", new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "?" },

}));
