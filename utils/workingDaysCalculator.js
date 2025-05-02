const Holiday = require('../models/holiday');
const moment = require('moment');
const lunarCalendar = require('lunar-calendar'); // Cần cài đặt package này
const { defaultVietnameseHolidays } = require('./vietnameseHolidays');

async function calculateWorkingDaysInMonth(month, year) {
  try {
    // Lấy tổng số ngày trong tháng
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    // Lấy danh sách các ngày lễ trong tháng từ database
    const holidays = await Holiday.find({
      $or: [
        { month: month, year: year },  // Ngày lễ cụ thể trong năm này
        { month: month, isRecurringYearly: true }  // Ngày lễ lặp lại hàng năm
      ]
    });

    // Tạo map để đánh dấu các ngày lễ
    const holidayMap = new Map();
    
    // Đánh dấu các ngày lễ vào map
    holidays.forEach(holiday => {
      const startDate = holiday.date;
      for(let i = 0; i < holiday.numberOfDays; i++) {
        const currentDate = new Date(year, month - 1, startDate + i);
        if (currentDate.getMonth() + 1 === month) {
          holidayMap.set(currentDate.getDate(), true);
        }
      }
    });

    // Kiểm tra từng ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      
      // Bỏ qua ngày cuối tuần và ngày lễ
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayMap.has(day)) {
        workingDays++;
      }
    }
    
    return workingDays;
  } catch (error) {
    console.error('Error calculating working days:', error);
    throw error;
  }
}

// Hàm kiểm tra một ngày có phải là ngày lễ
async function isHoliday(date, month, year) {
  try {
    const holiday = await Holiday.findOne({
      $or: [
        { date: date, month: month, year: year },
        { date: date, month: month, isRecurringYearly: true }
      ]
    });
    
    return !!holiday;
  } catch (error) {
    console.error('Error checking holiday:', error);
    throw error;
  }
}

// Hàm khởi tạo các ngày lễ mặc định
async function initializeDefaultHolidays() {
  try {
    for (const holiday of defaultVietnameseHolidays) {
      // Bỏ qua các ngày lễ âm lịch vì cần tính toán riêng
      if (!holiday.isLunar) {
        await Holiday.findOneAndUpdate(
          { name: holiday.name },
          { 
            ...holiday,
            isRecurringYearly: true 
          },
          { upsert: true, new: true }
        );
      }
    }
    
    console.log('Default holidays initialized successfully');
  } catch (error) {
    console.error('Error initializing default holidays:', error);
    throw error;
  }
}

// Hàm cập nhật ngày lễ âm lịch cho năm hiện tại
async function updateLunarHolidays(year) {
  try {
    const lunarHolidays = defaultVietnameseHolidays.filter(h => h.isLunar);
    
    for (const holiday of lunarHolidays) {
      if (holiday.name === "Tết Nguyên đán") {
        // Tết thường rơi vào khoảng cuối tháng 1 hoặc đầu tháng 2
        // Cần tính toán chính xác dựa vào lịch âm
        const lunarNewYear = lunarCalendar.getLunarDate(year);
        await Holiday.findOneAndUpdate(
          { name: holiday.name, year: year },
          {
            ...holiday,
            date: lunarNewYear.day,
            month: lunarNewYear.month,
            year: year,
            isRecurringYearly: false
          },
          { upsert: true, new: true }
        );
      }
      // Thêm các ngày lễ âm lịch khác tại đây
    }
  } catch (error) {
    console.error('Error updating lunar holidays:', error);
    throw error;
  }
}

module.exports = {
  calculateWorkingDaysInMonth,
  isHoliday,
  initializeDefaultHolidays,
  updateLunarHolidays
}; 