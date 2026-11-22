# Family Bank Manager

หน้าเว็บบน GitHub Pages สำหรับจัดเก็บและคัดลอกข้อมูลบัญชีของสมาชิกในครอบครัว โดยใช้ Apps Script API และ Google Sheets

## สถานะของเวอร์ชันนี้

- Dashboard พร้อม summary cards
- ค้นหาจากหัวข้อบัญชีหรือข้อมูลบัญชี และกรองตามเจ้าของหรือธนาคาร
- การ์ดแสดงหัวข้อบัญชีที่ตั้งเองได้ พร้อมปุ่มคัดลอกเลขบัญชีและข้อมูลทั้งหมด
- ฟอร์มเพิ่ม/แก้ไข พร้อม validation และสถานะกำลังบันทึก
- dialog ยืนยันการลบ, toast, loading state และ empty state
- navigation หลัก 2 เมนู: Dashboard และจัดการบัญชี ทั้งบนเดสก์ท็อปและมือถือ
- เมนูจัดการบัญชีรวมการเพิ่ม แก้ไข และลบไว้ในจุดเดียว
- เชื่อมข้อมูลหลังตั้งค่า API และลงชื่อเข้าใช้ด้วยบัญชี Google ที่ได้รับสิทธิ์

## ไฟล์

- `Code.gs` — ฟังก์ชันตั้งค่า อ่าน เพิ่ม แก้ไข และลบบัญชี
- `appsscript.json` — manifest ของ Apps Script และการตั้งค่า Advanced Sheets Service
- `Index.html` — หน้าเว็บบน GitHub Pages
- `TEST_CHECKLIST.md` — รายการตรวจ UX/UI

## ตั้งค่า Google Sheets และ Apps Script

1. สร้าง Google Sheet ส่วนตัวด้วยบัญชีที่จะใช้ลงชื่อเข้าแอป คัดลอก ID ระหว่าง `/d/` และ `/edit` จาก URL ของชีต
2. วางโค้ด `Code.gs` ในโปรเจกต์ Apps Script ที่จะใช้กับแอป เปิดการแสดง manifest ใน **Project Settings** แล้วนำการตั้งค่าจาก `appsscript.json` ไปใส่ใน manifest ของโปรเจกต์ หากโปรเจกต์มีการตั้งค่าอื่น ให้รวมเฉพาะ service และ scope ที่ต้องใช้
3. ใน **Project Settings → Script Properties** เพิ่ม `SPREADSHEET_ID` เป็น ID ของชีต และ `OWNER_EMAIL` เป็นอีเมล Google เจ้าของที่จะใช้แอป
4. สร้างหรือเลือกโปรเจกต์ Google Cloud แบบมาตรฐาน เปิด **Google Apps Script API** และ **Google Sheets API** แล้วผูก Apps Script กับหมายเลขโปรเจกต์นั้นใน **Project Settings → Google Cloud Platform Project** เปิดสิทธิ์ Apps Script API ใน [Apps Script settings](https://script.google.com/home/usersettings) ด้วย หากบัญชียังปิดอยู่
5. เลือก `setupSheet` ใน Apps Script แล้วกด **Run** ด้วยบัญชีเจ้าของและอนุญาตสิทธิ์ โปรแกรมจะสร้างแท็บ `FamilyBankAccounts` พร้อมหัวคอลัมน์และตั้งคอลัมน์เลขบัญชีเป็นข้อความ แท็บอื่นจะอยู่ตามเดิม หากแท็บนี้มีหัวคอลัมน์ต่างจากที่กำหนด โปรแกรมจะแจ้งข้อผิดพลาดเพื่อป้องกันการเขียนผิดตำแหน่ง
6. ใน Apps Script เลือก **Deploy → New deployment → API Executable** จำกัดผู้เข้าถึงเฉพาะเจ้าของ แล้วคัดลอก **Deployment ID** ของรายการนี้จาก **Manage deployments** การเรียกใช้จากหน้าเว็บใช้ ID ของ API Executable โดยเฉพาะ [คู่มือ Apps Script API](https://developers.google.com/apps-script/api/how-tos/execute)

## ตั้งค่า OAuth และ GitHub Pages

1. ใน Google Cloud โปรเจกต์เดียวกัน ตั้งค่า **OAuth consent screen** และสร้าง **OAuth client ID** ชนิด **Web application** หากแอปอยู่ในโหมด Testing ให้เพิ่มอีเมลเจ้าของใน **Test users**
2. เพิ่มต้นทางของ GitHub Pages ใน **Authorized JavaScript origins** เช่น `https://yourname.github.io` ให้ใช้เฉพาะ scheme และโดเมน ตัดส่วนชื่อ repository ออก [คู่มือ Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)
3. ใน `Index.html` ใส่ Deployment ID ใน `apps-script-api-deployment-id` และ OAuth Client ID ใน `google-oauth-client-id` ทั้งสองค่าตั้งในไฟล์ก่อนเผยแพร่ ส่วนอีเมลเจ้าของและ ID ของชีตอยู่ใน Script Properties
4. อัปโหลด `Index.html` เป็น `index.html` ในส่วนที่ GitHub Pages เผยแพร่ หน้าเว็บจะโหลดจาก GitHub Pages ผู้ใช้กด **ลงชื่อเข้าใช้ Google** เพื่อโหลดรายการบัญชี
5. ทดสอบเพิ่มบัญชีสมมติที่ขึ้นต้นด้วยศูนย์ รีเฟรชแล้วลงชื่อเข้าใช้อีกครั้ง ตรวจเลขบัญชี จากนั้นลองแก้ไขและลบบัญชีทดสอบ ตรวจด้วยบัญชี Google อื่นว่าถูกปฏิเสธ

ทุกการอ่านและเขียนตรวจอีเมลจากการเรียกที่ยืนยันตัวตนแล้ว ฝั่งเซิร์ฟเวอร์ตรวจข้อมูลก่อนเขียน ใช้ Script Lock และส่งค่าไปยัง Sheets แบบ `RAW` เพื่อคงเลขศูนย์นำหน้าและเก็บข้อความเป็นข้อมูล

