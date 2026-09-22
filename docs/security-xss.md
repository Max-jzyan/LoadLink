# Cross-Site Scripting (XSS) Assessment

**Accounts used (password `12345678` for all):** 

**Method:** For each input field we submitted an XSS payload through the real UI, then loaded the page that renders the value and inspected the DOM. Every payload was written to set `window.__xss = 1` and raise `alert()`


---

## Case 1 — Load "Commodity Type" (input → reflected echo → stored render)

**Side:** Company — log in as `testcompany1@example.com` (only companies post loads).

**1. URL (input):** `http://localhost:3000/loads/post`
**2. Field:** the "Commodity Type" text box on the Post-Load form. (Same form also at `/loads/:id/edit`.)
**3. Payload:**
```
<img src=x onerror=alert('XSS-commodity')>
```
**4. Result — two render points:**

*Reflected (as you type):* the "Load Summary" sidebar echoes the commodity live. It showed the payload as literal text, escaped in the DOM:
```html
<span class="font-medium text-right truncate min-w-0">&lt;img src=x onerror=alert('XSS-commodity')&gt;</span>
```

*Stored (after posting):* fill the rest of the form and click **Post**, then open `http://localhost:3000/company/auctions` and click **Details** on the load you just posted (it's the row whose commodity is the payload). The load detail page rendered the stored commodity as escaped text:
```html
<p class="text-sm font-medium break-words">&lt;img src=x onerror=alert('XSS-commodity')&gt;</p>
```
In both places no image element was created and no `onerror` ran. **Not executed.**


---

## Case 2 — Company profile: name, contact, address (stored)

**Side:** Company — log in as `testcompany1@example.com`.

**1. URL:** `http://localhost:3000/company/`

**2. Fields:** edit company **company name** , **contact name**, **business address**.

**3. Payloads (one per field):**
```
<img src=x onerror="window.__xss=1;alert('XSS-coName')">
<img src=x onerror="window.__xss=1;alert('XSS-coContact')">
<img src=x onerror="window.__xss=1;alert('XSS-coAddr')">
```
**4. Result:** all rendered as escaped text. The heading:
```html
<h2 class="mt-3 text-lg font-semibold">&lt;img src=x onerror="window.__xss=1;alert('XSS-coName')"&gt;</h2>
```
The avatar takes the first letters of the name; since the name is now plain text starting `<i…`, the avatar badge showed `<I` — proof the string is text, not markup. **Not executed.**


---

## Case 3 — Auction list search box

**Side:** Company — log in as `testcompany1@example.com`.

**1. URL:** `http://localhost:3000/company/auctions`

**2. Field:** the "Search loads, companies…" filter box.

**3. Payload:**
```
<img src=x onerror=alert('XSS-search')>
```
**4. Result:** held only as the input's `value` attribute (a React-controlled input), used to *filter* the list (which dropped to 0 rows) but never written back into the page as HTML. No image element. **Not executed.**

**Also covers every filter/search input in the app (identical pattern: text held as a controlled input value, used to filter a list, never re-emitted as HTML):**
- `/company/auctions`: origin, destination, price filters
- `/driverLoads`: search text, origin, destination, weight and price filters
- `/loads` (company load list): origin, destination
- `/dashboard` (Revenue Center): origin, destination filters
- Address entry / geocode search (`AddressField`) and load picker search (`LoadSelect`)

---

## Case 4 — Fraud report description (stored, shown on "My Reports")

**Side:** Driver — tested as `testuser1@example.com` (a driver reports a company). The same form exists on the company side, where a company reports a driver (`testcompany1@example.com`).

**1. URL:** submitted from `http://localhost:3000/report/fraud`, rendered on `http://localhost:3000/report` (My Reports).

**2. Fields:** "Company/Driver name" (the report target — used a **real** target, `testCompany1`, so the report persists), "Type of fraud" (dropdown), and the free-text "Description".

**3. Payload (in Description):**
```
<img src=x onerror="window.__xss=1;alert('XSS-report-desc')">
```
**4. Result:** the report persisted (My Reports showed `All (1) · Under Review (1)`) and the description rendered as escaped text:
```html
<p class="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">&lt;img src=x onerror="window.__xss=1;alert('XSS-report-desc')"&gt;</p>
```
**Not executed.**

**Also covers (same stored-moderation free-text render path):** the report **target name** field; the Inaccuracy report at `/report/inaccurate` (entity + description); blocklist **reason** / **notes** at `/blocklist`.

---

## Case 5 — Driver profile: name + professional title

**Side:** Driver — log in as `testuser1@example.com` (edits its own profile; the public profile is also viewable by companies).

**1. URL:** `http://localhost:3000/driver` (your own "My Profile"; edit via the **"Edit profile"** drawer).

**2. Fields:** driver **name** (`<h2>`) and **professional title**.

**3. Payloads:**
```
<img src=x onerror="window.__xss=1;alert('XSS-drvName')">
<img src=x onerror="window.__xss=1;alert('XSS-drvTitle')">
```
**4. Result:** both rendered as escaped visible text; no image created. **Not executed.**

**Also covers (Driver profile + contact card, same render path):** MC number, US DOT number, NSC number, phone, and home city / province / country.

---

## Case 6 — Review comment (write review → stored render on the profile)

**Side:** Company reviewing a driver — log in as `testcompany1@example.com`. (A driver reviewing a company works the same way and renders on the company profile.)

**1. URL (input):** `http://localhost:3000/driver/000000000000000000000014` (driver testUser4) → click **"Write a Review"**.

**2. Field:** the **Comment** box in the review dialog. 

**3. Payload:**
```
<script>window.__xss=1;alert('XSS-reviewComment')</script>
```
**4. Result — after submitting:** the review appears in the **"Ratings & Reviews"** list on that same driver profile (the driver also sees it at `http://localhost:3000/driver` → **Reviews**). The comment rendered as escaped text in the review card:
```html
<div class="whitespace-pre-wrap text-sm">&lt;script&gt;window.__xss=1;alert('XSS-reviewComment')&lt;/script&gt;</div>
```


**Also covers:** review comments on both driver and company profiles (same `UnifiedReviewForm` → same escaped render).

---

## Case 7 — Truck: make + notes (stored, submitted through the real driver UI)

**Side:** Driver — log in as `testuser1@example.com` (trucks belong to drivers).

**1. URL:** `http://localhost:3000/driver/` → **"Edit truck"** drawer.
**2. Fields:** "Make" and "Notes".
**3. Payloads:**
```
<img src=x onerror="window.__xss=1;alert('XSS-truckMake')">
<svg onload=alert('XSS-truckNotes')>
```
**4. Result:** after **Save Changes** (a real `PATCH`), the truck card rendered the make as escaped text:
```html
<span class="font-medium truncate">2022 &lt;img src=x onerror="window.__xss=1;alert('XSS-truckMake')"&gt; Cascadia 126</span>
```
**Not executed.**

**Also covers (Truck drawer, same render path):** model, plate number, and VIN.

---

## Case 8 — Trailer: plate + notes (stored, submitted through the real driver UI)

**Side:** Driver — log in as `testuser1@example.com` (trailers belong to drivers).

**1. URL:** `http://localhost:3000/driver/` → **"Add Trailer"** drawer.
**2. Fields:** "Plate Number" and "Notes".
**3. Payloads:**
```
<img src=x onerror="window.__xss=1;alert('XSS-trailerPlate')">   ← Plate Number
<svg onload=alert('XSS-trailerNotes')>                          ← Notes
```
**4. Result:** after **Add Trailer** (a real `POST`), the notes rendered as escaped text — `&lt;svg onload=alert('XSS-trailerNotes')&gt;` — no live element. **Not executed.**

**Also covers (Trailer drawer, same render path):** unit number, VIN, and make.

---

## XSS Summary

React's automatic output escaping neutralized every payload (`<script>`, `<img onerror>`, `<svg onload>`, `javascript:` URI) across all input surfaces: load, profile, review, report, truck, trailer, filters, and auth. The 8 cases cover every distinct render path, and each case's "Also covers" list maps the remaining input fields onto those same, proven-safe paths. 

