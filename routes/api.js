const express = require('express');
const router = express.Router();
const axios = require('axios');

// Cache cho dữ liệu tỉnh thành để giảm tải server
let provincesCache = null;
let provinceDetailCache = {};
let districtCache = {};

// URL gốc của API tỉnh/thành
const API_BASE_URL = 'https://provinces.open-api.vn/api';

// Middleware xử lý lỗi
const handleApiError = (err, res) => {
  console.error('Provinces API Error:', err.message);
  
  // Kiểm tra xem có lỗi CORS không
  if (err.code === 'ECONNREFUSED' || err.message.includes('CORS') || err.message.includes('Network Error')) {
    return res.status(502).json({ 
      error: 'Không thể kết nối đến API tỉnh/thành',
      message: 'Lỗi CORS hoặc mạng khi kết nối đến provinces API'
    });
  }
  
  return res.status(500).json({
    error: 'Lỗi khi truy vấn dữ liệu tỉnh/thành',
    message: err.message
  });
};

// Route lấy tất cả tỉnh/thành
router.get('/provinces', async (req, res) => {
  try {
    // Kiểm tra cache trước
    if (provincesCache) {
      console.log('Returning provinces from cache');
      return res.json(provincesCache);
    }
    
    console.log('Fetching provinces data from API...');
    const response = await axios.get(`${API_BASE_URL}/?depth=1`);
    
    // Cache kết quả
    provincesCache = response.data;
    
    res.json(response.data);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Route lấy thông tin chi tiết của 1 tỉnh/thành
router.get('/provinces/:id', async (req, res) => {
  try {
    const provinceId = req.params.id;
    
    // Kiểm tra cache trước
    if (provinceDetailCache[provinceId]) {
      console.log(`Returning province ${provinceId} from cache`);
      return res.json(provinceDetailCache[provinceId]);
    }
    
    console.log(`Fetching province ${provinceId} data from API...`);
    const response = await axios.get(`${API_BASE_URL}/p/${provinceId}?depth=2`);
    
    // Cache kết quả
    provinceDetailCache[provinceId] = response.data;
    
    res.json(response.data);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Route lấy quận/huyện của 1 tỉnh/thành
router.get('/provinces/:id/districts', async (req, res) => {
  try {
    const provinceId = req.params.id;
    
    // Kiểm tra cache trước
    if (districtCache[provinceId]) {
      console.log(`Returning districts for province ${provinceId} from cache`);
      return res.json(districtCache[provinceId]);
    }
    
    console.log(`Fetching districts for province ${provinceId} from API...`);
    const response = await axios.get(`${API_BASE_URL}/p/${provinceId}?depth=2`);
    
    if (response.data && response.data.districts) {
      // Cache kết quả
      districtCache[provinceId] = response.data.districts;
      return res.json(response.data.districts);
    } else {
      return res.status(404).json({ error: 'Không tìm thấy dữ liệu quận/huyện' });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

// Đường dẫn dọn cache - chỉ sử dụng trong development
router.get('/clear-cache', (req, res) => {
  provincesCache = null;
  provinceDetailCache = {};
  districtCache = {};
  res.json({ message: 'Đã xóa cache' });
});

module.exports = router; 