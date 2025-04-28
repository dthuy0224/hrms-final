/**
 * File xử lý tải dữ liệu tỉnh/thành, quận/huyện Việt Nam cho form
 * Sử dụng API proxy local từ server, không cần CORS
 */

// Lưu cache dữ liệu để tránh gọi API nhiều lần
let provincesCache = null;
let districtCache = {};

// URL của API proxy local
const API_BASE_URL = '/api';

// Dữ liệu tỉnh/thành phố dự phòng
const backupProvincesData = [
  { code: "01", name: "Thành phố Hà Nội" },
  { code: "02", name: "Thành phố Hồ Chí Minh" },
  { code: "03", name: "Thành phố Đà Nẵng" },
  { code: "04", name: "Thành phố Hải Phòng" },
  { code: "05", name: "Thành phố Cần Thơ" },
  { code: "06", name: "Tỉnh An Giang" },
  { code: "07", name: "Tỉnh Bà Rịa - Vũng Tàu" },
  { code: "08", name: "Tỉnh Bắc Giang" },
  { code: "09", name: "Tỉnh Bắc Kạn" },
  { code: "10", name: "Tỉnh Bạc Liêu" },
  { code: "11", name: "Tỉnh Bắc Ninh" },
  { code: "12", name: "Tỉnh Bến Tre" },
  { code: "13", name: "Tỉnh Bình Định" },
  { code: "14", name: "Tỉnh Bình Dương" },
  { code: "15", name: "Tỉnh Bình Phước" },
  { code: "16", name: "Tỉnh Bình Thuận" },
  { code: "17", name: "Tỉnh Cà Mau" },
  { code: "18", name: "Tỉnh Cao Bằng" },
  { code: "19", name: "Tỉnh Đắk Lắk" },
  { code: "20", name: "Tỉnh Đắk Nông" },
  { code: "21", name: "Tỉnh Điện Biên" },
  { code: "22", name: "Tỉnh Đồng Nai" },
  { code: "23", name: "Tỉnh Đồng Tháp" },
  { code: "24", name: "Tỉnh Gia Lai" },
  { code: "25", name: "Tỉnh Hà Giang" },
  { code: "26", name: "Tỉnh Hà Nam" },
  { code: "27", name: "Tỉnh Hà Tĩnh" },
  { code: "28", name: "Tỉnh Hải Dương" },
  { code: "29", name: "Tỉnh Hậu Giang" },
  { code: "30", name: "Tỉnh Hòa Bình" },
  { code: "31", name: "Tỉnh Hưng Yên" },
  { code: "32", name: "Tỉnh Khánh Hòa" },
  { code: "33", name: "Tỉnh Kiên Giang" },
  { code: "34", name: "Tỉnh Kon Tum" },
  { code: "35", name: "Tỉnh Lai Châu" },
  { code: "36", name: "Tỉnh Lâm Đồng" },
  { code: "37", name: "Tỉnh Lạng Sơn" },
  { code: "38", name: "Tỉnh Lào Cai" },
  { code: "39", name: "Tỉnh Long An" },
  { code: "40", name: "Tỉnh Nam Định" },
  { code: "41", name: "Tỉnh Nghệ An" },
  { code: "42", name: "Tỉnh Ninh Bình" },
  { code: "43", name: "Tỉnh Ninh Thuận" },
  { code: "44", name: "Tỉnh Phú Thọ" },
  { code: "45", name: "Tỉnh Phú Yên" },
  { code: "46", name: "Tỉnh Quảng Bình" },
  { code: "47", name: "Tỉnh Quảng Nam" },
  { code: "48", name: "Tỉnh Quảng Ngãi" },
  { code: "49", name: "Tỉnh Quảng Ninh" },
  { code: "50", name: "Tỉnh Quảng Trị" },
  { code: "51", name: "Tỉnh Sóc Trăng" },
  { code: "52", name: "Tỉnh Sơn La" },
  { code: "53", name: "Tỉnh Tây Ninh" },
  { code: "54", name: "Tỉnh Thái Bình" },
  { code: "55", name: "Tỉnh Thái Nguyên" },
  { code: "56", name: "Tỉnh Thanh Hóa" },
  { code: "57", name: "Tỉnh Thừa Thiên Huế" },
  { code: "58", name: "Tỉnh Tiền Giang" },
  { code: "59", name: "Tỉnh Trà Vinh" },
  { code: "60", name: "Tỉnh Tuyên Quang" },
  { code: "61", name: "Tỉnh Vĩnh Long" },
  { code: "62", name: "Tỉnh Vĩnh Phúc" },
  { code: "63", name: "Tỉnh Yên Bái" }
];

