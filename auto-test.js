import { chromium } from 'playwright';

(async () => {
  console.log('🤖 [PLAYWRIGHT] Khởi động trình duyệt test...');
  const browser = await chromium.launch({ headless: false }); // Hiện UI cho dễ nhìn
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // Bắt luồng dữ liệu API trả về từ Server
  page.on('response', async (response) => {
    if (response.url().includes('/api/analyze-media') && response.request().method() === 'POST') {
      const data = await response.json();
      console.log('\n📦 [DỮ LIỆU BACKEND TRẢ VỀ]');
      console.log('Tên file:', data.title);
      console.log('AI Tags:', data.tags);
      console.log('Detected Objects:', data.detectedObjects?.map(o => o.label));
      console.log('Orientation (Góc xoay):', data.orientation || 'Không có');

      // Assert (Kiểm chứng)
      const allText = JSON.stringify(data).toLowerCase();
      if (allText.includes('smartphone') || allText.includes('mobile')) {
        console.log('❌ LỖI NGHIÊM TRỌNG: AI bị ảo giác, lại nhận diện ra Smartphone!');
      } else {
        console.log('✅ PASS: AI đã nhận diện đúng, không bị ảo giác smartphone.');
      }
    }
  });

  console.log('📤 Đang tự động Upload file test...');
  // Fen nhớ chép 1 tấm hình con mèo HEIC bị lỗi vào thư mục, đổi tên thành 'test-cat.heic'
  await page.locator('input[type="file"]').setInputFiles('test-cat.heic');

  console.log('⏳ Đợi Server và Gemini xử lý (30s)...');
  await page.waitForTimeout(30000);

  await browser.close();
})();