import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Customer, PricingTemplate } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, DatepickerComponent,
  InputComponent, PageHeaderComponent, SelectComponent, SelectOption,
  SnackbarService,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { OperationsService } from './services/operations.service';

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
    ButtonComponent, CardComponent, DatepickerComponent,
    InputComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back to reservations</a>
      <pd-page-header title="New reservation" subtitle="Book a slot for incoming fiber." />

      <div class="form">
        <h2>Customer</h2>
        @if (!addingCustomer()) {
          <div class="row">
            <pd-select class="grow" label="Customer" [(ngModel)]="customerId" [options]="customerOptions()" />
            <pd-button variant="secondary" (click)="addingCustomer.set(true)">+ Walk-in</pd-button>
          </div>
        } @else {
          <pd-card variant="sunken">
            <div class="inline-add">
              <pd-input label="Name" [(ngModel)]="newCustomerName" />
              <pd-select label="Kind" [(ngModel)]="newCustomerKind" [options]="kindOptions" />
              <pd-input label="Email (optional)" type="email" [(ngModel)]="newCustomerEmail" />
              <pd-button variant="primary" [disabled]="!newCustomerName" (click)="saveNewCustomer()">
                Add customer
              </pd-button>
              <pd-button variant="ghost" (click)="addingCustomer.set(false)">Cancel</pd-button>
            </div>
          </pd-card>
        }

        <h2>Details</h2>
        <div class="row">
          <pd-input label="Expected weight (kg)" type="number" [(ngModel)]="expectedWeightKg" />
          <pd-datepicker label="Slot date" [(ngModel)]="slotDate" />
          <pd-select class="grow" label="Pricing template" [(ngModel)]="pricingArrangementId" [options]="pricingOptions()" />
        </div>

        <div class="actions">
          <pd-button variant="ghost" routerLink="/ops/reservations">Cancel</pd-button>
          <pd-button variant="primary" [disabled]="!canSave()" (click)="save()">
            Save reservation
          </pd-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .form h2 { font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--pd-color-text, #111); }
    .form h2:first-child { margin-top: 0; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
    .row .grow { flex: 1; min-width: 240px; }
    .inline-add { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
  `],
})
export class NewReservationComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly customers = signal<Customer[]>([]);
  readonly pricingTemplates = signal<PricingTemplate[]>([]);
  readonly addingCustomer = signal(false);

  readonly customerOptions = computed<SelectOption[]>(() =>
    this.customers().map((c) => ({
      value: c.id,
      label: `${c.displayName} (${c.customerKind.toLowerCase()})`,
    })),
  );
  readonly pricingOptions = computed<SelectOption[]>(() => [
    { value: '', label: '— None / TBD —' },
    ...this.pricingTemplates().map((t) => ({ value: t.id, label: t.name })),
  ]);

  readonly kindOptions: SelectOption[] = [
    { value: 'SHEPHERD', label: 'Shepherd' },
    { value: 'DESIGNER', label: 'Designer' },
  ];

  customerId: string | null = null;
  pricingArrangementId: string = '';
  expectedWeightKg = 10;
  slotDate = new Date().toISOString().slice(0, 10);

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
      error: (e) => this.snack.show('Failed to add: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.customerId) return;
    // pd-datepicker returns YYYY-MM-DD; convert to ISO datetime at noon UTC.
    const slotIso = new Date(`${this.slotDate}T12:00:00Z`).toISOString();
    this.ops.createReservation(tid, {
      customerId: this.customerId,
      pricingArrangementId: this.pricingArrangementId || undefined,
      expectedWeightKg: this.expectedWeightKg,
      slotStart: slotIso,
    }).subscribe({
      next: () => {
        this.snack.show('Reservation created', { durationMs: 2000 });
        this.router.navigate(['/ops/reservations']);
      },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
