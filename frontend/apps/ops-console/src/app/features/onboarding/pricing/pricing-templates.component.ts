import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreatePricingTemplateRequest, PricingKind, PricingTemplate } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, EmptyStateComponent, PageHeaderComponent, SnackbarService,
} from '@pindraft/ui';
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
  imports: [
    RouterLink,
    ButtonComponent, EmptyStateComponent, PageHeaderComponent,
    PricingFormComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <pd-page-header
        title="Pricing templates"
        subtitle="Templates your operators pick from when creating reservations. The template's structure is snapshotted onto the lot at intake, so editing later doesn't affect work already in flight." />

      @if (!loading()) {
        @if (templates().length === 0) {
          <pd-empty-state
            title="No pricing templates yet"
            description="Add at least one — lots can't be invoiced without it." />
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
                <pd-button variant="ghost" size="sm" (click)="remove(t)">Remove</pd-button>
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
          <pd-button variant="primary" (click)="showForm.set(true)">+ Add template</pd-button>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .template-list { list-style: none; padding: 0; margin: 0 0 16px; }
    .template-list li { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border: 1px solid var(--pd-color-border, #e5e7eb); border-radius: 8px; margin-bottom: 8px; }
    .meta { display: flex; gap: 12px; align-items: center; margin-top: 4px; }
    .kind { font-size: 11px; padding: 2px 8px; background: #f3f4f6; color: var(--pd-color-muted, #666); border-radius: 4px; }
    .summary { font-size: 12px; color: var(--pd-color-muted, #666); }
    .section { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: var(--pd-color-text, #111); }
  `],
})
export class PricingTemplatesComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

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
        this.snack.show('Template added', { durationMs: 2000 });
      },
      error: (e) => this.snack.show('Save failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  remove(t: PricingTemplate): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Remove "${t.name}"?`)) return;
    this.onboarding.deactivatePricingTemplate(tid, t.id).subscribe({
      next: () => this.templates.update((list) => list.filter((x) => x.id !== t.id)),
      error: (e) => this.snack.show('Remove failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
