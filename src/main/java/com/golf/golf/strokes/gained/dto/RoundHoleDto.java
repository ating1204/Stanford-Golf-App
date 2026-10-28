package com.golf.golf.strokes.gained.dto;

import java.util.List;

/* one hole on a scorecard: hole number + par (not the db hole id), score, stats, recorded shots */
public record RoundHoleDto(Integer holeNumber, Integer par, Integer score, String gir, String fairway,
        Integer putts, Integer chips, Integer sandShots, Integer penalties, List<ShotDto> shots) {

}
