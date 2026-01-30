-- Enforce single active alliance per party (regardless of side)

CREATE OR REPLACE FUNCTION public.enforce_single_active_alliance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.revoked_at IS NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.alliances a
            WHERE a.revoked_at IS NULL
              AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
              AND (
                  a.party_a_id IN (NEW.party_a_id, NEW.party_b_id)
                  OR a.party_b_id IN (NEW.party_a_id, NEW.party_b_id)
              )
        ) THEN
            RAISE EXCEPTION 'Each party can only be in one active alliance at a time.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_single_active_alliance ON public.alliances;

CREATE TRIGGER trg_enforce_single_active_alliance
BEFORE INSERT OR UPDATE ON public.alliances
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_active_alliance();