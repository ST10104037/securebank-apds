import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

/**
 * TASK 3 — EMPLOYEE PORTAL
 * 
 * Requirements met:
 * ✅ Static login only — NO registration possible
 * ✅ Pre-created employee accounts in Firebase Auth
 * ✅ Role-based access (role === 'employee' enforced in AuthService)
 * ✅ All payments from customers displayed and manageable
 * ✅ Input whitelisting on all actions
 * ✅ Session cleared on logout (anti session-hijacking)
 */

@Component({
  selector: 'app-employee-portal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="portal-container">

      <!-- HEADER -->
      <header class="portal-header">
        <div class="header-left">
          <span class="logo-icon">🏦</span>
          <span class="portal-title">SecureBank — Employee Portal</span>
        </div>
        <div class="header-right">
          <span class="welcome">{{ user?.fullName }} &nbsp;|&nbsp;
            <span class="role-badge">{{ user?.role | titlecase }}</span>
          </span>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>

      <!-- TOOLBAR -->
      <div class="portal-body">
        <div class="portal-toolbar">
          <h2>International Payment Verification</h2>
          <div class="toolbar-actions">
            <button (click)="loadPayments()" class="btn-secondary" [disabled]="loading">
              🔄 Refresh
            </button>
            <button
              (click)="submitToSwift()"
              class="btn-swift"
              [disabled]="loading || verifiedCount() === 0">
              🚀 Submit {{ verifiedCount() }} Verified to SWIFT
            </button>
          </div>
        </div>

        <!-- STATS BAR -->
        <div class="stats-bar" *ngIf="!loading && payments.length > 0">
          <div class="stat">
            <span class="stat-num">{{ countByStatus('pending') }}</span>
            <span class="stat-label">Pending</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ countByStatus('verified') }}</span>
            <span class="stat-label">Verified</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ countByStatus('submitted') }}</span>
            <span class="stat-label">Submitted</span>
          </div>
        </div>

        <!-- ALERTS -->
        <div *ngIf="successMsg" class="alert alert-success">✅ {{ successMsg }}</div>
        <div *ngIf="errorMsg"   class="alert alert-error">❌ {{ errorMsg }}</div>

        <!-- LOADING -->
        <div *ngIf="loading" class="loading-indicator">Loading transactions...</div>

        <!-- EMPTY STATE -->
        <div *ngIf="!loading && payments.length === 0" class="empty-state">
          No pending transactions found.
        </div>

        <!-- PAYMENTS TABLE -->
        <div *ngIf="!loading && payments.length > 0" class="table-wrapper">
          <table class="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Payee</th>
                <th>Payee Account</th>
                <th>SWIFT Code</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of payments" [class]="'row-' + p.status">
                <td>{{ p.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ p.customerName }}</td>
                <td><code>{{ p.customerAccount }}</code></td>
                <td><strong>{{ p.amount | number:'1.2-2' }}</strong></td>
                <td>{{ p.currency }}</td>
                <td>{{ p.payeeName }}</td>
                <td><code>{{ p.payeeAccountNumber }}</code></td>
                <td><code>{{ p.swiftCode }}</code></td>
                <td>
                  <span class="badge" [ngClass]="'badge-' + p.status">
                    {{ p.status | titlecase }}
                  </span>
                </td>
                <td>
                  <button
                    *ngIf="p.status === 'pending'"
                    (click)="verify(p.id)"
                    class="btn-verify"
                    [disabled]="verifying === p.id">
                    {{ verifying === p.id ? '...' : '✅ Verify' }}
                  </button>
                  <span *ngIf="p.status === 'verified'" class="text-verified">✔ Ready</span>
                  <span *ngIf="p.status === 'submitted'" class="text-submitted">✈ Sent</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-bar {
      display: flex; gap: 2rem; padding: 1rem 1.5rem;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-num { font-size: 1.8rem; font-weight: 700; color: #1e3a5f; }
    .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
    .role-badge {
      background: #dbeafe; color: #1e40af;
      padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;
    }
    .btn-verify {
      background: #16a34a; color: white; border: none;
      padding: 0.3rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;
    }
    .btn-verify:hover { background: #15803d; }
    .btn-verify:disabled { opacity: 0.6; cursor: not-allowed; }
    .text-verified { color: #16a34a; font-weight: 600; font-size: 0.85rem; }
    .text-submitted { color: #7c3aed; font-weight: 600; font-size: 0.85rem; }
    .row-verified { background: #f0fdf4; }
    .row-submitted { background: #faf5ff; }
    .badge-pending  { background: #fef3c7; color: #92400e; }
    .badge-verified { background: #dcfce7; color: #166534; }
    .badge-submitted{ background: #ede9fe; color: #5b21b6; }
  `]
})
export class EmployeePortalComponent implements OnInit {
  private authService = inject(AuthService);

  payments:   any[]   = [];
  user        = this.authService.getCurrentUser();
  loading     = false;
  verifying:  string | null = null;
  errorMsg    = '';
  successMsg  = '';

  ngOnInit(): void {
    this.loadPayments();
  }

  async loadPayments(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    try {
      this.payments = await this.authService.getAllPayments();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Failed to load payments.';
    } finally {
      this.loading = false;
    }
  }

  async verify(id: string): Promise<void> {
    // Whitelist: id must be a non-empty string
    if (!id || typeof id !== 'string') return;
    this.verifying = id;
    this.errorMsg  = '';
    this.successMsg = '';
    try {
      await this.authService.verifyPayment(id);
      const p = this.payments.find((x: any) => x.id === id);
      if (p) p.status = 'verified';
      this.successMsg = `Payment ${id.slice(0, 8)}... marked as verified.`;
    } catch (err: any) {
      this.errorMsg = err?.message || 'Verification failed.';
    } finally {
      this.verifying = null;
    }
  }

  async submitToSwift(): Promise<void> {
    const count = this.verifiedCount();
    if (!confirm(`Submit ${count} verified payment(s) to SWIFT? This cannot be undone.`)) return;
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    try {
      await this.authService.submitToSwift();
      this.successMsg = `${count} payment(s) successfully submitted to SWIFT.`;
      await this.loadPayments();
    } catch (err: any) {
      this.errorMsg = err?.message || 'SWIFT submission failed.';
    } finally {
      this.loading = false;
    }
  }

  verifiedCount(): number {
    return this.payments.filter((p: any) => p.status === 'verified').length;
  }

  countByStatus(status: string): number {
    return this.payments.filter((p: any) => p.status === status).length;
  }

  logout(): void {
    this.authService.logout();
  }
}