// Một số dữ liệu quận/huyện dự phòng cho các tỉnh/thành phố phổ biến
const backupDistrictsData = {
  "01": [ // Hà Nội
    { code: "001", name: "Quận Ba Đình" },
    { code: "002", name: "Quận Hoàn Kiếm" },
    { code: "003", name: "Quận Tây Hồ" },
    { code: "004", name: "Quận Long Biên" },
    { code: "005", name: "Quận Cầu Giấy" },
    { code: "006", name: "Quận Đống Đa" },
    { code: "007", name: "Quận Hai Bà Trưng" },
    { code: "008", name: "Quận Hoàng Mai" },
    { code: "009", name: "Quận Thanh Xuân" },
    { code: "016", name: "Huyện Sóc Sơn" },
    { code: "017", name: "Huyện Đông Anh" },
    { code: "018", name: "Huyện Gia Lâm" },
    { code: "019", name: "Quận Nam Từ Liêm" },
    { code: "020", name: "Huyện Thanh Trì" },
    { code: "021", name: "Quận Bắc Từ Liêm" },
    { code: "250", name: "Huyện Mê Linh" },
    { code: "268", name: "Quận Hà Đông" },
    { code: "269", name: "Thị xã Sơn Tây" },
    { code: "271", name: "Huyện Ba Vì" },
    { code: "272", name: "Huyện Phúc Thọ" },
    { code: "273", name: "Huyện Đan Phượng" },
    { code: "274", name: "Huyện Hoài Đức" },
    { code: "275", name: "Huyện Quốc Oai" },
    { code: "276", name: "Huyện Thạch Thất" },
    { code: "277", name: "Huyện Chương Mỹ" },
    { code: "278", name: "Huyện Thanh Oai" },
    { code: "279", name: "Huyện Thường Tín" },
    { code: "280", name: "Huyện Phú Xuyên" },
    { code: "281", name: "Huyện Ứng Hòa" },
    { code: "282", name: "Huyện Mỹ Đức" }
  ],
  "02": [ // TP.HCM
    { code: "760", name: "Quận 1" },
    { code: "761", name: "Quận 12" },
    { code: "762", name: "Thành phố Thủ Đức" },
    { code: "763", name: "Quận 9" },
    { code: "764", name: "Quận Gò Vấp" },
    { code: "765", name: "Quận Bình Thạnh" },
    { code: "766", name: "Quận Tân Bình" },
    { code: "767", name: "Quận Tân Phú" },
    { code: "768", name: "Quận Phú Nhuận" },
    { code: "769", name: "Quận 2" },
    { code: "770", name: "Quận 3" },
    { code: "771", name: "Quận 10" },
    { code: "772", name: "Quận 11" },
    { code: "773", name: "Quận 4" },
    { code: "774", name: "Quận 5" },
    { code: "775", name: "Quận 6" },
    { code: "776", name: "Quận 8" },
    { code: "777", name: "Quận Bình Tân" },
    { code: "778", name: "Quận 7" },
    { code: "783", name: "Huyện Củ Chi" },
    { code: "784", name: "Huyện Hóc Môn" },
    { code: "785", name: "Huyện Bình Chánh" },
    { code: "786", name: "Huyện Nhà Bè" },
    { code: "787", name: "Huyện Cần Giờ" }
  ],
  "12": [ // Bến Tre
    { code: "829", name: "Thành phố Bến Tre" },
    { code: "831", name: "Huyện Châu Thành" },
    { code: "832", name: "Huyện Chợ Lách" },
    { code: "833", name: "Huyện Mỏ Cày Nam" },
    { code: "834", name: "Huyện Giồng Trôm" },
    { code: "835", name: "Huyện Bình Đại" },
    { code: "836", name: "Huyện Ba Tri" },
    { code: "837", name: "Huyện Thạnh Phú" },
    { code: "838", name: "Huyện Mỏ Cày Bắc" }
  ]
};

// Hàm tải dữ liệu tỉnh/thành phố vào select box
function loadProvinces(selector = 'select[name="province"]') {
  try {
    const provinceSelect = $(selector);
    if (!provinceSelect.length) {
      console.log(`Element not found: ${selector}`);
      return;
    }

    // Hiển thị loading...
    provinceSelect.prop('disabled', true);
    const firstOption = provinceSelect.find('option:first-child');
    provinceSelect.empty();
    provinceSelect.append(firstOption);
    
    // Sử dụng cache nếu có
    if (provincesCache) {
      populateProvinces(provinceSelect, provincesCache);
      return;
    }
    
    // Tải dữ liệu từ API proxy
    console.log('Đang tải dữ liệu tỉnh/thành phố từ API...');
    $.ajax({
      url: `${API_BASE_URL}/provinces`,
      type: 'GET',
      dataType: 'json',
      timeout: 5000,
      success: function(data) {
        console.log('Tải dữ liệu tỉnh/thành phố thành công');
        provincesCache = data;
        populateProvinces(provinceSelect, data);
      },
      error: function(xhr, status, error) {
        console.error("Không thể tải dữ liệu tỉnh/thành phố từ API:", error);
        console.log("Sử dụng dữ liệu dự phòng");
        provincesCache = backupProvincesData;
        populateProvinces(provinceSelect, backupProvincesData);
      }
    });
  } catch (error) {
    console.error(`Error loading provinces into ${selector}:`, error);
    const provinceSelect = $(selector);
    provinceSelect.prop('disabled', false);
    provincesCache = backupProvincesData;
    populateProvinces(provinceSelect, backupProvincesData);
  }
}

