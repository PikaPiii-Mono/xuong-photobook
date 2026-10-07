# Xưởng Photobook

App dàn trang album photobook chạy độc lập trên Windows. Mỗi máy là một bản riêng: không cần tài khoản, không cần máy chủ, không cần mạng.

**[⬇ Tải Xuong-Photobook.exe (bản mới nhất)](https://github.com/PikaPiii-Mono/xuong-photobook/releases/latest/download/Xuong-Photobook.exe)**

Nhấp đúp là chạy, không cần cài đặt. Lần đầu, Windows có thể báo *"Windows protected your PC"* vì file chưa có chữ ký số: bấm **More info → Run anyway**.

## Làm được gì

- Hơn 50 bố cục: tràn viền, 1–12 ảnh, collage, polaroid, trải đôi (panorama vắt gáy), kiểu tạp chí có chữ, bìa.
- Khổ album tuỳ ý (20×20, 30×30, A4…), bìa gồm bìa sau, gáy và bìa trước; số trang hiển thị rõ.
- Thước cm hai bên, đường gióng kéo từ thước, hút dính, căn khung, cắt và xoay ảnh trong khung.
- Xem dạng sách lật trang.
- **Xuất file in**: PDF (có TrimBox/BleedBox), JPG hoặc PNG 300 dpi, tràn lề, dấu cắt, kiểm tra ảnh thiếu nét trước khi in.
- **Lưu trữ**: tự lưu tạm liên tục; lưu và mở album bằng file `.pbook` (chứa đủ bố cục và ảnh gốc, mang sang máy khác mở được ngay).

## Cập nhật tự động

Mỗi lần mở app:

| Tình huống | App làm gì |
|---|---|
| Có mạng, có bản mới | Tải bản mới từ repo này rồi mở luôn bằng bản mới |
| Mạng chậm | Mở ngay bằng bản đang có, tải ngầm, xong hiện nút **Cập nhật ngay** |
| Không có mạng | Bỏ qua kiểm tra, mở bình thường bằng bản đang có |

Repo để công khai nên app tải bản mới mà không cần đăng nhập. Cập nhật tự động áp cho giao diện và tính năng (file `Xuong-Photobook.html`); thay đổi ở bộ khởi chạy sẽ có file `.exe` mới trong mục Releases.

Muốn tắt hoặc đổi nguồn cập nhật, đặt file `Xuong-Photobook.cfg` cạnh file `.exe`:

```json
{ "tat_cap_nhat": true }
```

## Dữ liệu nằm ở đâu

Ảnh và album chỉ nằm trên máy đang dùng: bản tự lưu tạm ở bộ nhớ của Edge (`%LOCALAPPDATA%`), bản chính thức là file `.pbook` bạn tự lưu. App không gửi ảnh đi đâu; lần duy nhất app dùng mạng là đọc `version.txt` và tải `Xuong-Photobook.html` từ repo này.

## Phát triển

```
src/page.html        giao diện + CSS
src/js/*.js          mã, ghép theo thứ tự tên file
src/fonts/           phông chữ Google Fonts (giấy phép SIL OFL), nhúng sẵn vào bản dựng
desktop/launcher.py  bộ khởi chạy của file .exe
build.py             dựng Xuong-Photobook.html, đóng gói .exe, đẩy bản mới lên GitHub
server.js            (tuỳ chọn) chạy như trang web trong mạng nội bộ: node server.js 4330
```

Cần Python 3.9+ có PyInstaller và Pillow, Node.js (để kiểm tra cú pháp), GitHub CLI đã đăng nhập.

```bash
py build.py                    # chỉ dựng Xuong-Photobook.html
py build.py --publish          # dựng + đẩy lên GitHub: mọi máy có mạng tự nhận bản mới
py build.py --exe --publish    # như trên + tạo Release kèm file .exe mới
```
