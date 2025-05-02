const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HolidaySchema = new Schema({
  name: { type: String, required: true },
  date: { type: Number, required: true },
  month: { type: Number, required: true },
  year: { type: Number },  // Có thể null cho ngày lễ lặp lại hàng năm
  description: { type: String },
  isRecurringYearly: { type: Boolean, default: true },  // Đánh dấu ngày lễ lặp lại hàng năm
  numberOfDays: { type: Number, default: 1 },  // Số ngày nghỉ
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Holiday", HolidaySchema); 