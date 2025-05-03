var express = require("express");
var router = express.Router();
var Leave = require("../models/leave");
var Attendance = require("../models/attendance");
var Project = require("../models/project");
var moment = require("moment");
var User = require("../models/user");
var moment = require("moment");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const csrfProtection = require("csurf")();
const mongoose = require('mongoose');
router.use("/", isLoggedIn, function checkAuthentication(req, res, next) {
  next();
});

/**
 * Redirects to the dashboard page.
 */
router.get("/", function viewHome(req, res, next) {
  res.redirect("/employee/dashboard");
});

/**
 * Displays dashboard to the employee.
 */
router.get("/dashboard", function viewDashboard(req, res, next) {
  // Get the count of pending leaves
  Leave.countDocuments({ applicantID: req.user._id, status: "Pending" }, function(err, pendingLeaves) {
    if (err) {
      console.log(err);
      pendingLeaves = 0;
    }
    
    // Get the count of projects
    Project.countDocuments({ employeeID: req.user._id }, function(err, projectCount) {
      if (err) {
        console.log(err);
        projectCount = 0;
      }
      
      // Check if attendance is marked for today
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      Attendance.findOne({
        employeeID: req.user._id,
        date: day,
        month: month,
        year: year
      }, function(err, attendance) {
        let isPresent = attendance ? true : false;
        let attendanceStatus = null;
        
        if (attendance && attendance.status) {
          attendanceStatus = attendance.status;
        } else {
          attendanceStatus = 'absent';
        }
        
        // Get count of days present in current month
        Attendance.countDocuments({
          employeeID: req.user._id,
          month: month,
          year: year
        }, function(err, monthlyAttendance) {
          if (err) {
            console.log(err);
            monthlyAttendance = 0;
          }
          
          console.log("Attendance Status:", attendanceStatus);
          
          res.render("Employee/employeeDashboard", {
            title: "Dashboard",
            userName: req.user.name,
            csrfToken: req.csrfToken(),
            pendingLeaves: pendingLeaves,
            projectCount: projectCount,
            isPresent: isPresent,
            attendanceStatus: attendanceStatus,
            monthlyAttendance: monthlyAttendance,
            moment: moment,
            path: req.path
          });
        });
      });
    });
  });
});

/**
 * Displays the old home page to the employee.
 */
router.get("/home", function viewHome(req, res, next) {
  res.render("Employee/employeeHome", {
    title: "Home",
    userName: req.user.name,
    csrfToken: req.csrfToken(),
    path: req.path
  });
});

/**
 * Displays leave application form to the user.
 */

