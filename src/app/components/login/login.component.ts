import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="bank-logo">
          <span class="logo-icon">🏦</span>
          <h1>SecureBank</h1>
          <p class="subtitle">International Payments Portal</p>
        </div>
        <h2>Customer Login</h2>
        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate autocomplete="off">
          <div class="form-group">
            <label>Account Number</label>
            <input type="text" formControlName="accountNumber" placeholder="8–11 digit account number"
                   [class.invalid]="f['accountNumber'].invalid && f['accountNumber'].touched" />
            <span class="error" *ngIf="f['accountNumber'].errors?.['required'] && f['accountNumber'].touched">Account number is required.</span>
            <span class="error" *ngIf="f['accountNumber'].errors?.['pattern'] && f['accountNumber'].touched">Must be 8–11 digits only.</span>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password"
                   [class.invalid]="f['password'].invalid && f['password'].touched" />
            <span class="error" *ngIf="f['password'].errors?.['required'] && f['password'].touched">Password is required.</span>
          </div>
          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Logging in...' : 'Log In' }}
          </button>
        </form>
        <p class="link-text">New customer? <a routerLink="/register">Create Account</a></p>
        <p class="link-text"><a routerLink="/employee/login">Employee Login →</a></p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d{8,11}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = false;
  errorMsg = '';
  get f() { return this.form.controls; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMsg = '';
    try {
      const user = await this.authService.loginCustomer(
        this.form.value.accountNumber,
        this.form.value.password
      );
      this.authService.storeUser(user);
      this.router.navigate(['/payment']);
    } catch (err: any) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    this.errorMsg = 'Incorrect account number or password.';
  } else {
    this.errorMsg = 'Login failed. Please try again.';
  }
  this.loading = false;
}
  }
}