const { model, Schema } = require("mongoose");

module.exports = model("welcome", new Schema({
    Guild: String,
    Channel: String,
    Msg: String,
    DM: Boolean,
    DMMessage: Object,
    Content: Boolean,
    Embed: Boolean,
    ImageURI: String,
    Image: Boolean,
}));