router.get("/apply-for-leave", async function applyForLeave(req, res, next) {
  try {
    const coworkers = await User.find({
      department: req.user.department,
      _id: { $ne: req.user._id },
    });
    console.log("Coworkers fetched:", coworkers);

    res.render("Employee/applyForLeave", {
      title: "Apply for Leave",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      coworkers,
      path: '/employee/apply-for-leave'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading coworkers");
  }
});

/**
 * Displays the list of all applied laves of the user.
 */

router.get("/applied-leaves", function viewAppliedLeaves(req, res, next) {
  var leaveChunks = [];

  //find is asynchronous function
  Leave.find({ applicantID: req.user._id })
    .sort({ _id: -1 })
    .exec(function getLeaves(err, docs) {
      var hasLeave = 0;
      if (docs.length > 0) {
        hasLeave = 1;
      }
      for (var i = 0; i < docs.length; i++) {
        leaveChunks.push(docs[i]);
      }

      res.render("Employee/appliedLeaves", {
        title: "List Of Applied Leaves",
        csrfToken: req.csrfToken(),
        hasLeave: hasLeave,
        leaves: leaveChunks,
        userName: req.user.name,
        path: req.path
      });
    });
});

/**
 * Displays the attendance to the user.
 */

router.post(
  "/view-attendance",
  function viewAttendanceSheet(req, res, next) {
    var monthName = "";
    switch (parseInt(req.body.month)) {
      case 1:
        monthName = "January";
        break;
      case 2:
        monthName = "February";
        break;
      case 3:
        monthName = "March";
        break;
      case 4:
        monthName = "April";
        break;
      case 5:
        monthName = "May";
        break;
      case 6:
        monthName = "June";
        break;
      case 7:
        monthName = "July";
        break;
      case 8:
        monthName = "August";
        break;
      case 9:
        monthName = "September";
        break;
      case 10:
        monthName = "October";
        break;
      case 11:
        monthName = "November";
        break;
      case 12:
        monthName = "December";
        break;
    }
    Attendance.find(
      {
        employeeID: req.user._id,
        month: req.body.month,
        year: req.body.year,
      },
      null,
      { sort: { date: 1 } }
    )
      .exec(function getAttendance(err, docs) {
        if (err) {
          console.log(err);
          return next(err);
        }
        var found = 0;
        if (docs.length > 0) {
          found = 1;
        }

        // Calculate attendance statistics
        const workingDaysInMonth = calculateWorkingDaysInMonth(req.body.month, req.body.year);
        const presentDays = docs.length;
        const attendanceRate = Math.round((presentDays / workingDaysInMonth) * 100);

        // Calculate total work hours and overtime
        let totalWorkHours = 0;
        let overtimeHours = 0;
        let onTimeDays = 0;
        let lateDays = 0;

        // Regular work hours (e.g., 8 hours per day)
        const standardWorkHours = 8; 

        docs.forEach(record => {
          if (record.checkInTime && record.checkOutTime) {
            const workHours = calculateWorkHours(record.checkInTime, record.checkOutTime);
            totalWorkHours += workHours;
            
            // Calculate overtime (any hours beyond standard work hours)
            if (workHours > standardWorkHours) {
              overtimeHours += (workHours - standardWorkHours);
            }
          }

          // Count on-time and late days
          if (record.status === 'late') {
            lateDays++;
          } else {
            onTimeDays++;
          }
        });

        res.render("Employee/viewAttendance", {
          title: "My Attendance",
          month: req.body.month,
          monthName: monthName,
          selectedYear: req.body.year,
          currentDate: moment().format('MMMM Do YYYY'),
          csrfToken: req.csrfToken(),
          found: found,
          attendance: docs,
          moment: moment,
          userName: req.user.name,
          attendanceRate: attendanceRate,
          presentDays: presentDays,
          workingDaysInMonth: workingDaysInMonth,
          totalWorkHours: totalWorkHours,
          overtimeHours: overtimeHours,
          onTimeDays: onTimeDays,
          lateDays: lateDays,
          calculateWorkHours: calculateWorkHours
        });
      });
  }
);

// Function to calculate working days in a month (excluding weekends)
function calculateWorkingDaysInMonth(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

// Function to calculate work hours from time strings
function calculateWorkHours(checkInTime, checkOutTime) {
  if (!checkInTime || !checkOutTime) return 0;
  
  const [inHours, inMinutes, inSeconds] = checkInTime.split(':').map(Number);
  const [outHours, outMinutes, outSeconds] = checkOutTime.split(':').map(Number);
  
  const checkInDate = new Date();
  checkInDate.setHours(inHours, inMinutes, inSeconds);
  
  const checkOutDate = new Date();
  checkOutDate.setHours(outHours, outMinutes, outSeconds);
  
  // If checkout is earlier than checkin (next day), add 24 hours
  if (checkOutDate < checkInDate) {
    checkOutDate.setDate(checkOutDate.getDate() + 1);
  }
  
  // Calculate the difference in milliseconds
  const diffMs = checkOutDate - checkInDate;
  
  // Convert to hours (milliseconds to hours)
  const hours = diffMs / (1000 * 60 * 60);
  
  return hours;
}

/**
 * Display currently marked attendance to the user.
 */

router.get(
  "/view-attendance-current",
  function viewCurrentlyMarkedAttendance(req, res, next) {
    var monthName = "";
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    switch (currentMonth) {
      case 1: monthName = "January"; break;
      case 2: monthName = "February"; break;
      case 3: monthName = "March"; break;
      case 4: monthName = "April"; break;
      case 5: monthName = "May"; break;
      case 6: monthName = "June"; break;
      case 7: monthName = "July"; break;
      case 8: monthName = "August"; break;
      case 9: monthName = "September"; break;
      case 10: monthName = "October"; break;
      case 11: monthName = "November"; break;
      case 12: monthName = "December"; break;
    }
    
    console.log("Fetching attendance for month:", currentMonth, "year:", currentYear);
    
    Attendance.find(
      {
        employeeID: req.user._id,
        month: currentMonth,
        year: currentYear,
      },
      null,
      { sort: { date: 1 } }
    )
      .exec(function getAttendanceSheet(err, docs) {
        if (err) {
          console.error("Error fetching attendance:", err);
          return next(err);
        }
        
        console.log("Found attendance records:", docs.length);
        if (docs.length > 0) {
          console.log("Sample record:", JSON.stringify(docs[0]));
          docs.forEach((record, index) => {
            console.log(`Record ${index+1}: checkInTime = ${record.checkInTime}`);
          });
        }
        
        var found = 0;
        if (docs.length > 0) {
          found = 1;
        }
        
        // Calculate attendance statistics
        const workingDaysInMonth = calculateWorkingDaysInMonth(currentMonth, currentYear);
        const presentDays = docs.length;
        const attendanceRate = Math.round((presentDays / workingDaysInMonth) * 100);

        // Calculate total work hours and overtime
        let totalWorkHours = 0;
        let overtimeHours = 0;
        let onTimeDays = 0;
        let lateDays = 0;

        // Regular work hours (e.g., 8 hours per day)
        const standardWorkHours = 8; 

        docs.forEach(record => {
          if (record.checkInTime && record.checkOutTime) {
            const workHours = calculateWorkHours(record.checkInTime, record.checkOutTime);
            totalWorkHours += workHours;
            
            // Calculate overtime (any hours beyond standard work hours)
            if (workHours > standardWorkHours) {
              overtimeHours += (workHours - standardWorkHours);
            }
          }

          // Count on-time and late days
          if (record.status === 'late') {
            lateDays++;
          } else {
            onTimeDays++;
          }
        });

        res.render("Employee/viewAttendance", {
          title: "My Attendance",
          month: req.body.month,
          monthName: monthName,
          selectedYear: currentYear,
          currentDate: moment().format('MMMM Do YYYY'),
          csrfToken: req.csrfToken(),
          found: found,
          attendance: docs,
          moment: moment,
          userName: req.user.name,
          attendanceRate: attendanceRate,
          presentDays: presentDays,
          workingDaysInMonth: workingDaysInMonth,
          totalWorkHours: totalWorkHours,
          overtimeHours: overtimeHours,
          onTimeDays: onTimeDays,
          lateDays: lateDays,
          calculateWorkHours: calculateWorkHours
        });
      });
  }
);

/**
 * Displays employee his/her profile.
 */

router.get("/view-profile",  function viewProfile(req, res, next) {
  User.findById(req.user._id, function getUser(err, user) {
    if (err) {
      console.log(err);
    }
    res.render("Employee/viewProfile", {
      title: "Profile",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      userName: req.user.name,
      path: req.path,
      hasErrors: false
    });
  });
});

/**
 * Displays the list of all the projects to the Project Schema.
 */

router.get("/view-personal-projects", function viewPersonalProjects(req, res, next) {
  var projectChunks = [];
  
  // Populate nối các document từ các collection khác nhau
  Project.find({ employeeID: req.user._id })
    .sort({ _id: -1 })
    .populate('teamMembers', 'name') // Lấy thông tin teamMembers từ User collection
    .exec(function getProjects(err, docs) {
      var hasProject = 0;
      if (docs.length > 0) {
        hasProject = 1;
      }
      
      for (var i = 0; i < docs.length; i++) {
        // Tìm project manager từ teamRoles
        let projectManager = "Not Assigned";
        if (docs[i].teamRoles && docs[i].teamMembers) {
          docs[i].teamMembers.forEach(member => {
            if (docs[i].teamRoles.get(member._id.toString()) === "Project Manager") {
              projectManager = member.name;
            }
          });
        }
        
        // Thêm thông tin Project Manager vào dự án
        const project = docs[i].toObject();
        project.projectManager = projectManager;
        projectChunks.push(project);
      }
      
      res.render("Employee/viewPersonalProjects", {
        title: "View Project",
        hasProject: hasProject,
        projects: projectChunks,
        csrfToken: req.csrfToken(),
        userName: req.user.name,
        path: req.path,
        moment: moment
      });
    });
});

/**
 * Displays the employee his/her project infomation by
 * getting project id from the request parameters.
 */

router.get("/view-project/:project_id", function viewProject(req, res, next) {
  var projectId = req.params.project_id;
  Project.findById(projectId, function getProject(err, project) {
    if (err) {
      console.log(err);
    }
    res.render("Employee/viewProject", {
      title: "Project Details",
      project: project,
      csrfToken: req.csrfToken(),
      moment: moment,
      userName: req.user.name,
      path: req.path
    });
  });
});

/**
 * Saves the applied leave application form in Leave Schema.
 */

router.post("/apply-for-leave", async function (req, res, next) {
  try {
    const startDate = new Date(req.body.start_date);
    let endDate = new Date(req.body.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime())) {
      return res.status(400).send("Ngày bắt đầu không hợp lệ");
    }

    // Kiểm tra nghỉ nửa ngày
    const isHalfDay = req.body.leaveType && req.body.leaveType.startsWith('half');
    
    // Xử lý endDate cho nghỉ nửa ngày
    if (isHalfDay) {
      endDate = new Date(startDate); // Đảm bảo endDate = startDate
    } else if (isNaN(endDate.getTime())) {
      return res.status(400).send("Ngày kết thúc không hợp lệ");
    }

    // Validation rules
    if (startDate < today) {
      return res.status(400).send("Ngày bắt đầu phải từ hôm nay trở đi");
    }
    
    if (!isHalfDay && endDate < startDate) {
      return res.status(400).send("Ngày kết thúc phải sau ngày bắt đầu");
    }

    // Tính số ngày nghỉ
    const diffDays = Math.floor((startDate - today) / (1000 * 60 * 60 * 24)); // Tính số ngày còn lại từ hôm nay đến ngày bắt đầu
    let period = 0;
    if (isHalfDay) {
      period = 0.5; // Nửa ngày
    } else {
      const timeDiff = endDate - startDate;
      const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
      period = (dayDiff + 1);  
    }
    if (period === 1 && diffDays < 2) {
      return res.status(400).send("Đơn nghỉ 1 ngày phải gửi trước ít nhất 2 ngày.");
    }

    if (period > 1 && diffDays < 7) {
      return res.status(400).send("Đơn nghỉ nhiều ngày phải gửi trước ít nhất 7 ngày.");
    }
    const newLeave = new Leave({
      applicantID: req.user._id,
      title: req.body.title,
      type: req.body.type,
      leaveType: req.body.leaveType,
      startDate: startDate,
      endDate: endDate,
      appliedDate: new Date(),
      period: period,
      reason: req.body.reason,
      adminResponse: "Pending",
      delegateTo: req.body.delegateTo,
      delegateContent: req.body.delegateContent,
    });

    await newLeave.save();
    res.redirect("/employee/applied-leaves");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

/**
 * Marks the attendance of the employee in Attendance Schema
 */

router.post(
  "/mark-employee-attendance",
  async function markEmployeeAttendance(req, res, next) {
    try {
      // Check if attendance is already marked today
      const currentDate = new Date();
      const day = currentDate.getDate();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const existingAttendance = await Attendance.findOne({
        employeeID: req.user._id,
        date: day,
        month: month,
        year: year
      });
      
      if (existingAttendance) {
        console.log("Attendance already marked today for user:", req.user._id);
        console.log("Existing attendance:", existingAttendance);
        return res.redirect("/employee/view-attendance-current");
      }
      
      // Get current time for check-in
      const hours = currentDate.getHours().toString().padStart(2, '0');
      const minutes = currentDate.getMinutes().toString().padStart(2, '0');
      const seconds = currentDate.getSeconds().toString().padStart(2, '0');
      const checkInTime = `${hours}:${minutes}:${seconds}`;
      
      // Check if the employee is late (e.g., after 9:00 AM)
      const isLate = (hours > 9) || (hours === 9 && minutes > 0);
      
      console.log("Marking new attendance for user:", req.user._id);
      console.log("Check-in time:", checkInTime);
      
      // Create and save new attendance record
      const newAttendance = new Attendance({
        employeeID: req.user._id,
        year: year,
        month: month,
        date: day,
        present: true,
        checkInTime: checkInTime,
        status: isLate ? 'late' : 'present'
      });
      
      console.log("Created attendance record:", newAttendance);
      
      const savedAttendance = await newAttendance.save();
      console.log("Attendance saved successfully:", savedAttendance);
      console.log("Check-in time in saved attendance:", savedAttendance.checkInTime);
      
      res.redirect("/employee/view-attendance-current");
    } catch (err) {
      console.error("Error marking attendance:", err);
      res.status(500).send("Error marking attendance: " + err.message);
    }
  }
);

// Check-out route to mark the time when an employee leaves for the day
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
      res.redirect("/employee/view-attendance-current");
    } else {
      // No check-in record found for today
      res.status(400).send("No check-in record found for today. Please check-in first.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error recording check-out time");
  }
});
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
// Route for updating employee profile
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
    res.redirect('/employee/view-profile');
  } catch (err) {
    console.error("Error updating profile:", err);
    req.flash('error', 'Error updating profile: ' + err.message);
    res.redirect('/employee/view-profile');
  }
});

module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}
