var express = require("express");
var router = express.Router();
var User = require("../models/user");
var UserSalary = require("../models/user_salary");
var PaySlip = require("../models/payslip");
var Leave = require("../models/leave");
var Attendance = require("../models/attendance");
var moment = require("moment");
var Project = require("../models/project");
var PerformanceAppraisal = require("../models/performance_appraisal");

// Ensure user is logged in
router.use("/", isLoggedIn, function checkAuthentication(req, res, next) {
  next();
});

// Ensure user has manager role
router.use("/", function isManager(req, res, next) {
  if (req.user.type === "project_manager" || req.user.type === "accounts_manager") {
    next();
  } else {
    console.log("Unauthorized access attempt to manager route by:", req.user.type);
    req.flash("error", "You don't have permission to access this page");
    
    if (req.user.type === "admin") {
      res.redirect("/admin/");
    } else if (req.user.type === "employee") {
      res.redirect("/employee/");
    } else {
      res.redirect("/");
    }
  }
});

/**
 * Displays home to the manager
 */

router.get("/", function viewHomePage(req, res, next) {
  // Set date variables first to ensure they're always available
  const dateVars = {
    title: "Manager Dashboard",
    csrfToken: req.csrfToken(),
    userName: req.user.name,
    user: req.user,
    path: req.path,
    teamCount: 0,
    activeProjectsCount: 0,
    pendingLeavesCount: 0,
    todayAttendanceCount: 0,
    completedProjectsCount: 0,
    inProgressProjectsCount: 0,
    moment: moment
  };
  
  // Get team members count
  User.countDocuments({ type: "employee" }, function(err, teamCount) {
    if (!err) {
      dateVars.teamCount = teamCount || 0;
      console.log("Team count:", teamCount);
    }
    
    // Get active projects count - với nhiều loại status khác nhau và không phân biệt chữ hoa/chữ thường
    Project.countDocuments({ 
      status: { 
        $regex: /(on going|ongoing|in progress)/i 
      } 
    }, function(err, activeProjectsCount) {
      if (!err) {
        dateVars.activeProjectsCount = activeProjectsCount || 0;
        console.log("Active projects count:", activeProjectsCount);
      }
      
      // Get completed projects count - không phân biệt chữ hoa/chữ thường
      Project.countDocuments({ 
        status: { $regex: /completed/i } 
      }, function(err, completedProjectsCount) {
        if (!err) {
          dateVars.completedProjectsCount = completedProjectsCount || 0;
          console.log("Completed projects count:", completedProjectsCount);
        }
        
        // Get in-progress projects count - không phân biệt chữ hoa/chữ thường
        Project.countDocuments({ 
          status: { $regex: /(on going|ongoing|in progress)/i } 
        }, function(err, inProgressProjectsCount) {
          if (!err) {
            dateVars.inProgressProjectsCount = inProgressProjectsCount || 0;
            console.log("In progress projects count:", inProgressProjectsCount);
          }
          
          // Get pending leaves count - không phân biệt chữ hoa/chữ thường
          Leave.countDocuments({ 
            status: { $regex: /pending/i }
          }, function(err, pendingLeavesCount) {
            if (!err) {
              dateVars.pendingLeavesCount = pendingLeavesCount || 0;
              console.log("Pending leaves count:", pendingLeavesCount);
            }
            
            // Get today's attendance count
            var today = moment().startOf('day');
            var tomorrow = moment(today).add(1, 'days');
            
            Attendance.countDocuments({
              date: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
              }
            }, function(err, todayAttendanceCount) {
              if (!err) {
                dateVars.todayAttendanceCount = todayAttendanceCount || 0;
                console.log("Today's attendance count:", todayAttendanceCount);
              }
              
              // Hiển thị tổng quan về dữ liệu dashboard
              console.log("Final dashboard data:", JSON.stringify(dateVars, null, 2));
              res.render("Manager/managerHome", dateVars);
            });
          });
        });
      });
    });
  });
});

/**
 * Checks which type of manager is logged in.
 * Displays the list of employees to the manager respectively.
 * In case of accounts manager checks if user has entry in UserSalary Schema.
 * Then it enters the data in UserSalary Schema if user is not present.
 * Otherwise gets the data from UserSalary Schema and shows the salary of the employees to the accounts manager
 */

