-- aerial image of each hole for every course & the geographic bounds of that image (bounded by nw and se).
/* OUTDATED, CHECK V5 FOR NEWER VERSION */
CREATE TABLE hole_map (
    hole_id        bigint PRIMARY KEY REFERENCES hole(id) ON DELETE CASCADE,
    image_path     text NOT NULL,              -- e.g. /maps/stanford/hole01.png (served from static/)
    nw_lat         double precision NOT NULL,
    nw_lng         double precision NOT NULL,
    se_lat         double precision NOT NULL,
    se_lng         double precision NOT NULL,
    width_px       int NOT NULL,
    height_px      int NOT NULL,
    imagery_source text NOT NULL,              -- provenance, e.g. 'USDA NAIP 2022'
    imagery_date   date
);