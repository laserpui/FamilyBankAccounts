# Family Bank Manager

หน้าเว็บบน GitHub Pages สำหรับจัดเก็บและคัดลอกข้อมูลบัญชีของสมาชิกในครอบครัว โดยใช้ Apps Script Web App และ Google Sheets

## สถานะของเวอร์ชันนี้

- Dashboard พร้อม summary cards
- ค้นหาจากหัวข้อบัญชีหรือข้อมูลบัญชี และกรองตามเจ้าของหรือธนาคาร
- การ์ดแสดงหัวข้อบัญชีที่ตั้งเองได้ พร้อมปุ่มคัดลอกเลขบัญชีและข้อมูลทั้งหมด
- ฟอร์มเพิ่ม/แก้ไข พร้อม validation และสถานะกำลังบันทึก
- dialog ยืนยันการลบ, toast, loading state และ empty state
- navigation หลัก 2 เมนู: Dashboard และจัดการบัญชี ทั้งบนเดสก์ท็อปและมือถือ
- เมนูจัดการบัญชีรวมการเพิ่ม แก้ไข และลบไว้ในจุดเดียว
- เชื่อมข้อมูลผ่านหน้าต่าง Apps Script ที่เปิดด้วยบัญชีเจ้าของ

## ไฟล์

- `Code.gs` — หน้าต่างเชื่อมต่อและฟังก์ชันตั้งค่า อ่าน เพิ่ม แก้ไข และลบบัญชี
- `appsscript.json` — manifest ของ Apps Script และการตั้งค่า Advanced Sheets Service
- `Index.html` — หน้าเว็บบน GitHub Pages
- `TEST_CHECKLIST.md` — รายการตรวจ UX/UI

## ตั้งค่า Google Sheets และ Apps Script

1. สร้าง Google Sheet ส่วนตัวด้วยบัญชีที่จะใช้ลงชื่อเข้าแอป คัดลอก ID ระหว่าง `/d/` และ `/edit` จาก URL ของชีต
2. วางโค้ด `Code.gs` ในโปรเจกต์ Apps Script ที่จะใช้กับแอป เปิดการแสดง manifest ใน **Project Settings** แล้วนำการตั้งค่าจาก `appsscript.json` ไปใส่ใน manifest ของโปรเจกต์ หากโปรเจกต์มีการตั้งค่าอื่น ให้รวมเฉพาะ service และ scope ที่ต้องใช้
3. ใน **Project Settings → Script Properties** เพิ่ม `SPREADSHEET_ID` เป็น ID ของชีต และ `OWNER_EMAIL` เป็นอีเมล Google เจ้าของที่จะใช้แอป
4. หากแท็บ `FamilyBankAccounts` ยังไม่มี ให้รัน `setupSheet` ด้วยบัญชีเจ้าของ โปรแกรมจะสร้างแท็บพร้อมหัวคอลัมน์และตั้งคอลัมน์เลขบัญชีเป็นข้อความ หากพบแท็บเดิมที่หัวคอลัมน์ไม่ตรง โปรแกรมจะแจ้งข้อผิดพลาดเพื่อป้องกันการเขียนผิดตำแหน่ง
5. ใน **Deploy → Manage deployments** เลือก Web app ที่ตรงกับ URL `/exec` ที่ใช้อยู่ กดแก้ไขและเลือก **New version** ตั้ง **Execute as → User accessing the web app** และ **Who has access → Only myself** แล้ว Deploy หากต้องสร้าง Web app ใหม่ ให้คัดลอก URL `/exec` ไปแทนใน meta `apps-script-web-app-url` ของหน้าเว็บ [คู่มือ Apps Script Web App](https://developers.google.com/apps-script/guides/web)

## ใช้งานบน GitHub Pages

1. อัปโหลด `Index.html` เป็น `index.html` ที่ GitHub Pages แล้วเปิด `https://laserpui.github.io/FamilyBankAccounts/` โค้ด Apps Script อนุญาตให้หน้าต่างรับคำขอจาก `https://laserpui.github.io` เท่านั้น
2. กด **เชื่อม Google Sheets** หาก Google ขอสิทธิ์ครั้งแรก ให้ใช้บัญชีเดียวกับ `OWNER_EMAIL` เมื่อหน้าต่างแจ้งว่าเชื่อมต่อแล้ว ให้กลับไปหน้า GitHub Pages และเปิดหน้าต่าง Apps Script ไว้ระหว่างใช้งาน
3. ทดสอบเพิ่มบัญชีสมมติที่ขึ้นต้นด้วยศูนย์ รีเฟรชและกดเชื่อมใหม่ แล้วตรวจว่ารายการยังอยู่ในชีต จากนั้นลองแก้ไขและลบรายการทดสอบ
4. หากป๊อปอัปแจ้งให้เปิดใหม่หลังลงชื่อเข้าใช้ ให้กลับมาที่ GitHub Pages แล้วกดเชื่อมอีกครั้งด้วยเบราว์เซอร์เดียวกัน ตรวจว่าการเผยแพร่ของ Apps Script เป็นเวอร์ชันล่าสุดและ URL ในไฟล์ตรงกับ Web app นั้น

ทุกการอ่านและเขียนตรวจอีเมลจากการเรียกที่ยืนยันตัวตนแล้ว ฝั่งเซิร์ฟเวอร์ตรวจข้อมูลก่อนเขียน ใช้ Script Lock และส่งค่าไปยัง Sheets แบบ `RAW` เพื่อคงเลขศูนย์นำหน้าและเก็บข้อความเป็นข้อมูล

