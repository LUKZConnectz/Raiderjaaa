# Raiderjaaa Rider Dashboard

เว็บบันทึกค่ารอบสำหรับไรเดอร์ Grab / Delivery ที่ช่วยคำนวณค่าน้ำมันจากระยะทางและอัตราสิ้นเปลืองรถ พร้อม Dashboard สรุปกำไรสุทธิแบบรายวัน รายสัปดาห์ และรายเดือน

## Features

- บันทึกค่ารอบ ระยะทาง หมายเหตุ และวันที่ของแต่ละงาน
- คำนวณน้ำมันที่ใช้จากสูตร `ระยะทาง ÷ กม./ลิตร`
- คำนวณค่าน้ำมันและกำไรสุทธิจาก `ค่ารอบ - ค่าน้ำมัน`
- Dashboard สรุปรายวัน รายสัปดาห์ รายเดือน และกราฟกำไร 7 วันล่าสุด
- Dark Mode / White Mode
- ดึงราคาน้ำมันแบบ Real-time จาก `https://api.chnwt.dev/thai-oil-api/latest` พร้อมโหมดสำรองให้กรอกราคาเองเมื่อ API ไม่ตอบ
- Export ข้อมูลเป็น Excel และ PDF
- Responsive ใช้งานบนมือถือได้

## Run locally

```bash
npm run dev
```

จากนั้นเปิด `http://localhost:5173`

## Build

โปรเจกต์นี้เป็น static web app ที่ใช้ Tailwind CDN จึงไม่มีขั้นตอน build เพิ่มเติม

```bash
npm run build
```