router.get("/view-employees", function viewEmployees(req, res) {
  var userChunks = [];
  if (req.user.type === "project_manager") {
    //find is asynchronous function
    User.find({ type: "employee" })
      .sort({ _id: -1 })
      .exec(function getUser(err, docs) {
        for (var i = 0; i < docs.length; i++) {
          userChunks.push(docs[i]);
        }
        res.render("Manager/viewemp_project", {
          title: "List Of Employees",
          csrfToken: req.csrfToken(),
          users: userChunks,
          errors: 0,
          userName: req.user.name,
          path: req.path
        });
      });
  } else if (req.user.type === "accounts_manager") {
    //find is asynchronous function
    var salaryChunks = [];

    User.find({ $or: [{ type: "employee" }, { type: "project_manager" }] })
      .sort({ _id: -1 })
      .exec(function getUser(err, docs) {
        if (err) {
          console.log(err);
        }
        for (var i = 0; i < docs.length; i++) {
          userChunks.push(docs[i]);
        }
      });

    setTimeout(getUserSalaries, 900);

    function getUserSalaries() {
      function callback(i) {
        if (i < userChunks.length) {
          UserSalary.find(
            { employeeID: userChunks[i]._id },
            function (err, salary) {
              console.log(i);

              if (err) {
                console.log(err);
              }
              if (salary.length > 0) {
                salaryChunks.push(salary[0]);
              } else {
                var newSalary = new UserSalary();
                newSalary.accountManagerID = req.user._id;
                newSalary.employeeID = userChunks[i]._id;
                newSalary.save(function (err) {
                  if (err) {
                    console.log(err);
                  }
                  salaryChunks.push(newSalary);
                });
              }

              callback(i + 1);
            }
          );
        }
      }

      callback(0);
    }

    setTimeout(render_view, 2000);
    function render_view() {
      res.render("Manager/viewemp_accountant", {
        title: "List Of Employees",
        csrfToken: req.csrfToken(),
        users: userChunks,
        salary: salaryChunks,
        userName: req.user.name,
        path: req.path
      });
    }
  }
});

/**
 * Displays All the skills of the employee to the project manager.
 */

router.get(
  "/all-employee-skills/:id",
  function viewAllEmployeeSkills(req, res, next) {
    var employeeId = req.params.id;
    User.findById(employeeId, function getUser(err, user) {
      if (err) {
        console.log(err);
      }
      res.render("Manager/employeeSkills", {
        title: "List Of Employee Skills",
        employee: user,
        moment: moment,
        csrfToken: req.csrfToken(),
        userName: req.user.name,
      });
    });
  }
);

/**
 * Displays all the projects of the employee to the project manager
 */

router.get(
  "/all-employee-projects/:id",
  function viewAllEmployeeProjects(req, res, next) {
    var employeeId = req.params.id;
    var projectChunks = [];

    //find is asynchronous function
    Project.find({ employeeID: employeeId })
      .sort({ _id: -1 })
      .exec(function getProject(err, docs) {
        var hasProject = 0;
        if (docs.length > 0) {
          hasProject = 1;
        }
        for (var i = 0; i < docs.length; i++) {
          projectChunks.push(docs[i]);
        }
        User.findById(employeeId, function getUser(err, user) {
          if (err) {
            console.log(err);
          }
          res.render("Manager/employeeAllProjects", {
            title: "List Of Employee Projects",
            hasProject: hasProject,
            projects: projectChunks,
            csrfToken: req.csrfToken(),
            user: user,
            userName: req.user.name,
          });
        });
      });
  }
);

