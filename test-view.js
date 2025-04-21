// Script thử nghiệm xem route employee-details có hoạt động không
// Sử dụng Axios để gửi yêu cầu HTTP đến http://localhost:3000/admin/employee-details/680561285e886d42548449d9
// Và ghi lại phản hồi/lỗi

const axios = require('axios');
const fs = require('fs');

const employeeId = '680561285e886d42548449d9';
const url = `http://localhost:3000/admin/employee-details/${employeeId}`;

console.log(`Kiểm tra URL: ${url}`);

// Tạo file log
const logFile = 'test-view-log.txt';
fs.writeFileSync(logFile, `Kiểm tra URL: ${url}\n`);

// Gửi yêu cầu
axios.get(url)
  .then(response => {
    // Ghi lại thông tin response
    console.log('Mã trạng thái:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Độ dài nội dung:', response.data.length);
    
    // Ghi log
    fs.appendFileSync(logFile, `Mã trạng thái: ${response.status}\n`);
    fs.appendFileSync(logFile, `Headers: ${JSON.stringify(response.headers, null, 2)}\n`);
    fs.appendFileSync(logFile, `Độ dài nội dung: ${response.data.length}\n`);
    
    // Lưu nội dung HTML để kiểm tra
    const htmlFile = 'response.html';
    fs.writeFileSync(htmlFile, response.data);
    console.log(`Đã lưu nội dung HTML vào ${htmlFile}`);
    fs.appendFileSync(logFile, `Đã lưu nội dung HTML vào ${htmlFile}\n`);
  })
  .catch(error => {
    console.error('Lỗi:', error.message);
    
    // Ghi log chi tiết lỗi
    fs.appendFileSync(logFile, `Lỗi: ${error.message}\n`);
    
    if (error.response) {
      // Phản hồi từ server ngoài phạm vi 2xx
      console.log('Mã trạng thái:', error.response.status);
      console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Nội dung phản hồi:', error.response.data);
      
      fs.appendFileSync(logFile, `Mã trạng thái: ${error.response.status}\n`);
      fs.appendFileSync(logFile, `Headers: ${JSON.stringify(error.response.headers, null, 2)}\n`);
      fs.appendFileSync(logFile, `Nội dung phản hồi: ${error.response.data}\n`);
    } else if (error.request) {
      // Yêu cầu đã được tạo nhưng không nhận được phản hồi
      console.log('Không nhận được phản hồi từ server:', error.request);
      fs.appendFileSync(logFile, `Không nhận được phản hồi từ server: ${error.request}\n`);
    }
  }); 