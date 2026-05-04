import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  Firestore
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8nljtJfARjmjmwURliLQVx_2A02jKNjQ",
  authDomain: "apds-payments.firebaseapp.com",
  projectId: "apds-payments",
  storageBucket: "apds-payments.firebasestorage.app",
  messagingSenderId: "915740652897",
  appId: "1:915740652897:web:6496845743b402edc50120"
};

const app = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { auth, db };

export interface UserProfile {
  fullName: string;
  idNumber: string;
  accountNumber: string;
  username: string;
  email: string;
  role: 'customer' | 'employee';
  uid: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ── Customer Registration ──────────────────────────────────────────────────
  async registerCustomer(data: {
    fullName: string;
    idNumber: string;
    accountNumber: string;
    username: string;
    password: string;
  }): Promise<void> {
    const email = `${data.accountNumber}@apdsbank.local`;
    const cred = await createUserWithEmailAndPassword(auth, email, data.password);

    await setDoc(doc(db, 'users', cred.user.uid), {
      fullName: data.fullName,
      idNumber: data.idNumber,
      accountNumber: data.accountNumber,
      username: data.username,
      email,
      role: 'customer',
      uid: cred.user.uid,
      createdAt: new Date().toISOString(),
    });
  }

  // ── Customer Login ─────────────────────────────────────────────────────────
  async loginCustomer(accountNumber: string, password: string): Promise<UserProfile> {
  const email = `${accountNumber}@apdsbank.local`;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  const profile = snap.data() as UserProfile;
  // Always ensure uid is set from the auth credential, not just Firestore data
  profile.uid = cred.user.uid;
  return profile;
}

  // ── Employee Login ─────────────────────────────────────────────────────────
  async loginEmployee(email: string, password: string): Promise<UserProfile> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    const profile = snap.data() as UserProfile;
    if (profile.role !== 'employee') {
      await signOut(auth);
      throw new Error('Not an employee account');
    }
    return profile;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await signOut(auth);
    if (this.isBrowser) sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  // ── Store / Load user from sessionStorage ─────────────────────────────────
  storeUser(user: UserProfile): void {
    if (this.isBrowser) sessionStorage.setItem('apds_user', JSON.stringify(user));
  }

  getCurrentUser(): UserProfile | null {
    if (!this.isBrowser) return null;
    const raw = sessionStorage.getItem('apds_user');
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  isEmployee(): boolean {
    return this.getCurrentUser()?.role === 'employee';
  }

  // ── Submit Payment ─────────────────────────────────────────────────────────
  async submitPayment(payment: {
    amount: number;
    currency: string;
    provider: string;
    payeeName: string;
    payeeAccountNumber: string;
    swiftCode: string;
  }): Promise<string> {
    const user = this.getCurrentUser()!;
    const ref = await addDoc(collection(db, 'payments'), {
      ...payment,
      customerId: user.uid,
      customerName: user.fullName,
      customerAccount: user.accountNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  }

  // ── Get Customer's Own Payments ────────────────────────────────────────────
  async getMyPayments(): Promise<any[]> {
  const user = this.getCurrentUser();
  if (!user?.uid) throw new Error('Not logged in or session expired.');
  const q = query(collection(db, 'payments'), where('customerId', '==', user.uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

  // ── Employee: Get All Pending/Verified Payments ────────────────────────────
  async getAllPayments(): Promise<any[]> {
    const snap = await getDocs(collection(db, 'payments'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((p: any) => p.status === 'pending' || p.status === 'verified');
  }

  // ── Employee: Verify a Payment ─────────────────────────────────────────────
  async verifyPayment(paymentId: string): Promise<void> {
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'verified',
      verifiedAt: new Date().toISOString(),
    });
  }

  // ── Employee: Submit All Verified to SWIFT ─────────────────────────────────
  async submitToSwift(): Promise<void> {
    const payments = await this.getAllPayments();
    const verified = payments.filter((p: any) => p.status === 'verified');
    for (const p of verified) {
      await updateDoc(doc(db, 'payments', p.id), {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
    }
  }
}