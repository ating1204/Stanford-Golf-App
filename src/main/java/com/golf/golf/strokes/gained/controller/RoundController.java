package com.golf.golf.strokes.gained.controller;

import com.golf.golf.strokes.gained.dto.CreateRoundRequest;
import com.golf.golf.strokes.gained.dto.RoundDto;
import com.golf.golf.strokes.gained.service.RoundService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rounds")
public class RoundController {

    private final RoundService roundService;

    public RoundController(RoundService roundService) {
        this.roundService = roundService;
    }

    // POST /api/v1/rounds with JSON {courseId, tee, holes, playedOn} -> 201 + the new round (incl. its id)
    @PostMapping
    public ResponseEntity<RoundDto> startRound(@RequestBody CreateRoundRequest request) {
        RoundDto round = roundService.startRound(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(round);
    }
}
