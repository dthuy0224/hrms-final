const mongoose = require('mongoose');
const { calculateWorkingDaysInMonth } = require('../utils/workingDaysCalculator');
const Holiday = require('../models/holiday');
require('dotenv').config();

async function testWorkingDays() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    });
    console.log('Connected to MongoDB');

    // Kiểm tra số ngày làm việc tháng 4/2024
    const month = 4;
    const year = 2024;
    const workingDays = await calculateWorkingDaysInMonth(month, year);

    console.log(`\nPhân tích tháng ${month}/${year}:`);
    console.log('--------------------------------');
    
    // Tính toán chi tiết
    const daysInMonth = new Date(year, month, 0).getDate();
    let weekendDays = 0;
    let weekendDates = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDays++;
        weekendDates.push(`${day}/${month}`);
      }
    }

    // Lấy ngày lễ từ database
    const holidays = await Holiday.find({
      $or: [
        { month: month, year: year },
        { month: month, isRecurringYearly: true }
      ]
    });
    
    console.log(`Tổng số ngày trong tháng: ${daysInMonth} ngày`);
    console.log(`\nNgày cuối tuần (${weekendDays} ngày):`);
    console.log(weekendDates.join(', '));
    
    console.log(`\nCác ngày lễ (${holidays.length} ngày):`);
    holidays.forEach(holiday => {
      console.log(`- ${holiday.date}/${holiday.month} - ${holiday.name} (${holiday.numberOfDays} ngày)`);
    });
    
    console.log(`\nSố ngày làm việc thực tế: ${workingDays} ngày`);
    console.log(`(${daysInMonth} ngày - ${weekendDays} ngày cuối tuần - ${holidays.length} ngày lễ = ${workingDays} ngày làm việc)`);
    console.log('--------------------------------');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testWorkingDays(); 