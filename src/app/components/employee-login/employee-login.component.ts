import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * TASK 3 — EMPLOYEE LOGIN
 * 
 * ✅ NO registration link or form — employees are pre-created in Firebase
 * ✅ Email + password login with RegEx whitelisting
 * ✅ Role check enforced in AuthService (role must === 'employee')
 * ✅ Error messages do not leak whether email or password was wrong
 *    (generic message prevents user enumeration attacks)
 */

@Component({
  selector: 'app-employee-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">

        <div class="bank-logo">
          <span class="logo-icon">🏦</span>
          <h1>SecureBank</h1>
          <p class="subtitle">Staff Access Portal</p>
        </div>

        <!-- No registration notice — intentional -->
        <div class="info-box">
          🔒 Employee accounts are pre-configured by IT.<br/>
          No self-registration is available on this portal.
        </div>

        <h2>Employee Login</h2>

        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <div *ngIf="attempts >= 3" class="alert alert-warning">
          ⚠️ Multiple failed attempts detected. Account may be temporarily locked by Firebase.
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate autocomplete="off">

          <div class="form-group">
            <label>Staff Email Address</label>
            <input
              type="email"
              formControlName="email"
              placeholder="staff@securebank.co.za"
              autocomplete="off"
              [class.invalid]="f['email'].invalid && f['email'].touched" />
            <span class="error"
              *ngIf="f['email'].errors?.['required'] && f['email'].touched">
              Email is required.
            </span>
            <span class="error"
              *ngIf="f['email'].errors?.['pattern'] && f['email'].touched">
              Please enter a valid email address.
            </span>
          </div>

          <div class="form-group">
            <label>Password</label>
            <input
              type="password"
              formControlName="password"
              autocomplete="off"
              [class.invalid]="f['password'].invalid && f['password'].touched" />
            <span class="error"
              *ngIf="f['password'].errors?.['required'] && f['password'].touched">
              Password is required.
            </span>
            <span class="error"
              *ngIf="f['password'].errors?.['minlength'] && f['password'].touched">
              Password must be at least 8 characters.
            </span>
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Authenticating...' : 'Log In' }}
          </button>
        </form>

      </div>
    </div>
  `,
  styles: [`
    .info-box {
      background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb;
      padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.85rem;
      color: #1e40af; margin-bottom: 1.25rem; line-height: 1.6;
    }
    .alert-warning {
      background: #fffbeb; border: 1px solid #fcd34d;
      color: #92400e; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;
      font-size: 0.875rem;
    }
  `]
})
export class EmployeeLoginComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);

  // ── Email whitelisted: must match standard email format ─────────────────
  // ── Password: minimum 8 characters ──────────────────────────────────────
  form: FormGroup = this.fb.group({
    email: ['', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/),
    ]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading  = false;
  errorMsg = '';
  attempts = 0;   // Track failed attempts for UI warning

  get f() { return this.form.controls; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    try {
      const user = await this.authService.loginEmployee(
        this.form.value.email,
        this.form.value.password,
      );
      this.authService.storeUser(user);
      this.router.navigate(['/employee/portal']);
    } catch (err: any) {
      this.attempts++;
      const code = err?.code || '';

      // Generic error — does NOT reveal whether email or password was wrong
      // (prevents user enumeration attacks)
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password'     ||
        code === 'auth/user-not-found'     ||
        err?.message === 'Not an employee account'
      ) {
        this.errorMsg = 'Invalid credentials. Access denied.';
      } else if (code === 'auth/too-many-requests') {
        this.errorMsg = 'Account temporarily locked due to too many failed attempts. Try again later.';
      } else {
        this.errorMsg = 'Login failed. Please try again.';
      }
      this.loading = false;
    }
  }
}