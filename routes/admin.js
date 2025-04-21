const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Project = require("../models/project");
const config_passport = require("../config/passport.js");
const moment = require("moment");
const Leave = require("../models/leave");
const Attendance = require("../models/attendance");
const UserSalary = require("../models/user_salary");
const PaySlip = require("../models/payslip");
const { isLoggedIn } = require("./middleware");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const csrfProtection = require("csurf")();
const mongoose = require('mongoose');

// Cấu hình lưu trữ cho upload ảnh
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Khởi tạo multer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // giới hạn 5MB
  },
  fileFilter: fileFilter
});

// Check if user is authenticated
router.use("/", isLoggedIn, function isAuthenticated(req, res, next) {
  next();
});

// Check if user has admin privileges
router.use("/", function isAdmin(req, res, next) {
  if (req.user.type === "admin" || req.user.type === "accounts_manager") {
    next();
  } else {
    console.log("Unauthorized access attempt to admin route by:", req.user.type);
    req.flash("error", "You don't have permission to access this page");
    res.redirect("/manager/");
  }
});

// Displays home page to the admin
router.get("/", async function viewDashboard(req, res, next) {
  try {
    console.log("Admin dashboard route called"); // Debug message
    // Lấy tổng số nhân viên
    const employeeCount = await User.countDocuments({ type: "employee" });
    
    // Lấy tổng số managers
    const managerCount = await User.countDocuments({ type: "project_manager" });
    
    // Lấy số người điểm danh hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendanceCount = await Attendance.countDocuments({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    // Lấy số đơn nghỉ phép
    const pendingLeaves = await Leave.countDocuments({ adminResponse: "Pending" });
    const approvedLeaves = await Leave.countDocuments({ adminResponse: "Approved" });
    const totalLeaves = await Leave.countDocuments({});
    
    // Lấy số nhân viên Part-time và Full-time
    // Tối ưu hóa: chỉ truy vấn cơ sở dữ liệu một lần để lấy tất cả nhân viên
    const employees = await User.find({ type: "employee" });
    
    // Đếm nhân viên part-time và full-time từ kết quả có sẵn
    let partTimeCount = 0;
    let fullTimeCount = 0;
    
    for (const employee of employees) {
      if ((employee.employeeType === "Part-Time") || (employee.employmentType === "part-time")) {
        partTimeCount++;
      } else {
        fullTimeCount++;
      }
    }
    
    // Tính phần trăm
    const partTimePercentage = Math.round((partTimeCount / employeeCount) * 100) || 0;
    const fullTimePercentage = Math.round((fullTimeCount / employeeCount) * 100) || 0;
    
    console.log("About to render adminDashboard with data:", {
      employeeCount,
      managerCount,
      pendingLeaves
    });
    
    // Render adminDashboard instead of adminHome
    res.render("Admin/adminDashboard", {
      title: "Admin Dashboard",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      moment: moment,
      employeeCount,
      managerCount,
      todayAttendanceCount,
      pendingLeaves,
      approvedLeaves,
      totalLeaves,
      partTimeCount,
      fullTimeCount,
      partTimePercentage,
      fullTimePercentage
    });
  } catch (err) {
    console.error("Error in admin dashboard route:", err);
    res.status(500).send("Error loading dashboard");
  }
});

/**
 * Sorts the list of employees in User Schema.
 * Such that latest records are shown first.
 * Then displays list of all employees to the admin.
 */
router.get("/view-all-employees", async (req, res, next) => {
  try {
    const users = await User.find({
      $or: [
        { type: "employee" },
        { type: "project_manager" },
        { type: "accounts_manager" },
      ],
    }).sort({ _id: -1 });

    // Định dạng startDate cho mỗi user trước khi render
    const formattedUsers = users.map(user => {
      const userObject = user.toObject();
      
      // Thêm trường formattedDate để hiển thị startDate đã định dạng
      if (userObject.startDate) {
        const date = new Date(userObject.startDate);
        const day = date.getDate();
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        const year = date.getFullYear();
        
        // Thêm suffix cho ngày (1st, 2nd, 3rd, 4th...)
        const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : 
                      (day === 2 || day === 22) ? 'nd' : 
                      (day === 3 || day === 23) ? 'rd' : 'th';
        
        userObject.formattedStartDate = `${day}${suffix} ${month}, ${year}`;
      } else {
        userObject.formattedStartDate = 'N/A';
      }
      
      return userObject;
    });

    res.render("Admin/viewAllEmployee", {
      title: "All Employees",
      csrfToken: req.csrfToken(),
      users: formattedUsers,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employees");
  }
});

// Displays profile of the employee with the help of the id of the employee from the parameters.
router.get("/employee-profile/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("Admin/employeeProfile", {
      title: "Employee Profile",
      employee: user,
      csrfToken: req.csrfToken(),
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee profile");
  }
});

// Displays the attendance sheet of the given employee to the admin.
router.get("/view-employee-attendance/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const attendances = await Attendance.find({ employeeID: id }).sort({
      _id: -1,
    });
    const user = await User.findById(id);

    res.render("Admin/employeeAttendanceSheet", {
      title: "Employee Attendance Sheet",
      month: req.body.month,
      csrfToken: req.csrfToken(),
      found: attendances.length > 0 ? 1 : 0,
      attendance: attendances,
      moment: moment,
      userName: req.user.name,
      employee_name: user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee attendance");
  }
});

// Displays edit employee form to the admin.
router.get("/edit-employee/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("Admin/editEmployee", {
      title: "Edit Employee",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/");
  }
});

