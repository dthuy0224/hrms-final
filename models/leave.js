var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var LeaveSchema = new Schema({
  applicantID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: {
  type: String,
  required: true,
  maxlength: 100,
  trim: true,
  validate: [
    {
      validator: function (v) {
        return v.trim().length > 0;
      },
      message: "Title cannot be empty or just spaces."
    },
    {
      validator: function (v) {
        // Chỉ cho phép chữ cái, số, khoảng trắng và một số ký tự nhất định
        return /^[\p{L}0-9\s+]+$/u.test(v) && !/^\s|\s$/.test(v);
      },
      message: "Title must not contain special characters."
    }
  ]
},
  type: { type: String, required: true, enum: ["Annual Leave", "Sick Leave", "Maternity Leave", "Emergency Leave", "Onboard", "Other"] },
  startDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        return this.startDate <= v;
      },
      message: "End date must be after or equal to start date."
    }
  },
  appliedDate: { type: Date, required: true },
  leaveType: {
    type: String,
    enum: ['full', 'half-morning', 'half-afternoon'],
    default: 'full',
  },
  period: { type: Number, required: true, min: 0.5 },
  reason: {
  type: String,
  required: true,
  maxlength: 4000,
  trim: true,
  validate: [
    {
      validator: function (v) {
        return typeof v === 'string' && v.trim().length > 0;
      },
      message: "Reason cannot be empty or just spaces."
    }
  ]
},
  adminResponse: { type: String, default: "Pending" },
  delegateTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
  delegateContent: {
    type: String,
    required: true,
    maxlength: 4000,
    trim: true,
    validate: [
      {
        validator: function (v) {
          return typeof v === "string" && v.trim().length > 0;
        },
        message: "Delegate content cannot be empty or just spaces."
      }
    ]
  }
});


module.exports = mongoose.model("Leave", LeaveSchema);