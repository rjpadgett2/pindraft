-- V2: Mill-ops core schema
-- Reference taxonomies (platform-shared), workflow configuration (tenant-scoped),
-- lots and processing tables.

-- Platform-shared reference data
CREATE TABLE processing_stage_types (
    code         VARCHAR(32) PRIMARY KEY,
    name         VARCHAR(64) NOT NULL,
    description  TEXT NOT NULL,
    typical_order INT NOT NULL
);

INSERT INTO processing_stage_types (code, name, description, typical_order) VALUES
    ('INTAKE',   'Intake',    'Receive fiber, weigh, create lot',                     10),
    ('SORT',     'Sort',      'Skirting and quality classification',                 20),
    ('SCOUR',    'Scour',     'Wash fiber to remove lanolin and dirt',                30),
    ('DRY',      'Dry',       'Dry scoured fiber',                                    40),
    ('PICK',     'Pick',      'Open the locks of dried fiber',                        50),
    ('SEPARATE', 'Separate',  'Separate fibers by length or color',                   55),
    ('CARD',     'Card',      'Align fibers for spinning or felting',                 60),
    ('PINDRAFT', 'Pindraft',  'Further align fibers via pin drafter',                 70),
    ('SPIN',     'Spin',      'Spin into yarn',                                       80),
    ('PLY',      'Ply',       'Twist multiple singles together',                      90),
    ('WIND',     'Wind',      'Wind yarn into skeins, cakes, or cones',              100),
    ('SHIP',     'Ship back', 'Ship finished product back to customer',              110);

CREATE TABLE equipment_types (
    code         VARCHAR(32) PRIMARY KEY,
    name         VARCHAR(64) NOT NULL,
    description  TEXT NOT NULL,
    stage_code   VARCHAR(32) REFERENCES processing_stage_types(code)
);

INSERT INTO equipment_types (code, name, description, stage_code) VALUES
    ('SORT_TABLE',     'Sort table',     'Surface for hand-sorting and skirting',  'SORT'),
    ('SCOUR_TUB',      'Scour tub',      'Tub for washing fiber',                  'SCOUR'),
    ('DRYER',          'Dryer',          'Drying rack or machine',                 'DRY'),
    ('PICKER',         'Picker',         'Machine that opens fiber locks',         'PICK'),
    ('CARDER',         'Carder',         'Carding machine',                        'CARD'),
    ('PIN_DRAFTER',    'Pin drafter',    'Pin drafting machine',                   'PINDRAFT'),
    ('SPINNING_FRAME', 'Spinning frame', 'Industrial spinning machine',            'SPIN'),
    ('PLYER',          'Plyer',          'Plying machine',                         'PLY'),
    ('WINDER',         'Winder',         'Winding machine',                        'WIND');

-- Tenant-scoped workflow configuration
CREATE TABLE workflow_stages (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stage_type          VARCHAR(32) NOT NULL REFERENCES processing_stage_types(code),
    display_name        VARCHAR(64) NOT NULL,
    order_index         INT NOT NULL,
    requires_equipment  BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_custom       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_workflow_order UNIQUE (tenant_id, order_index)
);

CREATE INDEX idx_workflow_tenant ON workflow_stages(tenant_id);

