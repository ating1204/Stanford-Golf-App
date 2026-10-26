/* score input now optional for reach hole */
ALTER TABLE round_hole
    ALTER COLUMN score DROP NOT NULL;

/* generate UUID for each round to deal with potential communciation errors btwn client and server */
ALTER TABLE round
    ADD COLUMN client_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE round
    ALTER COLUMN client_id DROP DEFAULT;
