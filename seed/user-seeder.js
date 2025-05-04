/**
 * This script seeds the User collection in the MongoDB database.
 *
 * It first connects to the MongoDB database using Mongoose.
 * Then, it creates an array of new User instances with predefined data.
 * Each User instance represents a document that will be inserted into the User collection.
 *
 * Each User document has the following fields:
 * - type: The role of the user (e.g., "project_manager", "accounts_manager", "employee").
 * - email: The email address of the user.
 * - password: The hashed password of the user. The password is hashed using bcrypt.
 * - name: The name of the user.
 * - dateOfBirth: The date of birth of the user.
 * - contactNumber: The contact number of the user.
 *
 */
/**
 * This script seeds the User collection in the MongoDB database.
 *
 * It first connects to the MongoDB database using Mongoose.
 * Then, it creates an array of new User instances with predefined data.
 * Each User instance represents a document that will be inserted into the User collection.
 *
 * Each User document has the following fields:
 * - type: The role of the user (e.g., "project_manager", "accounts_manager", "employee").
 * - email: The email address of the user.
 * - password: The hashed password of the user. The password is hashed using bcrypt.
 * - name: The name of the user.
 * - dateOfBirth: The date of birth of the user.
 * - contactNumber: The contact number of the user.
 *
 */

let User = require("../models/user");
let bcrypt = require("bcrypt-nodejs");
let mongoose = require("mongoose");

const db = require("../db");

db.connect()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection error", err));

