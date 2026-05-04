import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="portal-container">
      <header class="portal-header">
        <div class="header-left">
          <span class="logo-icon">🏦</span>
          <span class="portal-title">SecureBank — International Payment</span>
        </div>
        <div class="header-right">
          <span class="welcome">Welcome, {{ user?.fullName }}</span>
          <a routerLink="/my-payments" class="btn-secondary">My Payments</a>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>
      <div class="form-card">
        <h2>New International Payment</h2>
        <div *ngIf="successMsg" class="alert alert-success">{{ successMsg }}</div>
        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label>Amount</label>
              <input type="text" formControlName="amount" placeholder="e.g. 1500.00"
                     [class.invalid]="f['amount'].invalid && f['amount'].touched" />
              <span class="error" *ngIf="f['amount'].errors?.['pattern'] && f['amount'].touched">Enter a valid positive amount (e.g. 1500.00).</span>
            </div>
            <div class="form-group">
              <label>Currency</label>
              <select formControlName="currency" [class.invalid]="f['currency'].invalid && f['currency'].touched">
                <option value="">Select currency</option>
                <option *ngFor="let c of currencies" [value]="c">{{ c }}</option>
              </select>
              <span class="error" *ngIf="f['currency'].errors?.['required'] && f['currency'].touched">Please select a currency.</span>
            </div>
          </div>
          <div class="form-group">
            <label>Payment Provider</label>
            <select formControlName="provider">
              <option value="SWIFT">SWIFT</option>
            </select>
          </div>
          <hr class="section-divider" />
          <h3>Payee / Recipient Details</h3>
          <div class="form-group">
            <label>Payee Full Name</label>
            <input type="text" formControlName="payeeName" placeholder="Recipient full name"
                   [class.invalid]="f['payeeName'].invalid && f['payeeName'].touched" />
            <span class="error" *ngIf="f['payeeName'].errors?.['pattern'] && f['payeeName'].touched">Only letters, spaces and hyphens allowed.</span>
          </div>
          <div class="form-group">
            <label>Payee Account Number</label>
            <input type="text" formControlName="payeeAccountNumber" placeholder="8–11 digits"
                   [class.invalid]="f['payeeAccountNumber'].invalid && f['payeeAccountNumber'].touched" />
            <span class="error" *ngIf="f['payeeAccountNumber'].errors?.['pattern'] && f['payeeAccountNumber'].touched">Must be 8–11 digits only.</span>
          </div>
          <div class="form-group">
            <label>SWIFT / BIC Code</label>
            <input type="text" formControlName="swiftCode" placeholder="e.g. ABCDZAJJXXX" maxlength="11"
                   style="text-transform:uppercase"
                   [class.invalid]="f['swiftCode'].invalid && f['swiftCode'].touched" />
            <span class="error" *ngIf="f['swiftCode'].errors?.['pattern'] && f['swiftCode'].touched">Invalid SWIFT code — must be 8 or 11 uppercase letters/digits.</span>
          </div>
          <button type="submit" class="btn-primary btn-large" [disabled]="loading">
            {{ loading ? 'Processing...' : '💳 Pay Now' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class PaymentComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  currencies = ['USD', 'EUR', 'GBP', 'ZAR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];
  user = this.authService.getCurrentUser();
  loading = false;
  errorMsg = '';
  successMsg = '';

  form: FormGroup = this.fb.group({
    amount: ['', [Validators.required, Validators.pattern(/^\d{1,10}(\.\d{1,2})?$/)]],
    currency: ['', Validators.required],
    provider: ['SWIFT', Validators.required],
    payeeName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s'\-]{2,100}$/)]],
    payeeAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{8,11}$/)]],
    swiftCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/)]],
  });

  get f() { return this.form.controls; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMsg = '';
    try {
      const id = await this.authService.submitPayment({
        ...this.form.value,
        amount: parseFloat(this.form.value.amount),
      });
      this.successMsg = `Payment submitted successfully! Reference: ${id}`;
      this.form.reset();
      this.form.patchValue({ provider: 'SWIFT' });
    } catch {
      this.errorMsg = 'Payment failed. Please try again.';
    }
    this.loading = false;
  }

  async logout(): Promise<void> { await this.authService.logout(); }
}