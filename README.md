# FayzFood — MVP (1-bosqich)

Fastfood uchun offline-first PWA: kassa, menyu, ombor, xarajat, hisobot, rollar.

## Ishga tushirish
```
node serve-app.js
```
Brauzerda oching: **http://localhost:8090**

Telefonda: kompyuter bilan bir Wi-Fi'da bo'lib, `http://<kompyuter-IP>:8090` ni oching → brauzer menyusidan "Bosh ekranga qo'shish".

## Kirish (namuna PIN-kodlar)
| Rol | PIN | Ko'radi |
|---|---|---|
| Egasi | **1111** | Hamma narsa: kassa, menyu, ombor, xarajat, hisobot, sozlama |
| Ishchi | **2222** | Faqat kassa va dostavka (tannarx/foyda/xarajat YO'Q) |
| Kuryer | **3333** | Faqat o'ziga biriktirilgan dostavka |

> PIN-kodlar Sozlamalar → Xodimlar bo'limida o'zgartiriladi.

## Tuzilishi
- `index.html`, `manifest.json`, `sw.js` — PWA qobiq + offline
- `js/db.js` — IndexedDB (offline saqlash, sync uchun tayyor)
- `js/seed.js` — boshlang'ich namuna ma'lumotlar
- `js/repo.js` — biznes-logika (tannarx, sotuv, ombor chiqim, hisobot)
- `js/state.js` — rol va kirish huquqlari
- `js/screens/` — ekranlar (kassa, menu, warehouse, expenses, reports, settings, courier)

## Test
```
cd ../test && node logic.test.mjs
```

## Holat
✅ 1-bosqich (MVP): auth+rollar, kassa, menyu+retsept, ombor, xarajat, hisobot, offline baza.
⬜ 2-bosqich: dostavka oqimi, Click to'lov, Telegram hisobot, server sinxronizatsiya.
