/* decided to make each round front 9, back 9, or 18 (defaulted to be a full round icn old roudns) */
ALTER TABLE round
    ADD COLUMN holes text NOT NULL DEFAULT 'full' CHECK (holes IN ('front', 'back', 'full'));

ALTER TABLE round
    ALTER COLUMN holes DROP DEFAULT;
