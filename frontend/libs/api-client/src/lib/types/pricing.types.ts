// Pricing templates: four discriminated kinds with per-kind configuration shapes.

export type PricingKind = 'PER_POUND' | 'TIERED_BY_GRADE' | 'HYBRID' | 'REVENUE_SPLIT';

export interface PricingTemplate {
  id: string;
  name: string;
  kind: PricingKind;
  configJson: string;
}

export interface PerPoundConfig {
  pricePerKg: number;
}

export interface HybridConfig {
  flatFee: number;
  pricePerKg: number;
}

export interface RevenueSplitConfig {
  millPercent: number;
  brandPercent: number;
}

export interface TieredTier {
  maxMicron: number;
  pricePerKg: number;
}

export interface TieredConfig {
  tiers: TieredTier[];
}

export type PricingConfig =
  | PerPoundConfig
  | HybridConfig
  | RevenueSplitConfig
  | TieredConfig;

export interface CreatePricingTemplateRequest {
  name: string;
  kind: PricingKind;
  config: PricingConfig;
}
