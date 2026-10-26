package com.golf.golf.strokes.gained.service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.golf.golf.strokes.gained.dto.RoundDto;
import com.golf.golf.strokes.gained.dto.UploadHoleRequest;
import com.golf.golf.strokes.gained.dto.UploadRoundRequest;
import com.golf.golf.strokes.gained.dto.UploadShotRequest;
import com.golf.golf.strokes.gained.entity.Hole;
import com.golf.golf.strokes.gained.entity.Round;
import com.golf.golf.strokes.gained.entity.RoundHole;
import com.golf.golf.strokes.gained.entity.Shot;
import com.golf.golf.strokes.gained.repository.CourseRepository;
import com.golf.golf.strokes.gained.repository.HoleRepository;
import com.golf.golf.strokes.gained.repository.HoleTeeRepository;
import com.golf.golf.strokes.gained.repository.RoundHoleRepository;
import com.golf.golf.strokes.gained.repository.RoundRepository;
import com.golf.golf.strokes.gained.repository.ShotRepository;

@Service
public class RoundService {
    // longest Stanford hole is 536 yd; anything past this is a phone bug
    // tbh an arbitrary number but im sure itll be fine :D
    private static final double MAX_SHOT_YARDS = 750;

    private final RoundRepository roundRepo;
    private final CourseRepository courseRepo;
    private final HoleRepository holeRepo;
    private final HoleTeeRepository holeTeeRepo;
    private final RoundHoleRepository roundHoleRepo;
    private final ShotRepository shotRepo;

    public RoundService(RoundRepository roundRepo, CourseRepository courseRepo, HoleRepository holeRepo,
            HoleTeeRepository holeTeeRepo, RoundHoleRepository roundHoleRepo, ShotRepository shotRepo) {
        this.roundRepo = roundRepo;
        this.courseRepo = courseRepo;
        this.holeRepo = holeRepo;
        this.holeTeeRepo = holeTeeRepo;
        this.roundHoleRepo = roundHoleRepo;
        this.shotRepo = shotRepo;
    }

    // what the controller gets back: the round + whether it was just saved (201) or already there (200)
    public record UploadResult(RoundDto round, boolean created) {
    }

    /* saves a whole finished round (round + holes + shots) that the phone uploads at the end */
    // all or nothing: if anything below throws, every insert in here is rolled back
    @Transactional
    public UploadResult uploadRound(UploadRoundRequest request) {
        /* 1. duplicate check */

        if (request.clientId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "clientId is required");
        }
        // phone retried an upload we already saved -> send the saved round back, don't save again
        Optional<Round> existing = roundRepo.findByClientId(request.clientId());
        if (existing.isPresent()) {
            return new UploadResult(toDto(existing.get()), false);
        }

        /* 2. checks: round info */

