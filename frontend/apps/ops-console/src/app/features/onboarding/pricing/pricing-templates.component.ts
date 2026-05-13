import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { CreatePricingTemplateRequest, PricingKind, PricingTemplate } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { OnboardingService } from '../services/onboarding.service';
import { PricingFormComponent } from './pricing-form.component';

/**
 * Pricing templates list + add. Smart parent — fetches templates, dispatches saves
 * and deactivations. The add form is a presentational child that emits a save event.
 */
@Component({
  selector: 'ops-pricing-templates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, RouterLink, PricingFormComponent],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <h1 class="page-title">Pricing templates</h1>
      <p class="page-subtitle">
        Templates your operators pick from when creating reservations. The template's
        structure is snapshotted onto the lot at intake, so editing later doesn't
        affect work already in flight.
      </p>

      @if (!loading()) {
        @if (templates().length === 0) {
          <div class="empty">
            No pricing templates yet. Add at least one — lots can't be invoiced without it.
          </div>
        } @else {
          <ul class="template-list">
            @for (t of templates(); track t.id) {
              <li>
                <div>
                  <strong>{{ t.name }}</strong>
                  <div class="meta">
                    <span class="kind">{{ kindLabel(t.kind) }}</span>
                    <span class="summary">{{ summarize(t) }}</span>
                  </div>
                </div>
                <button mat-button color="warn" (click)="remove(t)">Remove</button>
              </li>
            }
          </ul>
        }

        @if (showForm()) {
          <h2 class="section">Add template</h2>
          <ops-pricing-form
            (save)="onSave($event)"
            (cancel)="showForm.set(false)" />
        } @else {
          <button mat-flat-button color="primary" (click)="showForm.set(true)">
            + Add template
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .empty { padding: 24px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; margin-bottom: 16px; }
    .template-list { list-style: none; padding: 0; margin: 0 0 16px; }
    .template-list li { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; }
    .meta { display: flex; gap: 12px; align-items: center; margin-top: 4px; }
    .kind { font-size: 11px; padding: 2px 8px; background: #f3f4f6; color: #666; border-radius: 4px; }
    .summary { font-size: 12px; color: #666; }
    .section { font-size: 14px; font-weight: 500; margin: 16px 0 8px; }
  `],
})
export class PricingTemplatesComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly templates = signal<PricingTemplate[]>([]);
  readonly showForm = signal(false);

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.onboarding.listPricingTemplates(tid).subscribe({
      next: (list) => {
        this.templates.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  kindLabel(k: PricingKind): string {
    switch (k) {
      case 'PER_POUND': return 'Per pound';
      case 'HYBRID': return 'Flat + per pound';
      case 'TIERED_BY_GRADE': return 'Tiered by grade';
      case 'REVENUE_SPLIT': return 'Revenue split';
    }
  }

  summarize(t: PricingTemplate): string {
    try {
      const cfg = JSON.parse(t.configJson);
      switch (t.kind) {
        case 'PER_POUND': return `$${cfg.pricePerKg.toFixed(2)} per kg`;
        case 'HYBRID': return `$${cfg.flatFee.toFixed(2)} flat + $${cfg.pricePerKg.toFixed(2)}/kg`;
        case 'REVENUE_SPLIT': return `${cfg.millPercent}% mill / ${cfg.brandPercent}% brand`;
        case 'TIERED_BY_GRADE': return `${cfg.tiers.length} tier${cfg.tiers.length === 1 ? '' : 's'}`;
      }
    } catch { return ''; }
  }

  onSave(req: CreatePricingTemplateRequest): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.onboarding.createPricingTemplate(tid, req).subscribe({
      next: (t) => {
        this.templates.update((list) => [...list, t]);
        this.showForm.set(false);
        this.snack.open('Template added', 'OK', { duration: 2000 });
      },
      error: (e) => this.snack.open('Save failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  remove(t: PricingTemplate): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Remove "${t.name}"?`)) return;
    this.onboarding.deactivatePricingTemplate(tid, t.id).subscribe({
      next: () => this.templates.update((list) => list.filter((x) => x.id !== t.id)),
      error: (e) => this.snack.open('Remove failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
