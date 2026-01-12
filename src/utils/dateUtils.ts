import { useEffect } from "react";

export const formatThaiDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatThaiDateTime = (dateString: string): string => {
  // 1. สร้างวัตถุ Date จาก dateString
  // JavaScript จะจัดการการแปลงเป็น UTC ภายในวัตถุ Date
  const dateObj = new Date(dateString);

  // 2. ใช้ Intl.DateTimeFormat พร้อมระบุ timeZone: "Asia/Bangkok"
  // เพื่อให้ระบบทำการแปลงเวลาและแสดงผลเป็นภาษาไทยได้อย่างถูกต้อง
  const formatter = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok", // *** จุดสำคัญที่เพิ่มเข้ามา ***
  });

  // 3. จัดรูปแบบและจัดการกับ " น."
  const formattedDate = formatter.format(dateObj);

  // ตรวจสอบและจัดการกับการเพิ่ม " น." (นาฬิกา)
  if (formattedDate.endsWith(" น.")) {
    return formattedDate; // ถ้ามีอยู่แล้ว ไม่ต้องทำอะไร
  } else {
    // โค้ดเดิมของคุณ: .replace(" น.", "") + " น." อาจจะใช้ไม่ได้เสมอไป
    // ให้เพิ่ม " น." ต่อท้ายเลย
    return formattedDate + " น."; 
  }
};

export const toBangkokDate = (date: Date) =>
  date.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });

export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // เดือนนับจาก 0
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
