# Debug Notes

## Protección PDF
- pikepdf no funciona en producción (ModuleNotFoundError)
- Solución: usar @pdfsmaller/pdf-encrypt-lite (7KB, JS puro, funciona en browser y server)
- Solo soporta RC4 128-bit, no AES
- API: `encryptPDF(pdfBytes, userPassword, ownerPassword?)`
- Peer dep: pdf-lib (ya lo tenemos)
- Se puede hacer client-side directamente, sin servidor

## Paywall Guard
- Todas las herramientas deben funcionar libremente
- Solo al descargar → verificar isPremium
- Si no premium → abrir paywall
- Si premium → descargar directamente
