import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, InputComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { ListingKind, ListingsService } from './services/listings.service';

@Component({
  selector: 'ops-new-listing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, InputComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/marketplace/listings" class="back">← Back to listings</a>
      <pd-page-header title="New listing" subtitle="Drafts are private until you publish them." />

      <div class="form">
        <pd-select label="Kind" [(ngModel)]="kind" [options]="kindOptions" />
        <pd-input label="Title" [(ngModel)]="title" />

        <label class="textarea-field">
          <span>Description (optional)</span>
          <textarea rows="3" [(ngModel)]="description" name="description"></textarea>
        </label>

        <div class="row">
          <pd-input label="Price per kg ($)" type="number" [(ngModel)]="pricePerKg" />
          <pd-input label="Quantity (kg)" type="number" [(ngModel)]="quantityKg" />
        </div>

        <div class="trace-field">
          <pd-input label="Trace slug (optional)" [(ngModel)]="traceSlug"
                    helper="Attach a lot's provenance trace. Public viewers see the journey." />
        </div>

        <div class="actions">
          <pd-button variant="ghost" routerLink="/marketplace/listings">Cancel</pd-button>
          <pd-button variant="primary" [disabled]="!canSave()" (click)="save()">
            Create draft
          </pd-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    pd-input, pd-select { display: block; }
    .row { display: flex; gap: 12px; }
    .row pd-input { flex: 1; }
    .textarea-field { display: flex; flex-direction: column; gap: 4px; }
    .textarea-field span { font-size: 12px; font-weight: 600; color: var(--pd-color-muted, #6b7280); }
    .textarea-field textarea {
      padding: 10px 12px;
      border: 1px solid var(--pd-color-border, #d1d5db);
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      background: white;
    }
    .textarea-field textarea:focus { outline: none; border-color: var(--pd-brand-accent, #2563eb); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class NewListingComponent {
  private service = inject(ListingsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly kindOptions: SelectOption[] = [
    { value: 'YARN', label: 'Yarn' },
    { value: 'ROVING', label: 'Roving' },
    { value: 'FLEECE', label: 'Fleece' },
    { value: 'BLANK', label: 'Felted / woven panel' },
    { value: 'OTHER', label: 'Other' },
  ];

  kind: ListingKind = 'YARN';
  title = '';
  description = '';
  pricePerKg = 0;
  quantityKg = 0;
  traceSlug = '';

  canSave(): boolean {
    return this.title.trim().length > 0 && this.pricePerKg > 0 && this.quantityKg > 0;
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.create(tid, {
      kind: this.kind,
      title: this.title.trim(),
      description: this.description || undefined,
      pricePerKg: this.pricePerKg,
      quantityKg: this.quantityKg,
      traceSlug: this.traceSlug.trim().toUpperCase() || undefined,
    }).subscribe({
      next: () => {
        this.snack.show('Listing drafted', { durationMs: 1500 });
        this.router.navigate(['/marketplace/listings']);
      },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
