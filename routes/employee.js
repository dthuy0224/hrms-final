var express = require("express");
var router = express.Router();
var Leave = require("../models/leave");
var Attendance = require("../models/attendance");
var Project = require("../models/project");
var moment = require("moment");
var User = require("../models/user");
var moment = require("moment");

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
        day: day,
        month: month,
        year: year
      }, function(err, attendance) {
        let isPresent = attendance ? true : false;
        
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
          
          res.render("Employee/employeeDashboard", {
            title: "Dashboard",
            userName: req.user.name,
            csrfToken: req.csrfToken(),
            pendingLeaves: pendingLeaves,
            projectCount: projectCount,
            isPresent: isPresent,
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

router.get("/apply-for-leave", function applyForLeave(req, res, next) {
  res.render("Employee/applyForLeave", {
    title: "Apply for Leave",
    csrfToken: req.csrfToken(),
    userName: req.user.name,
    path: req.path
  });
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

router.post("/view-attendance", function viewAttendanceSheet(req, res, next) {
  var attendanceChunks = [];
  Attendance.find({
    employeeID: req.user._id,
    month: req.body.month,
    year: req.body.year,
  })
    .sort({ _id: -1 })
    .exec(function getAttendance(err, docs) {
      var found = 0;
      if (docs.length > 0) {
        found = 1;
      }
      for (var i = 0; i < docs.length; i++) {
        attendanceChunks.push(docs[i]);
      }
      res.render("Employee/viewAttendance", {
        title: "Attendance Sheet",
        month: req.body.month,
        csrfToken: req.csrfToken(),
        found: found,
        attendance: attendanceChunks,
        moment: moment,
        userName: req.user.name,
        path: "/employee/view-attendance"
      });
    });
});

/**
 * Display currently marked attendance to the user.
 */

router.get(
  "/view-attendance-current",
  function viewCurrentlyMarkedAttendance(req, res, next) {
    var attendanceChunks = [];

    Attendance.find({
      employeeID: req.user._id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    })
      .sort({ _id: -1 })
      .exec(function getAttendanceSheet(err, docs) {
        var found = 0;
        if (docs.length > 0) {
          found = 1;
        }
        for (var i = 0; i < docs.length; i++) {
          attendanceChunks.push(docs[i]);
        }
        res.render("Employee/viewAttendance", {
          title: "Attendance Sheet",
          month: new Date().getMonth() + 1,
          csrfToken: req.csrfToken(),
          found: found,
          attendance: attendanceChunks,
          moment: moment,
          userName: req.user.name,
          path: req.path
        });
      });
  }
);

/**
 * Displays employee his/her profile.
 */

router.get("/view-profile", function viewProfile(req, res, next) {
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
      path: req.path
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

router.post("/apply-for-leave", function applyForLeave(req, res, next) {
  var newLeave = new Leave();
  newLeave.applicantID = req.user._id;
  newLeave.title = req.body.title;
  newLeave.type = req.body.type;
  newLeave.startDate = new Date(req.body.start_date);
  newLeave.endDate = new Date(req.body.end_date);
  newLeave.period = req.body.period;
  newLeave.reason = req.body.reason;
  newLeave.appliedDate = new Date();
  newLeave.adminResponse = "Pending";
  newLeave.save(function saveLeave(err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/employee/applied-leaves");
  });
});

/**
 * Marks the attendance of the employee in Attendance Schema
 */

router.post(
  "/mark-employee-attendance",
  function markEmployeeAttendance(req, res, next) {
    Attendance.find(
      {
        employeeID: req.user._id,
        month: new Date().getMonth() + 1,
        date: new Date().getDate(),
        year: new Date().getFullYear(),
      },
      function getAttendanceSheet(err, docs) {
        var found = 0;
        if (docs.length > 0) {
          found = 1;
        } else {
          // Get current time for check-in
          const currentDate = new Date();
          const hours = currentDate.getHours().toString().padStart(2, '0');
          const minutes = currentDate.getMinutes().toString().padStart(2, '0');
          const seconds = currentDate.getSeconds().toString().padStart(2, '0');
          const checkInTime = `${hours}:${minutes}:${seconds}`;
          
          var newAttendance = new Attendance();
          newAttendance.employeeID = req.user._id;
          newAttendance.year = new Date().getFullYear();
          newAttendance.month = new Date().getMonth() + 1;
          newAttendance.date = new Date().getDate();
          newAttendance.present = 1;
          newAttendance.checkInTime = checkInTime;
          newAttendance.save(function saveAttendance(err) {
            if (err) {
              console.log(err);
            }
          });
        }
        res.redirect("/employee/view-attendance-current");
      }
    );
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
      req.session.checkedOut = true; // Mark that the user has checked out
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

module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}
