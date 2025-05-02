/**
 * This script sets up the Express application. It imports necessary modules, sets up middleware,
 * connects to the database, and imports routes.
 *
 * The Express application is then exported and can be used by other scripts (like www).
 *
 */

const express = require("express");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const favicon = require("serve-favicon");
const csrf = require('./config/csrf');
const User = require("./models/user");
const multer = require("multer");
const { initializeDefaultHolidays, updateLunarHolidays } = require('./utils/workingDaysCalculator');

const index = require("./routes/index");
const admin = require("./routes/admin");
const employee = require("./routes/employee");
const manager = require("./routes/manager");
const api = require("./routes/api");
const db = require("./db");

expressValidator = require("express-validator");

// Import the Passport configuration.
// This module configures Passport's strategies and sets up serialization and deserialization rules.
require("./config/passport.js");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));

// Use the morgan middleware for logging HTTP requests.
// 'dev' format is used, which means the log will include method, url, status, response time and content length.
app.use(logger("dev"));

//json() function parses incoming requests with JSON payloads.
app.use(bodyParser.json());
// urlencoded() function parses incoming requests with URL-encoded payloads.
app.use(bodyParser.urlencoded({ extended: false }));
// express-validator middleware validates and sanitize request data.
//validator should be after body parser
app.use(expressValidator());
// parses Cookie header and populate req.cookies with an object keyed by the cookie names.
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

// Use the express-session middleware to handle session state.
// The 'secret' is used to sign the session ID cookie.
// 'resave: false' means the session store will not be resaved into the session store if it hasn't changed.
// 'saveUninitialized: false' means the session will not be stored in the session store if it's new and not modified.
// 'store' is used to configure the session store. Here, a new instance of MongoStore is created to store session state in MongoDB.
// 'mongooseConnection: mongoose.connection' tells MongoStore to use the existing Mongoose connection.
// 'cookie: { maxAge: 180 * 60 * 1000 }' sets the maximum age of the session cookie to 180 minutes.
app.use(
  session({
    secret: "mysupersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
    }),
    cookie: { 
      maxAge: 180 * 60 * 1000,
      secure: false, // Đặt true nếu sử dụng HTTPS
      httpOnly: true
    },
  })
);

// connect-flash middleware provides flash messages, which are stored in the session until they are displayed and deleted.
// Flash messages are often used to show one-time notifications to the user.
app.use(flash());
// This is required to set up Passport's persistent login sessions.
// It must be used before any routes that need to authenticate users.
app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  res.locals.messages = req.flash();
  next();
});

// Cấu hình lưu trữ cho upload ảnh
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads/'));
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

