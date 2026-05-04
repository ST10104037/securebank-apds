import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-payments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="portal-container">
      <header class="portal-header">
        <div class="header-left">
          <span class="logo-icon">🏦</span>
          <span class="portal-title">SecureBank — My Payments</span>
        </div>
        <div class="header-right">
          <a routerLink="/payment" class="btn-secondary">New Payment</a>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>
      <div class="portal-body">
        <h2>My Payment History</h2>
        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <div *ngIf="loading" class="loading-indicator">Loading...</div>
        <div *ngIf="!loading && payments.length === 0" class="empty-state">No payments submitted yet.</div>
        <div *ngIf="!loading && payments.length > 0" class="table-wrapper">
          <table class="payments-table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Currency</th><th>Payee</th><th>SWIFT</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of payments">
                <td>{{ p.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ p.amount | number:'1.2-2' }}</td>
                <td>{{ p.currency }}</td>
                <td>{{ p.payeeName }}</td>
                <td><code>{{ p.swiftCode }}</code></td>
                <td><span class="badge" [class]="'badge-' + p.status">{{ p.status | titlecase }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class MyPaymentsComponent implements OnInit {
  private authService = inject(AuthService);
  payments: any[] = [];
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.loadPayments();
  }

  
async loadPayments(): Promise<void> {
  this.loading = true;
  this.errorMsg = '';
  try {
    const user = this.authService.getCurrentUser();
    console.log('Current user from session:', user); // ← ADD THIS
    if (!user?.uid) {
      this.errorMsg = 'Session expired. Please log in again.';
      this.loading = false;
      return;
    }
    this.payments = await this.authService.getMyPayments();
    console.log('Payments loaded:', this.payments); // ← ADD THIS
  } catch (err: any) {
    console.error('Payment load error:', err); // ← ADD THIS
    this.errorMsg = err?.message || 'Failed to load payments.';
  } finally {
    this.loading = false;
  }
}

  logout(): void {
    this.authService.logout();
  }
}