// Hàm điền dữ liệu tỉnh/thành vào select
function populateProvinces(select, data) {
  // Giữ lại option đầu tiên (placeholder)
  const firstOption = select.find('option:first-child');
  select.empty();
  select.append(firstOption);
  
  // Thêm các option tỉnh/thành phố
  data.forEach(province => {
    // Sử dụng code làm value thay vì name để dễ dàng tra cứu quận/huyện
    select.append(`<option value="${province.code}" data-name="${province.name}">${province.name}</option>`);
  });
  
  select.prop('disabled', false);
  console.log(`Loaded ${data.length} provinces`);
}

// Hàm tải dữ liệu tỉnh/thành phố vào select box birthplace
function loadBirthplaces(selector = 'select[name="birthplace"]') {
  try {
    const birthplaceSelect = $(selector);
    if (!birthplaceSelect.length) {
      console.log(`Element not found: ${selector}`);
      return;
    }

    // Hiển thị loading...
    birthplaceSelect.prop('disabled', true);
    const firstOption = birthplaceSelect.find('option:first-child');
    birthplaceSelect.empty();
    birthplaceSelect.append(firstOption);
    
    // Sử dụng cache nếu có
    if (provincesCache) {
      populateBirthplaces(birthplaceSelect, provincesCache);
      return;
    }
    
    // Nếu không có cache, chờ loadProvinces hoàn thành
    let checkCounter = 0;
    const checkCache = setInterval(function() {
      if (provincesCache) {
        clearInterval(checkCache);
        populateBirthplaces(birthplaceSelect, provincesCache);
      } else if (checkCounter > 20) { // Timeout after 10 seconds
        clearInterval(checkCache);
        console.error("Timeout waiting for province data");
        birthplaceSelect.prop('disabled', false);
        birthplaceSelect.append('<option value="">Không thể tải dữ liệu</option>');
      }
      checkCounter++;
    }, 500);
  } catch (error) {
    console.error(`Error loading birthplaces into ${selector}:`, error);
    const birthplaceSelect = $(selector);
    if (birthplaceSelect.length) {
      birthplaceSelect.prop('disabled', false);
    }
  }
}

// Hàm điền dữ liệu tỉnh/thành vào select birthplace
function populateBirthplaces(select, data) {
  // Giữ lại option đầu tiên (placeholder)
  const firstOption = select.find('option:first-child');
  select.empty();
  select.append(firstOption);
  
  // Thêm các option tỉnh/thành phố
  data.forEach(province => {
    select.append(`<option value="${province.code}" data-name="${province.name}">${province.name}</option>`);
  });
  
  select.prop('disabled', false);
  console.log(`Loaded ${data.length} birthplaces`);
}

// Hàm tải dữ liệu quận/huyện vào select box dựa vào tỉnh/thành phố được chọn
function loadDistricts(provinceCode, selector = 'select[name="district"]') {
  try {
    const districtSelect = $(selector);
    if (!districtSelect.length) {
      console.log(`Element not found: ${selector}`);
      return;
    }

    // Hiển thị loading...
    districtSelect.prop('disabled', true);
    districtSelect.empty();
    districtSelect.append('<option value="">Đang tải quận/huyện...</option>');
    
    console.log(`Loading districts for province code: ${provinceCode}`);
    
    // Sử dụng cache nếu có
    if (districtCache[provinceCode]) {
      populateDistricts(districtSelect, districtCache[provinceCode]);
      return;
    }
    
    // Tải dữ liệu từ API proxy
    console.log(`Đang tải dữ liệu quận/huyện cho tỉnh/thành phố ${provinceCode} từ API...`);
    $.ajax({
      url: `${API_BASE_URL}/provinces/${provinceCode}/districts`,
      type: 'GET',
      dataType: 'json',
      timeout: 5000,
      success: function(data) {
        console.log(`Tải dữ liệu quận/huyện thành công, có ${data.length} quận/huyện`);
        districtCache[provinceCode] = data;
        populateDistricts(districtSelect, data);
      },
      error: function(xhr, status, error) {
        console.error("Không thể tải dữ liệu quận/huyện từ API:", error);
        fallbackToBackupDistricts(districtSelect, provinceCode);
      }
    });
  } catch (error) {
    console.error(`Error loading districts for province ${provinceCode}:`, error);
    const districtSelect = $(selector);
    if (districtSelect.length) {
      fallbackToBackupDistricts(districtSelect, provinceCode);
    }
  }
}

