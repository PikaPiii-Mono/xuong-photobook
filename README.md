# Xưởng Photobook

App dàn trang album photobook chạy độc lập trên Windows. Mỗi máy là một bản riêng: không cần tài khoản, không cần máy chủ, không cần mạng.

**[⬇ Tải Xuong-Photobook.exe (bản mới nhất)](https://github.com/PikaPiii-Mono/xuong-photobook/releases/latest/download/Xuong-Photobook.exe)**

Nhấp đúp là chạy, không cần cài đặt. Lần đầu, Windows có thể báo *"Windows protected your PC"* vì file chưa có chữ ký số: bấm **More info → Run anyway**.

## Làm được gì

- Hơn 50 bố cục: tràn viền, 1–12 ảnh, collage, polaroid, trải đôi (panorama vắt gáy), kiểu tạp chí có chữ, bìa.
- Khổ album tuỳ ý (20×20, 30×30, A4…), bìa gồm bìa sau, gáy và bìa trước; số trang hiển thị rõ.
- Đọc JPG, PNG, WebP, AVIF, GIF, BMP, **HEIC/HEIF (iPhone)**, **TIFF** và **ảnh RAW máy ảnh** (DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2…: lấy ảnh JPEG cỡ lớn máy ảnh nhúng sẵn trong file, xoay đúng chiều). Ảnh HEIC/TIFF/RAW được chuyển sang JPEG 95% ở độ phân giải gốc; chạy offline.
- Thư viện tới 1000 ảnh. Ảnh thêm vào nằm chờ trong thư viện để bạn tự kéo vào khung (bật công tắc "Tự xếp khi thêm ảnh" nếu muốn app xếp hộ); nút "Gỡ hết ảnh khỏi khung" đưa mọi ảnh về thư viện, có hoàn tác.
- Thước cm hai bên, đường gióng kéo từ thước, hút dính, căn khung, cắt và xoay ảnh trong khung.
- Xem dạng sách lật trang.
- **Xuất file in**: PDF (có TrimBox/BleedBox), JPG hoặc PNG 300 dpi, tràn lề, dấu cắt, kiểm tra ảnh thiếu nét trước khi in.
- **Trình chiếu và xuất PowerPoint (.pptx)**: mỗi slide là một tờ album, một trang hoặc một ảnh; nền ảnh đổ mờ (chỉnh độ mờ, độ tối) hoặc nền màu; ảnh có lề kèm bóng đổ, sát mép hoặc tràn kín; hiệu ứng chuyển của PowerPoint (mờ dần, mờ qua đen, hoà tan, đẩy trượt, vén màn, phóng to, ngẫu nhiên); phóng chậm ảnh khi chiếu; tự chuyển slide, lặp lại; slide mở đầu và lời kết bằng chữ, sửa tiếp được trong PowerPoint. Có xem trước và chiếu toàn màn hình ngay trong app.
- **Nhạc nền**: thêm tới 12 bài (MP3, M4A, WAV, AAC, WMA, OGG, FLAC), xếp lại thứ tự, chỉnh âm lượng, lặp lại danh sách. Nhạc chạy khi xem trước và chiếu toàn màn hình trong app, và được **nhúng sẵn vào file .pptx**: PowerPoint tự phát, chạy xuyên các slide, hết bài thì bài sau vào đúng chỗ (nhúng được MP3, M4A, WAV, AAC, WMA — các loại khác app vẫn phát nhưng PowerPoint không nhận).
- **Lưu trữ**: tự lưu tạm liên tục; lưu và mở album bằng file `.pbook` (chứa đủ bố cục, ảnh gốc và nhạc nền, mang sang máy khác mở được ngay).

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
vendor/              bộ giải mã ảnh của bên thứ ba, giữ nguyên dạng file riêng
```

Thư viện bên thứ ba trong `vendor/` (chỉ được tải khi gặp đúng loại file):

| File | Dự án | Giấy phép |
|---|---|---|
| `libheif-bundle.js` | [libheif](https://github.com/strukturag/libheif) qua [libheif-js](https://github.com/catdad-experiments/libheif-js) 1.23.5 | LGPL-3.0 (`LICENSE-libheif.txt`) — mã nguồn tại hai liên kết bên cạnh; thay file này bằng bản build khác cùng API là app dùng được |
| `UTIF.js` | [UTIF.js](https://github.com/photopea/UTIF.js) 3.1.0 | MIT (`LICENSE-utif.txt`) |
| `pako_inflate.min.js` | [pako](https://github.com/nodeca/pako) 2.1.0 | MIT (`LICENSE-pako.txt`) |

Cần Python 3.9+ có PyInstaller và Pillow, Node.js (để kiểm tra cú pháp), GitHub CLI đã đăng nhập.

```bash
py build.py                    # chỉ dựng Xuong-Photobook.html
py build.py --publish          # dựng + đẩy lên GitHub: mọi máy có mạng tự nhận bản mới
py build.py --exe --publish    # như trên + tạo Release kèm file .exe mới
```
