const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Attendance = require("../models/attendance");
const { isLoggedIn } = require("./middleware");

router.get("/", function viewLoginPage(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/check-type");
  }

  const messages = req.flash("error");

  res.render("login", {
    title: "Log In",
    csrfToken: req.csrfToken(),
    messages: messages,
    hasErrors: messages.length > 0,
  });
});

router.post(
  "/login",
  passport.authenticate("local.signin", {
    successRedirect: "/check-type",
    failureRedirect: "/",
    failureFlash: true,
  })
);

router.get("/forgot-password", function(req, res, next) {
  const messages = req.flash("error");
  const successMsg = req.flash("success");
  
  res.render("forgot-password", {
    title: "Forgot Password",
    csrfToken: req.csrfToken(),
    messages: messages,
    hasErrors: messages.length > 0,
    hasSuccess: successMsg.length > 0
  });
});

router.post("/forgot-password", async function(req, res, next) {
  req.checkBody("email", "Invalid email").notEmpty().isEmail();
  
  let errors = req.validationErrors();
  if (errors) {
    let messages = [];
    errors.forEach(function(error) {
      messages.push(error.msg);
    });
    req.flash("error", messages);
    return res.redirect("/forgot-password");
  }
  
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      req.flash("error", "This account is not registered!");
      return res.redirect("/forgot-password");
    }
    
    // In a real application, you would send an email with password reset instructions here
    // For now, we'll render the reset confirmation page
    
    return res.render("reset-confirmation", {
      title: "Reset Password",
      csrfToken: req.csrfToken(),
      email: req.body.email
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred. Please try again later.");
    return res.redirect("/forgot-password");
  }
});

router.post("/resend-reset", async function(req, res, next) {
  const email = req.body.email;
  
  try {
    const user = await User.findOne({ email: email });
    
    if (!user) {
      req.flash("error", "This account is not registered!");
      return res.redirect("/forgot-password");
    }
    
    // In a real application, you would resend the email with password reset instructions here
    
    return res.render("reset-confirmation", {
      title: "Reset Password",
      csrfToken: req.csrfToken(),
      email: email
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred. Please try again later.");
    return res.redirect("/forgot-password");
  }
});

router.get("/check-type", function checkTypeOfLoggedInUser(req, res, next) {
  req.session.user = req.user;
  console.log("User type:", req.user.type); // Debug log
  
  switch (req.user.type) {
    case "project_manager":
      res.redirect("/manager/");
      break;
    case "accounts_manager":
      res.redirect("/manager/"); // Redirect accounts_manager to manager routes
      break;
    case "admin":
      res.redirect("/admin/");
      break;
    case "employee":
      res.redirect("/employee/");
      break;
    default:
      res.redirect("/");
  }
});

router.get("/logout", isLoggedIn, (req, res, next) => {
  console.log("Đang xử lý logout...");
  
  if (!req.isAuthenticated()) {
    console.log("Người dùng chưa đăng nhập");
    return res.redirect("/");
  }

  try {
    // Xóa trực tiếp session thay vì gọi req.logout()
    req.session.destroy(function(err) {
      if (err) {
        console.error("Lỗi khi xóa session:", err);
        return next(err);
      }
      console.log("Đăng xuất thành công - session đã bị xóa");
      return res.redirect("/");
    });
  } catch (error) {
    console.error("Lỗi nghiêm trọng khi logout:", error);
    return res.redirect("/");
  }
});

router.get("/signup", function signUp(req, res, next) {
  const messages = req.flash("error");
  res.render("signup", {
    csrfToken: req.csrfToken(),
    messages: messages,
    hasErrors: messages.length > 0,
  });
});

router.post(
  "/signup",
  passport.authenticate("local.signup", {
    successRedirect: "/signup",
    failureRedirect: "/signup",
    failureFlash: true,
  })
);

router.get("/dummy", async function (req, res, next) {
  try {
    const users = await User.find({ type: "employee" });
    res.render("dummy", { title: "Dummy", users });
  } catch (err) {
    console.log(err);
  }
});

// Thêm route để làm mới CSRF token
router.get('/refresh-csrf', isLoggedIn, function(req, res) {
  return res.json({ csrfToken: req.csrfToken() });
});

// Route để đăng xuất trực tiếp mà không kiểm tra checkout
router.post('/force-logout', isLoggedIn, function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Route đăng xuất bỏ qua CSRF (tính năng khẩn cấp)
router.get("/logout-no-csrf", function(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      req.logout(function(err) {
        if (err) { 
          console.error("Lỗi khi logout khẩn cấp:", err);
          return next(err); 
        }
        console.log("Đăng xuất khẩn cấp thành công");
        return res.redirect("/");
      });
    } catch (error) {
      console.error("Lỗi nghiêm trọng khi logout khẩn cấp:", error);
      return res.redirect("/");
    }
  } else {
    return res.redirect("/");
  }
});

module.exports = router;
