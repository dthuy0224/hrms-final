const mongoose = require('mongoose');
const { defaultVietnameseHolidays } = require('../utils/vietnameseHolidays');
const Holiday = require('../models/holiday');
require('dotenv').config();

async function initializeHolidays() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    });
    console.log('Connected to MongoDB');

    // Xóa tất cả ngày lễ hiện có
    await Holiday.deleteMany({});
    console.log('Cleared existing holidays');

    // Thêm các ngày lễ mặc định
    for (const holiday of defaultVietnameseHolidays) {
      const { name, date, month, description, numberOfDays, year } = holiday;
      const holidayDoc = new Holiday({
        name,
        date,
        month,
        description,
        numberOfDays,
        ...(year && { year }),
        isRecurringYearly: !year // Nếu không có năm thì là ngày lễ lặp lại hàng năm
      });
      
      await holidayDoc.save();
      console.log(`Added holiday: ${name}`);
    }

    console.log('Successfully initialized holidays');
    
    // Kiểm tra các ngày lễ đã được thêm
    const holidays = await Holiday.find({});
    console.log('Current holidays in database:', holidays);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing holidays:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

initializeHolidays(); 