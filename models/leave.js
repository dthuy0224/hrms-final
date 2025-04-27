var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var LeaveSchema = new Schema({
  applicantID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true,
    maxlength: 100   },
  type: { type: String, required: true, enum: ["Annual Leave", "Sick Leave", "Maternity Leave", "Emergency Leave", "Onboard", "Other"] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  appliedDate: { type: Date, required: true },
  leaveType: {
    type: String,
    enum: ['full', 'half-morning', 'half-afternoon'],
    default: 'full',
  },
  period: { type: Number, required: true, min: 0.5 },
  reason: { type: String, required: true,
    maxlength: 4000   },
  adminResponse: { type: String, default: "Pending" },
  statusAdmin: { type: String, default:"Approved"},
  delegateTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
  delegateContent: { type: String, required: true,
    maxlength: 4000   },
});


module.exports = mongoose.model("Leave", LeaveSchema);
