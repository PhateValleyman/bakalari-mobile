# Bakaláři API kontrakt

Ověřené zdroje:

- API v3 repository: https://github.com/bakalari-api/bakalari-api-v3
- Absence module: https://raw.githubusercontent.com/bakalari-api/bakalari-api-v3/master/moduly/absence.md

Aplikace používá `POST /api/login` s OAuth password grantem (`client_id=ANDR`) a rotací `refresh_token`. Aktuální rozvrh se načítá z `GET /api/3/timetable/actual?date=YYYY-MM-DD`, známky z `GET /api/3/marks` a absence z `GET /api/3/absence/student`.

Absence response obsahuje `PercentageThreshold`, `Absences[]` a volitelně `AbsencesPerSubject[]`; subject data mohou být prázdná bez oprávnění `ShowAbsencePercentage`.
