# Hisobla — universal kalkulyator

Ilmiy kalkulyator, **kasrlar bosqichma-bosqich yechim bilan**, o'lchov konvertori, foiz, BMI va kredit kalkulyatorlari.

- 🌐 Sayt: https://javohir877.github.io/hisobla/
- 📱 Android ilova (APK): https://github.com/Javohir877/hisobla/releases/latest/download/hisobla.apk
  — o'rnatilgandan keyin ilovaning o'zi yangi versiya chiqqanini xabar qiladi va yangilaydi.

## Imkoniyatlar
- Kasrlar aniq hisoblanadi (BigInt): `1/2 + 1/3 = 5/6`, `0,1 + 0,2 = 0,3`, davriy kasrlar `0,(3)`
- Kasrlar bo'limi: amallar, qisqartirish (EKUB, Yevklid), o'nli ⇄ oddiy, taqqoslash va mashq
- 10 ta rang mavzusi, telefonga moslashgan, internetsiz ishlaydi

## Tuzilishi (React + Vite)
```
src/
  main.jsx, App.jsx        — kirish nuqtasi, navigatsiya, umumiy holat
  context.js               — sahifalar ro'yxati va umumiy kontekst
  pages/                   — Home, Calculator, Fractions, Tools (Konvertor, Foiz, BMI, Kredit), Settings
  components/              — Layout (yon menyu, panellar), Sheet, ThemeGrid, FractionInput, UpdateNotice
  lib/math-core.js         — aniq kasr arifmetikasi va ifoda tahlili (React'dan mustaqil)
  lib/fractions.jsx        — kasr yechimlari qadamlari
  styles/app.css           — barcha ko'rinish, mavzular va animatsiyalar
public/                    — ikonkalar, manifest, service worker
android/                   — Android ilova (WebView + yangilanishni o'rnatish)
tests/                     — hisoblash yadrosi testlari
```

## Ishga tushirish
```bash
npm install
npm run dev     # http://localhost:5173  (ilova ko'rinishi: ?app=1)
npm test        # hisoblash testlari
npm run build   # dist/ — sayt va APK uchun
```

GitHub'ga yuklanganda sayt (`pages.yml`) va APK (`android.yml`) avtomatik yig'iladi.

## Litsenziyalar

Emoji rasmlari (`public/emoji/`) — Google [Noto Emoji](https://github.com/googlefonts/noto-emoji), Apache 2.0 litsenziyasi.
