package com.golf.golf.strokes.gained.dto;

import java.util.List;

/* one hole inside an uploaded round; every stat is optional (null = not entered) */
/* holeNumber not hole id: the server looks up the hole id from course + number */
public record UploadHoleRequest(Integer holeNumber, Integer score, String gir, String fairway,
        Integer putts, Integer chips, Integer sandShots, Integer penalties,
        List<UploadShotRequest> shots) {

}
