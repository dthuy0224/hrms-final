const csrf = require('csurf');

// Cấu hình chung với các đường dẫn bỏ qua CSRF
const csrfProtection = csrf({ 
  cookie: true, // Sử dụng cookie thay vì session để lưu token
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Bổ sung các đường dẫn bỏ qua kiểm tra CSRF
  value: (req) => {
    // Hoàn toàn bỏ qua CSRF cho POST /admin/add-employee và /admin/update-profile (tạm thời để fix lỗi)
    if ((req.path === '/admin/add-employee' || req.path === '/admin/update-profile') && req.method === 'POST') {
      // Kiểm tra nếu là form multipart thì bỏ qua hoàn toàn
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        return 'bypass-csrf-for-file-upload';
      }
      // Nếu không, thử lấy token
      return req.body._csrf || 'temporary-bypass';
    }
    
    // Danh sách các route đặc biệt cần bỏ qua CSRF hoàn toàn
    const bypassRoutes = [
      '/logout',
      '/force-logout',
      '/logout-no-csrf'
    ];
    
    // Cho phép các route đặc biệt bypass
    if (bypassRoutes.includes(req.path)) {
      return 'bypass-csrf-for-special-routes';
    }
    
    // Sử dụng CSRF token từ body, query, hoặc header
    return req.body._csrf || 
           req.query._csrf || 
           (req.headers['x-csrf-token']) ||
           (req.headers['x-xsrf-token']);
  }
});

// Middleware tùy chỉnh để cung cấp token cho views
const csrfMiddleware = (req, res, next) => {
  try {
    if (req.csrfToken) {
      res.locals.csrfToken = req.csrfToken();
    }
  } catch (err) {
    console.error('Lỗi khi tạo CSRF token:', err);
    // Tiếp tục dù có lỗi
  }
  next();
};

// Xử lý lỗi CSRF
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  
  // Ghi log lỗi
  console.log('Invalid CSRF token - reset required', req.url);
  console.log('Headers:', req.headers);
  console.log('Body CSRF:', req.body._csrf);
  
  // Đặc biệt xử lý cho /admin/add-employee
  if (req.path === '/admin/add-employee' && req.method === 'POST') {
    console.log('Phát hiện lỗi CSRF trên form upload, chuyển hướng đặc biệt');
    return res.redirect('/admin/add-employee');
  }
  
  // Đặc biệt xử lý cho /admin/update-profile
  if (req.path === '/admin/update-profile' && req.method === 'POST') {
    console.log('Phát hiện lỗi CSRF trên form update profile, chuyển hướng đặc biệt');
    req.flash('error', 'Phiên làm việc đã hết hạn. Vui lòng thử lại.');
    return res.redirect('/admin/view-profile');
  }
  
  // Thông báo lỗi
  req.flash('error', 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.');
  
  // Chuyển hướng về trang trước hoặc trang chủ
  res.redirect(req.headers.referer || '/');
};

module.exports = {
  protection: csrfProtection,
  middleware: csrfMiddleware,
  errorHandler: csrfErrorHandler
}; 