-- Tenant-scoped equipment inventory
CREATE TABLE equipment (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    equipment_type      VARCHAR(32) NOT NULL REFERENCES equipment_types(code),
    name                VARCHAR(255) NOT NULL,
    workflow_stage_id   UUID REFERENCES workflow_stages(id) ON DELETE SET NULL,
    max_weight_kg       NUMERIC(10, 2),
    typical_run_minutes INT,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipment_tenant ON equipment(tenant_id);

-- Pricing templates
CREATE TABLE pricing_arrangements (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    kind          VARCHAR(32) NOT NULL,
    config        JSONB NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pricing_kind CHECK (kind IN ('PER_POUND', 'TIERED_BY_GRADE', 'HYBRID', 'REVENUE_SPLIT'))
);

CREATE INDEX idx_pricing_tenant ON pricing_arrangements(tenant_id);

-- Reservations and lots
CREATE TABLE lot_reservations (
    id                     UUID PRIMARY KEY,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id            UUID NOT NULL REFERENCES tenant_customers(id),
    pricing_arrangement_id UUID REFERENCES pricing_arrangements(id),
    expected_weight_kg     NUMERIC(10, 2) NOT NULL,
    slot_start             TIMESTAMP WITH TIME ZONE NOT NULL,
    status                 VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    processing_request     JSONB,
    external_source        VARCHAR(64),
    external_shipment_id   VARCHAR(255),
    created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_reservation_status CHECK (status IN ('PENDING', 'RECEIVED', 'CANCELLED'))
);

CREATE INDEX idx_reservations_tenant ON lot_reservations(tenant_id);
CREATE INDEX idx_reservations_customer ON lot_reservations(customer_id);

CREATE TABLE lots (
    id                     UUID PRIMARY KEY,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id            UUID NOT NULL REFERENCES tenant_customers(id),
    reservation_id         UUID REFERENCES lot_reservations(id),
    current_stage_id       UUID REFERENCES workflow_stages(id),
    pricing_arrangement_id UUID REFERENCES pricing_arrangements(id),
    weight_intake_kg       NUMERIC(10, 2),
    status                 VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_lot_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_lots_tenant     ON lots(tenant_id);
CREATE INDEX idx_lots_customer   ON lots(customer_id);
CREATE INDEX idx_lots_stage      ON lots(current_stage_id);

CREATE TABLE lot_stage_events (
    id                  UUID PRIMARY KEY,
    lot_id              UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    workflow_stage_id   UUID NOT NULL REFERENCES workflow_stages(id),
    entered_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    exited_at           TIMESTAMP WITH TIME ZONE,
    weight_in_kg        NUMERIC(10, 2),
    weight_out_kg       NUMERIC(10, 2),
    actor_user_id       UUID REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stage_events_lot   ON lot_stage_events(lot_id);
CREATE INDEX idx_stage_events_stage ON lot_stage_events(workflow_stage_id);

-- Lineage DAG for splits and merges
CREATE TABLE lot_lineage_links (
    id              UUID PRIMARY KEY,
    parent_lot_id   UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    child_lot_id    UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    transition_kind VARCHAR(32) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_lineage_kind CHECK (transition_kind IN ('SPLIT', 'MERGE'))
);

CREATE INDEX idx_lineage_parent ON lot_lineage_links(parent_lot_id);
CREATE INDEX idx_lineage_child  ON lot_lineage_links(child_lot_id);

-- Floor batching: an equipment run contains one or more lots
CREATE TABLE equipment_runs (
    id            UUID PRIMARY KEY,
    equipment_id  UUID NOT NULL REFERENCES equipment(id),
    started_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at   TIMESTAMP WITH TIME ZONE,
    configuration JSONB,
    operator_id   UUID REFERENCES users(id),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE equipment_run_lots (
    id                 UUID PRIMARY KEY,
    equipment_run_id   UUID NOT NULL REFERENCES equipment_runs(id) ON DELETE CASCADE,
    lot_id             UUID NOT NULL REFERENCES lots(id),
    weight_in_kg       NUMERIC(10, 2),
    weight_out_kg      NUMERIC(10, 2)
);

-- Scans (every QR scan event)
CREATE TABLE scan_events (
    id              UUID PRIMARY KEY,
    lot_id          UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    actor_user_id   UUID REFERENCES users(id),
    scan_kind       VARCHAR(32) NOT NULL,
    scanned_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes           TEXT,

    CONSTRAINT chk_scan_kind CHECK (scan_kind IN ('STAGE_TRANSITION', 'NOTE', 'ISSUE', 'LOCATION_UPDATE', 'WEIGHT_CHECK'))
);

CREATE INDEX idx_scan_events_lot ON scan_events(lot_id);

-- Fiber tests
CREATE TABLE fiber_tests (
    id                   UUID PRIMARY KEY,
    lot_id               UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    test_type            VARCHAR(32) NOT NULL,
    instrument           VARCHAR(64),
    result_numeric       NUMERIC(10, 4),
    result_unit          VARCHAR(16),
    result_json          JSONB,
    tested_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_test_type CHECK (test_type IN ('MICRON_DIAMETER', 'COMFORT_FACTOR', 'STAPLE_LENGTH', 'IWTO_47_DISTRIBUTION'))
);

-- Wool pools
CREATE TABLE wool_pools (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    formation_criteria  JSONB NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'FORMING',
    target_lot_id       UUID REFERENCES lots(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pool_status CHECK (status IN ('FORMING', 'CLOSED', 'PROCESSING', 'DISTRIBUTED'))
);

CREATE TABLE wool_pool_contributions (
    id                   UUID PRIMARY KEY,
    pool_id              UUID NOT NULL REFERENCES wool_pools(id) ON DELETE CASCADE,
    customer_id          UUID NOT NULL REFERENCES tenant_customers(id),
    incoming_weight_kg   NUMERIC(10, 2) NOT NULL,
    accepted_weight_kg   NUMERIC(10, 2),
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Intake fleeces (transitioned from user-scoped to tenant-scoped at intake)
CREATE TABLE intake_fleeces (
    id                  UUID PRIMARY KEY,
    lot_id              UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    external_fleece_id  VARCHAR(255),
    source_animal_name  VARCHAR(255),
    source_animal_id    VARCHAR(255),
    breed_code          VARCHAR(32),
    weight_kg           NUMERIC(10, 2) NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_intake_fleeces_lot ON intake_fleeces(lot_id);
