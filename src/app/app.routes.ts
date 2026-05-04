import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'payment',
    loadComponent: () =>
      import('./components/payment/payment.component').then((m) => m.PaymentComponent),
  },
  {
    path: 'my-payments',
    loadComponent: () =>
      import('./components/my-payments/my-payments.component').then((m) => m.MyPaymentsComponent),
  },
  {
    path: 'employee/login',
    loadComponent: () =>
      import('./components/employee-login/employee-login.component').then((m) => m.EmployeeLoginComponent),
  },
  {
    path: 'employee/portal',
    loadComponent: () =>
      import('./components/employee-portal/employee-portal.component').then((m) => m.EmployeePortalComponent),
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];