let users = [
  new User({
    type: "project_manager",
    officeEmail: "pm@pm.com",
    password: bcrypt.hashSync("pm1234", bcrypt.genSaltSync(5), null),
    name: "Project manager",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1990-05-20"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: "Admin Admin", // Will be set after admin is created
    email: "pmad.personal@email.com",
    department: "Quality Assurance",
    designation: "Project Manager",
    jobTitle: "Backend Developer",
    jobId: "PM001", // phải duy nhất cho mỗi user
    idNumber: "012345678904", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",
    province: "Tỉnh Sơn La",
    district: "Huyện Mai Sơn",
    detailedAddress: "123 Đường ABC, gần trường XYZ",
    birthplace: "Thành phố Hà Nội",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Big Data Analytics", "PHP"],
    isActive: true,
    dateAdded: new Date()
  }),  
  new User({
    type: "project_manager",
    officeEmail: "pm2@pm.com",
    password: bcrypt.hashSync("pm1234", bcrypt.genSaltSync(5), null),
    name: "Project manager",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1990-05-20"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: "Admin Admin", // Will be set after admin is created
    email: "pman.personal@email.com",
    department: "Quality Assurance",
    designation: "Project Manager",
    jobTitle: "Backend Developer",
    jobId: "PM002", // phải duy nhất cho mỗi user
    idNumber: "012345678907", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",
    province: "Tỉnh Sơn La",
    district: "Huyện Mai Sơn",
    detailedAddress: "123 Đường ABC, gần trường XYZ",
    birthplace: "Thành phố Hà Nội",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Big Data Analytics", "PHP"],
    isActive: true,
    dateAdded: new Date()
  }), 
  new User({
    type: "employee",
    officeEmail: "employee1@employee.com",
    password: bcrypt.hashSync("123456", bcrypt.genSaltSync(5), null),
    name: "Employee One",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1994-06-26"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: "Project manager", // Will be set after admin is created
    email: "pmbv.personal@email.com",
    department: "Quality Assurance",
    designation: "Software Engineer",
    jobTitle: "Software Engineer",
    jobId: "EM001", // phải duy nhất cho mỗi user
    idNumber: "012345678904", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",

    province: "Tỉnh Cao Bằng",
    district: "Huyện Nguyên Bình",
    detailedAddress: "123 Đường ABC, gần trường XYZ",
  
    birthplace: "Thành phố Hà Nội",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Front End", "Big Data Analytics"],
    isActive: true,
    dateAdded: new Date()
  }),  
 
  new User({
    type: "employee",
    officeEmail: "employee2@employee.com",
    password: bcrypt.hashSync("123456", bcrypt.genSaltSync(5), null),
    name: "Employee Two",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1996-05-26"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: "Project manager", // Will be set after admin is created
    email: "ym.personal@email.com",
    department: "Quality Assurance",
    designation: "Software Engineer",
    jobTitle: "Software Engineer",
    jobId: "EM002", // phải duy nhất cho mỗi user
    idNumber: "012345678904", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",
  
    province: "Thành phố Hà Nội",
    district: "Quận Ba Đình",
    detailedAddress: "123 Đường ABC, gần trường XYZ",
  
    birthplace: "Tỉnh Hà Giang",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Big Data Analytics", "PHP"],
    isActive: true,
    dateAdded: new Date()
  }),  
  new User({
    type: "employee",
    officeEmail: "employee3@employee.com",
    password: bcrypt.hashSync("123456", bcrypt.genSaltSync(5), null),
    name: "Employee Two",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1996-05-26"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: "Project manager", // Will be set after admin is created
    email: "ymv.personal@email.com",
    department: "Quality Assurance",
    designation: "Software Engineer",
    jobTitle: "Software Engineer",
    jobId: "EM003", // phải duy nhất cho mỗi user
    idNumber: "012345678908", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",
  
    province: "Thành phố Hà Nội",
    district: "Quận Ba Đình",
    detailedAddress: "123 Đường ABC, gần trường XYZ",
  
    birthplace: "Tỉnh Hà Giang",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Big Data Analytics", "PHP"],
    isActive: true,
    dateAdded: new Date()
  }), 
  new User({
    type: "admin",
    officeEmail: "admin@admin.com",
    password: bcrypt.hashSync("admin123", bcrypt.genSaltSync(5), null),
    name: "Admin Admin",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1996-05-26"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: null, // Will be set after admin is created
    email: "pmcs.personal@email.com",
    department: "Human Resource",
    designation: "HR Manager",
    jobTitle: "Backend Developer",
    jobId: "AD001", // phải duy nhất cho mỗi user
    idNumber: "012345678904", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",

    province: "Thành phố Hà Nội",
    district: "Quận Ba Đình",
    detailedAddress: "123 Đường ABC",
    birthplace: "Tỉnh Hà Giang",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Big Data Analytics", "PHP"],
    isActive: true,
    dateAdded: new Date()
  }),  
  new User({
    type: "admin",
    officeEmail: "admin2@admin.com",
    password: bcrypt.hashSync("admin123", bcrypt.genSaltSync(5), null),
    name: "Admin Admin",
    firstName: "Nguyen",
    lastName: "Van PM",
    birthName: "Nguyen Van D",
    gender: "male",
    dateOfBirth: new Date("1996-05-26"),
    contactNumber: "325432011",
    photo: "/images/default-avatar.png",
    supervisor: null, // Will be set after admin is created
    email: "pmgc.personal@email.com",
    department: "Human Resource",
    designation: "HR Manager",
    jobTitle: "Backend Developer",
    jobId: "AD002", // phải duy nhất cho mỗi user
    idNumber: "012345678907", // 12 số duy nhất
    startDate: new Date("2025-01-01"),
    employmentType: "full-time",

    province: "Thành phố Hà Nội",
    district: "Quận Ba Đình",
    detailedAddress: "123 Đường ABC",
    birthplace: "Tỉnh Hà Giang",
    experience: "Senior", // optional nhưng nếu có sẽ tốt hơn
    Skills: ["Big Data Analytics", "PHP"],
    isActive: true,
    dateAdded: new Date()
  }),  
];

(async function () {
  for (let user of users) {
    let existingUser = await User.findOne({ email: user.email });
    if (existingUser) {
      console.log(`User with email ${user.email} already exists.`);
      break;
    } else {
      await user.save();
    }
  }
  exit();
})();

function exit() {
  mongoose.disconnect();
  console.log("Users Added...")
}
