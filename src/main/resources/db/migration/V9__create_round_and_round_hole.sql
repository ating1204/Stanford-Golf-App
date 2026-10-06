CREATE TABLE round (
    id            bigserial PRIMARY KEY,
    course_id     BIGINT    NOT NULL REFERENCES course(id),
    tee           text      NOT NULL,                 /* tee name, matches hole_tee.tee_name e.g. 'White' */
    total_score   INT       CHECK (total_score >= 1), /* stored at end of round; NULL while in progress */
    played_on     DATE      NOT NULL
);

CREATE TABLE round_hole (
    id           bigserial PRIMARY KEY,
    round_id     BIGINT    NOT NULL REFERENCES round(id) ON DELETE CASCADE, /* what round are we storing; deleting a round deletes its holes */
    hole_id      BIGINT    NOT NULL REFERENCES hole(id),  /* what hole r we storing data; no cascade so holes w/ recorded rounds can't be deleted */
    score        INT       NOT NULL CHECK (score >= 1),   /* score on hole */
    /* next few will be stats, can fetch with the following command (e.g. GIR) */
    /* SELECT gir, COUNT(*) FROM round_hole WHERE gir IS NOT NULL GROUP BY gir; */
    /* cannot store SG/shots cuz these will be in a list */
    /* all stats are NULL until recorded (NULL passes CHECK); 0 must be entered as 0 */
    gir          text      CHECK (gir IN ('hit', 'long', 'short', 'left', 'right', 'no_chance')),
    fairway      text      CHECK (fairway IN ('hit', 'long', 'short', 'left', 'right')), /* left NULL on par 3s */
    putts        INT       CHECK (putts >= 0),
    chips        INT       CHECK (chips >= 0),
    sand_shots   INT       CHECK (sand_shots >= 0),
    penalties    INT       CHECK (penalties >= 0),

    /* stops duped scores: one row per round + hole; also indexes round_id lookups */
    UNIQUE (round_id, hole_id)
);
