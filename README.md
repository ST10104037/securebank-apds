 
README.MD  
 

Frontend: Angular 17 — Standalone Components  

Authentication: Firebase Authentication (email/password)  

Database Cloud: Firestore (NoSQL) 

Hosting / HTTPS: Firebase Hosting (auto SSL)  

AI Assistance :Claude by Anthropic 

Features Customer  

• Register with: Full Name, ID Number, Account Number, Username, Password 

• Login using Account Number and Password 

• Submit an international payment (amount, currency, payee, SWIFT code)  

• View personal payment history with status badges 

 
 Employee  

• Dedicated login portal (employee@... email accounts)  

• View all pending and verified payments in a table  

• Mark individual payments as Verified  

• Submit all verified payments to SWIFT in one click 

Security Implementation 

3.1 Password Hashing & Salting Firebase  

Authentication handles all password storage. Passwords are never stored in plain text — Firebase applies bcrypt-style hashing with a unique salt per user. This means:  

• Even if the database is compromised, passwords cannot be reversed  

• Two users with the same password get different hashes  

• We never touch the raw password after it leaves the browser 

I used Firebase Authentication to enforce secure password hashing and salting, reducing the risk of misconfiguration that comes with manually implementing bcrypt. 

3.2 Input Whitelisting (RegEx Validation) 

All user inputs are validated before reaching Firebase. Invalid input is rejected with a visible error message. 

Field: RegEx Pattern / Rule  

Full Name: ^[a-zA-Z ]{2,50}$ — letters and spaces only  

ID Number: ^[0-9]{13}$ — exactly 13 digits  

Account Number: ^[0-9]{6,12}$ — 6-12 digits  

Username: ^[a-zA-Z0-9_]{3,20}$ — alphanumeric + underscore  

Payment Amount ^[0-9]+(.[0-9]{1,2})?$ — positive decimal  

SWIFT Code: ^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$ — ISO 9362  

Currency Dropdown: — restricted to: USD, EUR, GBP, ZAR 

3.3 HTTPS / SSL  

The application is hosted on Firebase Hosting which automatically provisions and renews an SSL/TLS certificate. All traffic is encrypted in transit. The HTTPS padlock is visible in the browser address bar.  

• No manual certificate management required  

• HTTP requests are automatically redirected to HTTPS  

• Prevents Man-in-the-Middle (MITM) attacks on data in transit 

3.4 Attack Protection  

• Brute Force: Firebase Authentication enforces automatic rate-limiting and account lockout after repeated failed login attempts 

 • XSS: Angular's template engine escapes all dynamic values by default — no raw innerHTML used  

• Injection: Firestore uses a structured SDK — no raw query strings that could be injected 

 • Session Hijacking: Session data is stored in sessionStorage (cleared on tab close); Firebase ID tokens expire and auto-refresh  

• MITM: Enforced HTTPS with Firebase Hosting prevents traffic interception 

DevSecOps / CI-CD Pipeline 

 A GitHub Actions workflow (.github/workflows/firebase-deploy.yml) runs automatically on every push to the main branch. 

Trigger: git push → main Steps: 1. Checkout code 2. Install Node dependencies (npm ci) 3. Build Angular production bundle (ng build) 4. Deploy to Firebase Hosting (firebase deploy) 

Tools & Ethical Disclosure 

I declare the following tools were used: 

Tool: Purpose & Security Provided  

Firebase Authentication: Password hashing, salting, brute-force protection, session tokens Cloud Firestore Structured NoSQL database — prevents SQL injection by design  

Firebase Hosting Automatic: HTTPS/SSL, CDN, HTTP→HTTPS redirect  

Claude (Anthropic): AI code assistant  

Local Setup 

Clone the repository and navigate to the project folder 

Run: npm install 

Run: npm start (or ng serve) 

Open: http://localhost:4200 

To deploy to Firebase Hosting: 5. Run: npm run build 6. Run: firebase deploy 

Key File Structure 

src/app/ components/ 

 register/ — Customer registration form + validation 

login/ — Customer login  

employee-login/ — Employee login portal 

payment/ — International payment submission form  

my-payments/ — Customer payment history  

employee-portal/ — Employee verification dashboard  

services/  

auth.service.ts — All Firebase calls (Auth + Firestore)  

guards/  

auth.guard.ts — Route protection for customers  

employee.guard.ts — Route protection for employees 

 