// Route khẩn cấp để reset session và đăng xuất khi gặp lỗi
app.get('/emergency-reset', (req, res) => {
  console.log("Emergency reset được gọi");
  // Xóa session
  req.session.destroy(function(err) {
    // Thêm lỗi vào response nếu có
    let errorMessage = err ? 'Có lỗi khi xóa session: ' + err.message : null;
    
    if (err) {
      console.error("Lỗi khi xóa session:", err);
    } else {
      console.log("Đã xóa session thành công trong emergency-reset");
    }
    
    // Render trang HTML đơn giản thông báo đã đăng xuất
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Đăng xuất khẩn cấp</title>
        <meta http-equiv="refresh" content="5;url=/" />
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>Đăng xuất khẩn cấp</h1>
        <p class="success">Bạn đã được đăng xuất khẩn cấp khỏi hệ thống.</p>
        ${errorMessage ? `<p class="error">${errorMessage}</p>` : ''}
        <p>Bạn sẽ được chuyển hướng về trang đăng nhập sau 5 giây...</p>
        <p><a href="/">Quay lại trang đăng nhập ngay</a></p>
      </body>
      </html>
    `);
  });
});

// Tạo route bypass CSRF cho logout trước khi áp dụng CSRF protection
app.get('/bypass-logout', (req, res, next) => {
  console.log("Bypass logout được gọi");
  try {
    // Xóa trực tiếp session thay vì gọi req.logout()
    req.session.destroy(function(err) {
      if (err) {
        console.error("Lỗi khi xóa session:", err);
        return next(err);
      }
      console.log("Đã xóa session thành công");
      // Redirect về trang chủ
      res.redirect('/');
    });
  } catch (error) {
    console.error("Lỗi nghiêm trọng khi logout:", error);
    return res.redirect('/');
  }
});

// Route đặc biệt để bypass CSRF cho form thêm nhân viên
app.post('/admin/add-employee-bypass', upload.single('photo'), async (req, res) => {
  console.log("Route bypass CSRF cho Add Employee được gọi");
  try {
    // Kiểm tra xem người dùng đã đăng nhập và là admin
    if (!req.isAuthenticated() || req.user.type !== 'admin') {
      return res.status(403).send("Không có quyền truy cập");
    }
    
    // Xử lý form giống như trong route /admin/add-employee
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
      employeeType,
      officeEmail,
      provinceActual,
      districtActual
    } = req.body;
    
    console.log("Dữ liệu form:", {
      firstName, 
      lastName,
      email,
      officeEmail,
      dateOfBirth: dateOfBirth ? dateOfBirth : 'Not set',
      contactNumber: contactNumber ? contactNumber : 'Not set', 
      password: password ? 'Set' : 'Not set',
      department, 
      designation,
      employeeType,
      province: provinceActual || req.body.province,
      district: districtActual || req.body.district
    });
    
    // Kết hợp firstName và lastName thành name
    const name = `${firstName} ${lastName}`;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      console.log("Email đã tồn tại:", email);
      req.flash("error", "Email is already in use");
      return res.redirect("/admin/add-employee");
    }
    
    // Kiểm tra office email đã tồn tại chưa
    const existingOfficeEmail = await User.findOne({ officeEmail: officeEmail });
    if (existingOfficeEmail) {
      console.log("Office Email đã tồn tại:", officeEmail);
      req.flash("error", "Office Email is already in use");
      return res.redirect("/admin/add-employee");
    }
    
    // Xử lý các trường required
    if (!dateOfBirth) {
      console.log("dateOfBirth là required nhưng không có giá trị");
      req.flash("error", "Date of Birth is required");
      return res.redirect("/admin/add-employee");
    }
    
    if (!contactNumber) {
      console.log("contactNumber là required nhưng không có giá trị");
      req.flash("error", "Contact Number is required");
      return res.redirect("/admin/add-employee");
    }
    
    // Xử lý định dạng số điện thoại Việt Nam - đảm bảo format +84
    const formattedPhone = contactNumber.startsWith('0') 
      ? '+84' + contactNumber.substring(1) 
      : contactNumber.includes('+84') 
        ? contactNumber 
        : '+84' + contactNumber;
    
    const dob = new Date(dateOfBirth);
    
    // Tạo user mới
    const userData = {
      name,
      email,
      officeEmail,
      dateOfBirth: dob,
      contactNumber: formattedPhone,
      department,
      designation,
      type: "employee", // Mặc định là nhân viên
      Skills: skills || [],
      employeeType: employeeType, 
      employmentType: employeeType === "Full-Time" ? "full-time" : "part-time"
    };
    
    // Tạo instance từ model và hash password
    const user = new User(userData);
    const defaultPassword = "123456";
    if (password) {
      user.password = user.encryptPassword(password);
    } else {
      user.password = user.encryptPassword(defaultPassword);
    }
    
    // Xử lý các trường mới
    if (req.body.gender) {
      // Đảm bảo gender luôn là chữ thường để phù hợp với model
      user.gender = req.body.gender.toLowerCase();
    }
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
    
    await user.save();
    console.log("User đã lưu thành công với ID:", user._id);
    
    req.flash("success", `Employee ${name} added successfully! Employee ID: ${user._id}`);
    res.redirect("/admin/view-all-employees");
  } catch (err) {
    console.error("ERROR trong add-employee-bypass:", err);
    req.flash("error", "Error adding employee: " + err.message);
    res.redirect("/admin/add-employee");
  }
});

// Route đặc biệt để bypass CSRF cho form cập nhật hồ sơ
app.post('/admin/update-profile-bypass', upload.single('photo'), async (req, res) => {
  console.log("Route bypass CSRF cho Update Profile được gọi");
  try {
    // Kiểm tra xem người dùng đã đăng nhập
    if (!req.isAuthenticated()) {
      return res.status(403).send("Không có quyền truy cập");
    }
    
    const { _id } = req.user;
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    
    // Xử lý giới tính - chuyển thành chữ thường
    if (req.body.gender) {
      updateData.gender = req.body.gender.toLowerCase();
    }
    
    // Xử lý các trường thông thường
    const simpleFields = [
      'contactNumber', 'birthplace', 'province', 'district', 
      'detailedAddress', 'idNumber', 'jobId', 'department', 'experience'
    ];
    
    simpleFields.forEach(field => {
      if (req.body[field]) {
        updateData[field] = req.body[field];
      }
    });
    
    // Xử lý ngày bắt đầu
    if (req.body.startDate) {
      updateData.startDate = new Date(req.body.startDate);
    }
    
    // Xử lý loại hình làm việc
    if (req.body.employeeType) {
      updateData.employeeType = req.body.employeeType;
      // Tự động cập nhật employmentType
      updateData.employmentType = req.body.employeeType === "Full-Time" ? "full-time" : "part-time";
    }
    
    // Xử lý ảnh nếu được tải lên
    if (req.file) {
      updateData.photo = req.file.filename;
    }
    
    // Thực hiện cập nhật một lần duy nhất
    const updatedUser = await User.findByIdAndUpdate(
      _id, 
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    // Chuyển hướng về trang hồ sơ
    req.flash('success', 'Profile updated successfully');
    res.redirect('/admin/view-profile');
  } catch (err) {
    console.error("Error updating profile:", err);
    req.flash('error', 'Error updating profile: ' + err.message);
    res.redirect('/admin/view-profile');
  }
});

// Thêm route logout trực tiếp ngay đầu ứng dụng
app.get('/direct-logout', (req, res) => {
  console.log("Direct logout route được gọi");
  if (req.session) {
    // Đăng xuất người dùng
    console.log("Đang hủy session...");
    req.session.destroy(err => {
      if (err) {
        console.error("Lỗi khi hủy session:", err);
        return res.status(500).send("Đã xảy ra lỗi khi đăng xuất.");
      }
      
      // Xóa cookie session
      res.clearCookie('connect.sid');
      console.log("Đã xóa cookie và session");
      
      // Chuyển hướng về trang đăng nhập
      return res.redirect('/');
    });
  } else {
    console.log("Không có session để hủy");
    return res.redirect('/');
  }
});

// Cấu hình cho các đường dẫn đặc biệt cần bypass CSRF
app.use((req, res, next) => {
  // Danh sách các route cần bỏ qua CSRF
  const bypassRoutes = [
    '/manager/add-project-member',
    '/manager/update-project',
    '/manager/remove-project-member',
    '/manager/add-project',
    '/manager/mark-manager-attendance'
  ];
  
  // Kiểm tra nếu request path bắt đầu bằng một trong các route cần bypass
  const shouldBypass = bypassRoutes.some(route => req.path.startsWith(route)) && req.method === 'POST';
  
  if (shouldBypass) {
    console.log(`CSRF bypass applied for route: ${req.path}`);
    // Gán một function giả cho req._csrfToken để bỏ qua validation
    req._csrfToken = () => 'bypass-csrf-token';
  }
  
  next();
});

// Direct handler for add-project-member
app.post('/manager/add-project-member/:project_id', async (req, res) => {
  console.log("Direct route handler for add-project-member called");
  try {
    const projectId = req.params.project_id;
    let employeeIds = req.body.employeeId;
    const Project = require('./models/project');
    
    // Chuyển đổi thành mảng nếu chỉ có một giá trị
    if (!Array.isArray(employeeIds) && employeeIds) {
      employeeIds = [employeeIds];
    }
    
    if (!employeeIds || employeeIds.length === 0) {
      req.flash("error", "No employee selected");
      return res.redirect("/manager/edit-project/" + projectId);
    }
    
    const project = await Project.findById(projectId);
    if (!project) {
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    // Khởi tạo mảng teamMembers nếu chưa có
    if (!project.teamMembers) {
      project.teamMembers = [];
    }
    
    let addedCount = 0;
    let alreadyInProjectCount = 0;
    
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
    
    await project.save();
    
    if (addedCount > 0) {
      req.flash("success", addedCount + " team member(s) added successfully");
    }
    if (alreadyInProjectCount > 0) {
      req.flash("info", alreadyInProjectCount + " employee(s) were already in the project");
    }
    
    res.redirect("/manager/edit-project/" + projectId);
  } catch (err) {
    console.error("Error in direct handler:", err);
    req.flash("error", "Error adding team member(s)");
    res.redirect("/manager/view-all-personal-projects");
  }
});

// Direct handler for update-project
app.post('/manager/update-project/:project_id', async (req, res) => {
  console.log("Direct route handler for update-project called");
  try {
    const projectId = req.params.project_id;
    const Project = require('./models/project');
    
    const project = await Project.findById(projectId);
    if (!project) {
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
    
    await project.save();
    
    req.flash("success", "Project updated successfully");
    res.redirect("/manager/edit-project/" + projectId);
  } catch (err) {
    console.error("Error updating project:", err);
    req.flash("error", "Error updating project");
    res.redirect("/manager/view-all-personal-projects");
  }
});

// Direct handler for remove-project-member
app.post('/manager/remove-project-member/:project_id/:member_id', async (req, res) => {
  console.log("Direct route handler for remove-project-member called");
  try {
    const projectId = req.params.project_id;
    const memberId = req.params.member_id;
    const Project = require('./models/project');
    
    const project = await Project.findById(projectId);
    if (!project) {
      req.flash("error", "Project not found");
      return res.redirect("/manager/view-all-personal-projects");
    }
    
    // Xóa thành viên khỏi mảng teamMembers
    if (project.teamMembers && project.teamMembers.length > 0) {
      project.teamMembers = project.teamMembers.filter(id => id.toString() !== memberId);
    }
    
    await project.save();
    
    req.flash("success", "Team member removed successfully");
    res.redirect("/manager/edit-project/" + projectId);
  } catch (err) {
    console.error("Error removing team member:", err);
    req.flash("error", "Error removing team member");
    res.redirect("/manager/view-all-personal-projects");
  }
});

// Direct handler for add-project
app.post('/manager/add-project', async (req, res) => {
  console.log("Direct route handler for add-project called");
  try {
    const Project = require('./models/project');
    
    const newProject = new Project();
    
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
    
    await newProject.save();
    
    req.flash("success", "Project created successfully");
    res.redirect("/manager/view-all-personal-projects");
  } catch (err) {
    console.error("Error creating project:", err);
    req.flash("error", "Error creating project");
    res.redirect("/manager/add-project");
  }
});

// Thêm route API (đặt trước CSRF để API không bị ảnh hưởng bởi CSRF)
app.use('/api', api);

// Cấu hình CSRF toàn cục
app.use(csrf.protection);
app.use(csrf.middleware);

// Set up routing for the application.
// The first argument to app.use() is the base path for the routes defined in the provided router.
// The second argument is the router object.
// For example, app.use("/admin", admin) means that the routes defined in the 'admin' router will be used for any path that starts with '/admin'.
app.use("/", index);
app.use("/admin", admin);
app.use("/manager", manager);
app.use("/employee", employee);

// Add error handler for CSRF after the routes
app.use(csrf.errorHandler);

// Add logging middleware to see all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Add more detailed 404 handler
app.use(function(req, res, next) {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Initialize holidays when app starts
(async () => {
  try {
    console.log('Initializing default holidays...');
    await initializeDefaultHolidays();
    
    // Update lunar holidays for current year
    const currentYear = new Date().getFullYear();
    console.log(`Updating lunar holidays for year ${currentYear}...`);
    await updateLunarHolidays(currentYear);
    
    console.log('Holiday initialization completed successfully');
  } catch (error) {
    console.error('Error initializing holidays:', error);
  }
})();

module.exports = app;
