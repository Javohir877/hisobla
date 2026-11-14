import { createContext, useContext } from "react";

/* Butun ilova bo'ylab umumiy holat: sahifa, sozlamalar, tarix, mashq natijalari, xabarlar */
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

/* Android ilova ichidami yoki o'rnatilgan PWA — index.html dagi skript belgilaydi */
export const IS_APP = document.documentElement.classList.contains("app-mode");
export const NATIVE = window.HisoblaNative || null;
export const APP_VERSION = (navigator.userAgent.match(/HisoblaApp\/([\d.]+)/) || [])[1] || null;
export const SITE_URL = "https://javohir877.github.io/hisobla/";
export const APK_URL = "https://github.com/Javohir877/hisobla/releases/latest/download/hisobla.apk";

export const PAGES = {
  home: { title: "Hisobla", desc: "Barcha hisob-kitoblar bir joyda." },
  calculator: { title: "Kalkulyator", desc: "Kundalik va murakkab hisob-kitoblar uchun. Kasrlar aniq hisoblanadi." },
  fractions: { title: "Kasrlar", desc: "Oddiy kasrlar ustida amallar — bosqichma-bosqich tushuntirish bilan." },
  converter: { title: "Konvertor", desc: "Uzunlik, og'irlik, harorat va boshqa birliklarni o'tkazing." },
  percent: { title: "Foiz kalkulyatori", desc: "Foizni hisoblang yoki qiymatdagi o'zgarishni toping." },
  bmi: { title: "Tana massasi (BMI)", desc: "Bo'yingiz va vazningizga qarab tana massasi indeksini hisoblang." },
  loan: { title: "Kredit kalkulyatori", desc: "Oylik to'lov va kredit bo'yicha jami xarajatni hisoblang." },
  settings: { title: "Sozlamalar", desc: "Ilovani o'zingizga moslang." }
};

/* Ilovada Asosiy sahifadan ochiladigan kichik vositalar ("orqaga" tugmasi bilan) */
export const SUB_PAGES = ["converter", "percent", "bmi", "loan"];
