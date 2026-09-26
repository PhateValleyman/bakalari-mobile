# Bakaláři Mobile – TODO

## Hotovo v této iteraci

- [x] Porovnání s veřejným repozitářem Lepší rozvrh.
- [x] Offline cache rozvrhu oddělená podle týdne.
- [x] Přepínání minulý / tento / příští týden.
- [x] Režim stálého rozvrhu přes Bakaláři endpoint.
- [x] Zvýraznění právě probíhající hodiny.
- [x] Značky domácích úkolů, změn a zrušených hodin.
- [x] Detail hodiny s učitelem, místností a poznámkou.
- [x] Motivy systémový, světlý, tmavý a černý.
- [x] Persistovaný výběr motivu a akcentní barvy.
- [x] Záloha a obnova zachovává černý motiv.
- [x] Vitest pokrytí pro week navigation, aktuální hodinu a změny.

## Záměrně mimo scope

- [ ] Android home-screen widgety – vyžadují nativní Android widget extension a vlastní development build; čistý Expo web preview je neumí věrně ověřit.
- [ ] Trvalá systémová notifikace aktuální další hodiny – současná implementace už podporuje lokální připomenutí termínů úkolů; next-lesson notifikace vyžaduje další návrh životního cyklu a synchronizace rozvrhu.

## Následující kandidáti

- [ ] Přidat časovou osu dne a automatický scroll na aktuální hodinu.
- [ ] Přidat nastavení začátku týdne a kompaktní režim pro tablety.
- [ ] Přidat export/import vlastních motivů jako JSON.