// Sử dụng dữ liệu dự phòng cho quận/huyện
function fallbackToBackupDistricts(districtSelect, provinceCode) {
  console.log("Sử dụng dữ liệu quận/huyện dự phòng");
  
  if (backupDistrictsData[provinceCode]) {
    districtCache[provinceCode] = backupDistrictsData[provinceCode];
    populateDistricts(districtSelect, backupDistrictsData[provinceCode]);
  } else {
    // Tạo dữ liệu mẫu nếu không có dữ liệu dự phòng
    const genericDistricts = [
      { code: `${provinceCode}01`, name: "Thành phố/Thị xã" },
      { code: `${provinceCode}02`, name: "Quận/Huyện 1" },
      { code: `${provinceCode}03`, name: "Quận/Huyện 2" },
      { code: `${provinceCode}04`, name: "Quận/Huyện 3" },
      { code: `${provinceCode}05`, name: "Quận/Huyện 4" },
      { code: `${provinceCode}06`, name: "Quận/Huyện 5" }
    ];
    
    districtCache[provinceCode] = genericDistricts;
    populateDistricts(districtSelect, genericDistricts);
  }
}

// Hàm điền dữ liệu quận/huyện vào select
function populateDistricts(select, districts) {
  select.empty();
  select.append('<option value="">Chọn quận/huyện...</option>');
  
  if (districts && districts.length > 0) {
    districts.forEach(district => {
      select.append(`<option value="${district.code}" data-name="${district.name}">${district.name}</option>`);
    });
    console.log(`Loaded ${districts.length} districts`);
  } else {
    select.append('<option value="">Không có dữ liệu quận/huyện</option>');
    console.log("No districts available for this province");
  }
  
  select.prop('disabled', false);
}

// Hàm khởi tạo sự kiện khi tỉnh/thành phố thay đổi
function initProvinceChange() {
  try {
    const provinceSelect = $('select[name="province"]');
    if (!provinceSelect.length) {
      console.log('Province select element not found');
      return;
    }

    // Loại bỏ event handler cũ nếu có
    provinceSelect.off('change');
    
    // Thêm event handler mới
    provinceSelect.on('change', function() {
      const provinceCode = $(this).val();
      const districtSelect = $('select[name="district"]');
      
      console.log(`Province changed to: ${provinceCode}`);
      
      if (provinceCode) {
        // Đã dùng code làm value nên không cần tìm code nữa
        loadDistricts(provinceCode);
      } else {
        // Reset quận/huyện nếu không chọn tỉnh/thành phố
        districtSelect.empty();
        districtSelect.append('<option value="">Chọn tỉnh/thành phố trước...</option>');
        districtSelect.prop('disabled', true);
      }
    });
    
    console.log('Province change event handler initialized');
    
    // Kích hoạt sự kiện change nếu đã có giá trị tỉnh
    setTimeout(function() {
      if (provinceSelect.val()) {
        console.log("Province already has value, triggering change event");
        provinceSelect.trigger('change');
      }
    }, 200);
  } catch (error) {
    console.error('Error initializing province change handler:', error);
  }
}

// Hàm tải tất cả dữ liệu ngay lập tức
function loadProvincesDataImmediately() {
  console.log("Loading provinces data...");
  
  try {
    // Tải dữ liệu tỉnh/thành phố vào cả hai select box
    loadProvinces('select[name="province"]');
    loadBirthplaces('select[name="birthplace"]');
    
    // Khởi tạo sự kiện cho province change
    initProvinceChange();
    
    console.log("Provinces data load initiated");
  } catch (error) {
    console.error("Error in loadProvincesDataImmediately:", error);
  }
}

// Đảm bảo rằng jQuery đã sẵn sàng trước khi thực hiện các hàm
$(document).ready(function() {
  console.log("Provinces.js loaded and ready");
  
  // Thêm thông báo trạng thái tải
  $('select[name="province"]').after('<small class="text-muted load-status" style="display:none">Đang tải dữ liệu...</small>');
  
  $(document).ajaxStart(function() {
    $('.load-status').show();
  }).ajaxStop(function() {
    $('.load-status').hide();
  });
  
  // Tải dữ liệu
  setTimeout(function() {
    try {
      loadProvincesDataImmediately();
    } catch (error) {
      console.error("Error when trying to load provinces data:", error);
    }
  }, 500); // Đợi 500ms để đảm bảo DOM đã sẵn sàng
}); 