        if (request.courseId() == null || request.tee() == null
                || request.holes() == null || request.playedOn() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "courseId, tee, holes and playedOn are required");
        }
        if (!List.of("front", "back", "full").contains(request.holes())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "holes must be front, back, or full");
        }
        if (request.playedOn().isAfter(LocalDate.now().plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "playedOn can't be in the future");
        }
        if (!courseRepo.existsById(request.courseId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No course with id " + request.courseId());
        }
        List<Hole> courseHoles = holeRepo.findByCourseIdOrderByHoleNumberAsc(request.courseId());
        List<Long> courseHoleIds = courseHoles.stream().map(Hole::getId).toList();
        if (!holeTeeRepo.existsByHoleIdInAndTeeName(courseHoleIds, request.tee())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Course " + request.courseId() + " has no tee '" + request.tee() + "'");
        }

        /* 2. checks: holes + their shots */

        // partial rounds are allowed, so a missing list just means no holes
        List<UploadHoleRequest> holesPlayed = request.holesPlayed() == null ? List.of() : request.holesPlayed();
        // phone sends hole numbers; the db needs hole ids
        Map<Integer, Hole> holeByNumber = courseHoles.stream()
                .collect(Collectors.toMap(Hole::getHoleNumber, Function.identity()));
        int firstHole = request.holes().equals("back") ? 10 : 1;
        int lastHole = request.holes().equals("front") ? 9 : 18;

        Set<Integer> seenHoles = new HashSet<>();
        for (UploadHoleRequest hole : holesPlayed) {
            Integer n = hole.holeNumber();
            if (n == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "every hole needs a holeNumber");
            }
            if (!holeByNumber.containsKey(n)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Course " + request.courseId() + " has no hole " + n);
            }
            // extending front 9 -> 18 happens on the phone, which then sends holes = full
            if (n < firstHole || n > lastHole) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Hole " + n + " isn't part of a '" + request.holes() + "' round");
            }
            if (!seenHoles.add(n)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hole " + n + " appears more than once");
            }
            checkShots(hole);
        }

        /* 3. total: only set when every hole on the side has a score (= a complete round) */

        // holes are unique and on the side (checked above), so counting scored holes is enough
        long scoredHoles = holesPlayed.stream().filter(h -> h.score() != null).count();
        Integer total = null;
        if (scoredHoles == lastHole - firstHole + 1) {
            total = holesPlayed.stream().mapToInt(UploadHoleRequest::score).sum();
        }

        /* 4. save top down: each row needs the id of the row above it */

        Round round = new Round(request.clientId(), request.courseId(), request.tee(),
                request.playedOn(), request.holes());
        round.setTotalScore(total);
        Round savedRound = roundRepo.save(round);

        for (UploadHoleRequest hole : holesPlayed) {
            RoundHole savedHole = roundHoleRepo.save(new RoundHole(savedRound.getId(),
                    holeByNumber.get(hole.holeNumber()).getId(), hole.score(), hole.gir(), hole.fairway(),
                    hole.putts(), hole.chips(), hole.sandShots(), hole.penalties()));

            for (UploadShotRequest shot : shotsOf(hole)) {
                shotRepo.save(new Shot(savedHole.getId(), shot.shotNumber(), shot.club(),
                        shot.startDist(), shot.endDist(), shot.startLie(), shot.endLie(),
                        shot.startLat(), shot.startLng(), shot.endLat(), shot.endLng(), shot.penalties()));
            }
        }

        /* 5. send the saved round back */
        return new UploadResult(toDto(savedRound), true);
    }

    // shot checks for one hole; the db would also reject most of these, but as a 500 instead of a clear 400
    private void checkShots(UploadHoleRequest hole) {
        Set<Integer> seenShots = new HashSet<>();
        for (UploadShotRequest shot : shotsOf(hole)) {
            if (shot.shotNumber() == null || shot.club() == null || shot.startDist() == null
                    || shot.endDist() == null || shot.startLie() == null || shot.endLie() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Hole " + hole.holeNumber() + ": every shot needs shotNumber, club, distances and lies");
            }
            if (!seenShots.add(shot.shotNumber())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Hole " + hole.holeNumber() + ": shot " + shot.shotNumber() + " appears more than once");
            }
            if (outOfRange(shot.startDist()) || outOfRange(shot.endDist())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Hole " + hole.holeNumber() + " shot " + shot.shotNumber()
                                + ": distances must be 0-" + (int) MAX_SHOT_YARDS + " yards");
            }
        }
    }

    private static boolean outOfRange(double yards) {
        return yards < 0 || yards > MAX_SHOT_YARDS;
    }

    // a hole with no tracked shots may send no list at all
    private static List<UploadShotRequest> shotsOf(UploadHoleRequest hole) {
        return hole.shots() == null ? List.of() : hole.shots();
    }

    // entity -> JSON shape for the phone
    private static RoundDto toDto(Round r) {
        return new RoundDto(r.getId(), r.getCourseId(), r.getTee(),
                r.getHoles(), r.getPlayedOn(), r.getTotalScore());
    }
}