/**
 * Description:
 * Displays employee project information to the project manager
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/employee-project-info/:id",
  function viewEmployeeProjectInfo(req, res, next) {
    var projectId = req.params.id;
    Project.findById(projectId, function getProject(err, project) {
      if (err) {
        console.log(err);
      }
      User.findById(project.employeeID, function getUser(err, user) {
        if (err) {
          console.log(err);
        }
        res.render("Manager/projectInfo", {
          title: "Employee Project Information",
          project: project,
          employee: user,
          moment: moment,
          csrfToken: req.csrfToken(),
          message: "",
          userName: req.user.name,
        });
      });
    });
  }
);

/**
 * Description:
 * Displays the performance appraisal form for the employee to the project manager.
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/provide-performance-appraisal/:id",
  function providePerformanceAppraisal(req, res, next) {
    var employeeId = req.params.id;
    var userChunks = [];
    PerformanceAppraisal.find(
      { employeeID: employeeId },
      function getPerformanceAppraisal(err, pa) {
        if (pa.length > 0) {
          User.find({ type: "employee" }, function getUser(err, docs) {
            for (var i = 0; i < docs.length; i++) {
              userChunks.push(docs[i]);
            }
            res.render("Manager/viewemp_project", {
              title: "List Of Employees",
              csrfToken: req.csrfToken(),
              users: userChunks,
              errors: 1,
              userName: req.user.name,
            });
          });
        } else {
          User.findById(employeeId, function getUser(err, user) {
            if (err) {
              console.log(err);
            }
            res.render("Manager/performance_appraisal", {
              title: "Provide Performance Appraisal",
              csrfToken: req.csrfToken(),
              employee: user,
              moment: moment,
              message: "",
              userName: req.user.name,
            });
          });
        }
      }
    );
  }
);

/**
 * Description:
 * Displays currently marked attendance to the manager.
 *
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/view-attendance-current",
  function viewCurrentMarkedAttendance(req, res, next) {
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
        
        // Hàm tính số giờ làm việc
        function calculateWorkHours(checkInTime, checkOutTime) {
          if (!checkInTime || !checkOutTime) return 0;
          
          // Chuyển đổi từ chuỗi giờ:phút:giây thành số giờ
          var checkIn = checkInTime.split(':');
          var checkOut = checkOutTime.split(':');
          
          if (checkIn.length < 2 || checkOut.length < 2) return 0;
          
          var checkInHours = parseInt(checkIn[0]);
          var checkInMinutes = parseInt(checkIn[1]);
          var checkOutHours = parseInt(checkOut[0]);
          var checkOutMinutes = parseInt(checkOut[1]);
          
          // Tính số giờ làm việc
          var hours = checkOutHours - checkInHours;
          var minutes = checkOutMinutes - checkInMinutes;
          
          if (minutes < 0) {
            hours--;
            minutes += 60;
          }
          
          return hours + (minutes / 60);
        }
        
        res.render("Manager/viewAttendance", {
          title: "Attendance Sheet",
          month: new Date().getMonth() + 1,
          csrfToken: req.csrfToken(),
          found: found,
          attendance: attendanceChunks,
          moment: moment,
          userName: req.user.name,
          calculateWorkHours: calculateWorkHours
        });
      });
  }
);
// Displays the list of all the leave applications applied by all employees.
// Displays the list of all the leave applications applied by all employees.
router.get("/leave-applications", async (req, res, next) => {
  try {
    const leaves = await Leave.find({}).sort({ _id: -1 });
    const hasLeave = leaves.length > 0 ? 1 : 0;

    const employeeChunks = await Promise.all(
      leaves.map((leave) => User.findById(leave.applicantID))
    );

    res.render("Manager/allApplications", {
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


router.get(
  "/respond-application/:leave_id/:employee_id",
  async (req, res, next) => {
    const { leave_id: leaveID, employee_id: employeeID } = req.params;
    try {
      const leave = await Leave.findById(leaveID);
      const user = await User.findById(employeeID);

      res.render("Manager/applicationResponse", {
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
// Sets the response field of that leave according to response given by employee from body of the post request.

router.post("/respond-application", async (req, res) => {
  try {
    const leave = await Leave.findById(req.body.leave_id);
    leave.adminResponse = req.body.status;
    await leave.save();
    res.redirect("/manager/leave-applications");
  } catch (err) {
    console.log(err);
  }
});

/**
 * Description:
 * Displays leave application form for the manager to apply for leave
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/apply-for-leave", async function applyForLeave(req, res, next) {
  try {
    const coworkers = await User.find({
      department: req.user.department,
      _id: { $ne: req.user._id },
    });
    console.log("Coworkers fetched:", coworkers);

    res.render("Manager/managerApplyForLeave", {
      title: "Apply for Leave",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      coworkers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading coworkers");
  }
});

/**
 * Description:
 * Manager gets the list of all his/her applied leaves.
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/applied-leaves", function appliedLeaves(req, res, next) {
  var leaveChunks = [];

  //find is asynchronous function
  Leave.find({ applicantID: req.user._id })
    .sort({ _id: -1 })
    .exec(function getLeave(err, docs) {
      var hasLeave = 0;
      if (docs.length > 0) {
        hasLeave = 1;
      }
      for (var i = 0; i < docs.length; i++) {
        leaveChunks.push(docs[i]);
      }

      res.render("Manager/managerAppliedLeaves", {
        title: "List Of Applied Leaves",
        csrfToken: req.csrfToken(),
        hasLeave: hasLeave,
        leaves: leaveChunks,
        userName: req.user.name,
      });
    });
});

/**
 * Description:
 * Displays logged in manager his/her profile.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/view-profile", function viewProfile(req, res, next) {
  User.findById(req.user._id, function getUser(err, user) {
    if (err) {
      console.log(err);
    }
    res.render("Manager/viewManagerProfile", {
      title: "Profile",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      userName: req.user.name,
      hasErrors: false
    });
  });
});

/**
 * Description:
 * Gets the id of the project to be shown form request parameters.
 * Displays the project to the project manager.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/view-project/:project_id", function viewProject(req, res, next) {
  var projectId = req.params.project_id;
  Project.findById(projectId, function getProject(err, project) {
    if (err) {
      console.log(err);
    }
    res.render("Manager/viewManagerProject", {
      title: "Project Details",
      project: project,
      csrfToken: req.csrfToken(),
      moment: moment,
      userName: req.user.name,
    });
  });
});

/**
 * Description:
 * Displays list of all the project managers project.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016 Salman Nizam
 *
 * Known Bugs: None
 */

