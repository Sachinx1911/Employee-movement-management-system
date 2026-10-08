# Hostinger वर Live करणे (Business Web Hosting)

App आणि MySQL database दोन्ही Hostinger वरच राहतील. एकूण वेळ: साधारण 20–30 मिनिटे.

> hPanel मधील बटणांची नावे थोडी वेगळी असू शकतात; खाली दिलेल्या जागा शोधा.

---

## Step 1 — MySQL database बनवा

1. **hPanel → Websites → (तुमची website) → Databases → MySQL Databases** उघडा.
2. नवीन database बनवा:
   - Database name: उदा. `ddsr` → Hostinger त्याला `u123456789_ddsr` असे नाव देईल
   - Username: उदा. `ddsr` → `u123456789_ddsr`
   - Password: मजबूत password (अक्षरे + अंक; `@ # : / ?` टाळल्यास सोपे)
3. **Create** करा. त्याच पानावर दिसणारे हे चार तपशील लिहून ठेवा:
   - **Database name**, **Username**, **Password**
   - **Host** (बहुतेक `localhost`; hPanel वेगळा host दाखवत असेल तर तो वापरा)

तुमचा `DATABASE_URL` असा तयार होईल:

```
mysql://u123456789_ddsr:तुमचा_PASSWORD@localhost:3306/u123456789_ddsr
```

> Password मध्ये `@` असेल तर त्याऐवजी `%40`, `#` → `%23`, `:` → `%3A`, `/` → `%2F` लिहा.

---

## Step 2 — AUTH_SECRET बनवा

तुमच्या laptop वर project folder मध्ये हा command चालवा आणि आलेली ओळ copy करा:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 3 — Node.js App बनवा (GitHub वरून)

1. **hPanel → Websites → Add Website → Node.js Apps** (किंवा *Node.js Web App*).
2. **Import Git repository** निवडा → GitHub account जोडा →
   repository **`Sachinx1911/Employee-movement-management-system`**, branch **`main`**.
3. Build settings:

| Setting | Value |
|---|---|
| Framework | Next.js (आपोआप ओळखेल) |
| Node.js version | **22.x** |
| Root directory | `/` (रिकामे) |
| Install command | `npm install` (default) |
| Build command | **`npm run build`** |
| Start command | **`npm start`** |
| Output directory | `.next` (default) |

4. **Environment variables** मध्ये हे टाका:

| Name | Value |
|---|---|
| `DATABASE_URL` | Step 1 मधील `mysql://...` ओळ |
| `AUTH_SECRET` | Step 2 मधील ओळ |
| `NEXT_PUBLIC_APP_TIMEZONE` | `Asia/Kolkata` |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_ADMIN_PASSWORD` | पहिल्या login साठी admin password (8+ अक्षरे) |

5. Domain निवडा (उदा. `movement.तुमचेdomain.com`) आणि **Deploy** करा.

`npm run build` आपोआप हे करते:
1. database मध्ये सर्व tables बनवते (`prisma migrate deploy`)
2. पहिल्यांदाच `admin` user बनवते (`SEED_ADMIN_PASSWORD` ने) आणि default purposes टाकते
3. app build करते

Deploy log मध्ये `Created user 'admin'` आणि `✓ Compiled successfully` दिसले पाहिजे.

---

## Step 4 — पहिला login

1. `https://तुमचा-domain/login` उघडा.
2. Username **`admin`**, Password = `SEED_ADMIN_PASSWORD`.
3. लगेच **Settings → System & Security → Change Password** ने password बदला.
4. **Settings → Users & Access** मधून office staff साठी users बनवा (role: STAFF).
5. **Master Data** मध्ये खरे कर्मचारी, locations, purposes आणि Authorized By भरा.
6. **Settings → General** मध्ये company माहिती, logo आणि working hours भरा.

---

## Step 5 — तपासणी

- `https://तुमचा-domain/api/health` → `{"status":"ok"}` दिसले पाहिजे.
- New Entry मध्ये एक OUT टाका → Mark IN → Daily Report मध्ये दिसते का ते पहा.
- **SSL**: hPanel → Security → SSL मध्ये certificate active आहे याची खात्री करा (https).
- **Backup**: hPanel → Files → Backups मध्ये daily backup चालू ठेवा.
  App मधून सुद्धा **Settings → Data & Backup → Download Backup** करता येते.

---

## पुढचे updates

GitHub वर `main` branch ला नवीन code push केला की hPanel मधून **Redeploy** करा
(auto-deploy चालू केले असल्यास आपोआप होईल). नवीन database बदल (migrations) build वेळी आपोआप लागू होतात.
`SEED_ADMIN_PASSWORD` पहिल्या deploy नंतर काढून टाकू शकता — admin आधीच असल्याने तो परत वापरला जात नाही.

---

## अडचणी आल्यास

| लक्षण | उपाय |
|---|---|
| Build log: `DATABASE_URL must start with mysql://` | `DATABASE_URL` नीट copy झाला का, सुरुवात `mysql://` ने आहे का |
| Build log: `Access denied for user` | username/password/database name चुकले; password मधील special characters encode करा |
| Build log: `Can't reach database server` | Host `localhost` ऐवजी hPanel मध्ये दाखवलेला MySQL host वापरा |
| Build log: `Set SEED_ADMIN_PASSWORD` | `SEED_ADMIN_PASSWORD` (8+ अक्षरे) env मध्ये टाका |
| App उघडते पण login होत नाही | `AUTH_SECRET` आणि `AUTH_TRUST_HOST=true` env मध्ये आहेत का |
| Server सुरू होत नाही: `Configuration error` | `AUTH_SECRET` किमान 32 अक्षरांचा हवा |
