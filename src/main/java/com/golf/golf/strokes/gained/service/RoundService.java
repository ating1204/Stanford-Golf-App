package com.golf.golf.strokes.gained.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.golf.golf.strokes.gained.dto.CreateRoundRequest;
import com.golf.golf.strokes.gained.dto.RoundDto;
import com.golf.golf.strokes.gained.entity.Hole;
import com.golf.golf.strokes.gained.entity.Round;
import com.golf.golf.strokes.gained.repository.CourseRepository;
import com.golf.golf.strokes.gained.repository.HoleRepository;
import com.golf.golf.strokes.gained.repository.HoleTeeRepository;
import com.golf.golf.strokes.gained.repository.RoundRepository;

@Service
public class RoundService {
    private final RoundRepository roundRepo;
    private final CourseRepository courseRepo;
    private final HoleRepository holeRepo;
    private final HoleTeeRepository holeTeeRepo;

    public RoundService(RoundRepository roundRepo, CourseRepository courseRepo, HoleRepository holeRepo,
            HoleTeeRepository holeTeeRepo) {
        this.roundRepo = roundRepo;
        this.courseRepo = courseRepo;
        this.holeRepo = holeRepo;
        this.holeTeeRepo = holeTeeRepo;
    }

    /* starts a new round: check the request, saves it, and then sends the saved round back  */
    public RoundDto startRound(CreateRoundRequest request) {
        /* running checks */

        // every field is required
        if (request.courseId() == null || request.tee() == null
                || request.holes() == null || request.playedOn() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "courseId, tee, holes and playedon are required");
        }

        // holes must match the V11 check vals
        if (!List.of("front", "back", "full").contains(request.holes())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "holes must be front, back, or full");
        }

        // date comes from the phone
        // 1 day ahead in case of timezone diff
        if (request.playedOn().isAfter(LocalDate.now().plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "playedOn can't be in the future");
        }

        // course must exist (404 = thing you pointed at isnt there)
        if (!courseRepo.existsById(request.courseId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No course with id " + request.courseId());
        }

        // tee must exist on this course; tees belong to holes, so look up the course's hole ids first
        List<Long> holeIds = holeRepo.findByCourseIdOrderByHoleNumberAsc(request.courseId())
                .stream().map(Hole::getId).toList();
        if (!holeTeeRepo.existsByHoleIdInAndTeeName(holeIds, request.tee())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Course " + request.courseId() + " has no tee '" + request.tee() + "'");
        }

        /* checks passed: save */

        // id + totalScore stay null; save() inserts the row and fills in the id from the db
        Round saved = roundRepo.save(new Round(request.courseId(), request.tee(),
                request.playedOn(), request.holes()));

        // entity -> JSON shape for the phone
        return new RoundDto(saved.getId(), saved.getCourseId(), saved.getTee(),
                saved.getHoles(), saved.getPlayedOn(), saved.getTotalScore());
    }
}