router.get(
  "/view-all-personal-projects",
  function viewAllPersonalProjects(req, res, next) {
    var projectChunks = [];
    // Check if filter parameter exists
    var activeFilter = req.query.filter === 'active';
    
    // Create query object
    var query = { employeeID: req.user._id };
    
    // Add status filter if active filter is applied
    if (activeFilter) {
      query.status = { $regex: /^in\s*progress$/i }; // Case-insensitive regex for "In Progress" with possible spacing variations
    }
    
    // Check for sort parameter
    var sortOption = {};
    if (req.query.sort) {
      switch(req.query.sort) {
        case 'title':
          sortOption = { title: 1 }; // Sort by title A-Z
          break;
        case 'startDate':
          sortOption = { startDate: 1 }; // Sort by start date (oldest first)
          break;
        case 'endDate':
          sortOption = { endDate: 1 }; // Sort by end date (earliest first)
          break;
        case 'status':
          sortOption = { status: 1 }; // Sort by status A-Z
          break;
        default:
          sortOption = { _id: -1 }; // Default sort by most recent
      }
    } else {
      sortOption = { _id: -1 }; // Default sort by most recent
    }
    
    Project.find(query)
      .sort(sortOption)
      .exec(function getProject(err, docs) {
        var hasProject = 0;
        if (docs.length > 0) {
          hasProject = 1;
        }
        for (var i = 0; i < docs.length; i++) {
          projectChunks.push(docs[i]);
        }
        res.render("Manager/viewManagerPersonalProjects", {
          title: "List Of Projects",
          hasProject: hasProject,
          projects: projectChunks,
          csrfToken: req.csrfToken(),
          userName: req.user.name,
          activeFilter: activeFilter,
          sortBy: req.query.sort || null
        });
      });
  }
);

/**
 * Description:
 * Checks if pay slip has already been generated.
 * If yes then fills the field of the form with current attributes.
 * Then displays the pay slip form for the employee to the project manager.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/generate-pay-slip/:employee_id",
  function generatePaySlip(req, res, next) {
    var employeeId = req.params.employee_id;
    User.findById(employeeId, function getUser(err, user) {
      if (err) {
        console.log(err);
      }
      PaySlip.find({ employeeID: employeeId }, function getPaySlip(err, docs) {
        var pay_slip;
        var hasPaySlip = 0;
        if (docs.length > 0) {
          hasPaySlip = 1;
          pay_slip = docs[0];
        } else {
          var newPS = new PaySlip();
          newPS.accountManagerID = req.user._id;
          newPS.employeeID = employeeId;
          newPS.bankName = "abc";
          newPS.branchAddress = "abc";
          newPS.basicPay = 0;
          newPS.overtime = 0;
          newPS.conveyanceAllowance = 0;

          newPS.save(function savePaySlip(err) {
            if (err) {
              console.log(err);
            }
            pay_slip = newPS;
          });
        }

        setTimeout(render_view, 900);
        function render_view() {
          res.render("Manager/generatePaySlip", {
            title: "Generate Pay Slip",
            csrfToken: req.csrfToken(),
            employee: user,
            pay_slip: pay_slip,
            moment: moment,
            hasPaySlip: hasPaySlip,
            userName: req.user.name,
          });
        }
      });
    });
  }
);

/**
 * Description:
 * Reads the parameters from the body of the post request.
 * Then saves the applied leave to the leave schema.
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
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
    res.redirect("/manager/applied-leaves");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


/**
 * Description:
 * Sets the bonus of the selected employee in UserSalary Schema
 *
 
 *
 * Last Updated: 30th Novemebr, 2016
 *
 * Known Bugs: None
 */

