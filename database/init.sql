-- ============================================================
-- CAB BOOKING APP - PostgreSQL Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'rider' CHECK (role IN ('rider', 'driver', 'admin')),
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_plate VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(30) DEFAULT 'sedan' CHECK (vehicle_type IN ('sedan', 'suv', 'auto', 'bike')),
    license_number VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT false,
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_rides INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RIDES TABLE
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    status VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled')),
    vehicle_type VARCHAR(30) DEFAULT 'sedan',
    estimated_fare DECIMAL(10, 2),
    final_fare DECIMAL(10, 2),
    distance_km DECIMAL(8, 2),
    duration_minutes INTEGER,
    payment_method VARCHAR(20) DEFAULT 'card' CHECK (payment_method IN ('card', 'cash')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(255),
    otp VARCHAR(10),
    cancelled_by VARCHAR(20),
    cancel_reason TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'inr',
    method VARCHAR(20) DEFAULT 'card',
    status VARCHAR(20) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    receipt_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- RATINGS TABLE
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    rider_rating INTEGER CHECK (rider_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    rider_comment TEXT,
    driver_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PROMO CODES TABLE
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    min_fare DECIMAL(10, 2) DEFAULT 0,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_till TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id);

-- AUTO UPDATE updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_drivers_timestamp BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_rides_timestamp BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- SEED ADMIN USER (password: Admin@123)
INSERT INTO users (name, email, password, role, is_active, is_verified)
VALUES ('Admin', 'admin@cabapp.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpwcuAoCTEFgGa', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- SEED PROMO CODE
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, valid_till)
VALUES ('FIRST50', 'percentage', 50, 1000, NOW() + INTERVAL '1 year')
ON CONFLICT (code) DO NOTHING;
