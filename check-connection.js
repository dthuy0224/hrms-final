const mongoose = require("mongoose");
const User = require("./models/user");
require("dotenv").config();

// ID nhân viên cần kiểm tra
const employeeId = '680561285e886d42548449d9';

// Hiển thị URL kết nối từ biến môi trường
console.log('DB_URL from environment:', process.env.DB_URL);

// Kết nối đến cơ sở dữ liệu
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Kết nối MongoDB thành công!');
  
  try {
    // Kiểm tra danh sách collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections trong database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Kiểm tra số lượng người dùng
    const userCount = await User.countDocuments();
    console.log(`Tổng số người dùng: ${userCount}`);
    
    // Tìm nhân viên theo ID
    const employee = await User.findById(employeeId);
    if (employee) {
      // Tránh hiển thị quá nhiều thông tin
      console.log('Tìm thấy nhân viên:');
      console.log('ID:', employee._id.toString());
      console.log('Name:', employee.name);
      console.log('Email:', employee.email);
      console.log('Type:', employee.type);
      
      // Ghi lại các thông tin quan trọng
      console.log('\nThông tin chi tiết:');
      Object.keys(employee.toObject()).forEach(key => {
        const value = employee[key];
        if (typeof value !== 'object' && value !== undefined) {
          console.log(`${key}: ${value}`);
        }
      });
    } else {
      console.log(`Không tìm thấy nhân viên với ID: ${employeeId}`);
      
      // Thử tìm các ID tương tự
      console.log("Tìm kiếm các ID gần giống...");
      const allUsers = await User.find({}, { _id: 1, name: 1 });
      console.log("Danh sách các ID trong cơ sở dữ liệu:");
      allUsers.forEach(user => {
        console.log(`- ${user._id.toString()} (${user.name})`);
      });
    }
  } catch (error) {
    console.error('Lỗi khi thực hiện kiểm tra:', error);
  } finally {
    // Đóng kết nối
    await mongoose.disconnect();
    console.log('Đã đóng kết nối MongoDB');
  }
})
.catch(err => {
  console.error('Lỗi kết nối MongoDB:', err);
}); 