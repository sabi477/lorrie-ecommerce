CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    seller_id BIGINT REFERENCES users(id),
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_uses INT,
    current_uses INT DEFAULT 0,
    max_uses_per_user INT DEFAULT 1,
    starts_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_code ON campaigns(code);
CREATE INDEX idx_campaigns_seller ON campaigns(seller_id);

ALTER TABLE orders ADD COLUMN campaign_id BIGINT REFERENCES campaigns(id);
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;