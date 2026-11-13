# Hisobla — universal kalkulyator

Ilmiy kalkulyator, **kasrlar bosqichma-bosqich yechim bilan**, o'lchov konvertori, foiz, BMI va kredit kalkulyatorlari.

- 🌐 Sayt: https://javohir877.github.io/hisobla/
- 📱 Android ilova (APK): https://github.com/Javohir877/hisobla/releases/latest/download/hisobla.apk

## Imkoniyatlar
- Kasrlar aniq hisoblanadi: `1/2 + 1/3 = 5/6`, `0,1 + 0,2 = 0,3`, davriy kasrlar `0,(3)`
- Kasrlar bo'limi: amallar, qisqartirish (EKUB, Yevklid algoritmi), o'nli ⇄ oddiy, taqqoslash va **mashq**
- Qora va yorug' mavzu, telefonga moslashgan, internetsiz ishlaydi (PWA)

## Tuzilishi
- `index.html`, `style.css`, `app.js` — sayt
- `math-core.js` — BigInt asosidagi aniq kasr arifmetikasi
- `sw.js`, `manifest.webmanifest` — o'rnatiladigan ilova (PWA)
- `android/` — Android WebView ilovasi; APK `.github/workflows/android.yml` orqali avtomatik yig'iladi
