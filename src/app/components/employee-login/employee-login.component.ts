import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-employee-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="bank-logo">
          <span class="logo-icon">🏦</span>
          <h1>SecureBank</h1>
          <p class="subtitle">Employee Portal</p>
        </div>
        <h2>Employee Login</h2>
        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate autocomplete="off">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" formControlName="email" placeholder="employee@apdsbank.com"
                   [class.invalid]="f['email'].invalid && f['email'].touched" />
            <span class="error" *ngIf="f['email'].errors?.['required'] && f['email'].touched">Email is required.</span>
            <span class="error" *ngIf="f['email'].errors?.['email'] && f['email'].touched">Enter a valid email address.</span>
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
        <p class="link-text"><a routerLink="/login">← Customer Login</a></p>
      </div>
    </div>
  `,
})
export class EmployeeLoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
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
      const user = await this.authService.loginEmployee(
        this.form.value.email,
        this.form.value.password
      );
      this.authService.storeUser(user);
      this.router.navigate(['/employee/portal']);
    } catch {
      this.errorMsg = 'Invalid email or password.';
      this.loading = false;
    }
  }
}