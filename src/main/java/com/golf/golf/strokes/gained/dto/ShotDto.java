package com.golf.golf.strokes.gained.dto;

/* one recorded shot, as the server sends it back inside a scorecard */
public record ShotDto(Integer shotNumber, String club, Double startDist, Double endDist,
        String startLie, String endLie, Double startLat, Double startLng,
        Double endLat, Double endLng, Integer penalties) {

}
