import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, InputComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { PoolKind, PoolsService } from './services/pools.service';

@Component({
  selector: 'ops-new-pool',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, InputComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/pools" class="back">← Back to pools</a>
      <pd-page-header title="New pool" subtitle="New pools open in ACCEPTING state." />

      <div class="form">
        <pd-input label="Name" [(ngModel)]="name" />
        <pd-select label="Kind" [(ngModel)]="kind" [options]="kindOptions" />

        <label class="textarea-field">
          <span>Description (optional)</span>
          <textarea rows="3" [(ngModel)]="description" name="description"></textarea>
        </label>

        <div class="actions">
          <pd-button variant="ghost" routerLink="/pools">Cancel</pd-button>
          <pd-button variant="primary" [disabled]="!canSave()" (click)="save()">Create pool</pd-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    pd-input, pd-select { display: block; }
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
export class NewPoolComponent {
  private service = inject(PoolsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly kindOptions: SelectOption[] = [
    { value: 'FINE_WOOL', label: 'Fine wool' },
    { value: 'MEDIUM_WOOL', label: 'Medium wool' },
    { value: 'LONG_WOOL', label: 'Long wool' },
    { value: 'COLORED_WOOL', label: 'Colored wool' },
    { value: 'MIXED', label: 'Mixed' },
    { value: 'OTHER', label: 'Other' },
  ];

  name = '';
  description = '';
  kind: PoolKind = 'FINE_WOOL';

  canSave(): boolean {
    return this.name.trim().length > 0;
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.create(tid, {
      name: this.name.trim(),
      description: this.description || undefined,
      kind: this.kind,
    }).subscribe({
      next: (p) => {
        this.snack.show('Pool created', { durationMs: 1500 });
        this.router.navigate(['/pools', p.id]);
      },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
