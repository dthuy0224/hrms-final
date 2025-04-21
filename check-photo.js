const mongoose = require('mongoose');
const User = require('./models/user');

// ID nhân viên cần kiểm tra - ID từ console log của bạn
const employeeId = '680561285e886d42548449d9';

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/hrms', { useNewUrlParser: true })
  .then(() => {
    console.log('Đã kết nối database');
    
    // Tìm user theo ID
    return User.findById(employeeId);
  })
  .then(user => {
    if (!user) {
      console.log('Không tìm thấy user với ID:', employeeId);
      return;
    }
    
    console.log('Thông tin user:');
    console.log('- Tên:', user.name);
    console.log('- Email:', user.email);
    console.log('- Giá trị trường photo:', user.photo);
    
    if (user.photo) {
      console.log('- Đường dẫn ảnh đầy đủ:', `/uploads/${user.photo}`);
    } else {
      console.log('- User không có ảnh đại diện');
    }
    
    // Kiểm tra tất cả các trường của user
    console.log('\nTất cả các trường của user:');
    Object.keys(user.toObject()).forEach(key => {
      console.log(`- ${key}: ${user[key]}`);
    });
  })
  .catch(err => {
    console.error('Lỗi:', err);
  })
  .finally(() => {
    // Đóng kết nối
    mongoose.disconnect()
      .then(() => console.log('Đã đóng kết nối database'));
  }); 