// First it gets attributes of the logged in admin from the User Schema.
router.get("/view-profile", async (req, res, next) => {
  const { _id, name } = req.user;
  try {
    const user = await User.findById(_id);
    res.render("Admin/viewProfile", {
      title: "Profile",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      userName: name,
      messages: req.flash() || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving profile");
  }
});

// Route for updating admin profile
router.post("/update-profile", csrfProtection, upload.single('photo'), async (req, res, next) => {
  const { _id } = req.user;
  try {
    // Get current user data
    const user = await User.findById(_id);
    
    // Update basic fields if provided
    if (req.body.gender) user.gender = req.body.gender;
    if (req.body.contactNumber) user.contactNumber = req.body.contactNumber;
    if (req.body.birthplace) user.birthplace = req.body.birthplace;
    if (req.body.province) user.province = req.body.province;
    if (req.body.district) user.district = req.body.district;
    if (req.body.detailedAddress) user.detailedAddress = req.body.detailedAddress;
    if (req.body.idNumber) user.idNumber = req.body.idNumber;
    if (req.body.jobId) user.jobId = req.body.jobId;
    if (req.body.startDate) user.startDate = new Date(req.body.startDate);
    if (req.body.department) user.department = req.body.department;
    if (req.body.experience) user.experience = req.body.experience;
    
    // Update photo if uploaded
    if (req.file) {
      user.photo = req.file.filename;
    }
    
    // Save updated user
    await user.save();
    
    // Redirect back to profile page
    req.flash('success', 'Profile updated successfully');
    res.redirect('/admin/view-profile');
  } catch (err) {
    console.error("Error updating profile:", err);
    req.flash('error', 'Error updating profile: ' + err.message);
    res.redirect('/admin/view-profile');
  }
});

// Displays add employee form to the admin.
router.get("/add-employee", (req, res, next) => {
  const { name } = req.user;
  const messages = req.flash("error");

  res.render("Admin/addEmployee", {
    title: "Add Employee",
    user: config_passport.User,
    messages,
    hasErrors: messages.length > 0,
    userName: name,
    csrfToken: req.csrfToken()
  });
});

/**
 * First it gets the id of the given employee from the parameters.
 * Finds the project of the employee from Project Schema with the help of that id.
 * Then displays all the projects of the given employee.
 */
router.get("/all-employee-projects/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const projects = await Project.find({ employeeID: id }).sort({ _id: -1 });
    const user = await User.findById(id);

    res.render("Admin/employeeAllProjects", {
      title: "List Of Employee Projects",
      hasProject: projects.length > 0 ? 1 : 0,
      projects,
      csrfToken: req.csrfToken(),
      user,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee projects");
  }
});

// Displays the list of all the leave applications applied by all employees.
router.get("/leave-applications", async (req, res, next) => {
  try {
    const leaves = await Leave.find({}).sort({ _id: -1 });
    const hasLeave = leaves.length > 0 ? 1 : 0;

    const employeeChunks = await Promise.all(
      leaves.map((leave) => User.findById(leave.applicantID))
    );

    res.render("Admin/allApplications", {
      title: "List Of Leave Applications",
      csrfToken: req.csrfToken(),
      hasLeave,
      leaves,
      employees: employeeChunks,
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving leave applications");
  }
});

/**
 * Gets the leave id and employee id from the parameters.
 * Then shows the response application form of that leave of the employee to the admin.
 */
router.get(
  "/respond-application/:leave_id/:employee_id",
  async (req, res, next) => {
    const { leave_id: leaveID, employee_id: employeeID } = req.params;
    try {
      const leave = await Leave.findById(leaveID);
      const user = await User.findById(employeeID);

      res.render("Admin/applicationResponse", {
        title: "Respond Leave Application",
        csrfToken: req.csrfToken(),
        leave,
        employee: user,
        moment: moment,
        userName: req.user.name,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error responding to application");
    }
  }
);

/**
 * Gets id of the projet to be edit.
 * Displays the form of the edit project to th admin.
 */
router.get("/edit-employee-project/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await Project.findById(id);
    res.render("Admin/editProject", {
      title: "Edit Employee",
      csrfToken: req.csrfToken(),
      project,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving project");
  }
});

/**
 * Gets the id of the employee from parameters.
 * Displays the add employee project form to the admin.
 */
router.get("/add-employee-project/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("Admin/addProject", {
      title: "Add Employee Project",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    res.redirect("/admin/");
  }
});

router.get("/employee-project-info/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await Project.findById(id);
    const user = await User.findById(project.employeeID);
    res.render("Admin/projectInfo", {
      title: "Employee Project Information",
      project: project,
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/redirect-employee-profile", async (req, res, next) => {
  const { id } = req.user;
  try {
    const user = await User.findById(id);
    res.redirect(`/admin/employee-profile/${id}`);
  } catch (err) {
    console.log(err);
  }
});

// Displays the admin its own attendance sheet
router.post("/view-attendance", async (req, res, next) => {
  const { month, year } = req.body;
  const { _id, name } = req.user;
  try {
    const attendance = await Attendance.find({
      employeeID: _id,
      month,
      year,
    }).sort({ _id: -1 });
    const found = attendance.length > 0 ? 1 : 0;
    res.render("Admin/viewAttendanceSheet", {
      title: "Attendance Sheet",
      month,
      csrfToken: req.csrfToken(),
      found,
      attendance,
      userName: name,
      moment: moment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing attendance");
  }
});

// After marking attendance, shows current attendance to the admin.
router.get("/view-attendance-current", async (req, res, next) => {
  const { _id, name } = req.user;
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  try {
    const attendance = await Attendance.find({
      employeeID: _id,
      month,
      year,
    }).sort({ _id: -1 });
    const found = attendance.length > 0 ? 1 : 0;
    res.render("Admin/viewAttendanceSheet", {
      title: "Attendance Sheet",
      month,
      csrfToken: req.csrfToken(),
      found,
      attendance,
      moment: moment,
      userName: name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing current attendance");
  }
});

// Admin Attendance Dashboard - Enhanced version
router.get("/admin-attendance-dashboard", async (req, res, next) => {
  const { _id, name } = req.user;
  const currentDate = new Date();
  const month = parseInt(req.query.month) || currentDate.getMonth() + 1;
  const year = parseInt(req.query.year) || currentDate.getFullYear();
  
  try {
    // 1. Lấy toàn bộ điểm danh trong tháng của admin
    const attendanceRecords = await Attendance.find({
      employeeID: _id,
      month,
      year,
    }).sort({ date: -1 });
    
    // 2. Lấy thông tin điểm danh hôm nay
    const today = currentDate.getDate();
    const todayAttendance = attendanceRecords.find(record => record.date === today);
    const hasCheckedInToday = !!todayAttendance;
    const hasCheckedOutToday = todayAttendance && !!todayAttendance.checkOutTime;
    
    // 3. Thống kê điểm danh
    const daysInMonth = new Date(year, month, 0).getDate();
    const presentDays = attendanceRecords.length;
    const lateDays = attendanceRecords.filter(record => record.status === 'late').length;
    const onTimeDays = presentDays - lateDays;
    const attendanceRate = Math.round((presentDays / daysInMonth) * 100);
    
    // 4. Thống kê thời gian làm việc
    let totalWorkHours = 0;
    let workDaysWithFullHours = 0;
    
    attendanceRecords.forEach(record => {
      if (record.checkInTime && record.checkOutTime) {
        // Parse times and calculate working hours
        const checkIn = record.checkInTime.split(':');
        const checkOut = record.checkOutTime.split(':');
        
        const checkInDate = new Date(year, month - 1, record.date);
        checkInDate.setHours(parseInt(checkIn[0]), parseInt(checkIn[1]), parseInt(checkIn[2]));
        
        const checkOutDate = new Date(year, month - 1, record.date);
        checkOutDate.setHours(parseInt(checkOut[0]), parseInt(checkOut[1]), parseInt(checkOut[2]));
        
        // Calculate time difference in hours
        const diffHours = (checkOutDate - checkInDate) / (1000 * 60 * 60);
        
        // Add to total
        if (diffHours > 0) {
          totalWorkHours += diffHours;
          workDaysWithFullHours++;
        }
      }
    });
    
    // Round to 2 decimal places
    totalWorkHours = Math.round(totalWorkHours * 100) / 100;
    const avgWorkHours = workDaysWithFullHours > 0 ? 
      Math.round((totalWorkHours / workDaysWithFullHours) * 100) / 100 : 0;
    
    // 5. Lấy các đơn nghỉ phép đang chờ phê duyệt để hiển thị tóm tắt
    const pendingLeaves = await Leave.find({ adminResponse: "Pending" })
      .limit(5)
      .populate('applicantID', 'name');
    
    res.render("Admin/adminAttendanceDashboard", {
      title: "Admin Attendance Dashboard",
          csrfToken: req.csrfToken(),
      userName: name,
      month,
      year,
      attendanceRecords,
      todayAttendance,
      hasCheckedInToday,
      hasCheckedOutToday,
      presentDays,
      lateDays,
      onTimeDays,
      attendanceRate,
      totalWorkHours,
      avgWorkHours,
      workDaysWithFullHours,
      pendingLeaves,
      daysInMonth,
          moment: moment,
      currentDate: currentDate
        });
  } catch (err) {
    console.error("Error in admin attendance dashboard:", err);
    res.status(500).send("Error loading admin attendance dashboard");
  }
});

// Cập nhật route mark-attendance để chuyển hướng đến dashboard mới
router.post("/mark-attendance", async (req, res) => {
  const { _id } = req.user;
  const currentDate = new Date();
  const date = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  // Format the current time as HH:MM:SS
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');
  const checkInTime = `${hours}:${minutes}:${seconds}`;
  
  // Define the cutoff time for "late" status (9:00 AM)
  const lateTime = '09:00:00';
  // Determine if the employee is late
  const isLate = checkInTime > lateTime;
  
  try {
    const attendance = await Attendance.find({
      employeeID: _id,
      date,
      month,
      year,
    });

    if (attendance.length === 0) {
      const newAttendance = new Attendance({
        employeeID: _id,
        year,
        month,
        date,
        present: 1,
        checkInTime: checkInTime,
        status: isLate ? 'late' : 'present'
      });
      await newAttendance.save();
    }

    // Chuyển hướng đến dashboard mới thay vì view-attendance-current
    res.redirect("/admin/admin-attendance-dashboard");
  } catch (err) {
    console.log(err);
  }
});

// Cập nhật route check-out để chuyển hướng đến dashboard mới
router.post("/check-out", async (req, res) => {
  const { _id } = req.user;
  const currentDate = new Date();
  const date = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  // Format the current time as HH:MM:SS
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');
  const checkOutTime = `${hours}:${minutes}:${seconds}`;
  
  try {
    // Find today's attendance record for the user
    const attendance = await Attendance.findOne({
      employeeID: _id,
      date,
      month,
      year,
    });

    if (attendance) {
      // Update the attendance record with check-out time
      attendance.checkOutTime = checkOutTime;
      await attendance.save();
      req.session.checkedOut = true; // Mark that the user has checked out
      
      // Chuyển hướng đến dashboard mới thay vì view-attendance-current
      res.redirect("/admin/admin-attendance-dashboard");
    } else {
      // No check-in record found for today
      res.status(400).send("No check-in record found for today. Please check-in first.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error recording check-out time");
  }
});

/**
 * Employees Salary Management Features 
 * These were previously in accounts_manager role, now moved to admin
 * NOTE: These routes have been removed from admin role and should be accessed
 * only by accounts_manager role. They are kept here for reference only.
 * These endpoints should be properly protected from unauthorized access.
 */

// The following salary management routes should be accessed only by accounts_manager role
router.use("/view-employees-salary|/generate-pay-slip|/set-bonus|/set-salary|/increment-salary", function(req, res, next) {
  // Redirect admin users away from salary management routes
  if (req.user && req.user.type === "admin") {
    return res.status(403).send("Access denied: This feature is restricted to Accounts Manager role");
  }
  
  // Only allow accounts_manager to proceed
  if (req.user && req.user.type === "accounts_manager") {
    next();
  } else {
    return res.status(403).send("Access denied: This feature is restricted to Accounts Manager role");
  }
});

// View employees with salary information
router.get("/view-employees-salary", async (req, res) => {
  try {
    const users = await User.find({ 
      $or: [{ type: "employee" }, { type: "project_manager" }] 
    }).sort({ _id: -1 });
    
    const salaries = [];
    
    for (const user of users) {
      let salary = await UserSalary.findOne({ employeeID: user._id });
      
      if (!salary) {
        // Create new salary entry if it doesn't exist
        const newSalary = new UserSalary();
        newSalary.accountManagerID = req.user._id;
        newSalary.employeeID = user._id;
        await newSalary.save();
        salary = newSalary;
      }
      
      salaries.push(salary);
    }
    
    res.render("Admin/viewEmployeesSalary", {
      title: "Manage Employee Salaries",
      csrfToken: req.csrfToken(),
      users: users,
      salary: salaries,
      userName: req.user.name,
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee salary information");
  }
});

// Generate pay slip route
router.get("/generate-pay-slip/:employee_id", async (req, res) => {
  try {
    const employeeId = req.params.employee_id;
    const user = await User.findById(employeeId);
    
    let paySlip = await PaySlip.findOne({ employeeID: employeeId });
    let hasPaySlip = 0;
    
    if (paySlip) {
      hasPaySlip = 1;
    } else {
      const newPS = new PaySlip();
      newPS.accountManagerID = req.user._id;
      newPS.employeeID = employeeId;
      newPS.bankName = "abc";
      newPS.branchAddress = "abc";
      newPS.basicPay = 0;
      newPS.overtime = 0;
      newPS.conveyanceAllowance = 0;
      
      await newPS.save();
      paySlip = newPS;
    }
    
    res.render("Admin/generatePaySlip", {
      title: "Generate Pay Slip",
      csrfToken: req.csrfToken(),
      employee: user,
      pay_slip: paySlip,
      moment: moment,
      hasPaySlip: hasPaySlip,
      userName: req.user.name,
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating pay slip");
  }
});

// Set bonus route
router.post("/set-bonus", async (req, res) => {
  try {
    const us = await UserSalary.findOne({ employeeID: req.body.employee_bonus });
    us.bonus = req.body.bonus;
    us.reason = req.body.reason;
    await us.save();
    
    res.redirect("/admin/view-employees-salary");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error setting bonus");
  }
});

// Set salary route
router.post("/set-salary", async (req, res) => {
  try {
    const employee_id = req.body.employee_salary;
    const us = await UserSalary.findOne({ employeeID: employee_id });
    
    us.salary = Number(req.body.salary);
    await us.save();
    
    res.redirect("/admin/view-employees-salary");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error setting salary");
  }
});

// Increment salary route
router.post("/increment-salary", async (req, res) => {
  try {
    const us = await UserSalary.findOne({ employeeID: req.body.employee_increment });
    
    us.salary = Number(req.body.current_salary) + Number(req.body.amount_increment);
    await us.save();
    
    res.redirect("/admin/view-employees-salary");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error incrementing salary");
  }
});

// Generate pay slip post route
router.post("/generate-pay-slip", async (req, res) => {
  try {
    const employeeId = req.body.employee_id;
    const docs = await PaySlip.find({ employeeID: employeeId });
    
    docs[0].accountManagerID = req.user._id;
    docs[0].employeeID = employeeId;
    docs[0].bankName = req.body.bankName;
    docs[0].branchAddress = req.body.branchAddress;
    docs[0].basicPay = req.body.basicPay;
    docs[0].overtime = req.body.overtime;
    docs[0].conveyanceAllowance = req.body.conveyanceAllowance;
    
    await docs[0].save();
    
    res.redirect("/admin/view-employees-salary");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating pay slip");
  }
});

// Test route cho dashboard
router.get("/dashboard", async function testDashboard(req, res, next) {
  try {
    console.log("Test dashboard route called");
    
    // Lấy tổng số nhân viên
    const employeeCount = await User.countDocuments({ type: "employee" });
    
    // Lấy tổng số managers
    const managerCount = await User.countDocuments({ type: "project_manager" });
    
    // Lấy số người điểm danh hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendanceCount = await Attendance.countDocuments({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    // Lấy số đơn nghỉ phép
    const pendingLeaves = await Leave.countDocuments({ adminResponse: "Pending" });
    const approvedLeaves = await Leave.countDocuments({ adminResponse: "Approved" });
    const totalLeaves = await Leave.countDocuments({});
    
    // Lấy số nhân viên Part-time và Full-time
    // Tối ưu hóa: chỉ truy vấn cơ sở dữ liệu một lần để lấy tất cả nhân viên
    const employees = await User.find({ type: "employee" });
    
    // Đếm nhân viên part-time và full-time từ kết quả có sẵn
    let partTimeCount = 0;
    let fullTimeCount = 0;
    
    for (const employee of employees) {
      if ((employee.employeeType === "Part-Time") || (employee.employmentType === "part-time")) {
        partTimeCount++;
      } else {
        fullTimeCount++;
      }
    }
    
    // Tính phần trăm
    const partTimePercentage = Math.round((partTimeCount / employeeCount) * 100) || 0;
    const fullTimePercentage = Math.round((fullTimeCount / employeeCount) * 100) || 0;
    
    res.render("Admin/adminDashboard", {
      title: "Admin Dashboard",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      moment: moment,
      employeeCount,
      managerCount,
      todayAttendanceCount,
      pendingLeaves,
      approvedLeaves,
      totalLeaves,
      partTimeCount,
      fullTimeCount,
      partTimePercentage,
      fullTimePercentage
    });
  } catch (err) {
    console.error("Error in test dashboard route:", err);
    res.status(500).send("Error loading dashboard");
  }
});

/**
 * View attendance for all employees
 * Displays a comprehensive list of attendance records for all employees
 */
router.get("/employees-attendance", async (req, res, next) => {
  try {
    console.log("[DEBUG] Accessing employees-attendance route");
    
    // Get month and year from query parameters, default to current month/year
    const currentDate = new Date();
    const month = parseInt(req.query.month) || currentDate.getMonth() + 1;
    const year = parseInt(req.query.year) || currentDate.getFullYear();
    
    console.log(`[DEBUG] Showing attendance for month: ${month}, year: ${year}`);
    
    // Number of days in the selected month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Get all employees (except admins)
    const employees = await User.find({ type: { $ne: "admin" } });
    console.log(`[DEBUG] Found ${employees.length} employees`);
    
    // Initialize statistics counters
    let totalPresentDays = 0;
    let totalLeaveDays = 0;
    let totalLateDays = 0;
    let totalOnTimeDays = 0;
    let totalDays = 0;
    
    // Get attendance records for the selected month
    const attendanceData = await Promise.all(
      employees.map(async (employee) => {
        // Get attendance records for this employee in the selected month/year
        const attendanceRecords = await Attendance.find({
          employeeID: employee._id,
          month: month,
          year: year
        }).sort({ date: 1 });
        
        console.log(`[DEBUG] Employee ${employee.name} has ${attendanceRecords.length} attendance records`);
        
        // Count present days for this employee
        const presentDays = attendanceRecords.length;
        
        // Count days with leave status
        const leaveRecords = await Leave.find({
          applicantID: employee._id,
          status: "accepted",
          $or: [
            {
              fromMonth: month,
              fromYear: year
            },
            {
              toMonth: month,
              toYear: year
            }
          ]
        });
        
        // Calculate days on leave in this month
        let leaveDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let onTimeDays = 0;
        
        // Process leave records to count leave days in the selected month
        leaveRecords.forEach(leave => {
          const fromDate = new Date(leave.fromYear, leave.fromMonth - 1, leave.fromDate);
          const toDate = new Date(leave.toYear, leave.toMonth - 1, leave.toDate);
          
          // Adjust dates to be within the current month if they span multiple months
          const startDate = new Date(Math.max(fromDate, new Date(year, month - 1, 1)));
          const endDate = new Date(Math.min(toDate, new Date(year, month, 0)));
          
          if (startDate <= endDate) {
            // Count days between startDate and endDate (inclusive)
            const diffTime = endDate - startDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            leaveDays += diffDays;
          }
        });
        
        // Process attendance records to count late arrivals
        attendanceRecords.forEach(record => {
          // Consider arrival after 9:00 AM as late
          if (record.checkInTime && record.checkInTime > '09:00:00') {
            lateDays++;
          } else {
            onTimeDays++;
          }
          
          // Add status to attendance records if not already present
          if (!record.status) {
            if (record.checkInTime && record.checkInTime > '09:00:00') {
              record.status = 'late';
            } else {
              record.status = 'present';
            }
          }
        });
        
        // Calculate absent days (excluding leave days)
        absentDays = daysInMonth - presentDays - leaveDays;
        if (absentDays < 0) absentDays = 0;
        
        // Calculate attendance percentage
        const workingDays = daysInMonth; // Simplification - count all days as working days
        const attendancePercentage = workingDays > 0 
          ? Math.round((presentDays / workingDays) * 100) 
          : 0;
          
        // Update statistics totals
        totalPresentDays += presentDays;
        totalLeaveDays += leaveDays;
        totalLateDays += lateDays;
        totalOnTimeDays += onTimeDays;
        totalDays += workingDays;
        
        return {
          employee,
          presentDays,
          absentDays,
          leaveDays,
          lateDays,
          onTimeDays,
          attendancePercentage,
          attendanceRecords,
          status: leaveDays > 0 ? 'leave' : (presentDays > 0 ? 'present' : '')
        };
      })
    );
    
    console.log(`[DEBUG] Processed attendance data for ${attendanceData.length} employees`);
    
    // Calculate overall statistics
    const statsData = {
      presentDays: totalPresentDays,
      leaveDays: totalLeaveDays,
      lateDays: totalLateDays,
      onTimeDays: totalOnTimeDays,
      totalDays: totalDays
    };

    res.render("Admin/employeesAttendance", {
      title: "Employees Attendance",
      csrfToken: req.csrfToken(),
      employees: attendanceData,
      month,
      year,
      userName: req.user.name,
      statsData
    });
  } catch (err) {
    console.error("[ERROR] Error in employees-attendance route:", err);
    res.status(500).send("Error retrieving employee attendance");
  }
});

// Handle editing attendance record
router.post("/edit-attendance", async (req, res, next) => {
  try {
    const { attendanceId, status, checkInTime, checkOutTime, isNewRecord, date } = req.body;
    
    // Nếu là bản ghi mới
    if (isNewRecord === 'true') {
      console.log('[DEBUG] Creating new attendance record');
      
      // Parse date from ISO format (YYYY-MM-DD)
      const dateParts = date.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);
      
      // Create new attendance record
      const newAttendance = new Attendance({
        employeeID: attendanceId, // Trong trường hợp này attendanceId là ID của nhân viên
        year,
        month,
        date: day,
        present: status !== 'leave',
        checkInTime: checkInTime ? checkInTime + ':00' : null,
        checkOutTime: checkOutTime ? checkOutTime + ':00' : null,
        status
      });
      
      await newAttendance.save();
      return res.json({ success: true, message: 'Attendance added successfully' });
    }
    
    // Nếu là cập nhật bản ghi hiện có
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    
    // Update the attendance record with new values
    attendance.status = status;
    
    if (checkInTime) {
      attendance.checkInTime = checkInTime + ':00';
    }
    
    if (checkOutTime) {
      attendance.checkOutTime = checkOutTime + ':00';
    }
    
    await attendance.save();
    
    return res.json({ success: true, message: 'Attendance updated successfully' });
  } catch (err) {
    console.error('Error updating attendance:', err);
    return res.status(500).json({ success: false, message: 'Error updating attendance' });
  }
});

// Get attendance record by ID
router.get("/get-attendance", async (req, res) => {
  try {
    const { id } = req.query;
    
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    
    return res.json({ 
      success: true, 
      record: {
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        date: attendance.date,
        month: attendance.month,
        year: attendance.year
      } 
    });
  } catch (err) {
    console.error('Error getting attendance record:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving attendance record' });
  }
});

// Route mới để hiển thị chi tiết nhân viên dạng trang đầy đủ
router.get("/employee-details/:id", csrfProtection, async (req, res, next) => {
  try {
    const employeeId = req.params.id;
    console.log('[PAGE] Request for employee details page with ID:', employeeId);
    console.log('[PAGE] MongoDB connection string:', process.env.DB_URL);
    console.log('[PAGE] Current connection state:', mongoose.connection.readyState);
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.log('[PAGE] Invalid MongoDB ObjectId:', employeeId);
      req.flash('error', 'Mã nhân viên không hợp lệ');
      return res.redirect('/admin/view-all-employees');
    }
    
    // Tìm nhân viên theo ID với toàn bộ thông tin
    const employee = await User.findById(employeeId);
    
    if (!employee) {
      console.log('[PAGE] Employee not found with ID:', employeeId);
      console.log('[PAGE] Database name:', mongoose.connection.db.databaseName);
      const count = await User.countDocuments();
      console.log('[PAGE] Total users in database:', count);
      req.flash('error', 'Không tìm thấy thông tin nhân viên');
      return res.redirect('/admin/view-all-employees');
    }
    
    console.log('[PAGE] Successfully found employee:', employee.name);
    
    // Render trang employee details
    res.render("Admin/employeeDetails", {
      title: `${employee.name} - Employee Details`,
      employee: employee,
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      moment: moment,
    });
  } catch (err) {
    console.error('[PAGE] Error rendering employee details:', err);
    req.flash('error', 'Lỗi khi hiển thị thông tin nhân viên');
    res.redirect('/admin/view-all-employees');
  }
});

// API endpoint to get employee profile by ID
router.get('/api/employee-profile/:id', csrfProtection, async (req, res) => {
  try {
    const employeeId = req.params.id;
    console.log('[API] Request for employee profile with ID:', employeeId);
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.log('[API] Invalid MongoDB ObjectId:', employeeId);
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
        details: 'The provided ID is not in the correct format'
      });
    }
    
    // Find employee by ID - get photo field
    const employee = await User.findById(employeeId)
      .select('name email contactNumber employeeID department designation photo employmentType startDate address detailedAddress district province');
    
    if (!employee) {
      console.log('[API] Employee not found with ID:', employeeId);
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        details: 'No employee found with the provided ID'
      });
    }
    
    // Kiểm tra thông tin photo
    console.log('[API] Raw employee photo field:', employee.photo);
    
    // Clone employee data to modify for response
    const employeeData = employee.toObject();
    
    // Ensure photo field is included in response
    if (employee.photo) {
      // Giữ nguyên trường photo để client có thể kiểm tra
      employeeData.photo = employee.photo;
      
      // Thêm trường profileImage cho thuận tiện
      employeeData.profileImage = `/uploads/${employee.photo}`;
      console.log('[API] Employee photo found, setting profileImage to:', employeeData.profileImage);
    } else {
      console.log('[API] No photo found for employee, using default image');
      employeeData.profileImage = '/uploads/default.png';
    }
    
    // Print all fields in the response for debugging
    console.log('[API] Final response data keys:', Object.keys(employeeData));
    console.log('[API] profileImage in response:', employeeData.profileImage);
    console.log('[API] photo in response:', employeeData.photo);
    console.log('[API] Successfully retrieved employee:', employee.name);
    
    return res.json({
      success: true,
      employee: employeeData
    });
  } catch (err) {
    const errorDetails = err.name === 'CastError' 
      ? `Invalid ID format: "${err.value}" is not a valid ObjectId` 
      : err.message;
    
    console.error('[API] Error fetching employee profile:', errorDetails);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      details: errorDetails
    });
  }
});

// Route để tạo dữ liệu điểm danh mẫu cho kiểm thử
router.get("/create-sample-attendance", async (req, res) => {
  try {
    // Lấy tất cả nhân viên (không phải admin)
    const employees = await User.find({ type: { $ne: "admin" }});
    
    if (employees.length === 0) {
      return res.send("Không có nhân viên nào trong hệ thống. Vui lòng thêm nhân viên trước.");
    }
    
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Số ngày đã qua trong tháng hoặc tối đa 15 ngày
    const daysToCreate = Math.min(currentDate.getDate(), 15);
    
    console.log(`Creating sample attendance for ${employees.length} employees, ${daysToCreate} days`);
    
    let createdRecords = 0;
    
    // Tạo dữ liệu điểm danh cho mỗi nhân viên
    for (const employee of employees) {
      // Tạo dữ liệu cho ngẫu nhiên các ngày trong tháng
      for (let day = 1; day <= daysToCreate; day++) {
        // Kiểm tra xem đã có bản ghi điểm danh chưa
        const existingRecord = await Attendance.findOne({
          employeeID: employee._id,
          date: day,
          month: month,
          year: year
        });
        
        if (!existingRecord) {
          // Tạo thời gian check-in ngẫu nhiên (giữa 7:00 và 10:00)
          const hour = Math.floor(Math.random() * 3) + 7;
          const minute = Math.floor(Math.random() * 60);
          const checkInTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          
          // 50% khả năng có checkout
          const hasCheckout = Math.random() > 0.5;
          let checkOutTime = null;
          
          if (hasCheckout) {
            // Check-out giữa 16:00 và 18:00
            const outHour = Math.floor(Math.random() * 2) + 16;
            const outMinute = Math.floor(Math.random() * 60);
            checkOutTime = `${outHour.toString().padStart(2, '0')}:${outMinute.toString().padStart(2, '0')}:00`;
          }
          
          // Xác định trạng thái dựa trên thời gian check-in
          let status = 'present';
          if (hour >= 9) {
            status = 'late';
          } else if (Math.random() < 0.1) { // 10% khả năng nghỉ phép
            status = 'leave';
          }
          
          // Tạo bản ghi điểm danh mới
          const newAttendance = new Attendance({
            employeeID: employee._id,
            year,
            month,
            date: day,
            present: status !== 'leave',
            checkInTime: status !== 'leave' ? checkInTime : null,
            checkOutTime: status !== 'leave' ? checkOutTime : null,
            status: status
          });
          
          await newAttendance.save();
          createdRecords++;
        }
      }
    }
    
    res.send(`Đã tạo ${createdRecords} bản ghi điểm danh mẫu. <a href="/admin/employees-attendance">Xem điểm danh</a>`);
  } catch (err) {
    console.error("Error creating sample attendance:", err);
    res.status(500).send("Lỗi khi tạo dữ liệu điểm danh mẫu");
  }
});

/**
 * Xử lý form thêm nhân viên mới
 */
router.post("/add-employee", upload.single('photo'), async (req, res, next) => {
  try {
    console.log("1. POST /admin/add-employee - Bắt đầu xử lý");
    
    const { 
      firstName, 
      lastName, 
      email, 
      dateOfBirth, 
      contactNumber, 
      password,
      department, 
      designation, 
      skills,
      employeeType
    } = req.body;
    
    console.log("2. Dữ liệu form:", {
      firstName, 
      lastName,
      email,
      dateOfBirth: dateOfBirth ? dateOfBirth : 'Not set',
      contactNumber: contactNumber ? contactNumber : 'Not set', 
      password: password ? 'Set' : 'Not set',
      department, 
      designation,
      employeeType
    });
    
    // Kết hợp firstName và lastName thành name
    const name = `${firstName} ${lastName}`;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      console.log("3. Email đã tồn tại:", email);
      req.flash("error", "Email is already in use");
      return res.redirect("/admin/add-employee");
    }
    
    console.log("4. Email hợp lệ, đang tạo nhân viên mới");
    
    // Xử lý các trường required
    if (!dateOfBirth) {
      console.log("ERROR: dateOfBirth là required nhưng không có giá trị");
      req.flash("error", "Date of Birth is required");
      return res.redirect("/admin/add-employee");
    }
    
    if (!contactNumber) {
      console.log("ERROR: contactNumber là required nhưng không có giá trị");
      req.flash("error", "Contact Number is required");
      return res.redirect("/admin/add-employee");
    }
    
    const dob = new Date(dateOfBirth);
    console.log("DateOfBirth parsed:", dob);
    
    // Tạo user mới - cách 1: Tạo object trước
    const userData = {
      name,
      email,
      dateOfBirth: dob,
      contactNumber,
      department,
      designation,
      type: "employee", // Mặc định là nhân viên
      Skills: skills || [],
      employeeType: employeeType, // Lưu giá trị gốc vào trường employeeType
      employmentType: employeeType === "Full-Time" ? "full-time" : "part-time" // Chuyển đổi giá trị cho trường employmentType
    };
    
    console.log("5. Object user đã tạo:", userData);
    
    // Tạo instance từ model
    const user = new User(userData);
    
    // Hash password
    const defaultPassword = "123456";
    if (password) {
      console.log("6. Sử dụng mật khẩu từ form");
      user.password = user.encryptPassword(password);
    } else {
      console.log("6. Sử dụng mật khẩu mặc định:", defaultPassword);
      user.password = user.encryptPassword(defaultPassword);
    }
    
    // Xử lý các trường mới
    if (req.body.gender) user.gender = req.body.gender;
    if (req.body.birthName) user.birthName = req.body.birthName;
    if (req.body.province) user.province = req.body.province;
    if (req.body.district) user.district = req.body.district;
    if (req.body.detailedAddress) user.detailedAddress = req.body.detailedAddress;
    if (req.body.birthplace) user.birthplace = req.body.birthplace;
    if (req.body.idNumber) user.idNumber = req.body.idNumber;
    if (req.body.jobId) user.jobId = req.body.jobId;
    if (req.body.supervisor) user.supervisor = req.body.supervisor;
    if (req.body.startDate) user.startDate = req.body.startDate;
    if (req.body.experience) user.experience = req.body.experience;
    
    // Lưu ảnh nếu có
    if (req.file) {
      user.photo = req.file.filename;
    }
    
    console.log("7. User trước khi lưu:", {
      name: user.name,
      email: user.email,
      type: user.type,
      employmentType: user.employmentType,
      dateOfBirth: user.dateOfBirth,
      contactNumber: user.contactNumber
    });
    
    // Thử cách lưu thứ 2: Tạo và lưu trực tiếp
    console.log("8. Thử cách lưu trực tiếp");
    const savedUser = await User.create({
      name,
      email,
      password: user.password,
      dateOfBirth: dob,
      contactNumber,
      department,
      designation,
      type: "employee",
      employeeType: employeeType,
      employmentType: employeeType === "Full-Time" ? "full-time" : "part-time",
      Skills: skills || [],
      gender: req.body.gender,
      birthName: req.body.birthName,
      province: req.body.province,
      district: req.body.district,
      detailedAddress: req.body.detailedAddress,
      birthplace: req.body.birthplace,
      idNumber: req.body.idNumber,
      jobId: req.body.jobId,
      supervisor: req.body.supervisor,
      startDate: req.body.startDate,
      experience: req.body.experience,
      photo: req.file ? req.file.filename : undefined
    });
    
    console.log("9. User đã lưu thành công với ID:", savedUser._id);
    console.log("User trong database:", {
      _id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email
    });
    
    req.flash("success", "Employee added successfully!");
    res.redirect("/admin/view-all-employees");
  } catch (err) {
    console.error("ERROR trong add-employee:", err);
    req.flash("error", "Error adding employee: " + err.message);
    res.redirect("/admin/add-employee");
  }
});

// Gets the id of the leave from the body of the post request.
// Sets the response field of that leave according to response given by employee from body of the post request.
router.post("/respond-application", async (req, res) => {
  try {
    const leave = await Leave.findById(req.body.leave_id);
    leave.adminResponse = req.body.status;
    await leave.save();
    res.redirect("/admin/leave-applications");
  } catch (err) {
    console.log(err);
  }
});

// Gets the id of the employee from the parameters.
// Gets the edited fields of the project from body of the post request.
// Saves the update field to the project of the employee  in Project Schema.
// Edits the project of the employee.
router.post("/edit-employee/:id", async (req, res) => {
  const { id } = req.params;
  const { email, designation, name, DOB, number, department, skills } =
    req.body;
  const newUser = {
    email,
    type:
      designation === "Accounts Manager"
        ? "accounts_manager"
        : designation === "Project Manager"
        ? "project_manager"
        : "employee",
    name,
    dateOfBirth: new Date(DOB),
    contactNumber: number,
    department,
    Skills: skills,
    designation,
  };

  try {
    const user = await User.findById(id);
    if (user.email !== email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render("Admin/editEmployee", {
          title: "Edit Employee",
          csrfToken: req.csrfToken(),
          employee: newUser,
          moment: moment,
          message: "Email is already in use",
          userName: req.user.name,
        });
      }
    }
    Object.assign(user, newUser);
    await user.save();
    res.redirect(`/admin/employee-profile/${id}`);
  } catch (err) {
    console.log(err);
    res.redirect("/admin/");
  }
});

router.post("/add-employee-project/:id", async (req, res) => {
  const { id } = req.params;
  const { title, type, start_date, end_date, description, status } = req.body;
  const newProject = new Project({
    employeeID: id,
    title,
    type,
    startDate: new Date(start_date),
    endDate: new Date(end_date),
    description,
    status,
  });

  try {
    await newProject.save();
    res.redirect(`/admin/employee-project-info/${newProject._id}`);
  } catch (err) {
    console.log(err);
  }
});

router.post("/edit-employee-project/:id", async (req, res) => {
  const { id } = req.params;
  const { title, type, start_date, end_date, description, status } = req.body;

  try {
    const project = await Project.findById(id);
    project.title = title;
    project.type = type;
    project.startDate = new Date(start_date);
    project.endDate = new Date(end_date);
    project.description = description;
    project.status = status;
    await project.save();
    res.redirect(`/admin/employee-project-info/${id}`);
  } catch (err) {
    console.log(err);
  }
});

router.post("/delete-employee/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await User.findByIdAndRemove(id);
    res.redirect("/admin/view-all-employees");
  } catch (err) {
    console.log("unable to delete employee");
  }
});

module.exports = router;
