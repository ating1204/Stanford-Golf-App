/* 
- creates shot tracking table for SG
- tee to green dist calc using center of green as pin
- manual entry will be necessary for putting/around the green dist
- stores all data in yds (including putting)
- to look up SG for putting, multiply value * 3 + round to nearest int
----- necessary fixes -----
- green centers not in db yet?
- prob add green centers to hole data (sim to tee coords)

 */

CREATE TABLE shot (
    id               bigserial PRIMARY KEY,
    round_hole_id    BIGINT NOT NULL REFERENCES round_hole(id) ON DELETE CASCADE,
    shot_number      INT NOT NULL CHECK (shot_number >= 1),
    club             text NOT NULL,
    start_dist       double precision NOT NULL CHECK (start_dist >= 0),
    end_dist         double precision NOT NULL CHECK (end_dist >= 0),
    start_lie        text NOT NULL CHECK (start_lie IN ('tee', 'fairway', 'rough', 'sand', 'green', 'recovery')),
    end_lie          text NOT NULL CHECK (end_lie IN ('tee', 'fairway', 'rough', 'sand', 'green', 'recovery')),
    /* gps coords (optional tee to green) to potentially visualize shot data on map */
    start_lat        double precision,
    start_lng        double precision,
    end_lat          double precision,
    end_lng          double precision,
    /* penalties - you should check later on if this should get changed to make data more understandable in product */
    penalties        INT NOT NULL DEFAULT 0 CHECK (penalties >= 0),

    UNIQUE (round_hole_id, shot_number)
);