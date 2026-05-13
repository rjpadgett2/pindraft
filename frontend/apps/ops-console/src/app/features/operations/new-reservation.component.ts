import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Customer, PricingTemplate } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { OperationsService } from './services/operations.service';
import { TitleCasePipe } from '@angular/common';

/**
 * New reservation form. Includes inline "add walk-in customer" affordance so the
 * operator doesn't have to bounce to another screen.
 */
@Component({
  selector: 'ops-new-reservation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatButtonModule, TitleCasePipe
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back to reservations</a>
      <h1 class="page-title">New reservation</h1>
      <p class="page-subtitle">Book a slot for incoming fiber.</p>

      <div class="form">
        <h2>Customer</h2>
        @if (!addingCustomer()) {
          <div class="row">
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Customer</mat-label>
              <mat-select [(value)]="customerId">
                @for (c of customers(); track c.id) {
                  <mat-option [value]="c.id">{{ c.displayName }} ({{ c.customerKind | titlecase }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-stroked-button (click)="addingCustomer.set(true)">+ Walk-in</button>
          </div>
        } @else {
          <div class="inline-add">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="newCustomerName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Kind</mat-label>
              <mat-select [(value)]="newCustomerKind">
                <mat-option value="SHEPHERD">Shepherd</mat-option>
                <mat-option value="DESIGNER">Designer</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email (optional)</mat-label>
              <input matInput type="email" [(ngModel)]="newCustomerEmail" />
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="!newCustomerName" (click)="saveNewCustomer()">
              Add customer
            </button>
            <button mat-button (click)="addingCustomer.set(false)">Cancel</button>
          </div>
        }

        <h2>Details</h2>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Expected weight (kg)</mat-label>
            <input matInput type="number" min="0" step="0.1" [(ngModel)]="expectedWeightKg" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Slot date</mat-label>
            <input matInput [matDatepicker]="picker" [(ngModel)]="slotDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Pricing template</mat-label>
            <mat-select [(value)]="pricingArrangementId">
              <mat-option [value]="null">— None / TBD —</mat-option>
              @for (t of pricingTemplates(); track t.id) {
                <mat-option [value]="t.id">{{ t.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="actions">
          <button mat-button routerLink="/ops/reservations">Cancel</button>
          <button mat-flat-button color="primary" [disabled]="!canSave()" (click)="save()">
            Save reservation
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .form h2 { font-size: 14px; font-weight: 500; margin: 24px 0 12px; color: #374151; }
    .form h2:first-child { margin-top: 0; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
    .row mat-form-field { min-width: 180px; }
    .row .grow { flex: 1; min-width: 240px; }
    .inline-add { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; background: #f9fafb; padding: 16px; border-radius: 8px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
  `],
})
export class NewReservationComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly customers = signal<Customer[]>([]);
  readonly pricingTemplates = signal<PricingTemplate[]>([]);
  readonly addingCustomer = signal(false);

  customerId: string | null = null;
  pricingArrangementId: string | null = null;
  expectedWeightKg: number = 10;
  slotDate: Date = new Date();

  newCustomerName = '';
  newCustomerKind: 'SHEPHERD' | 'DESIGNER' = 'SHEPHERD';
  newCustomerEmail = '';

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    forkJoin({
      customers: this.ops.listCustomers(tid),
      pricing: this.onboarding.listPricingTemplates(tid),
    }).subscribe(({ customers, pricing }) => {
      this.customers.set(customers);
      this.pricingTemplates.set(pricing);
    });
  }

  canSave(): boolean {
    return !!this.customerId && this.expectedWeightKg > 0 && !!this.slotDate;
  }

  saveNewCustomer(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.newCustomerName) return;
    this.ops.createCustomer(tid, {
      displayName: this.newCustomerName,
      customerKind: this.newCustomerKind,
      email: this.newCustomerEmail || undefined,
    }).subscribe({
      next: (c) => {
        this.customers.update((list) => [...list, c]);
        this.customerId = c.id;
        this.addingCustomer.set(false);
        this.newCustomerName = '';
        this.newCustomerEmail = '';
      },
      error: (e) => this.snack.open('Failed to add: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.customerId) return;
    this.ops.createReservation(tid, {
      customerId: this.customerId,
      pricingArrangementId: this.pricingArrangementId ?? undefined,
      expectedWeightKg: this.expectedWeightKg,
      slotStart: this.slotDate.toISOString(),
    }).subscribe({
      next: () => {
        this.snack.open('Reservation created', 'OK', { duration: 2000 });
        this.router.navigate(['/ops/reservations']);
      },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
