-- Migration to add 'Pagado' and 'Aconto' to the billing_status enum
-- since the frontend UI uses these options for payment states.

ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'Pagado';
ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'Aconto';
