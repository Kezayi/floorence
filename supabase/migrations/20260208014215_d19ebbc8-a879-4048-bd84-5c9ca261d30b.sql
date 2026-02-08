CREATE OR REPLACE FUNCTION public.check_relationship_coherence()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    bd_1 DATE;
    bd_2 DATE;
BEGIN
    SELECT birth_date INTO bd_1 FROM memorials WHERE id = NEW.memorial_id_1;
    SELECT birth_date INTO bd_2 FROM memorials WHERE id = NEW.memorial_id_2;

    IF bd_1 IS NOT NULL AND bd_2 IS NOT NULL THEN
        IF NEW.relation_type IN ('Père', 'Mère') AND (bd_2 <= bd_1 + INTERVAL '15 years') THEN
            RAISE EXCEPTION 'Incohérence : Le parent doit avoir au moins 15 ans de plus que l''enfant.';
        END IF;

        IF NEW.relation_type = 'Grand Frère' AND (bd_1 > bd_2) THEN
            RAISE EXCEPTION 'Incohérence : Le Grand Frère ne peut pas être né après son cadet.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;