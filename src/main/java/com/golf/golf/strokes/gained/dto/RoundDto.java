package com.golf.golf.strokes.gained.dto;

import java.time.LocalDate;

/* things server sends back to phone for a round */
public record RoundDto(Long id, Long courseId, String tee, String holes, LocalDate playedOn, Integer totalScore) {

}
