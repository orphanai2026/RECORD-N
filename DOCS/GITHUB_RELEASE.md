# تسجيل الإصدار على GitHub

## GitHub Desktop
1. انسخ ملفات الحزمة إلى مجلد المستودع.
2. Summary:
   `Release v0.4.0 — Ney Meyar`
3. اضغط Commit to main ثم Push origin.
4. من موقع GitHub افتح Releases ثم Draft a new release.
5. أنشئ Tag باسم `v0.4.0`.
6. العنوان: `مِعيار الناي v0.4.0`.
7. استخدم محتوى RELEASE_NOTES_v0.4.0.md.
8. اضغط Publish release.

يسجل GitHub تاريخ ووقت الـCommit والـTag والـRelease.

## الأوامر
```bash
git add .
git commit -m "Release v0.4.0 — Ney Meyar"
git push origin main
git tag -a v0.4.0 -m "Ney Meyar v0.4.0 — 2026-08-02"
git push origin v0.4.0
```
