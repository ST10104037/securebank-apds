import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
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
        <h2>Create Account</h2>
        <div *ngIf="successMsg" class="alert alert-success">{{ successMsg }}</div>
        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate autocomplete="off">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" formControlName="fullName" placeholder="e.g. John Smith"
                   [class.invalid]="f['fullName'].invalid && f['fullName'].touched" />
            <span class="error" *ngIf="f['fullName'].errors?.['pattern'] && f['fullName'].touched">Only letters, spaces and hyphens allowed.</span>
          </div>
          <div class="form-group">
            <label>SA ID Number</label>
            <input type="text" formControlName="idNumber" placeholder="13-digit SA ID" maxlength="13"
                   [class.invalid]="f['idNumber'].invalid && f['idNumber'].touched" />
            <span class="error" *ngIf="f['idNumber'].errors?.['pattern'] && f['idNumber'].touched">Must be exactly 13 digits.</span>
          </div>
          <div class="form-group">
            <label>Account Number</label>
            <input type="text" formControlName="accountNumber" placeholder="8–11 digit account number"
                   [class.invalid]="f['accountNumber'].invalid && f['accountNumber'].touched" />
            <span class="error" *ngIf="f['accountNumber'].errors?.['pattern'] && f['accountNumber'].touched">Must be 8–11 digits only.</span>
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" formControlName="username" placeholder="3–30 letters/numbers"
                   [class.invalid]="f['username'].invalid && f['username'].touched" />
            <span class="error" *ngIf="f['username'].errors?.['pattern'] && f['username'].touched">Letters, numbers and underscores only (3–30 chars).</span>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="Min 8 chars, upper, lower, number, special"
                   [class.invalid]="f['password'].invalid && f['password'].touched" />
            <span class="error" *ngIf="f['password'].errors?.['pattern'] && f['password'].touched">
              Min 8 chars with uppercase, lowercase, number and special character (@$!%*?&).
            </span>
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" formControlName="confirmPassword"
                   [class.invalid]="form.errors?.['passwordsMismatch'] && f['confirmPassword'].touched" />
            <span class="error" *ngIf="form.errors?.['passwordsMismatch'] && f['confirmPassword'].touched">Passwords do not match.</span>
          </div>
          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Registering...' : 'Create Account' }}
          </button>
        </form>
        <p class="link-text">Already have an account? <a routerLink="/login">Log In</a></p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s'\-]{2,100}$/)]],
    idNumber: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d{8,11}$/)]],
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,30}$/)]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,64}$/)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordsMatch });

  loading = false;
  errorMsg = '';
  successMsg = '';

  private passwordsMatch(group: AbstractControl) {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordsMismatch: true };
  }

  get f() { return this.form.controls; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMsg = '';
    const { confirmPassword, ...payload } = this.form.value;
    try {
      await this.authService.registerCustomer(payload);
      this.successMsg = 'Registration successful! Redirecting to login...';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (e: any) {
      this.errorMsg = e.message?.includes('email-already-in-use')
        ? 'An account with that account number already exists.'
        : 'Registration failed. Please try again.';
      this.loading = false;
    }
  }
}