import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-employee-portal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="portal-container">
      <header class="portal-header">
        <div class="header-left">
          <span class="logo-icon">🏦</span>
          <span class="portal-title">SecureBank — Employee Portal</span>
        </div>
        <div class="header-right">
          <span class="welcome">{{ user?.fullName }} ({{ user?.role }})</span>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>
      <div class="portal-body">
        <div class="portal-toolbar">
          <h2>Pending International Payments</h2>
          <div class="toolbar-actions">
            <button (click)="loadPayments()" class="btn-secondary" [disabled]="loading">🔄 Refresh</button>
            <button (click)="submitToSwift()" class="btn-swift" [disabled]="loading || verifiedCount() === 0">
              🚀 Submit to SWIFT ({{ verifiedCount() }} verified)
            </button>
          </div>
        </div>
        <div *ngIf="successMsg" class="alert alert-success">{{ successMsg }}</div>
        <div *ngIf="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <div *ngIf="loading" class="loading-indicator">Loading transactions...</div>
        <div *ngIf="!loading && payments.length === 0" class="empty-state">No pending transactions.</div>
        <div *ngIf="!loading && payments.length > 0" class="table-wrapper">
          <table class="payments-table">
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>From Account</th>
                <th>Amount</th><th>Currency</th><th>Payee</th>
                <th>Payee Account</th><th>SWIFT Code</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of payments" [class]="'row-' + p.status">
                <td>{{ p.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ p.customerName }}</td>
                <td>{{ p.customerAccount }}</td>
                <td>{{ p.amount | number:'1.2-2' }}</td>
                <td>{{ p.currency }}</td>
                <td>{{ p.payeeName }}</td>
                <td>{{ p.payeeAccountNumber }}</td>
                <td><code>{{ p.swiftCode }}</code></td>
                <td><span class="badge" [class]="'badge-' + p.status">{{ p.status | titlecase }}</span></td>
                <td>
                  <button *ngIf="p.status === 'pending'" (click)="verify(p.id)" class="btn-verify">✅ Verify</button>
                  <span *ngIf="p.status === 'verified'" class="text-verified">✔ Verified</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class EmployeePortalComponent implements OnInit {
  private authService = inject(AuthService);

  payments: any[] = [];
  user = this.authService.getCurrentUser();
  loading = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.loadPayments();
  }

  async loadPayments(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    try {
      this.payments = await this.authService.getAllPayments();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Failed to load payments.';
    } finally {
      this.loading = false;
    }
  }

  async verify(id: string): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';
    try {
      await this.authService.verifyPayment(id);
      const p = this.payments.find((x: any) => x.id === id);
      if (p) p.status = 'verified';
      this.successMsg = 'Payment verified.';
    } catch (err: any) {
      this.errorMsg = err?.message || 'Verification failed.';
    }
  }

  async submitToSwift(): Promise<void> {
    if (!confirm(`Submit ${this.verifiedCount()} verified payment(s) to SWIFT?`)) return;
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    try {
      await this.authService.submitToSwift();
      this.successMsg = 'Payments submitted to SWIFT successfully.';
      await this.loadPayments();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Submission failed.';
    } finally {
      this.loading = false;
    }
  }

  verifiedCount(): number {
    return this.payments.filter((p: any) => p.status === 'verified').length;
  }

  logout(): void {
    this.authService.logout();
  }
}