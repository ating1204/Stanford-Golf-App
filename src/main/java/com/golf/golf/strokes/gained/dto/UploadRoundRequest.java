package com.golf.golf.strokes.gained.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/* whole finished round the phone uploads at the end: round info + every hole + their shots */
/* no id (db makes it) and no totalScore (server computes it) */
public record UploadRoundRequest(UUID clientId, Long courseId, String tee, String holes,
        LocalDate playedOn, List<UploadHoleRequest> holesPlayed) {

}
