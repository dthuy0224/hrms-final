/**
 * This module configures Passport.js for user authentication.
 *
 * It sets up local authentication strategy and provides functions for serializing and deserializing users.
 * Serialization determines what data of the user object should be stored in the session.
 * Deserialization is used to retrieve this data from the session and attach it to the req.user object.
 *
 */

let passport = require("passport");
let User = require("../models/user");
let LocalStrategy = require("passport-local").Strategy;

// Passport's serializeUser method is used to determine which data of the user object should be stored in the session.
// Here, we are storing the user's id in the session.
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// Passport's deserializeUser method is used to retrieve the user data from the database.
// The user's id, which was stored in the session is used to find the user in the database.
// The found user object is then attached to the req.user object.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// This code sets up a local authentication strategy with Passport.js for adding a new employee.
// It first validates the email and password from the request body.
// If there are validation errors, it stores the error messages and returns.
// If the validation passes, it checks if a user with the given email already exists.
// If the user exists, it returns an error message.
// If the user doesn't exist, it creates a new user with the given details, saves it to the database, and returns the new user.
passport.use(
  "local.add-employee",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async function (req, email, password, done) {
      req.checkBody("email", "Invalid email").notEmpty().isEmail();
      req
        .checkBody("password", "Invalid password")
        .notEmpty()
        .isLength({ min: 6 });
      let errors = req.validationErrors();
      if (errors) {
        let messages = [];
        errors.forEach(function (error) {
          messages.push(error.msg);
        });
        return done(null, false, req.flash("error", messages));
      }
      try {
        let user = await User.findOne({ email: email });
        if (user) {
          return done(null, false, { message: "Email is already in use" });
        }

        let newUser = new User();
        newUser.email = email;
        if (req.body.designation == "Accounts Manager") {
          newUser.type = "accounts_manager";
        } else if (req.body.designation == "Project Manager") {
          newUser.type = "project_manager";
        } else {
          newUser.type = "employee";
        }
        newUser.password = newUser.encryptPassword(password);
        newUser.name = req.body.name;
        newUser.dateOfBirth = new Date(req.body.DOB);
        newUser.contactNumber = req.body.number;
        newUser.department = req.body.department;
        newUser.Skills = req.body["skills[]"];
        newUser.designation = req.body.designation;
        newUser.dateAdded = new Date();

        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// This code sets up a local authentication strategy with Passport.js for signing in a user.
// It first validates the email and password from the request body.
// If there are validation errors, it stores the error messages and returns.
// If the validation passes, it checks if a user with the given email exists.
// If the user doesn't exist or the password is incorrect, it returns an error message.
// If the user exists and the password is correct, it returns the user.
passport.use(
  "local.signin",
  new LocalStrategy(
    {
      usernameField: "officeEmail",
      passwordField: "password",
      passReqToCallback: true,
    },
    async function (req, officeEmail, password, done) {
      req.checkBody("officeEmail", "Invalid office email").notEmpty().isEmail();
      req.checkBody("password", "Invalid password").notEmpty();
      let errors = req.validationErrors();
      if (errors) {
        let messages = [];
        errors.forEach(function (error) {
          messages.push(error.msg);
        });
        return done(null, false, req.flash("error", messages));
      }
      try {
        // Tìm user bằng email hoặc officeEmail
        let user = await User.findOne({ 
          $or: [
            { email: officeEmail },
            { officeEmail: officeEmail }
          ] 
        });
         
        // Kiểm tra xem tài khoản có tồn tại không
        if (!user) {
          console.log("Authentication failed: Account not registered");
          return done(null, false, { message: "This account is not registered!" });
        }
         
        // Lấy thông tin cần thiết từ user để kiểm tra
        const userId = user._id;
        const failedAttempts = user.failedLoginAttempts || 0;
        const lockedUntil = user.accountLockedUntil;
        
        console.log(`Login attempt for ${officeEmail}. Failed attempts: ${failedAttempts}, Locked until: ${lockedUntil}`);

        // Kiểm tra xem tài khoản có bị khóa không
        if (lockedUntil && lockedUntil > new Date()) {
          // Tính thời gian còn lại đến khi mở khóa
          const remainingTime = Math.ceil((lockedUntil - new Date()) / (60 * 1000));
          console.log(`Account locked. Remaining time: ${remainingTime} minutes`);
          return done(null, false, { 
            message: `Your account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingTime} minutes.` 
          });
        }
         
        // Kiểm tra mật khẩu
        if (!user.validPassword(password)) {
          // Tăng số lần đăng nhập sai và lưu trực tiếp vào database
          const newFailedAttempts = failedAttempts + 1;
          console.log(`Wrong password. Failed attempts increased to ${newFailedAttempts}`);
          
          // Kiểm tra và cập nhật khóa tài khoản nếu cần
          let updateData = { failedLoginAttempts: newFailedAttempts };
          
          // Nếu đăng nhập sai 5 lần trở lên, khóa tài khoản trong 15 phút
          if (newFailedAttempts >= 5) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 15);
            updateData.accountLockedUntil = lockUntil;
            
            console.log(`Account locked until ${lockUntil}`);
            
            // Cập nhật thông tin với updateOne để không kích hoạt validation
            await User.updateOne({ _id: userId }, updateData);
            
            return done(null, false, { 
              message: `You have entered the wrong password more than 5 times. Please try again in 15 minutes.` 
            });
          }
          
          // Cập nhật số lần đăng nhập sai mà không kích hoạt validation
          await User.updateOne({ _id: userId }, updateData);
          
          // Thông báo số lần còn lại trước khi bị khóa
          const attemptsLeft = 5 - newFailedAttempts;
          console.log(`Attempts left: ${attemptsLeft}`);
          
          return done(null, false, { 
            message: `Wrong password! You have ${attemptsLeft} attempts left before your account is temporarily locked.` 
          });
        }
         
        // Đăng nhập thành công, reset số lần đăng nhập sai
        console.log(`Login successful. Resetting failed attempts.`);
        
        // Cập nhật thông tin với updateOne để không kích hoạt validation
        await User.updateOne(
          { _id: userId }, 
          { 
            $set: { failedLoginAttempts: 0, accountLockedUntil: null } 
          }
        );
        
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }
  )
);
