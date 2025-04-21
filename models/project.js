var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ProjectSchema = new Schema({
  employeeID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  teamMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  teamRoles: { type: Map, of: String }
});

module.exports = mongoose.model("Project", ProjectSchema);
