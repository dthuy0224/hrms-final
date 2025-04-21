var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var AttendanceSchema = new Schema({
  employeeID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  date: { type: Number, required: true },
  present: { type: Boolean, required: true },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  status: { type: String, enum: ['present', 'late', 'leave'], default: 'present' }
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
