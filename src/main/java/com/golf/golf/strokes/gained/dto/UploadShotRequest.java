package com.golf.golf.strokes.gained.dto;

/* one tracked shot inside an uploaded hole; distances in yards, GPS optional */
public record UploadShotRequest(Integer shotNumber, String club, Double startDist, Double endDist,
        String startLie, String endLie, Double startLat, Double startLng,
        Double endLat, Double endLng, Integer penalties) {

}