router.post("/set-bonus", function setBonus(req, res) {
  UserSalary.findOne(
    { employeeID: req.body.employee_bonus },
    function getUser(err, us) {
      if (err) {
        console.log(err);
      }
      us.bonus = req.body.bonus;
      us.reason = req.body.reason;
      us.save(function saveUserSalary(err) {
        if (err) {
          console.log(err);
        }
        res.redirect("/manager/view-employees");
      });
    }
  );
});

/**
 * Description:
 * Sets the salary of the selected employee in UserSalary Schema
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/set-salary", function setSalary(req, res) {
  var employee_id = req.body.employee_salary;
  UserSalary.findOne({ employeeID: employee_id }, function (err, us) {
    if (err) {
      console.log(err);
    }
    console.log(us);
    us.salary = Number(req.body.salary);
    us.save(function setUserSalary(err) {
      if (err) {
        console.log(err);
      }
      res.redirect("/manager/view-employees");
    });
  });
});

/**
 * Description:
 * Sets the Incremented salary of the selected employee in UserSalary Schema
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/increment-salary", function incrementSalary(req, res) {
  UserSalary.findOne(
    { employeeID: req.body.employee_increment },
    function getUserSalary(err, us) {
      if (err) {
        console.log(err);
      }
      us.salary =
        Number(req.body.current_salary) + Number(req.body.amount_increment);
      us.save(function saveUserSalary(err) {
        if (err) {
          console.log(err);
        }
        res.redirect("/manager/view-employees");
      });
    }
  );
});

/**
 * Description:
 * Saves the performance appraisal of the employee against the employeeID in the PaySlip Schema.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post(
  "/provide-performance-appraisal",
  function providePerformanceAppraisal(req, res) {
    var employeeId = req.body.employee_id;
    var newPerformanceAppraisal = new PerformanceAppraisal();
    newPerformanceAppraisal.employeeID = employeeId;
    newPerformanceAppraisal.projectManagerID = req.user._id;
    newPerformanceAppraisal.rating = req.body.performance_rating;
    newPerformanceAppraisal.positionExpertise = req.body.expertise;
    newPerformanceAppraisal.approachTowardsQualityOfWork =
      req.body.approach_quality;
    newPerformanceAppraisal.approachTowardsQuantityOfWork =
      req.body.approach_quantity;
    newPerformanceAppraisal.leadershipManagementSkills = req.body.lead_manage;
    newPerformanceAppraisal.communicationSkills = req.body.skills_com;
    newPerformanceAppraisal.commentsOnOverallPerformance = req.body.comments;
    newPerformanceAppraisal.save(function savePerformanceAppraisal(err) {
      if (err) {
        console.log(err);
      }
      res.redirect("/manager/view-employees");
    });
  }
);

/**
 * Description:
 * Stores the Pay Slip of employee in PaySlip schema if  not already stored
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/generate-pay-slip", function generatePaySlip(req, res) {
  var employeeId = req.body.employee_id;
  PaySlip.find({ employeeID: employeeId }, function getPaySlip(err, docs) {
    if (err) {
      console.log(err);
    }
    docs[0].bankName = req.body.bname;
    docs[0].branchAddress = req.body.baddress;
    docs[0].basicPay = req.body.pay;
    docs[0].overtime = req.body.otime;
    docs[0].conveyanceAllowance = req.body.allowance;
    docs[0].save(function savePaySlip(err) {
      if (err) {
        console.log(err);
      }
      res.redirect("/manager/view-employees");
    });
  });
});

/**
 * Description:
 * Displays attendance to the manager for the given year and month.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/view-attendance", function viewAttendance(req, res, next) {
  var attendanceChunks = [];
  Attendance.find({
    employeeID: req.user._id,
    month: req.body.month,
    year: req.body.year,
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
      
      // Hàm tính số giờ làm việc
      function calculateWorkHours(checkInTime, checkOutTime) {
        if (!checkInTime || !checkOutTime) return 0;
        
        // Chuyển đổi từ chuỗi giờ:phút:giây thành số giờ
        var checkIn = checkInTime.split(':');
        var checkOut = checkOutTime.split(':');
        
        if (checkIn.length < 2 || checkOut.length < 2) return 0;
        
        var checkInHours = parseInt(checkIn[0]);
        var checkInMinutes = parseInt(checkIn[1]);
        var checkOutHours = parseInt(checkOut[0]);
        var checkOutMinutes = parseInt(checkOut[1]);
        
        // Tính số giờ làm việc
        var hours = checkOutHours - checkInHours;
        var minutes = checkOutMinutes - checkInMinutes;
        
        if (minutes < 0) {
          hours--;
          minutes += 60;
        }
        
        return hours + (minutes / 60);
      }
      
      res.render("Manager/viewAttendance", {
        title: "Attendance Sheet",
        month: req.body.month,
        csrfToken: req.csrfToken(),
        found: found,
        attendance: attendanceChunks,
        moment: moment,
        userName: req.user.name,
        calculateWorkHours: calculateWorkHours
      });
    });
});

/**
 * Description:
 * Marks the attendance of the manager in current date
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

// CSRF exemption middleware for mark attendance only
const skipCSRF = (req, res, next) => {
  // Đơn giản hóa middleware này
  req.csrfToken = function() { 
    return ''; 
  };
  next();
};

// Thêm route handler GET cho mark-manager-attendance
router.get("/mark-manager-attendance", function(req, res) {
  // Chuyển hướng đến route mark-attendance-direct
  res.redirect("/manager/mark-attendance-direct");
});

// Sửa lại route handler POST
router.post(
  "/mark-manager-attendance",
  function markAttendance(req, res, next) {
    console.log("Mark attendance POST route được gọi");
    
    Attendance.find(
      {
        employeeID: req.user._id,
        date: new Date().getDate(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
      function getAttendance(err, docs) {
        var found = 0;
        if (docs.length > 0) {
          found = 1;
        } else {
          var newAttendance = new Attendance();
          newAttendance.employeeID = req.user._id;
          newAttendance.year = new Date().getFullYear();
          newAttendance.month = new Date().getMonth() + 1;
          newAttendance.date = new Date().getDate();
          newAttendance.present = 1;
          
          // Thêm giờ check-in
          const now = new Date();
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const seconds = now.getSeconds().toString().padStart(2, '0');
          newAttendance.checkInTime = `${hours}:${minutes}:${seconds}`;
          
          // Kiểm tra xem có đi muộn không (sau 9:00 sáng)
          const isLate = (hours > 9) || (hours === 9 && minutes > 0);
          newAttendance.status = isLate ? 'late' : 'present';
          
          newAttendance.save(function saveAttendance(err) {
            if (err) {
              console.log(err);
            }
          });
        }
        res.redirect("/manager/view-attendance-current");
      }
    );
  }
);

// Check-out route for manager
router.post("/check-out", async (req, res) => {
  try {
    const currentDate = new Date();
    const date = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    // Format thời gian checkout
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');
    const checkOutTime = `${hours}:${minutes}:${seconds}`;
    
    console.log(`Manager checkout: Date=${date}/${month}/${year}, Time=${checkOutTime}`);
    
    // Tìm bản ghi attendance phù hợp
    const attendance = await Attendance.findOne({
      employeeID: req.user._id,
      date: date,
      month: month,
      year: year
    });
    
    if (!attendance) {
      req.flash("error", "Không tìm thấy bản ghi chấm công cho ngày hôm nay");
      return res.redirect("/manager");
    }
    
    // Cập nhật thời gian check-out
    attendance.checkOutTime = checkOutTime;
    await attendance.save();
    
    req.flash("success", "Đã ghi nhận thời gian check-out thành công");
    res.redirect("/manager");
  } catch (err) {
    console.error("Lỗi khi check-out:", err);
    req.flash("error", "Đã xảy ra lỗi khi check-out: " + err.message);
    res.redirect("/manager");
  }
});

/**
 * Description:
 * Hiển thị form chỉnh sửa dự án và quản lý thành viên dự án 
 */
