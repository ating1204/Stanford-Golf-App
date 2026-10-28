package com.golf.golf.strokes.gained.dto;

import java.time.LocalDate;
import java.util.List;

/* full scorecard for one round: same info as RoundDto + every hole played and its shots */
public record RoundDetailDto(Long id, Long courseId, String tee, String holes, LocalDate playedOn,
        Integer totalScore, List<RoundHoleDto> holesPlayed) {

}
