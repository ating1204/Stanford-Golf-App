package com.golf.golf.strokes.gained.dto;

import java.time.LocalDate;

/* things phone sends to server to start a round */
/* so doesnt inc id nor total score */
public record CreateRoundRequest(Long courseId, String tee, String holes, LocalDate playedOn) {

}
