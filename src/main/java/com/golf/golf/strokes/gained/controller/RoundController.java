package com.golf.golf.strokes.gained.controller;

import com.golf.golf.strokes.gained.dto.RoundDto;
import com.golf.golf.strokes.gained.dto.UploadRoundRequest;
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

    // POST /api/v1/rounds with the whole finished round (round + holes + shots)
    // 201 = just saved, 200 = already had it (phone retried); either way the phone gets the saved round
    @PostMapping
    public ResponseEntity<RoundDto> uploadRound(@RequestBody UploadRoundRequest request) {
        RoundService.UploadResult result = roundService.uploadRound(request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.round());
    }
}



/* 

~~~~random testing~~~~

TEST: sends a "start round" requeest to POST api/v1/rounds enpoint, confirms round setup works properly

fetch("/api/v1/rounds", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ courseId: 1, tee: "Blue", holes: "full", playedOn: "2026-10-26" })
}).then(async r => console.log(r.status, await r.json()))

RETURNS: {id: 8, courseId: 1, tee: 'Blue', holes: 'full', playedOn: '2026-10-26', …}

*** NOTE this actually logs a round in the rounds dt --> need to setup delete request at some point

*/