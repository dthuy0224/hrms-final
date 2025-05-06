var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");
require("mongoose-type-email");
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  // Thông tin cơ bản
  type: { type: String, enum: ['employee', 'project_manager', 'accounts_manager', 'admin'], default: 'employee' },
  employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'intern', 'temporary'], default: 'full-time' },
  employeeType: { type: String },
  email: { type: mongoose.SchemaTypes.Email, required: true, unique: true },
  officeEmail: { type: mongoose.SchemaTypes.Email, unique: true },
  password: { type: String, required: true },
  
  // Thông tin cá nhân
  name: { type: String, required: true },
  birthName: { type: String },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  contactNumber: { type: String, required: true },
  idNumber: { type: String },
  photo: { type: String },
  
  // Địa chỉ
  province: { type: String },
  district: { type: String },
  detailedAddress: { type: String },
  birthplace: { type: String },
  
  // Thông tin công việc
  department: { type: String },
  designation: { type: String },
  jobId: { type: String },
  supervisor: { type: String },
  Skills: [String],
  experience: { type: String, enum: ['Fresher', 'Junior', 'Senior'] },
  
  // Thông tin hợp đồng
  startDate: { type: Date },
  endDate: { type: Date },
  salary: { type: Number },
  contractType: { type: String },
  workingHours: { type: Number, default: 8 },
  
  // Metadata
  dateAdded: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'probation', 'terminated'], default: 'active' },
  
  // Thông tin bảo mật
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date, default: null }
});

UserSchema.methods.encryptPassword = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);
};

UserSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

// Kiểm tra xem tài khoản có bị khóa không
UserSchema.methods.isAccountLocked = function() {
  if (!this.accountLockedUntil) return false;
  
  // Kiểm tra xem thời gian khóa đã hết chưa
  return this.accountLockedUntil > new Date();
};

// Reset số lần đăng nhập thất bại
UserSchema.methods.resetFailedLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  return this.save();
};

// Tăng số lần đăng nhập thất bại và kiểm tra để khóa tài khoản nếu cần
UserSchema.methods.incrementFailedLoginAttempts = function() {
  this.failedLoginAttempts += 1;
  
  // Nếu đăng nhập sai 5 lần, khóa tài khoản trong 15 phút
  if (this.failedLoginAttempts >= 5) {
    // Tính thời điểm mở khóa (15 phút sau)
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + 15);
    this.accountLockedUntil = lockUntil;
  }
  
  return this.save();
};

module.exports = mongoose.model("User", UserSchema);