router.get("/edit-project/:project_id", function editProject(req, res, next) {
  var projectId = req.params.project_id;
  
  console.log("Đang truy cập edit-project với ID:", projectId);
  
  // Kiểm tra project_id có hợp lệ không
  if (!projectId || projectId.length !== 24) {
    console.log("ID không hợp lệ:", projectId);
    req.flash("error", "Invalid project ID");
    return res.redirect("/manager/view-all-personal-projects");
  }
  
  Project.findById(projectId, function getProject(err, project) {
    if (err) {
      console.error("Lỗi khi tìm project:", err);
      req.flash("error", "Error finding project");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    if (!project) {
      console.log("Không tìm thấy project với ID:", projectId);
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    console.log("Đã tìm thấy project:", project.title);
    
    // Lấy danh sách thành viên hiện tại của dự án
    User.find({ _id: { $in: project.teamMembers || [] } }, function(err, projectTeam) {
      if (err) {
        console.log(err);
        projectTeam = [];
      }
      
      console.log("Số lượng team members:", projectTeam ? projectTeam.length : 0);
      
      // Lấy danh sách nhân viên có thể thêm vào dự án
      User.find({ 
        type: "employee",
        _id: { $nin: project.teamMembers || [] }
      }, function(err, availableEmployees) {
        if (err) {
          console.log(err);
          availableEmployees = [];
        }
        
        console.log("Số lượng nhân viên có thể thêm:", availableEmployees ? availableEmployees.length : 0);
        
        res.render("Manager/editProject", {
          title: "Edit Project",
          project: project,
          projectTeam: projectTeam,
          availableEmployees: availableEmployees,
          moment: moment,
          csrfToken: req.csrfToken(),
          userName: req.user.name,
          path: '/manager/view-all-personal-projects'
        });
      });
    });
  });
});

/**
 * Description:
 * Cập nhật thông tin dự án
 */
router.post("/update-project/:project_id", skipCSRF, function updateProject(req, res, next) {
  var projectId = req.params.project_id;
  
  Project.findById(projectId, function getProject(err, project) {
    if (err || !project) {
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    // Cập nhật thông tin dự án
    project.title = req.body.title;
    project.type = req.body.type;
    project.status = req.body.status;
    project.startDate = req.body.startDate;
    project.endDate = req.body.endDate;
    project.description = req.body.description;
    
    project.save(function(err) {
      if (err) {
        console.log(err);
        req.flash("error", "Error updating project");
      } else {
        req.flash("success", "Project updated successfully");
      }
      res.redirect("/manager/edit-project/" + projectId);
    });
  });
});

/**
 * Description:
 * Thêm thành viên vào dự án
 */
router.post("/add-project-member/:project_id", skipCSRF, function addProjectMember(req, res, next) {
  var projectId = req.params.project_id;
  var employeeIds = req.body.employeeId;
  var role = req.body.role;
  
  // Chuyển đổi thành mảng nếu chỉ có một giá trị
  if (!Array.isArray(employeeIds) && employeeIds) {
    employeeIds = [employeeIds];
  }
  
  if (!employeeIds || employeeIds.length === 0) {
    req.flash("error", "No employee selected");
    return res.redirect("/manager/edit-project/" + projectId);
  }
  
  Project.findById(projectId, function(err, project) {
    if (err || !project) {
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    // Khởi tạo mảng teamMembers nếu chưa có
    if (!project.teamMembers) {
      project.teamMembers = [];
    }
    
    var addedCount = 0;
    var alreadyInProjectCount = 0;
    
    // Thêm từng nhân viên vào dự án
    employeeIds.forEach(function(employeeId) {
      // Kiểm tra xem thành viên đã có trong dự án chưa
      if (project.teamMembers.indexOf(employeeId) === -1) {
        // Thêm thành viên vào dự án
        project.teamMembers.push(employeeId);
        addedCount++;
      } else {
        alreadyInProjectCount++;
      }
    });
    
    // Tùy chọn: có thể lưu vai trò của thành viên nếu cần
    // project.teamRoles = project.teamRoles || {};
    // employeeIds.forEach(function(employeeId) {
    //   project.teamRoles[employeeId] = role;
    // });
    
    project.save(function(err) {
      if (err) {
        console.log(err);
        req.flash("error", "Error adding team member(s)");
      } else {
        if (addedCount > 0) {
          req.flash("success", addedCount + " team member(s) added successfully");
        }
        if (alreadyInProjectCount > 0) {
          req.flash("info", alreadyInProjectCount + " employee(s) were already in the project");
        }
      }
      res.redirect("/manager/edit-project/" + projectId);
    });
  });
});

/**
 * Description:
 * Xóa thành viên khỏi dự án
 */
router.post("/remove-project-member/:project_id/:member_id", skipCSRF, function removeProjectMember(req, res, next) {
  var projectId = req.params.project_id;
  var memberId = req.params.member_id;
  
  Project.findById(projectId, function(err, project) {
    if (err || !project) {
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    // Xóa thành viên khỏi mảng teamMembers
    if (project.teamMembers && project.teamMembers.length > 0) {
      project.teamMembers = project.teamMembers.filter(id => id.toString() !== memberId);
    }
    
    // Xóa vai trò của thành viên nếu có
    // if (project.teamRoles && project.teamRoles[memberId]) {
    //   delete project.teamRoles[memberId];
    // }
    
    project.save(function(err) {
      if (err) {
        console.log(err);
        req.flash("error", "Error removing team member");
      } else {
        req.flash("success", "Team member removed successfully");
      }
      res.redirect("/manager/edit-project/" + projectId);
    });
  });
});

/**
 * Description:
 * Hiển thị danh sách thành viên dự án
 */
router.get("/view-project-team/:project_id", function viewProjectTeam(req, res, next) {
  var projectId = req.params.project_id;
  
  console.log("Đang truy cập view-project-team với ID:", projectId);
  
  // Kiểm tra project_id có hợp lệ không
  if (!projectId || projectId.length !== 24) {
    console.log("ID không hợp lệ:", projectId);
    req.flash("error", "Invalid project ID");
    return res.redirect("/manager/view-all-personal-projects");
  }
  
  Project.findById(projectId, function getProject(err, project) {
    if (err) {
      console.error("Lỗi khi tìm project:", err);
      req.flash("error", "Error finding project");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    if (!project) {
      console.log("Không tìm thấy project với ID:", projectId);
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    // Lấy danh sách thành viên dự án
    User.find({ _id: { $in: project.teamMembers || [] } }, function(err, projectTeam) {
      if (err) {
        console.log(err);
        projectTeam = [];
      }
      
      // Chuyển hướng đến trang edit project vì đã có chức năng xem team ở đó
      res.redirect("/manager/edit-project/" + projectId);
    });
  });
});

/**
 * Description:
 * Hiển thị form tạo dự án mới
 */
router.get("/add-project", function(req, res, next) {
  // Lấy danh sách nhân viên có thể thêm vào dự án
  User.find({ type: "employee" }, function(err, employees) {
    if (err) {
      console.log(err);
      employees = [];
    }
    
    res.render("Manager/addProject", {
      title: "Add New Project",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      employees: employees,
      moment: moment,
      path: '/manager/view-all-personal-projects'
    });
  });
});

/**
 * Description:
 * Xử lý tạo dự án mới
 */
router.post("/add-project", skipCSRF, function(req, res, next) {
  var newProject = new Project();
  
  newProject.employeeID = req.user._id; // Người tạo dự án
  newProject.title = req.body.title;
  newProject.type = req.body.type;
  newProject.status = req.body.status;
  newProject.startDate = req.body.startDate;
  newProject.endDate = req.body.endDate;
  newProject.description = req.body.description;
  
  // Khởi tạo mảng thành viên nếu có
  if (req.body.teamMembers && Array.isArray(req.body.teamMembers)) {
    newProject.teamMembers = req.body.teamMembers;
  } else if (req.body.teamMembers) {
    newProject.teamMembers = [req.body.teamMembers];
  } else {
    newProject.teamMembers = [];
  }
  
  newProject.save(function(err) {
    if (err) {
      console.log(err);
      req.flash("error", "Error creating project");
      return res.redirect("/manager/add-project");
    }
    
    req.flash("success", "Project created successfully");
    res.redirect("/manager/view-all-personal-projects");
  });
});

/**
 * Alternate route for marking attendance without CSRF (temporary solution)
 * Accessible via direct GET request
 */
router.get("/mark-attendance-direct", function directMarkAttendance(req, res, next) {
  console.log("Mark attendance direct route được gọi");
  
  Attendance.find(
    {
      employeeID: req.user._id,
      date: new Date().getDate(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
    function getAttendance(err, docs) {
      var found = 0;
      if (docs.length > 0) {
        found = 1;
        console.log("Đã điểm danh hôm nay rồi");
      } else {
        var newAttendance = new Attendance();
        newAttendance.employeeID = req.user._id;
        newAttendance.year = new Date().getFullYear();
        newAttendance.month = new Date().getMonth() + 1;
        newAttendance.date = new Date().getDate();
        newAttendance.present = 1;
        
        // Thêm giờ check-in
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        newAttendance.checkInTime = `${hours}:${minutes}:${seconds}`;
        
        // Kiểm tra xem có đi muộn không (sau 9:00 sáng)
        const isLate = (hours > 9) || (hours === 9 && minutes > 0);
        newAttendance.status = isLate ? 'late' : 'present';
        
        console.log("Tạo điểm danh mới với check-in time:", newAttendance.checkInTime, "Status:", newAttendance.status);
        
        newAttendance.save(function saveAttendance(err) {
          if (err) {
            console.log("Lỗi khi lưu điểm danh:", err);
          } else {
            console.log("Đã lưu điểm danh thành công");
          }
        });
      }
      res.redirect("/manager/view-attendance-current");
    }
  );
});

module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}
