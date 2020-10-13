var mongoose    = require('mongoose');

var PlayerSchema = new mongoose.Schema({
	id: String,
	name: String,
	points: {type: Number, default: 0},
	totalPoints: {type: Number, default: 0}
});

module.exports = mongoose.model("Player", PlayerSchema);
