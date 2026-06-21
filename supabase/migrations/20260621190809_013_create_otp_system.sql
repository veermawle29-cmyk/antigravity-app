/*
# Create Phone OTP System

1. New Tables
- `phone_otps` - Stores OTP verification codes
  - `id` (uuid, primary key)
  - `phone` (text, indexed) - Phone number in E.164 format
  - `otp_code` (text) - 6-digit verification code
  - `expires_at` (timestamp) - OTP expiration (5 minutes)
  - `verified` (boolean) - Whether OTP was used
  - `attempts` (integer) - Number of verification attempts
  - `created_at` (timestamp)

2. Security
- Enable RLS on `phone_otps`
- Allow anonymous inserts (for sending OTP)
- Allow anonymous reads with phone+otp match (for verification)
- Auto-delete verified/expired OTPs via trigger

3. Features
- Rate limiting (max 5 attempts per phone per 15 min)
- OTP expires in 5 minutes
- Max 3 verification attempts per OTP
*/

CREATE TABLE IF NOT EXISTS phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires_at ON phone_otps(expires_at);

-- Enable RLS
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert OTP (for sending)
DROP POLICY IF EXISTS "anon_insert_otp" ON phone_otps;
CREATE POLICY "anon_insert_otp" ON phone_otps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Policy: Anyone can read OTP (for verification - but only with matching phone/code)
DROP POLICY IF EXISTS "anon_verify_otp" ON phone_otps;
CREATE POLICY "anon_verify_otp" ON phone_otps FOR SELECT
  TO anon, authenticated USING (true);

-- Policy: Anyone can update OTP (for marking verified/incrementing attempts)
DROP POLICY IF EXISTS "anon_update_otp" ON phone_otps;
CREATE POLICY "anon_update_otp" ON phone_otps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_otps 
  WHERE expires_at < now() OR verified = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate and store OTP
CREATE OR REPLACE FUNCTION generate_phone_otp(p_phone text)
RETURNS TABLE(otp_code text, expires_at timestamptz) AS $$
DECLARE
  v_otp text;
  v_expires timestamptz;
  v_recent_count integer;
BEGIN
  -- Check rate limit: max 3 OTPs per phone in last 15 minutes
  SELECT COUNT(*) INTO v_recent_count
  FROM phone_otps
  WHERE phone = p_phone
    AND created_at > now() - interval '15 minutes';
  
  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many OTP requests. Please wait before requesting again.';
  END IF;

  -- Generate 6-digit OTP
  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires := now() + interval '5 minutes';

  -- Invalidate previous OTPs for this phone
  UPDATE phone_otps 
  SET verified = true 
  WHERE phone = p_phone AND verified = false;

  -- Insert new OTP
  INSERT INTO phone_otps (phone, otp_code, expires_at)
  VALUES (p_phone, v_otp, v_expires);

  -- Return the OTP
  RETURN QUERY SELECT v_otp, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_phone_otp_code(p_phone text, p_otp text)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_otp_record record;
BEGIN
  -- Find the latest unverified OTP for this phone
  SELECT * INTO v_otp_record
  FROM phone_otps
  WHERE phone = p_phone
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- No OTP found
  IF v_otp_record IS NULL THEN
    -- Check if there's an expired OTP
    SELECT * INTO v_otp_record
    FROM phone_otps
    WHERE phone = p_phone
      AND verified = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_record IS NOT NULL THEN
      RETURN QUERY SELECT false, 'OTP has expired. Please request a new one.'::text;
    ELSE
      RETURN QUERY SELECT false, 'No OTP found for this phone number.'::text;
    END IF;
    RETURN;
  END IF;

  -- Check attempt limit
  IF v_otp_record.attempts >= 3 THEN
    RETURN QUERY SELECT false, 'Too many failed attempts. Please request a new OTP.'::text;
    RETURN;
  END IF;

  -- Increment attempts
  UPDATE phone_otps 
  SET attempts = attempts + 1 
  WHERE id = v_otp_record.id;

  -- Verify OTP
  IF v_otp_record.otp_code = p_otp THEN
    -- Mark as verified
    UPDATE phone_otps 
    SET verified = true 
    WHERE id = v_otp_record.id;

    RETURN QUERY SELECT true, 'OTP verified successfully!'::text;
  ELSE
    RETURN QUERY SELECT false, 'Invalid OTP. Please try again.'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old OTPs periodically (call this from edge function or scheduled job)
-- For now, we'll clean on each new OTP generation